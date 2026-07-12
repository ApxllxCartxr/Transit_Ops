from fastapi import APIRouter, Depends, Response

from app.auth.dependencies import require_roles

ALL_ROLES = ["Admin", "Fleet Manager", "Dispatcher", "Safety Officer", "Financial Analyst"]

router = APIRouter(
    prefix="/api/v1/exports",
    tags=["exports"],
    dependencies=[Depends(require_roles(*ALL_ROLES))],
)


@router.get("/csv")
def export_csv():
    """Export trip data as CSV — placeholder until real DB query is wired."""
    content = "id,vehicle_id,status\n1,V-1,Completed\n"
    return Response(content=content, media_type="text/csv")
