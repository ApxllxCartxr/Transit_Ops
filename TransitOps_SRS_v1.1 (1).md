# Software Requirements Specification (SRS)
## TransitOps: Smart Transport Operations Platform

---

| Field | Value |
|---|---|
| **Project Name** | TransitOps |
| **Organization** | Odoo Hackathon |
| **Document Version** | 1.1 (validated & tech-refreshed against problem statement, July 2026) |
| **Document Type** | Software Requirements Specification |
| **Duration** | 8 Hours |
| **Team Size** | 4 (2 Backend, 2 Frontend) |
| **Tech Stack** | Next.js 16 (App Router), FastAPI, PostgreSQL 18, BetterAuth |

> **v1.1 changelog:** Upgraded Next.js 14→16 and PostgreSQL 16→18 (both were two major versions behind current stable as of mid-2026); moved Tailwind config to v4's CSS-first `@theme` model; pinned Node.js and Python versions; corrected Dark Mode from mandatory to bonus to match the source problem statement's §7/§8 split; scoped the "total operational cost" formula back to Fuel+Maintenance per §3.7 (with Expenses as a clearly separate, additional metric); defined the "Drivers On Duty" KPI; resolved the vehicle-region vs. trip-region conflict; and flagged a Maintenance/Expense "Repair" category double-counting risk as a new edge case.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [System Architecture](#3-system-architecture)
4. [Technology Stack & Justification](#4-technology-stack--justification)
5. [Functional Requirements](#5-functional-requirements)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [Database Design](#7-database-design)
8. [API Design](#8-api-design)
9. [Frontend Design & UX](#9-frontend-design--ux)
10. [Business Rules & Edge Cases](#10-business-rules--edge-cases)
11. [Security Requirements](#11-security-requirements)
12. [Team Work Distribution](#12-team-work-distribution)
13. [Testing & Debugging Strategy](#13-testing--debugging-strategy)
14. [Deliverables & Timeline](#14-deliverables--timeline)

---

## 1. Introduction

### 1.1 Purpose
This Software Requirements Specification (SRS) document provides a comprehensive description of **TransitOps**, a centralized transport operations platform designed to digitize the complete lifecycle of fleet management. This document is intended for the 4-member development team, evaluators, and stakeholders.

### 1.2 Scope
TransitOps enables logistics organizations to manage vehicles, drivers, trips, maintenance, fuel logs, and operational expenses through a unified, role-based web application. The system enforces business rules, automates status transitions, and provides real-time operational insights via a KPI dashboard and analytics module.

### 1.3 Definitions & Acronyms
| Term | Definition |
|---|---|
| **RBAC** | Role-Based Access Control |
| **KPI** | Key Performance Indicator |
| **ROI** | Return on Investment |
| **CRUD** | Create, Read, Update, Delete |
| **ORM** | Object-Relational Mapping |
| **SSR** | Server-Side Rendering |
| **JWT** | JSON Web Token |
| **FSM** | Finite State Machine |

---

## 2. Overall Description

### 2.1 Product Perspective
TransitOps is a **greenfield, self-contained web application** deployed as a decoupled system: a Next.js 16 frontend consumes a FastAPI backend, which persists data to PostgreSQL 18. Authentication is handled by BetterAuth, and the system is designed to minimize reliance on paid external APIs.

### 2.2 User Classes and Characteristics

| Role | Primary Responsibilities | Access Level |
|---|---|---|
| **Fleet Manager** | Vehicle lifecycle, maintenance oversight, operational efficiency | Full access to Vehicles, Maintenance, Reports |
| **Dispatcher / Driver Coordinator** | Trip creation, vehicle-driver assignment, dispatch monitoring | Full access to Trips; Read-only on Vehicles/Drivers |
| **Safety Officer** | License validity, compliance, safety scores | Full access to Drivers; Read-only on Trips |
| **Financial Analyst** | Expense review, fuel consumption, cost analysis, ROI | Full access to Expenses, Fuel Logs, Reports |
| **Admin** *(implicit)* | Manages users and roles | Full system access |

> **Note on "Driver" role:** The original brief lists "Driver" as a user who *creates trips*. This appears to be a mislabel — dispatchers/coordinators create trips, while actual drivers execute them. We recommend renaming this to **Dispatcher** for logical correctness. A separate `drivers` table (non-login entities) represents the physical drivers being dispatched.

### 2.3 Assumptions & Dependencies
- Users have modern browsers (Chrome/Firefox/Edge, last 2 versions).
- The 8-hour scope excludes real-time GPS tracking, mobile apps, and multi-tenancy.
- Currency and units follow a single organization-wide standard (e.g., INR, kilometers, liters).
- **Runtime pins (current as of July 2026):** Node.js 22 LTS, Python 3.13, Next.js 16.2.x, PostgreSQL 18.x, BetterAuth 1.6.x, Tailwind CSS 4.3.x. Pin exact patch versions in `package.json`/`pyproject.toml` at project kickoff rather than trailing `latest`, since this stack ships frequent security releases.

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                        │
└─────────────────────────────────────────────────────────────┘
                            │  HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Next.js 16 (App Router, Turbopack default bundler)          │
│  - Server Components + Client Components                    │
│  - BetterAuth session handling (proxy.ts, formerly           │
│    middleware.ts — renamed in Next.js 16)                   │
│  - TanStack Query for server state                          │
│  - Tailwind CSS v4 (CSS-first @theme config) + shadcn/ui     │
└─────────────────────────────────────────────────────────────┘
                            │  REST (JSON) + Bearer Token
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  FastAPI (Python 3.11+)                                     │
│  ├─ Routers (vehicles, drivers, trips, maintenance, ...)    │
│  ├─ Services (business logic, FSM transitions)              │
│  ├─ Repositories (SQLAlchemy ORM)                           │
│  ├─ Schemas (Pydantic v2)                                   │
│  ├─ Auth middleware (verifies BetterAuth session)           │
│  └─ RBAC dependency injection                               │
└─────────────────────────────────────────────────────────────┘
                            │  asyncpg
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  PostgreSQL 18                                               │
│  - Normalized schema (3NF)                                  │
│  - Check constraints, triggers, partial indexes             │
│  - Row-level audit columns                                  │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Modularity Principles
The system is organized into **bounded contexts**, each with its own router, service, repository, and schema module:

```
backend/
├── app/
│   ├── core/              # config, security, db session, exceptions
│   ├── auth/              # BetterAuth integration, RBAC dependencies
│   ├── modules/
│   │   ├── vehicles/      # router.py, service.py, repository.py, schemas.py, models.py
│   │   ├── drivers/
│   │   ├── trips/
│   │   ├── maintenance/
│   │   ├── fuel_expenses/
│   │   ├── reports/
│   │   └── dashboard/
│   ├── shared/            # enums, utils, validators, FSM
│   └── main.py

frontend/
├── app/                   # Next.js App Router
│   ├── globals.css        # Tailwind v4 entry point — @import "tailwindcss";
│   │                      #   @theme { ... } design tokens live here (CSS-first
│   │                      #   config; no tailwind.config.ts needed in v4)
│   ├── proxy.ts           # renamed from middleware.ts in Next.js 16
│   ├── (auth)/
│   ├── (dashboard)/
│   │   ├── vehicles/
│   │   ├── drivers/
│   │   ├── trips/
│   │   ├── maintenance/
│   │   ├── expenses/
│   │   └── reports/
├── components/
│   ├── ui/                # shadcn primitives
│   ├── forms/
│   ├── tables/
│   └── charts/
├── lib/                   # api client, auth, utils, rbac guards
├── hooks/
└── types/
```
> **Note on Tailwind v4:** unlike v3, there is no `tailwind.config.ts`. Theme tokens (colors, spacing, fonts) are declared with `@theme` directly in `globals.css`, and content scanning is automatic. If any team member is following an older Tailwind v3 tutorial, flag this early — it's the most common source of "my styles aren't applying" confusion during the hackathon.

Each module is **independently deployable in logic** — one team member can work on `trips` while another works on `maintenance` without merge conflicts.

---

## 4. Technology Stack & Justification

| Layer | Choice | Rationale |
|---|---|---|
| **Runtime (frontend)** | Node.js 22 LTS | Next.js 16 requires Node ≥20.9; 22 is the current LTS line in 2026 |
| **Runtime (backend)** | Python 3.13 | Current stable CPython; FastAPI/Pydantic/SQLAlchemy all fully support it |
| **Frontend Framework** | **Next.js 16** (App Router) | *Upgraded from 14 — 14 is now two majors behind stable.* Turbopack is the default bundler (2–5x faster builds), Cache Components (`"use cache"`) give explicit opt-in caching instead of 14's implicit caching (fewer stale-dashboard surprises), React 19.2, and `proxy.ts` replaces `middleware.ts` |
| **UI Library** | shadcn/ui + Radix + **Tailwind CSS v4** | Free, unstyled, accessible, no runtime cost. *v4's Rust-based Oxide engine and CSS-first `@theme` config remove the old `tailwind.config.ts` + PostCSS chain entirely — less to set up in an 8-hour window, not more* |
| **Charts** | Recharts *(recommended)* or Chart.js | Free, tree-shakeable, React-native |
| **Client State** | Zustand + TanStack Query | Minimal boilerplate; better than Redux for 8-hour scope |
| **Form Handling** | React Hook Form + Zod | Type-safe validation shared with backend contracts |
| **Backend Framework** | FastAPI | Async, automatic OpenAPI docs, Pydantic v2 validation — still the standard idiomatic choice in 2026, no upgrade needed |
| **ORM** | SQLAlchemy 2.0 (async) + Alembic | Industry standard, migration support, still current major |
| **Auth** | **BetterAuth 1.6.x** | Modern, framework-agnostic, session + JWT, self-hosted — still the strongest self-hosted pick for Next.js in 2026, no change needed |
| **Database** | **PostgreSQL 18** | *Upgraded from 16 — 16 is now two majors behind stable (18.4 is current; 19 is in beta).* ACID, rich constraints, JSONB, `io_uring` async I/O and better skip-scan index performance in 18 |
| **PDF Export** *(bonus)* | WeasyPrint (Python) | Free, HTML→PDF, no external API |
| **CSV Export** | Python `csv` module | Built-in, mandatory per §3.8 |
| **Email (bonus)** | SMTP via `aiosmtplib` + local MailHog for dev | No paid API (SendGrid/Mailgun avoided) |
| **Scheduling (bonus)** | APScheduler (in-process) | No external cron/Redis dependency for 8h scope |
| **Testing** | Pytest + Playwright | Free, comprehensive |
| **Containerization** | Docker + Docker Compose | Reproducible dev environments |

### 4.1 Alternatives Considered / Rejected
- **NextAuth.js** — Rejected in favor of BetterAuth (per requirement); BetterAuth has cleaner RBAC extensibility.
- **Prisma** — Rejected because FastAPI + SQLAlchemy is more idiomatic; Prisma would require a Node sidecar.
- **MongoDB** — Rejected: transport operations are highly relational (FKs, constraints, joins for reports).
- **Firebase / Supabase** — Rejected: reduces control over business rules and RBAC granularity.
- **Auth0 / Clerk** — Rejected: paid, external dependency.

---

## 5. Functional Requirements

### 5.1 Authentication (FR-AUTH)
| ID | Requirement |
|---|---|
| FR-AUTH-01 | Users authenticate via email + password using BetterAuth. |
| FR-AUTH-02 | Passwords hashed with bcrypt (cost factor ≥ 12) — handled by BetterAuth. |
| FR-AUTH-03 | Sessions expire after 24h of inactivity; sliding refresh supported. |
| FR-AUTH-04 | All API routes except `/auth/*` and `/health` require a valid session. |
| FR-AUTH-05 | RBAC enforced at both frontend (route guards) and backend (dependency injection). |
| FR-AUTH-06 | Failed login attempts rate-limited (5 attempts / 15 min per IP). |

### 5.2 Dashboard (FR-DASH)
| ID | Requirement |
|---|---|
| FR-DASH-01 | Display KPIs: Active Vehicles, Available Vehicles, In-Shop Vehicles, Active Trips, Pending Trips, On-Duty Drivers, Fleet Utilization %. |
| FR-DASH-01a | **On-Duty Drivers** = count of drivers with `status IN ('Available', 'OnTrip')`, i.e. every driver except `OffDuty`/`Suspended`. *(Clarification: the brief's driver status enum has no literal "On Duty" value, so this is defined here rather than left implicit.)* |
| FR-DASH-02 | Fleet Utilization = `(Vehicles On Trip / Total Non-Retired Vehicles) × 100`. |
| FR-DASH-03 | Filters: vehicle type, status, region. Region is sourced from `vehicles.region` (the vehicle's home depot/base) — **not** derived from trip source/destination, which can differ per trip and would make the filter unstable. |
| FR-DASH-04 | KPI cards refresh on mount and via manual refresh button (no polling in 8h scope). |
| FR-DASH-05 | Charts (bonus): Trips per day (7d), Fuel cost trend (30d), Cost breakdown per vehicle. |

### 5.3 Vehicle Registry (FR-VEH)
| ID | Requirement |
|---|---|
| FR-VEH-01 | CRUD operations on vehicles with fields: registration_number (unique), name, model, type, max_load_kg, odometer_km, acquisition_cost, status, acquired_at. |
| FR-VEH-02 | `status ∈ {Available, OnTrip, InShop, Retired}`. |
| FR-VEH-03 | Registration number is validated at DB level with UNIQUE constraint and application-level regex. |
| FR-VEH-04 | Retired vehicles cannot be un-retired (soft-lock, per business rule); only Admin/FleetManager may override via explicit "Reinstate" action *(edge case handled)*. |
| FR-VEH-05 | Odometer is monotonically non-decreasing — enforced by trigger. |

### 5.4 Driver Management (FR-DRV)
| ID | Requirement |
|---|---|
| FR-DRV-01 | CRUD on drivers: name, license_number (unique), license_category, license_expiry, contact, safety_score (0–100), status. |
| FR-DRV-02 | `status ∈ {Available, OnTrip, OffDuty, Suspended}`. |
| FR-DRV-03 | Drivers with `license_expiry < CURRENT_DATE` are visually flagged and excluded from dispatch selection. |
| FR-DRV-04 | Safety score is manually editable by Safety Officer; historical changes are audited. |

### 5.5 Trip Management (FR-TRIP)
| ID | Requirement |
|---|---|
| FR-TRIP-01 | Create trip with: source, destination, vehicle_id, driver_id, cargo_weight_kg, planned_distance_km. |
| FR-TRIP-02 | Trip FSM: `Draft → Dispatched → Completed`; also `Draft → Cancelled`, `Dispatched → Cancelled`. |
| FR-TRIP-03 | Vehicle & driver dropdowns show ONLY entities eligible per business rules (see §10). |
| FR-TRIP-04 | On dispatch: vehicle.status = OnTrip, driver.status = OnTrip, trip.dispatched_at = now(). |
| FR-TRIP-05 | On completion: user enters final_odometer, fuel_consumed_liters, actual_distance_km; vehicle & driver → Available. |
| FR-TRIP-06 | On cancellation of dispatched trip: vehicle & driver → Available; trip.cancelled_at recorded. |
| FR-TRIP-07 | Trip transitions are transactional — either all side-effects succeed or none do. |

### 5.6 Maintenance (FR-MNT)
| ID | Requirement |
|---|---|
| FR-MNT-01 | Create maintenance log with vehicle_id, type (Oil Change, Tire, Repair, Inspection, Other), description, cost, opened_at, closed_at (nullable). |
| FR-MNT-02 | Opening a maintenance record (closed_at IS NULL) sets vehicle.status = InShop. |
| FR-MNT-03 | Closing a maintenance record sets vehicle.status = Available (unless Retired). |
| FR-MNT-04 | A vehicle cannot have >1 open maintenance record at once (partial unique index). |
| FR-MNT-05 | Cannot open maintenance on a vehicle currently OnTrip *(edge case)*. |

### 5.7 Fuel & Expense Management (FR-FUEL)
| ID | Requirement |
|---|---|
| FR-FUEL-01 | Fuel logs: vehicle_id, trip_id (nullable), liters, cost_per_liter, total_cost (generated column), logged_at, odometer_at_fill. |
| FR-FUEL-02 | Expenses: vehicle_id (nullable), trip_id (nullable), category (Toll, Parking, Fine, Repair, Other), amount, incurred_at. |
| FR-FUEL-03 | **Operational Cost** per vehicle (per §3.7 of the source brief) = `SUM(fuel.total_cost) + SUM(maintenance.cost)`. This is the figure used everywhere the brief says "operational cost," including as an input to Vehicle ROI (FR-RPT-03). |
| FR-FUEL-03a | **Total Cost incl. Incidentals** *(additional metric, beyond §3.7 — clearly labeled as a separate figure, not a redefinition of "Operational Cost")* = `Operational Cost + SUM(expenses.amount)`. Shown on the Fuel & Expenses page as a secondary total so tolls/fines/parking are visible without silently changing the number the grading brief specifies. |

### 5.8 Reports & Analytics (FR-RPT)
| ID | Requirement |
|---|---|
| FR-RPT-01 | Fuel Efficiency = `SUM(actual_distance_km) / SUM(fuel_consumed_liters)` per vehicle, filterable by date range. |
| FR-RPT-02 | Fleet Utilization report — daily average over a range. |
| FR-RPT-03 | Vehicle ROI = `(Revenue − (Maintenance + Fuel)) / Acquisition Cost`. Revenue derived from a `revenue` column on completed trips (see §7). |
| FR-RPT-04 | CSV export for every report (mandatory). |
| FR-RPT-05 | PDF export via WeasyPrint (optional / bonus). |

---

## 6. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-PERF-01 | Performance | Dashboard KPIs must load in <500ms on a fleet of 500 vehicles / 10k trips (use materialized views or indexed queries). |
| NFR-PERF-02 | Performance | List endpoints paginated (default 20, max 100). |
| NFR-PERF-03 | Performance | N+1 queries prevented via `selectinload`/`joinedload` in SQLAlchemy. |
| NFR-SEC-01 | Security | All traffic over HTTPS in production. |
| NFR-SEC-02 | Security | Pydantic input validation on every endpoint. |
| NFR-SEC-03 | Security | Parameterized queries only — no raw string SQL. |
| NFR-SEC-04 | Security | CORS restricted to frontend origin. |
| NFR-SEC-05 | Security | CSRF protection on session cookies (BetterAuth default). |
| NFR-USA-01 | Usability | Responsive down to 375px width; core tables scroll horizontally on mobile. |
| NFR-USA-02 | Usability | Toast notifications for every mutation (success/error). |
| NFR-USA-03 | Usability | Loading skeletons on all data tables. |
| NFR-USA-04 | Usability | Dark mode toggle (**bonus** — per source problem statement §8) using Tailwind v4 `dark:` variants + system preference. |
| NFR-SCAL-01 | Scalability | Stateless FastAPI workers — horizontally scalable behind a load balancer. |
| NFR-SCAL-02 | Scalability | Schema supports multi-tenancy migration path via optional `organization_id` (nullable in v1). |
| NFR-SCAL-03 | Scalability | Business logic in service layer, not in routers — enables reuse from CLI/jobs. |

---

## 7. Database Design

> ⚠️ **This section carries the highest evaluation weight. It is intentionally exhaustive.**

### 7.1 Design Principles
1. **Third Normal Form (3NF)** with deliberate, documented denormalizations (e.g., `trips.total_cost_cached`).
2. **Enums as PostgreSQL native ENUM types** for status columns — enforces domain integrity at DB level.
3. **All monetary fields** use `NUMERIC(12, 2)` — never `FLOAT` (avoids rounding errors).
4. **All timestamps** are `TIMESTAMPTZ` (UTC) — client renders in local timezone.
5. **Soft-delete via `deleted_at`** on entities that must retain audit history (Vehicles, Drivers, Trips). Hard-delete only for Fuel/Expense corrections within a 24h window.
6. **Audit columns** (`created_at`, `updated_at`, `created_by`, `updated_by`) on every mutable table.
7. **CHECK constraints** encode business rules that cannot be bypassed by application bugs.
8. **Partial unique indexes** for conditional uniqueness (e.g., one open maintenance per vehicle).

### 7.2 Enum Types
```sql
CREATE TYPE vehicle_status   AS ENUM ('Available', 'OnTrip', 'InShop', 'Retired');
CREATE TYPE driver_status    AS ENUM ('Available', 'OnTrip', 'OffDuty', 'Suspended');
CREATE TYPE trip_status      AS ENUM ('Draft', 'Dispatched', 'Completed', 'Cancelled');
CREATE TYPE maintenance_type AS ENUM ('OilChange', 'Tire', 'Repair', 'Inspection', 'Other');
CREATE TYPE expense_category AS ENUM ('Toll', 'Parking', 'Fine', 'Repair', 'Other');
CREATE TYPE user_role        AS ENUM ('Admin', 'FleetManager', 'Dispatcher', 'SafetyOfficer', 'FinancialAnalyst');
```

### 7.3 Entity-Relationship Overview

```
users ──< user_roles >── roles                (many-to-many; supports multi-role users)
  │
  └──────── audit fk (created_by / updated_by) on every table

vehicles ──1:N── trips ──N:1── drivers
    │             │
    │             └──1:N── fuel_logs
    │             └──1:N── expenses
    │
    ├──1:N── maintenance_logs
    ├──1:N── fuel_logs
    └──1:N── expenses

drivers ──1:N── trips
```

### 7.4 Table Definitions

#### 7.4.1 `users`
Managed by BetterAuth; we extend it with an application-level profile.
```sql
CREATE TABLE users (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email          CITEXT UNIQUE NOT NULL,
    password_hash  TEXT NOT NULL,       -- managed by BetterAuth
    full_name      VARCHAR(120) NOT NULL,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at  TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_email ON users(email);
```

#### 7.4.2 `roles` & `user_roles`
```sql
CREATE TABLE roles (
    id          SERIAL PRIMARY KEY,
    name        user_role UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE user_roles (
    user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id  INT  NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    granted_by UUID REFERENCES users(id),
    PRIMARY KEY (user_id, role_id)
);
```
> **Design decision:** Many-to-many rather than a single `users.role` column. A Fleet Manager may also be a Financial Analyst in small organizations. Scales to permission-level RBAC later without schema break.

#### 7.4.3 `vehicles`
```sql
CREATE TABLE vehicles (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_number  VARCHAR(20) UNIQUE NOT NULL,
    name                 VARCHAR(80)  NOT NULL,
    model                VARCHAR(80)  NOT NULL,
    vehicle_type         VARCHAR(40)  NOT NULL,   -- Truck, Van, Bike, ...
    max_load_kg          NUMERIC(10,2) NOT NULL CHECK (max_load_kg > 0),
    odometer_km          NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (odometer_km >= 0),
    acquisition_cost     NUMERIC(12,2) NOT NULL CHECK (acquisition_cost >= 0),
    acquired_at          DATE NOT NULL,
    status               vehicle_status NOT NULL DEFAULT 'Available',
    region               VARCHAR(60),
    deleted_at           TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by           UUID REFERENCES users(id),
    updated_by           UUID REFERENCES users(id)
);
CREATE INDEX idx_vehicles_status       ON vehicles(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_vehicles_type_region  ON vehicles(vehicle_type, region);
```

#### 7.4.4 `drivers`
```sql
CREATE TABLE drivers (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name        VARCHAR(120) NOT NULL,
    license_number   VARCHAR(30) UNIQUE NOT NULL,
    license_category VARCHAR(10) NOT NULL,        -- A, B, C, HMV, LMV, ...
    license_expiry   DATE NOT NULL,
    contact_number   VARCHAR(20) NOT NULL,
    safety_score     SMALLINT NOT NULL DEFAULT 100
                        CHECK (safety_score BETWEEN 0 AND 100),
    status           driver_status NOT NULL DEFAULT 'Available',
    deleted_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by       UUID REFERENCES users(id),
    updated_by       UUID REFERENCES users(id)
);
CREATE INDEX idx_drivers_status         ON drivers(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_drivers_license_expiry ON drivers(license_expiry);
```

#### 7.4.5 `trips`
```sql
CREATE TABLE trips (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_code             VARCHAR(20) UNIQUE NOT NULL,   -- human-readable, e.g. TRP-2026-000123
    vehicle_id            UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
    driver_id             UUID NOT NULL REFERENCES drivers(id)  ON DELETE RESTRICT,
    source                VARCHAR(120) NOT NULL,
    destination           VARCHAR(120) NOT NULL,
    cargo_weight_kg       NUMERIC(10,2) NOT NULL CHECK (cargo_weight_kg > 0),
    planned_distance_km   NUMERIC(10,2) NOT NULL CHECK (planned_distance_km > 0),
    actual_distance_km    NUMERIC(10,2) CHECK (actual_distance_km >= 0),
    start_odometer_km     NUMERIC(12,2),
    end_odometer_km       NUMERIC(12,2),
    fuel_consumed_liters  NUMERIC(10,2) CHECK (fuel_consumed_liters >= 0),
    revenue               NUMERIC(12,2) DEFAULT 0 CHECK (revenue >= 0),
    status                trip_status NOT NULL DEFAULT 'Draft',
    dispatched_at         TIMESTAMPTZ,
    completed_at          TIMESTAMPTZ,
    cancelled_at          TIMESTAMPTZ,
    cancellation_reason   TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by            UUID REFERENCES users(id),
    updated_by            UUID REFERENCES users(id),

    -- Logical invariants
    CONSTRAINT chk_trip_odometer      CHECK (end_odometer_km IS NULL OR end_odometer_km >= start_odometer_km),
    CONSTRAINT chk_trip_completed_fields CHECK (
        status <> 'Completed' OR (
            completed_at IS NOT NULL AND
            actual_distance_km IS NOT NULL AND
            end_odometer_km IS NOT NULL AND
            fuel_consumed_liters IS NOT NULL
        )
    ),
    CONSTRAINT chk_trip_dispatched_fields CHECK (
        status <> 'Dispatched' OR dispatched_at IS NOT NULL
    ),
    CONSTRAINT chk_trip_cancelled_fields CHECK (
        status <> 'Cancelled' OR cancelled_at IS NOT NULL
    )
);
CREATE INDEX idx_trips_status      ON trips(status);
CREATE INDEX idx_trips_vehicle     ON trips(vehicle_id);
CREATE INDEX idx_trips_driver      ON trips(driver_id);
CREATE INDEX idx_trips_created     ON trips(created_at DESC);

-- CRITICAL: enforce "one active trip per vehicle/driver" at DB level
CREATE UNIQUE INDEX uq_trip_active_vehicle
    ON trips(vehicle_id)
    WHERE status = 'Dispatched';

CREATE UNIQUE INDEX uq_trip_active_driver
    ON trips(driver_id)
    WHERE status = 'Dispatched';
```
> **Why partial unique indexes?** They enforce business rule §10 (no double-booking) at the storage layer, even if the application has a bug. This is the single most important design choice for logical correctness.

#### 7.4.6 `maintenance_logs`
```sql
CREATE TABLE maintenance_logs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id   UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
    m_type       maintenance_type NOT NULL,
    description  TEXT,
    cost         NUMERIC(12,2) NOT NULL CHECK (cost >= 0),
    opened_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at    TIMESTAMPTZ,
    odometer_at  NUMERIC(12,2),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by   UUID REFERENCES users(id),
    CONSTRAINT chk_close_after_open CHECK (closed_at IS NULL OR closed_at >= opened_at)
);
CREATE INDEX idx_maint_vehicle ON maintenance_logs(vehicle_id);

-- Only one OPEN maintenance per vehicle
CREATE UNIQUE INDEX uq_open_maint_per_vehicle
    ON maintenance_logs(vehicle_id)
    WHERE closed_at IS NULL;
```

#### 7.4.7 `fuel_logs`
```sql
CREATE TABLE fuel_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id      UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
    trip_id         UUID REFERENCES trips(id) ON DELETE SET NULL,
    liters          NUMERIC(10,2) NOT NULL CHECK (liters > 0),
    cost_per_liter  NUMERIC(8,2)  NOT NULL CHECK (cost_per_liter > 0),
    total_cost      NUMERIC(12,2) GENERATED ALWAYS AS (liters * cost_per_liter) STORED,
    odometer_at_fill NUMERIC(12,2),
    logged_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by      UUID REFERENCES users(id)
);
CREATE INDEX idx_fuel_vehicle_date ON fuel_logs(vehicle_id, logged_at DESC);
CREATE INDEX idx_fuel_trip         ON fuel_logs(trip_id);
```

#### 7.4.8 `expenses`
```sql
CREATE TABLE expenses (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id   UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    trip_id      UUID REFERENCES trips(id) ON DELETE SET NULL,
    category     expense_category NOT NULL,
    amount       NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    description  TEXT,
    incurred_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by   UUID REFERENCES users(id),
    CONSTRAINT chk_expense_has_owner CHECK (vehicle_id IS NOT NULL OR trip_id IS NOT NULL)
);
CREATE INDEX idx_expenses_vehicle ON expenses(vehicle_id);
CREATE INDEX idx_expenses_trip    ON expenses(trip_id);
```

#### 7.4.9 `audit_log` (bonus, recommended)
```sql
CREATE TABLE audit_log (
    id           BIGSERIAL PRIMARY KEY,
    entity_type  VARCHAR(40) NOT NULL,
    entity_id    UUID NOT NULL,
    action       VARCHAR(20) NOT NULL,   -- INSERT / UPDATE / DELETE / STATUS_CHANGE
    changes      JSONB,
    actor_id     UUID REFERENCES users(id),
    occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
```

### 7.5 Triggers (Business-Rule Enforcement at DB Level)

```sql
-- 1. Odometer must never decrease on a vehicle
CREATE OR REPLACE FUNCTION trg_vehicle_odometer_monotonic()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.odometer_km < OLD.odometer_km THEN
        RAISE EXCEPTION 'Odometer cannot decrease: % -> %', OLD.odometer_km, NEW.odometer_km;
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER vehicle_odometer_check
BEFORE UPDATE ON vehicles
FOR EACH ROW EXECUTE FUNCTION trg_vehicle_odometer_monotonic();

-- 2. Auto-update `updated_at`
CREATE OR REPLACE FUNCTION trg_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
-- attach to vehicles, drivers, trips, maintenance_logs
```

> **Note:** Status transitions themselves are enforced in the **service layer** (Python FSM) rather than triggers, so error messages surface cleanly to the frontend. Triggers guard against direct DB manipulation.

### 7.6 Sample Materialized View (for dashboard performance)
```sql
CREATE MATERIALIZED VIEW mv_vehicle_costs AS
SELECT
    v.id AS vehicle_id,
    v.registration_number,
    COALESCE(SUM(f.total_cost), 0)  AS total_fuel_cost,
    COALESCE(SUM(m.cost), 0)        AS total_maintenance_cost,
    COALESCE(SUM(e.amount), 0)      AS total_other_expenses,
    COALESCE(SUM(t.revenue) FILTER (WHERE t.status = 'Completed'), 0) AS total_revenue
FROM vehicles v
LEFT JOIN fuel_logs        f ON f.vehicle_id = v.id
LEFT JOIN maintenance_logs m ON m.vehicle_id = v.id
LEFT JOIN expenses         e ON e.vehicle_id = v.id
LEFT JOIN trips            t ON t.vehicle_id = v.id
GROUP BY v.id, v.registration_number;

CREATE UNIQUE INDEX ON mv_vehicle_costs (vehicle_id);
-- Refresh on-demand after mutations, or scheduled every 5 min
```

---

## 8. API Design

### 8.1 Conventions
- Base URL: `/api/v1`
- All responses JSON; errors follow RFC 7807 Problem Details.
- Pagination via `?page=1&size=20`; response includes `total`, `page`, `size`.
- Filtering via query params: `?status=Available&type=Truck`.
- All mutations return the updated resource.

### 8.2 Endpoint Summary

| Method | Path | Roles | Purpose |
|---|---|---|---|
| POST   | `/auth/login`                     | Public | Login |
| POST   | `/auth/logout`                    | Auth   | Logout |
| GET    | `/auth/me`                        | Auth   | Current user + roles |
| GET    | `/dashboard/kpis`                 | All    | Dashboard KPIs |
| GET    | `/vehicles`                       | All    | List vehicles (paginated, filtered) |
| POST   | `/vehicles`                       | FleetMgr, Admin | Create vehicle |
| GET    | `/vehicles/{id}`                  | All    | Get vehicle |
| PATCH  | `/vehicles/{id}`                  | FleetMgr, Admin | Update vehicle |
| DELETE | `/vehicles/{id}`                  | Admin  | Soft-delete vehicle |
| GET    | `/drivers`                        | All    | List drivers |
| POST   | `/drivers`                        | SafetyOfficer, Admin | Create driver |
| PATCH  | `/drivers/{id}`                   | SafetyOfficer, Admin | Update driver |
| GET    | `/trips`                          | All    | List trips |
| POST   | `/trips`                          | Dispatcher, Admin | Create trip (Draft) |
| POST   | `/trips/{id}/dispatch`            | Dispatcher, Admin | Dispatch trip |
| POST   | `/trips/{id}/complete`            | Dispatcher, Admin | Complete trip |
| POST   | `/trips/{id}/cancel`              | Dispatcher, Admin | Cancel trip |
| GET    | `/maintenance`                    | FleetMgr, Admin | List maintenance logs |
| POST   | `/maintenance`                    | FleetMgr, Admin | Open maintenance |
| POST   | `/maintenance/{id}/close`         | FleetMgr, Admin | Close maintenance |
| GET    | `/fuel-logs`                      | All    | List fuel logs |
| POST   | `/fuel-logs`                      | Dispatcher, FinAnalyst, Admin | Create fuel log |
| GET    | `/expenses`                       | FinAnalyst, Admin | List expenses |
| POST   | `/expenses`                       | FinAnalyst, Admin | Create expense |
| GET    | `/reports/fuel-efficiency`        | FinAnalyst, FleetMgr, Admin | |
| GET    | `/reports/vehicle-roi`            | FinAnalyst, Admin | |
| GET    | `/reports/fleet-utilization`      | FleetMgr, Admin | |
| GET    | `/reports/{name}/export.csv`      | Same as report | CSV export |

### 8.3 Trip State Machine (implemented in `trips/service.py`)

```
                     ┌──────────┐
      create ───────▶│  Draft   │
                     └────┬─────┘
                          │ dispatch()
                          ▼
                     ┌──────────┐
                     │Dispatched│──── cancel() ──▶ Cancelled
                     └────┬─────┘
                          │ complete()
                          ▼
                     ┌──────────┐
                     │Completed │
                     └──────────┘
```
Illegal transitions raise `409 Conflict` with a machine-readable error code.

---

## 9. Frontend Design & UX

### 9.1 Layout
- **Shell:** persistent left sidebar (nav), top bar (user menu, dark-mode toggle, notifications).
- **Main area:** page-specific content — KPIs, tables, forms.
- **Breakpoints:** `sm 640 / md 768 / lg 1024 / xl 1280`. Sidebar collapses to a drawer below `md`.

### 9.2 Key Screens

| Screen | Components |
|---|---|
| **Login** | Centered card; email + password; role auto-detected from user record. |
| **Dashboard** | 7 KPI cards in a responsive grid; 2 charts (Trips 7d, Fuel cost 30d); filter bar. |
| **Vehicles** | Table with search, status/type filters, status pill badges, row actions (edit / retire / view). Slide-over drawer for create/edit. |
| **Drivers** | Table with expiring-license warning icons (yellow: <30d, red: expired). |
| **Trips** | Kanban view (Draft / Dispatched / Completed / Cancelled) + Table view toggle. |
| **Trip Create** | Multi-step form: Route → Cargo → Vehicle → Driver → Review. Vehicle & driver dropdowns show only *eligible* entities and disable ineligible ones with a tooltip explaining why. |
| **Maintenance** | Table grouped by vehicle; "Open" and "Close" buttons; cost input. |
| **Fuel & Expenses** | Two tabs; date-range filter; footer shows both Operational Cost (Fuel+Maintenance, FR-FUEL-03) and Total Cost incl. Incidentals (+Expenses, FR-FUEL-03a) as clearly separate figures. |
| **Reports** | Filter panel + chart + data table + CSV export button. |

### 9.3 Design System
- **Colors:** semantic tokens — `primary`, `success`, `warning`, `danger`, `muted`.
- **Status color map:**
  - Available / Completed → green
  - OnTrip / Dispatched → blue
  - InShop / OffDuty / Draft → amber
  - Retired / Suspended / Cancelled → red/gray
- **Typography:** Inter (self-hosted, no Google Fonts CDN in production).
- **Icons:** Lucide (open-source).
- **Accessibility:** WCAG AA color contrast; keyboard-navigable tables and forms; ARIA labels on icon buttons.

### 9.4 State Management
- **Server state:** TanStack Query — one query key per resource, auto-invalidation after mutation.
- **UI state:** Zustand for global (sidebar collapsed, dark mode) + `useState` for local.
- **Forms:** React Hook Form + Zod schemas mirroring backend Pydantic models.

---

## 10. Business Rules & Edge Cases

### 10.1 Business Rules (Restated with Enforcement Layer)

| # | Rule | Enforcement |
|---|---|---|
| BR-01 | Vehicle registration number must be unique | DB `UNIQUE` constraint |
| BR-02 | `Retired` or `InShop` vehicles must not appear in dispatch selection | Service-layer query filter + frontend guard |
| BR-03 | Drivers with expired license or `Suspended` cannot be assigned | Service check + partial index candidates excluded |
| BR-04 | Driver or vehicle already `OnTrip` cannot be re-assigned | **DB partial unique index** on `trips(vehicle_id) WHERE status='Dispatched'` |
| BR-05 | `cargo_weight_kg ≤ vehicle.max_load_kg` | Service-layer + Pydantic validator |
| BR-06 | Dispatch → vehicle & driver become `OnTrip` | Service transaction |
| BR-07 | Completion → vehicle & driver → `Available` | Service transaction |
| BR-08 | Cancellation of Dispatched → vehicle & driver → `Available` | Service transaction |
| BR-09 | Opening maintenance → vehicle → `InShop` | Service transaction |
| BR-10 | Closing maintenance → vehicle → `Available` (unless `Retired`) | Service transaction |

### 10.2 Edge Cases (Explicitly Handled)

| # | Edge Case | Resolution |
|---|---|---|
| EC-01 | Two dispatchers simultaneously dispatch the same vehicle | DB partial unique index → second request gets 409; frontend shows "Vehicle just became unavailable — refresh." |
| EC-02 | User tries to complete a trip that was never dispatched | FSM rejects transition → 409 with `code: "INVALID_TRIP_TRANSITION"`. |
| EC-03 | Driver's license expires mid-trip | Trip continues (already dispatched); dashboard flags it. Cannot dispatch new trips with expired driver. |
| EC-04 | Vehicle marked `Retired` while on trip | Blocked: cannot retire vehicles whose current status is `OnTrip`. Error 409. |
| EC-05 | Closing maintenance on a `Retired` vehicle | Maintenance closes, but vehicle stays `Retired` (BR-10 exception). |
| EC-06 | Fuel log with `odometer_at_fill < vehicle.odometer_km` | Rejected — odometer must be monotonic. |
| EC-07 | Completing a trip with `end_odometer < start_odometer` | CHECK constraint rejects. |
| EC-08 | Deleting a vehicle referenced by trips | `ON DELETE RESTRICT` → forbidden; use soft-delete (`deleted_at`). |
| EC-09 | User's role revoked mid-session | Backend RBAC re-checks roles on every request (roles cached ≤60s). |
| EC-10 | Negative cargo weight / distance / cost | CHECK constraints + Pydantic `gt=0`. |
| EC-11 | Cancelling a `Completed` trip | Rejected — completed trips are immutable. Requires an "adjustment" audit entry instead. |
| EC-12 | Race: driver assigned to Trip A (Draft) and Trip B (Draft), Trip A dispatched first | Trip B dispatch fails because driver is now `OnTrip` — DB index catches it. Trip B stays Draft. |
| EC-13 | Fleet utilization when all vehicles are Retired | Denominator excludes Retired → if zero, display "N/A" not `NaN%`. |
| EC-14 | ROI when acquisition_cost = 0 (donated vehicle) | Guard: return `null` and label "N/A". |
| EC-15 | Timezone mismatch — trip dispatched at 23:59 UTC shows as next day locally | All timestamps stored `TIMESTAMPTZ`; frontend formats via `Intl.DateTimeFormat`. |
| EC-16 | User uploads registration number with different casing | Store as-is; index is case-sensitive but validate normalized (e.g., uppercase) at input. |
| EC-17 | Large CSV export (10k+ rows) | Stream response with `StreamingResponse`, don't buffer in memory. |
| EC-18 | Same repair logged in both `maintenance_logs` (type=`Repair`) and `expenses` (category=`Repair`) | Both tables allow a `Repair` classification, which risks double-counting in Total Cost incl. Incidentals (FR-FUEL-03a). UI copy on the Expenses form should clarify "Repair" here means incidental/roadside repair costs not already tracked as a maintenance record; Operational Cost (FR-FUEL-03) is unaffected since it never sums `expenses`. |

---

## 11. Security Requirements

| ID | Requirement |
|---|---|
| SEC-01 | Passwords hashed with bcrypt (via BetterAuth); never logged. |
| SEC-02 | Session tokens stored in HttpOnly, Secure, SameSite=Lax cookies. |
| SEC-03 | RBAC enforced server-side via FastAPI dependency `require_roles(...)`; frontend guards are UX-only. |
| SEC-04 | All Pydantic schemas use `extra="forbid"` to reject unexpected fields. |
| SEC-05 | SQL injection prevented by exclusive use of SQLAlchemy parameterized queries. |
| SEC-06 | CORS configured to allow only the deployed frontend origin. |
| SEC-07 | Rate limit on `/auth/login`: 5 attempts / 15 min / IP (via `slowapi`). |
| SEC-08 | Security headers via `secure` middleware: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy: same-origin`, `Strict-Transport-Security`. |
| SEC-09 | Secrets loaded from environment variables only; `.env` in `.gitignore`. |
| SEC-10 | Audit log records all mutations with actor, timestamp, and diff. |
| SEC-11 | Input length limits on every string field to prevent oversized payloads. |
| SEC-12 | UUIDs (not sequential IDs) for public identifiers to prevent enumeration. |

---

## 12. Team Work Distribution

**Team:** 4 developers — 2 Backend, 2 Frontend.

### 12.1 Backend Developer 1 — "Core Entities & Auth"
- Project scaffolding (FastAPI, Alembic, Docker Compose, `.env` config).
- BetterAuth integration + `users`, `roles`, `user_roles` tables and seeding.
- RBAC dependency (`require_roles`) and `/auth/*` routes.
- Vehicles module (models, schemas, repo, service, router, tests).
- Drivers module (same layers).
- Shared enums, exceptions, base repository.

### 12.2 Backend Developer 2 — "Operations & Analytics"
- Trips module with the full FSM (dispatch / complete / cancel) and transactional state updates.
- Maintenance module including auto-status side-effects.
- Fuel logs + Expenses modules.
- Reports module (fuel efficiency, ROI, utilization).
- Dashboard KPI endpoint (with materialized view refresh strategy).
- CSV export (streaming); PDF export (WeasyPrint) if time allows.

### 12.3 Frontend Developer 1 — "Shell, Auth & Fleet"
- Next.js scaffolding, Tailwind, shadcn/ui setup, dark mode.
- Auth pages, session provider, route guards (middleware).
- Layout shell (sidebar, topbar), design tokens.
- Dashboard page with KPI cards + filter bar.
- Vehicles CRUD screens (table + drawer form).
- Drivers CRUD screens with license-expiry visual warnings.

### 12.4 Frontend Developer 2 — "Operations & Reports"
- Trips page (Kanban + Table toggle).
- Multi-step trip creation flow with eligibility-aware dropdowns.
- Maintenance page.
- Fuel & Expenses page (tabbed).
- Reports page with charts (Recharts) and CSV export button.
- Toast system, loading skeletons, empty states.

### 12.5 Shared / Pair Work
- API contract (OpenAPI schema shared as source of truth; frontend runs `openapi-typescript` to generate types).
- End-of-hackathon integration + smoke tests.
- Seed data script for demo.

### 12.6 Suggested Timeline (8 hours)

| Hour | Backend | Frontend |
|---|---|---|
| 0–1 | Scaffolding, DB schema migration, seed | Scaffolding, layout, theme, auth pages |
| 1–3 | Vehicles + Drivers CRUD + Auth done | Vehicles + Drivers pages wired to API |
| 3–5 | Trips FSM + Maintenance side-effects | Trips + Maintenance pages |
| 5–6.5 | Fuel/Expenses + Reports endpoints | Fuel/Expenses + Reports pages |
| 6.5–7.5 | Dashboard KPI endpoint, bug fixes | Dashboard KPIs, charts, polish |
| 7.5–8 | Integration testing, demo seed | Final polish, dark mode QA, README |

---

## 13. Testing & Debugging Strategy

### 13.1 Testing
- **Unit tests (backend):** Pytest for service-layer FSM transitions and validators. Target ≥ 70% coverage on `services/`.
- **Integration tests:** `httpx.AsyncClient` against a test PostgreSQL container (via `testcontainers`).
- **Frontend:** React Testing Library for form validation; Playwright smoke test for login → create vehicle → create trip → dispatch → complete.

### 13.2 Debugging & Observability
- **Structured logging:** `structlog` with request-id correlation.
- **FastAPI OpenAPI docs** at `/docs` — used by frontend team during development.
- **Postgres slow-query log** enabled (>200ms) during development.
- **Frontend:** React Query Devtools + Zustand devtools.
- **Error surfacing:** every backend error carries an `error_code` string (e.g., `TRIP_VEHICLE_UNAVAILABLE`); frontend maps codes to friendly toasts.

### 13.3 Seed Data
Provide `scripts/seed.py`: 1 admin, 1 user per role, 20 vehicles (mixed statuses), 15 drivers (2 with expiring licenses), 10 completed trips, 3 active trips, 5 maintenance records, 30 fuel logs, 40 expenses. Enables instant demo.

---

## 14. Deliverables & Timeline

### 14.1 Mandatory Deliverables
> **Corrected against source PDF layout:** the original problem statement's §7/§8 split (visible in the PDF's actual page layout — the plain-text extraction had merged the two bullet lists) places Dark Mode under **Bonus Features**, not Mandatory. It has been moved to §14.2 accordingly and NFR-USA-04 is now consistent with this list.
- [x] Responsive Next.js frontend
- [x] FastAPI backend with OpenAPI docs at `/docs`
- [x] PostgreSQL schema with migrations (Alembic)
- [x] BetterAuth login + RBAC (5 roles)
- [x] CRUD for Vehicles and Drivers
- [x] Trip management with FSM and business-rule validation
- [x] Automatic vehicle & driver status transitions
- [x] Maintenance workflow with auto-status side-effects
- [x] Fuel & expense tracking
- [x] Dashboard with 7 KPIs
- [x] CSV export for reports
- [x] Seed data script + README with setup instructions

### 14.2 Bonus (if time permits)
- [ ] Recharts visualizations on dashboard and reports
- [ ] PDF export via WeasyPrint
- [ ] License-expiry email reminders (SMTP + APScheduler)
- [ ] Vehicle document uploads (local filesystem, not S3 — free)
- [ ] Advanced search / sorting on all tables
- [ ] Dark mode toggle (Tailwind v4 `dark:` variants + system preference — see NFR-USA-04)
- [ ] Audit log viewer (Admin-only)

### 14.3 Definition of Done
1. All mandatory business rules verified via at least one automated test.
2. All API endpoints return sensible errors for invalid input.
3. All screens usable at 375px, 768px, 1440px widths.
4. Demo script runs end-to-end without manual intervention.
5. README documents `docker compose up` startup and default credentials.

---

## Appendix A — Recommended Repository Layout

```
transitops/
├── docker-compose.yml
├── README.md
├── .env.example
├── backend/
│   ├── pyproject.toml
│   ├── alembic/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/  (config, db, security, logging)
│   │   ├── auth/
│   │   ├── modules/
│   │   │   ├── vehicles/
│   │   │   ├── drivers/
│   │   │   ├── trips/
│   │   │   ├── maintenance/
│   │   │   ├── fuel_expenses/
│   │   │   ├── reports/
│   │   │   └── dashboard/
│   │   └── shared/
│   └── tests/
├── frontend/
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── hooks/
│   └── types/
└── scripts/
    └── seed.py
```

---

## Appendix B — Sample Trip Dispatch Transaction (Pseudocode)

```python
async def dispatch_trip(trip_id: UUID, actor: User) -> Trip:
    async with db.transaction():
        trip = await trips_repo.get_for_update(trip_id)              # SELECT ... FOR UPDATE
        if trip.status != TripStatus.DRAFT:
            raise ConflictError("INVALID_TRIP_TRANSITION")

        vehicle = await vehicles_repo.get_for_update(trip.vehicle_id)
        driver  = await drivers_repo.get_for_update(trip.driver_id)

        # Re-validate business rules under lock
        if vehicle.status != VehicleStatus.AVAILABLE:
            raise ConflictError("VEHICLE_UNAVAILABLE")
        if driver.status != DriverStatus.AVAILABLE:
            raise ConflictError("DRIVER_UNAVAILABLE")
        if driver.license_expiry < date.today():
            raise ConflictError("DRIVER_LICENSE_EXPIRED")
        if trip.cargo_weight_kg > vehicle.max_load_kg:
            raise ConflictError("CARGO_EXCEEDS_CAPACITY")

        trip.status = TripStatus.DISPATCHED
        trip.dispatched_at = utcnow()
        vehicle.status = VehicleStatus.ON_TRIP
        driver.status  = DriverStatus.ON_TRIP

        await audit_log.record("TRIP_DISPATCHED", trip.id, actor)
        # Partial unique index guarantees no other trip took this vehicle/driver
        return trip
```

---

**End of Document**
