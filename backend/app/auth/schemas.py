from pydantic import BaseModel, Field, ConfigDict


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)


class AuthUser(BaseModel):
    id: str
    email: str
    full_name: str
    roles: list[str]


class AuthResponse(BaseModel):
    user: AuthUser
    token: str


class LogoutResponse(BaseModel):
    ok: bool = True
