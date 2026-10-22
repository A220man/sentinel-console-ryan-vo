from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index, Boolean
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.core.database import Base


class IssueType(PyEnum):
    BUG = "bug"
    FEATURE = "feature"
    ENHANCEMENT = "enhancement"
    QUESTION = "question"


class IssuePriority(PyEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class IssueStatus(PyEnum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class Issue(Base):
    __tablename__ = "issues"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    external_id: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    number: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=True)
    html_url: Mapped[str] = mapped_column(String(500), nullable=True)
    issue_type: Mapped[str] = mapped_column(String(50), default=IssueType.QUESTION.value, index=True)
    priority: Mapped[str] = mapped_column(String(50), default=IssuePriority.MEDIUM.value, index=True)
    status: Mapped[str] = mapped_column(String(50), default=IssueStatus.OPEN.value, index=True)
    comments_count: Mapped[int] = mapped_column(Integer, default=0)
    labels: Mapped[str] = mapped_column(Text, nullable=True)  # JSON array
    assignees: Mapped[str] = mapped_column(Text, nullable=True)  # JSON array
    author: Mapped[str] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    closed_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # AI/ML fields
    classification_confidence: Mapped[float] = mapped_column(default=0.0)
    classified_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    similarity_hash: Mapped[str] = mapped_column(String(64), nullable=True, index=True)
    priority_score: Mapped[float] = mapped_column(default=0.0)

    def to_dict(self):
        return {
            "id": self.id,
            "external_id": self.external_id,
            "number": self.number,
            "title": self.title,
            "body": self.body,
            "html_url": self.html_url,
            "issue_type": self.issue_type,
            "priority": self.priority,
            "status": self.status,
            "comments_count": self.comments_count,
            "labels": self.labels,
            "assignees": self.assignees,
            "author": self.author,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "closed_at": self.closed_at.isoformat() if self.closed_at else None,
            "classification_confidence": self.classification_confidence,
            "classified_at": self.classified_at.isoformat() if self.classified_at else None,
            "similarity_hash": self.similarity_hash,
            "priority_score": self.priority_score,
        }


class UsageRecord(Base):
    __tablename__ = "usage_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    model: Mapped[str] = mapped_column(String(100), index=True)
    input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0)
    total_tokens: Mapped[int] = mapped_column(Integer, default=0)
    cost_usd: Mapped[float] = mapped_column(default=0.0)
    session_id: Mapped[str] = mapped_column(String(100), index=True, nullable=True)
    user_id: Mapped[str] = mapped_column(String(100), index=True, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "model": self.model,
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "total_tokens": self.total_tokens,
            "cost_usd": self.cost_usd,
            "session_id": self.session_id,
            "user_id": self.user_id,
        }


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str] = mapped_column(String(500), nullable=True)
    active_profile_id: Mapped[int] = mapped_column(Integer, default=0)
    oidc_sub: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    profiles: Mapped[list["AccountProfile"]] = relationship(back_populates="user", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "avatar_url": self.avatar_url,
            "active_profile_id": self.active_profile_id,
            "oidc_sub": self.oidc_sub,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_login": self.last_login.isoformat() if self.last_login else None,
        }


class AccountProfile(Base):
    __tablename__ = "account_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("user_profiles.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g., "work", "personal"
    account_type: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g., "anthropic", "github"
    account_id: Mapped[str] = mapped_column(String(255), nullable=False)  # provider-specific ID
    display_name: Mapped[str] = mapped_column(String(255), nullable=True)
    access_token_encrypted: Mapped[str] = mapped_column(Text, nullable=True)
    refresh_token_encrypted: Mapped[str] = mapped_column(Text, nullable=True)
    token_expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    mcp_config: Mapped[str] = mapped_column(Text, nullable=True)  # JSON
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user: Mapped["UserProfile"] = relationship(back_populates="profiles")

    def to_dict(self, include_tokens: bool = False):
        d = {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "account_type": self.account_type,
            "account_id": self.account_id,
            "display_name": self.display_name,
            "mcp_config": self.mcp_config,
            "is_active": self.is_active,
            "is_default": self.is_default,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_tokens:
            d["access_token_encrypted"] = self.access_token_encrypted
            d["refresh_token_encrypted"] = self.refresh_token_encrypted
            d["token_expires_at"] = self.token_expires_at.isoformat() if self.token_expires_at else None
        return d


class AccessibilitySettings(Base):
    __tablename__ = "accessibility_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("user_profiles.id"), unique=True, nullable=False)
    reduced_motion: Mapped[bool] = mapped_column(Boolean, default=False)
    high_contrast: Mapped[bool] = mapped_column(Boolean, default=False)
    screen_reader_announcements: Mapped[bool] = mapped_column(Boolean, default=True)
    status_update_interval_ms: Mapped[int] = mapped_column(Integer, default=500)
    theme: Mapped[str] = mapped_column(String(50), default="system")  # light, dark, system
    font_size: Mapped[int] = mapped_column(Integer, default=14)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "reduced_motion": self.reduced_motion,
            "high_contrast": self.high_contrast,
            "screen_reader_announcements": self.screen_reader_announcements,
            "status_update_interval_ms": self.status_update_interval_ms,
            "theme": self.theme,
            "font_size": self.font_size,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# Indexes
Index("ix_issues_type_status", Issue.issue_type, Issue.status)
Index("ix_issues_created_priority", Issue.created_at, Issue.priority)
Index("ix_usage_timestamp_model", UsageRecord.timestamp, UsageRecord.model)
Index("ix_profiles_user_active", AccountProfile.user_id, AccountProfile.is_active)