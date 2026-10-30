# Product development plan

Each round completes one feature or repair. Future items are planned, not implemented claims.

## Current round

project-skeleton

## Roadmap

### project-skeleton — Project skeleton with FastAPI backend and React frontend

Status: done

Acceptance:
- FastAPI app runs on localhost:8000 with /health endpoint
- React + TypeScript + Vite frontend builds and serves on localhost:5173
- Docker Compose with backend, frontend, and Keycloak services
- SQLite persistence with SQLAlchemy models
- Basic OIDC authentication flow with Keycloak

Implementation: `backend/app/main.py`, `backend/app/core/config.py`, `backend/app/core/database.py`, `backend/app/models/__init__.py`, `backend/app/api/__init__.py`, `backend/requirements.txt`, `frontend/package.json`, `frontend/src/main.tsx`, `frontend/src/App.tsx`, `frontend/src/api/client.ts`, `compose.yaml`, `Dockerfile.backend`, `Dockerfile.frontend`, `.env.example`

Tests: `backend/tests/test_api.py`, `frontend/src/__tests__/App.test.tsx`

### issue-tracking — Issue tracking domain engine with AI/ML classification

Status: in_progress

Acceptance:
- Create, list, search, filter issues with pagination
- AI-powered issue classification (bug/feature/enhancement) using LLM
- Issue similarity detection to find duplicates
- Priority scoring based on keywords, comments, engagement

Implementation: `backend/app/services/classifier.py`, `backend/app/services/__init__.py`, `backend/app/api/__init__.py`, `backend/app/models/__init__.py`, `frontend/src/api/client.ts`, `frontend/src/hooks/useApi.ts`, `frontend/src/pages/Issues.tsx`, `frontend/src/types/index.ts`

Tests: `backend/tests/test_api.py`

### usage-analytics — Usage analytics dashboard with limit monitoring

Status: planned

Acceptance:
- Track API usage over time with persistent storage
- Visual dashboard showing usage trends
- Alert when approaching subscription limits
- Export usage data as CSV/JSON

### multi-account — Multi-account profile management

Status: planned

Acceptance:
- Add/switch between multiple Claude accounts
- Separate conversation history per account
- Distinct MCP server configurations per profile
- Visual account indicator in UI

### accessibility-fixes — Terminal accessibility improvements (anti-flicker)

Status: planned

Acceptance:
- In-place status updates without full buffer redraw
- Screen reader compatible status announcements
- Reduced motion mode for animations
- High contrast theme option

