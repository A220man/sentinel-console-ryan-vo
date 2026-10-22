from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, or_
from typing import Optional, List
from datetime import datetime, timedelta
import json

from app.core.database import get_db
from app.core.config import get_settings
from app.models import (
    Issue, IssueType, IssuePriority, IssueStatus,
    UsageRecord, UserProfile, AccountProfile, AccessibilitySettings
)

router = APIRouter()
settings = get_settings()


# Health check
@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "sentinel-console",
        "version": settings.app_version,
        "timestamp": datetime.utcnow().isoformat()
    }


# Issues API
@router.get("/issues", response_model=dict)
async def list_issues(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    issue_type: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc")
):
    query = db.query(Issue)

    if issue_type:
        query = query.filter(Issue.issue_type == issue_type)
    if priority:
        query = query.filter(Issue.priority == priority)
    if status:
        query = query.filter(Issue.status == status)
    if search:
        query = query.filter(
            or_(
                Issue.title.ilike(f"%{search}%"),
                Issue.body.ilike(f"%{search}%")
            )
        )

    # Sorting
    sort_column = getattr(Issue, sort_by, Issue.created_at)
    if sort_order == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(sort_column)

    total = query.count()
    issues = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": [issue.to_dict() for issue in issues],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }


@router.get("/issues/{issue_id}", response_model=dict)
async def get_issue(issue_id: int, db: Session = Depends(get_db)):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return issue.to_dict()


@router.post("/issues", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_issue(
    issue_data: dict,
    db: Session = Depends(get_db)
):
    # Validate required fields
    required = ["external_id", "number", "title"]
    for field in required:
        if field not in issue_data:
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")

    # Check duplicate
    existing = db.query(Issue).filter(Issue.external_id == issue_data["external_id"]).first()
    if existing:
        raise HTTPException(status_code=409, detail="Issue with this external_id already exists")

    issue = Issue(
        external_id=issue_data["external_id"],
        number=issue_data["number"],
        title=issue_data["title"],
        body=issue_data.get("body"),
        html_url=issue_data.get("html_url"),
        issue_type=issue_data.get("issue_type", IssueType.QUESTION.value),
        priority=issue_data.get("priority", IssuePriority.MEDIUM.value),
        status=issue_data.get("status", IssueStatus.OPEN.value),
        comments_count=issue_data.get("comments_count", 0),
        labels=json.dumps(issue_data.get("labels", [])),
        assignees=json.dumps(issue_data.get("assignees", [])),
        author=issue_data.get("author"),
        created_at=datetime.fromisoformat(issue_data["created_at"]) if issue_data.get("created_at") else datetime.utcnow(),
        updated_at=datetime.fromisoformat(issue_data["updated_at"]) if issue_data.get("updated_at") else datetime.utcnow(),
    )

    db.add(issue)
    db.commit()
    db.refresh(issue)
    return issue.to_dict()


@router.patch("/issues/{issue_id}", response_model=dict)
async def update_issue(issue_id: int, updates: dict, db: Session = Depends(get_db)):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    allowed_fields = ["title", "body", "issue_type", "priority", "status", "comments_count", "labels", "assignees"]
    for field, value in updates.items():
        if field in allowed_fields:
            if field in ["labels", "assignees"] and isinstance(value, list):
                setattr(issue, field, json.dumps(value))
            else:
                setattr(issue, field, value)

    issue.updated_at = datetime.utcnow()
    if updates.get("status") in (IssueStatus.RESOLVED.value, IssueStatus.CLOSED.value) and not issue.closed_at:
        issue.closed_at = datetime.utcnow()

    db.commit()
    db.refresh(issue)
    return issue.to_dict()


@router.get("/issues/stats/summary", response_model=dict)
async def issues_summary(db: Session = Depends(get_db)):
    total = db.query(Issue).count()
    by_type = db.query(Issue.issue_type, func.count(Issue.id)).group_by(Issue.issue_type).all()
    by_priority = db.query(Issue.priority, func.count(Issue.id)).group_by(Issue.priority).all()
    by_status = db.query(Issue.status, func.count(Issue.id)).group_by(Issue.status).all()

    return {
        "total": total,
        "by_type": {t: c for t, c in by_type},
        "by_priority": {p: c for p, c in by_priority},
        "by_status": {s: c for s, c in by_status},
    }


# Usage Analytics API
@router.get("/usage", response_model=dict)
async def list_usage(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    model: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    session_id: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
):
    query = db.query(UsageRecord)

    if model:
        query = query.filter(UsageRecord.model == model)
    if user_id:
        query = query.filter(UsageRecord.user_id == user_id)
    if session_id:
        query = query.filter(UsageRecord.session_id == session_id)
    if start_date:
        query = query.filter(UsageRecord.timestamp >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(UsageRecord.timestamp <= datetime.fromisoformat(end_date))

    query = query.order_by(desc(UsageRecord.timestamp))

    total = query.count()
    records = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": [r.to_dict() for r in records],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }


@router.post("/usage", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_usage_record(record: dict, db: Session = Depends(get_db)):
    required = ["model", "input_tokens", "output_tokens"]
    for field in required:
        if field not in record:
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")

    total = record["input_tokens"] + record["output_tokens"]
    # Rough cost estimation (placeholder)
    cost = total * 0.00001

    usage = UsageRecord(
        model=record["model"],
        input_tokens=record["input_tokens"],
        output_tokens=record["output_tokens"],
        total_tokens=total,
        cost_usd=record.get("cost_usd", cost),
        session_id=record.get("session_id"),
        user_id=record.get("user_id"),
        timestamp=datetime.fromisoformat(record["timestamp"]) if record.get("timestamp") else datetime.utcnow(),
    )

    db.add(usage)
    db.commit()
    db.refresh(usage)
    return usage.to_dict()


@router.get("/usage/stats/summary", response_model=dict)
async def usage_summary(
    db: Session = Depends(get_db),
    days: int = Query(30, ge=1, le=365),
    user_id: Optional[str] = Query(None)
):
    since = datetime.utcnow() - timedelta(days=days)
    query = db.query(UsageRecord).filter(UsageRecord.timestamp >= since)
    if user_id:
        query = query.filter(UsageRecord.user_id == user_id)

    total_records = query.count()
    total_tokens = query.with_entities(func.sum(UsageRecord.total_tokens)).scalar() or 0
    total_cost = query.with_entities(func.sum(UsageRecord.cost_usd)).scalar() or 0.0

    by_model = query.with_entities(
        UsageRecord.model,
        func.count(UsageRecord.id),
        func.sum(UsageRecord.total_tokens),
        func.sum(UsageRecord.cost_usd)
    ).group_by(UsageRecord.model).all()

    daily = query.with_entities(
        func.date(UsageRecord.timestamp),
        func.sum(UsageRecord.total_tokens),
        func.sum(UsageRecord.cost_usd)
    ).group_by(func.date(UsageRecord.timestamp)).order_by(func.date(UsageRecord.timestamp)).all()

    return {
        "period_days": days,
        "total_records": total_records,
        "total_tokens": total_tokens,
        "total_cost_usd": round(total_cost, 4),
        "by_model": [
            {"model": m, "requests": c, "tokens": t or 0, "cost_usd": round(cst or 0, 4)}
            for m, c, t, cst in by_model
        ],
        "daily": [
            {"date": str(d), "tokens": t or 0, "cost_usd": round(cst or 0, 4)}
            for d, t, cst in daily
        ]
    }


# User Profiles API
@router.get("/profiles/me", response_model=dict)
async def get_current_profile(db: Session = Depends(get_db)):
    # Demo mode: return or create demo user
    if settings.demo_mode:
        user = db.query(UserProfile).filter(UserProfile.email == settings.demo_user_email).first()
        if not user:
            user = UserProfile(
                email=settings.demo_user_email,
                name=settings.demo_user_name,
                active_profile_id=0
            )
            db.add(user)
            db.commit()
            db.refresh(user)

            # Create default profile
            profile = AccountProfile(
                user_id=user.id,
                name="default",
                account_type="anthropic",
                account_id="demo-account",
                display_name="Demo Account",
                is_active=True,
                is_default=True
            )
            db.add(profile)
            db.commit()
            db.refresh(profile)
            user.active_profile_id = profile.id
            db.commit()

            # Create accessibility settings
            a11y = AccessibilitySettings(user_id=user.id)
            db.add(a11y)
            db.commit()

        return {
            "user": user.to_dict(),
            "profiles": [p.to_dict() for p in user.profiles],
            "active_profile": next((p.to_dict() for p in user.profiles if p.id == user.active_profile_id), None),
            "accessibility": user.accessibility.to_dict() if hasattr(user, 'accessibility') and user.accessibility else AccessibilitySettings(user_id=user.id).to_dict()
        }

    raise HTTPException(status_code=401, detail="Authentication required")


@router.post("/profiles/me/switch/{profile_id}", response_model=dict)
async def switch_profile(profile_id: int, db: Session = Depends(get_db)):
    if settings.demo_mode:
        user = db.query(UserProfile).filter(UserProfile.email == settings.demo_user_email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        profile = db.query(AccountProfile).filter(
            AccountProfile.id == profile_id,
            AccountProfile.user_id == user.id,
            AccountProfile.is_active == True
        ).first()
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found or inactive")

        user.active_profile_id = profile_id
        db.commit()
        return {"success": True, "active_profile": profile.to_dict()}

    raise HTTPException(status_code=401, detail="Authentication required")


@router.post("/profiles", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_profile(profile_data: dict, db: Session = Depends(get_db)):
    if settings.demo_mode:
        user = db.query(UserProfile).filter(UserProfile.email == settings.demo_user_email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        profile = AccountProfile(
            user_id=user.id,
            name=profile_data.get("name", "new-profile"),
            account_type=profile_data.get("account_type", "anthropic"),
            account_id=profile_data.get("account_id", ""),
            display_name=profile_data.get("display_name"),
            mcp_config=json.dumps(profile_data.get("mcp_config", {})),
            is_active=True,
            is_default=False
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
        return profile.to_dict()

    raise HTTPException(status_code=401, detail="Authentication required")


@router.patch("/profiles/{profile_id}", response_model=dict)
async def update_profile(profile_id: int, updates: dict, db: Session = Depends(get_db)):
    if settings.demo_mode:
        user = db.query(UserProfile).filter(UserProfile.email == settings.demo_user_email).first()
        profile = db.query(AccountProfile).filter(
            AccountProfile.id == profile_id,
            AccountProfile.user_id == user.id
        ).first()
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")

        allowed = ["name", "display_name", "mcp_config", "is_active", "is_default"]
        for field, value in updates.items():
            if field in allowed:
                if field == "mcp_config" and isinstance(value, dict):
                    setattr(profile, field, json.dumps(value))
                else:
                    setattr(profile, field, value)

        profile.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(profile)
        return profile.to_dict()

    raise HTTPException(status_code=401, detail="Authentication required")


# Accessibility API
@router.get("/accessibility", response_model=dict)
async def get_accessibility(db: Session = Depends(get_db)):
    if settings.demo_mode:
        user = db.query(UserProfile).filter(UserProfile.email == settings.demo_user_email).first()
        if user:
            a11y = db.query(AccessibilitySettings).filter(AccessibilitySettings.user_id == user.id).first()
            if a11y:
                return a11y.to_dict()
        return AccessibilitySettings(user_id=0).to_dict()
    raise HTTPException(status_code=401, detail="Authentication required")


@router.patch("/accessibility", response_model=dict)
async def update_accessibility(updates: dict, db: Session = Depends(get_db)):
    if settings.demo_mode:
        user = db.query(UserProfile).filter(UserProfile.email == settings.demo_user_email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        a11y = db.query(AccessibilitySettings).filter(AccessibilitySettings.user_id == user.id).first()
        if not a11y:
            a11y = AccessibilitySettings(user_id=user.id)
            db.add(a11y)

        allowed = ["reduced_motion", "high_contrast", "screen_reader_announcements", "status_update_interval_ms", "theme", "font_size"]
        for field, value in updates.items():
            if field in allowed:
                setattr(a11y, field, value)

        a11y.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(a11y)
        return a11y.to_dict()

    raise HTTPException(status_code=401, detail="Authentication required")