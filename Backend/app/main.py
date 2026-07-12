from fastapi import FastAPI

from app.api import router as api_router

app = FastAPI(title="TransitOps Backend")
app.include_router(api_router)
