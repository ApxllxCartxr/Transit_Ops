from pydantic import BaseModel, EmailStr, Field, ConfigDict


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class AuthUser(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    roles: list[str]


class AuthResponse(BaseModel):
    user: AuthUser
    token: str


class LogoutResponse(BaseModel):
    ok: bool = True
