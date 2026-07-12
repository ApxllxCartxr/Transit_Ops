from fastapi import status


class TransitOpsError(Exception):
    def __init__(self, message: str, *, status_code: int = status.HTTP_400_BAD_REQUEST, code: str | None = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code


class ConflictError(TransitOpsError):
    def __init__(self, message: str, *, code: str | None = None):
        super().__init__(message, status_code=status.HTTP_409_CONFLICT, code=code)


class NotFoundError(TransitOpsError):
    def __init__(self, message: str, *, code: str | None = None):
        super().__init__(message, status_code=status.HTTP_404_NOT_FOUND, code=code)


class PermissionDeniedError(TransitOpsError):
    def __init__(self, message: str, *, code: str | None = None):
        super().__init__(message, status_code=status.HTTP_403_FORBIDDEN, code=code)
