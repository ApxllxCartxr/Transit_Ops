from fastapi import APIRouter, Depends
from app.auth.schemas import AuthResponse, AuthUser, LoginRequest, LogoutResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest):
    return AuthResponse(
        user=AuthUser(
            id="demo-user",
            email=payload.email,
            full_name="TransitOps Demo User",
            roles=["Admin"],
        ),
        token="demo-token",
    )


@router.post("/logout", response_model=LogoutResponse)
async def logout():
    return LogoutResponse()


@router.get("/me", response_model=AuthUser)
async def me():
    return AuthUser(id="demo-user", email="admin@transitops.dev", full_name="TransitOps Admin", roles=["Admin"])
