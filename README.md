# TransitOps

TransitOps is a smart transport operations platform for managing vehicles, drivers, trips, maintenance, fuel logs, expenses, and reports in one place.

## Features

- Vehicle registry with status tracking and lifecycle controls
- Driver management with license and safety checks
- Trip workflow with draft, dispatch, complete, and cancel states
- Maintenance logs with automatic vehicle status updates
- Fuel and expense tracking with operational cost reporting
- KPI dashboard and analytics for fleet visibility
- Role-based access control for operational and financial workflows

## Proposed Work

- Set up the FastAPI backend with PostgreSQL and auth integration
- Build the Next.js frontend with dashboard, CRUD pages, and reports
- Add database migrations, seed data, and validation rules
- Implement trip state transitions and business-rule enforcement
- Add Docker-based local development and deployment support

## Tech Stack

- Frontend: Next.js 16, React, Tailwind CSS v4
- Backend: FastAPI, Python 3.13, SQLAlchemy, Pydantic
- Database: PostgreSQL 18
- Auth: BetterAuth
- Tooling: Docker, Docker Compose, Playwright, Pytest

## How to Run

### With Docker

```bash
docker compose up --build
```

### Local Development

```bash
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd ../frontend
npm install
npm run dev
```
