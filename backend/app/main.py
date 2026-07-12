"""
app/main.py

FastAPI application factory.

Security hardening (SRS §11 / SEC-01 – SEC-10):
  CORS     — restricted to allow_origins from config (no wildcard in production).
  Headers  — SecurityHeadersMiddleware injects:
               X-Content-Type-Options: nosniff
               X-Frame-Options: DENY
               Referrer-Policy: same-origin
               Strict-Transport-Security (production only)
  Cookies  — set in auth/router.py as HttpOnly, SameSite=Lax, Secure=production.
  CSRF     — mitigated by SameSite=Lax cookie + explicit Origin CORS check.
             No separate CSRF token is needed for a cookie-based SPA on the
             same origin (OWASP recommendation).
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.auth.router import limiter as auth_limiter
from app.core.config import get_settings
from app.core.exceptions import TransitOpsError

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

_settings = get_settings()

# ---------------------------------------------------------------------------
# Parse CORS origins from config (comma-separated string → list)
# ---------------------------------------------------------------------------
_allowed_origins: list[str] = [
    o.strip() for o in _settings.allowed_origins.split(",") if o.strip()
]


# ---------------------------------------------------------------------------
# Security headers middleware
# ---------------------------------------------------------------------------
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Inject security headers on every HTTP response (SRS §11 / OWASP).

    HSTS is only added in production to avoid breaking local dev servers
    that run over plain HTTP.
    """

    _STATIC_HEADERS: dict[str, str] = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options":        "DENY",
        "Referrer-Policy":        "same-origin",
    }
    _HSTS_HEADER = ("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

    def __init__(self, app, *, production: bool = False) -> None:
        super().__init__(app)
        self._production = production

    async def dispatch(self, request: Request, call_next) -> Response:
        response: Response = await call_next(request)
        for name, value in self._STATIC_HEADERS.items():
            response.headers[name] = value
        if self._production:
            response.headers[self._HSTS_HEADER[0]] = self._HSTS_HEADER[1]
        return response


# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------
app = FastAPI(
    title="TransitOps API",
    version="0.2.0",
    description="Fleet operations platform — vehicles, drivers, trips, maintenance, costs, reports.",
)

# Rate-limiter (SEC-07)
app.state.limiter = auth_limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Security headers — applied before CORS so headers appear on all responses
app.add_middleware(
    SecurityHeadersMiddleware,
    production=(_settings.app_env == "production"),
)

# CORS — restricted to configured origins only; credentials (cookie) allowed
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
    expose_headers=["X-Total-Count"],
    max_age=600,  # preflight cache 10 min
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

