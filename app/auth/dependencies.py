from fastapi import Depends, HTTPException, status
from typing import Annotated


class RequireRoles:
    def __init__(self, *roles: str):
        self.roles = roles

    def __call__(self) -> None:
        return None


def require_roles(*roles: str):
    def dependency() -> None:
        return None

    return dependency
