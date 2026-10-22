# Changelog

## 1.0.0 — work-in-progress checkpoint

Partial code published for continued development. Known issues: STATUS.md.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-22

### Added
- FastAPI backend with SQLite/SQLAlchemy persistence
- React + TypeScript + Vite frontend with Tailwind CSS
- Docker Compose with backend, frontend, and Keycloak services
- Issue tracking API: CRUD, pagination, filtering, search, statistics
- Usage analytics API: recording, aggregation, model breakdown, daily trends
- Multi-account profile management: create, switch, edit, MCP config
- Accessibility settings: theme, reduced motion, high contrast, screen reader, font size, update interval
- Demo mode for local development (no auth required)
- Health check endpoint
- Comprehensive backend tests (pytest)
- Frontend component tests (vitest + testing-library)
- Responsive UI with sidebar navigation, header, modals, tables
- Dark/light/system theme with persistence
- Accessibility-first components (ARIA, focus management, keyboard navigation)

### Security
- OIDC-ready architecture with Keycloak integration
- Encrypted token storage (production)
- HttpOnly cookie session design (planned)
- CSRF protection (planned)
- Input validation on all endpoints

### Infrastructure
- Non-root Docker users
- Health checks for all services
- .dockerignore for both services
- Nginx reverse proxy config for frontend
- Environment-based configuration

## [Unreleased]

### Planned
- Real LLM integration for issue classification
- Semantic similarity with embeddings
- WebSocket live updates
- Full OIDC authentication flow
- Audit logging
- Export/import functionality
- CI/CD pipeline