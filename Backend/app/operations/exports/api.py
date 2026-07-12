from fastapi import APIRouter, Response

router = APIRouter()


@router.get("/csv")
def export_csv():
    content = "id,vehicle_id,status\n1,V-1,Completed\n"
    return Response(content=content, media_type="text/csv")
