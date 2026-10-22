# Sentinel Console Backend Tests

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import create_app
from app.core.database import Base, get_db
from app.models import Issue, IssueType, IssuePriority, IssueStatus, UsageRecord, UserProfile, AccountProfile, AccessibilitySettings


# Test database
TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    app = create_app()
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


class TestHealth:
    def test_health_check(self, client):
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "sentinel-console"
        assert "version" in data
        assert "timestamp" in data


class TestIssuesAPI:
    def test_create_issue(self, client):
        issue_data = {
            "external_id": "test-1",
            "number": 123,
            "title": "Test Issue",
            "body": "Test body",
            "issue_type": "bug",
            "priority": "high",
            "status": "open",
            "labels": ["bug", "urgent"],
            "assignees": ["user1"],
            "author": "tester",
        }
        response = client.post("/api/issues", json=issue_data)
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Test Issue"
        assert data["issue_type"] == "bug"
        assert data["priority"] == "high"
        assert data["labels"] == '["bug", "urgent"]'

    def test_create_issue_missing_required(self, client):
        response = client.post("/api/issues", json={"title": "Only Title"})
        assert response.status_code == 400
        assert "external_id" in response.json()["detail"]

    def test_create_duplicate_external_id(self, client):
        issue_data = {
            "external_id": "dup-1",
            "number": 1,
            "title": "First",
        }
        client.post("/api/issues", json=issue_data)
        response = client.post("/api/issues", json={**issue_data, "title": "Second"})
        assert response.status_code == 409

    def test_list_issues(self, client):
        # Create test issues
        for i in range(5):
            client.post("/api/issues", json={
                "external_id": f"list-{i}",
                "number": i,
                "title": f"Issue {i}",
                "issue_type": "bug" if i % 2 == 0 else "feature",
                "priority": "high" if i < 2 else "medium",
            })

        response = client.get("/api/issues")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 5
        assert len(data["items"]) == 5

    def test_list_issues_with_filters(self, client):
        for i in range(3):
            client.post("/api/issues", json={
                "external_id": f"filter-{i}",
                "number": i,
                "title": f"Bug {i}",
                "issue_type": "bug",
                "priority": "high",
            })
        for i in range(2):
            client.post("/api/issues", json={
                "external_id": f"filter-feat-{i}",
                "number": 10 + i,
                "title": f"Feature {i}",
                "issue_type": "feature",
                "priority": "medium",
            })

        # Filter by type
        response = client.get("/api/issues?issue_type=bug")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 3
        assert all(item["issue_type"] == "bug" for item in data["items"])

        # Filter by priority
        response = client.get("/api/issues?priority=high")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 3

    def test_get_issue(self, client):
        create_resp = client.post("/api/issues", json={
            "external_id": "get-1",
            "number": 42,
            "title": "Get Me",
        })
        issue_id = create_resp.json()["id"]

        response = client.get(f"/api/issues/{issue_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Get Me"
        assert data["number"] == 42

    def test_get_issue_not_found(self, client):
        response = client.get("/api/issues/99999")
        assert response.status_code == 404

    def test_update_issue(self, client):
        create_resp = client.post("/api/issues", json={
            "external_id": "update-1",
            "number": 1,
            "title": "Original",
            "status": "open",
        })
        issue_id = create_resp.json()["id"]

        response = client.patch(f"/api/issues/{issue_id}", json={
            "title": "Updated",
            "status": "resolved",
            "priority": "critical",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated"
        assert data["status"] == "resolved"
        assert data["priority"] == "critical"
        assert data["closed_at"] is not None

    def test_issues_summary(self, client):
        client.post("/api/issues", json={"external_id": "s1", "number": 1, "title": "Bug", "issue_type": "bug", "priority": "high", "status": "open"})
        client.post("/api/issues", json={"external_id": "s2", "number": 2, "title": "Feature", "issue_type": "feature", "priority": "medium", "status": "closed"})

        response = client.get("/api/issues/stats/summary")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        assert data["by_type"]["bug"] == 1
        assert data["by_type"]["feature"] == 1
        assert data["by_priority"]["high"] == 1
        assert data["by_status"]["open"] == 1
        assert data["by_status"]["closed"] == 1


class TestUsageAPI:
    def test_create_usage_record(self, client):
        record = {
            "model": "gpt-4o",
            "input_tokens": 100,
            "output_tokens": 50,
            "session_id": "sess-1",
            "user_id": "user-1",
        }
        response = client.post("/api/usage", json=record)
        assert response.status_code == 201
        data = response.json()
        assert data["model"] == "gpt-4o"
        assert data["input_tokens"] == 100
        assert data["output_tokens"] == 50
        assert data["total_tokens"] == 150
        assert data["cost_usd"] > 0

    def test_list_usage(self, client):
        for i in range(3):
            client.post("/api/usage", json={
                "model": "gpt-4o",
                "input_tokens": 100 + i * 10,
                "output_tokens": 50,
                "user_id": "user-1",
            })

        response = client.get("/api/usage")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 3

    def test_usage_summary(self, client):
        client.post("/api/usage", json={"model": "gpt-4o", "input_tokens": 100, "output_tokens": 50, "user_id": "user-1"})
        client.post("/api/usage", json={"model": "claude-3", "input_tokens": 200, "output_tokens": 100, "user_id": "user-1"})

        response = client.get("/api/usage/stats/summary?days=30")
        assert response.status_code == 200
        data = response.json()
        assert data["total_records"] == 2
        assert data["total_tokens"] == 450
        assert len(data["by_model"]) == 2
        assert len(data["daily"]) >= 1


class TestProfilesAPI:
    def test_get_current_profile_demo(self, client):
        response = client.get("/api/profiles/me")
        assert response.status_code == 200
        data = response.json()
        assert "user" in data
        assert "profiles" in data
        assert "active_profile" in data
        assert "accessibility" in data
        assert data["user"]["email"] == "demo@sentinel.local"

    def test_switch_profile(self, client):
        # Get initial profile
        resp = client.get("/api/profiles/me")
        profile_id = resp.json()["profiles"][0]["id"]

        # Switch to it (should work)
        response = client.post(f"/api/profiles/me/switch/{profile_id}")
        assert response.status_code == 200
        assert response.json()["success"] is True

    def test_create_profile(self, client):
        # First ensure demo user exists
        client.get("/api/profiles/me")
        response = client.post("/api/profiles", json={
            "name": "work",
            "account_type": "anthropic",
            "account_id": "work-account-123",
            "display_name": "Work Account",
            "mcp_config": {"servers": ["github", "slack"]},
        })
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "work"
        assert data["account_type"] == "anthropic"
        assert data["is_default"] is False

    def test_update_profile(self, client):
        # First ensure demo user exists
        client.get("/api/profiles/me")
        create_resp = client.post("/api/profiles", json={"name": "temp", "account_type": "github", "account_id": "gh-1"})
        profile_id = create_resp.json()["id"]

        response = client.patch(f"/api/profiles/{profile_id}", json={
            "display_name": "Updated Name",
            "is_active": False,
        })
        assert response.status_code == 200
        data = response.json()
        assert data["display_name"] == "Updated Name"
        assert data["is_active"] is False


class TestAccessibilityAPI:
    def test_get_accessibility(self, client):
        # First ensure demo user exists
        client.get("/api/profiles/me")
        response = client.get("/api/accessibility")
        assert response.status_code == 200
        data = response.json()
        assert "reduced_motion" in data
        assert "high_contrast" in data
        assert "theme" in data

    def test_update_accessibility(self, client):
        # First ensure demo user exists
        client.get("/api/profiles/me")
        response = client.patch("/api/accessibility", json={
            "reduced_motion": True,
            "high_contrast": True,
            "theme": "dark",
            "font_size": 16,
        })
        assert response.status_code == 200
        data = response.json()
        assert data["reduced_motion"] is True
        assert data["high_contrast"] is True
        assert data["theme"] == "dark"
        assert data["font_size"] == 16