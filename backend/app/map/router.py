from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth.dependencies import require_admin
from app.models.user import User
from app.map.schemas import MapResponse, MapPointCreate, MapPointUpdate
from app.map.service import get_maps, get_map_points_geojson, create_map_point, update_map_point, delete_map_point

router = APIRouter(prefix="/api/maps", tags=["maps"])


@router.get("", response_model=list[MapResponse])
async def list_maps(db: AsyncSession = Depends(get_db)):
    return await get_maps(db)


@router.get("/{map_id}/points")
async def list_points(map_id: int, bbox: str | None = Query(None), category: str | None = Query(None), db: AsyncSession = Depends(get_db)):
    return await get_map_points_geojson(db, map_id, bbox, category)


@router.post("/{map_id}/points", status_code=status.HTTP_201_CREATED)
async def create_point(map_id: int, data: MapPointCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_admin)):
    data.map_id = map_id
    point = await create_map_point(db, data)
    return {"id": point.id, "message": "created"}


@router.put("/points/{point_id}")
async def update_point(point_id: int, data: MapPointUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(require_admin)):
    point = await update_map_point(db, point_id, data)
    if not point:
        raise HTTPException(status_code=404, detail="Point not found")
    return {"id": point.id, "message": "updated"}


@router.delete("/points/{point_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_point(point_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(require_admin)):
    deleted = await delete_map_point(db, point_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Point not found")
