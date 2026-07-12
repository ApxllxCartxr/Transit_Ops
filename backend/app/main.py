from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.auth.router import router as auth_router
from app.modules.vehicles.router import router as vehicles_router
from app.modules.drivers.router import router as drivers_router

# BE2 operations modules (merged from feat/backend-ops-analytics)
from app.modules.trips.router import router as trips_router
from app.modules.maintenance.router import router as maintenance_router
from app.modules.costs.router import router as costs_router
from app.modules.reports.router import router as reports_router
from app.modules.dashboard.router import router as dashboard_router
from app.modules.exports.router import router as exports_router

from app.core.exceptions import TransitOpsError

app = FastAPI(
    title="TransitOps API",
    version="0.2.0",
    description="Fleet operations platform — vehicles, drivers, trips, maintenance, costs, reports.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(TransitOpsError)
async def transitops_error_handler(request: Request, exc: TransitOpsError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": exc.message, "code": exc.code},
    )


# BE1 — Core Auth & Entity routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(vehicles_router, prefix="/api/v1")
app.include_router(drivers_router, prefix="/api/v1")

# BE2 — Operations & Analytics routers
app.include_router(trips_router)
app.include_router(maintenance_router)
app.include_router(costs_router)
app.include_router(reports_router)
app.include_router(dashboard_router)
app.include_router(exports_router)


@app.get("/health", tags=["health"])
async def health() -> dict[str, str]:
    return {"status": "ok"}
