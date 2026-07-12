from fastapi import APIRouter, Response

router = APIRouter(prefix="/api/v1/exports", tags=["exports"])


@router.get("/csv")
def export_csv():
    """Export trip data as CSV — placeholder until real DB query is wired."""
    content = "id,vehicle_id,status\n1,V-1,Completed\n"
    return Response(content=content, media_type="text/csv")
