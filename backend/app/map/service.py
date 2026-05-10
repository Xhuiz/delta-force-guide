import json
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from geoalchemy2.shape import from_shape, to_shape
from shapely.geometry import Point

from app.models.map import Map, MapPoint
from app.redis import cache_get, cache_set, cache_delete


async def get_maps(db: AsyncSession) -> list[Map]:
    result = await db.execute(select(Map).order_by(Map.id))
    return list(result.scalars().all())


async def get_map_points_geojson(db: AsyncSession, map_id: int, bbox: str | None = None, category: str | None = None) -> dict:
    cache_key = f"map_points:{map_id}:{bbox}:{category}"
    cached = await cache_get(cache_key)
    if cached:
        return json.loads(cached)

    query = select(MapPoint).where(MapPoint.map_id == map_id)
    if category:
        query = query.where(MapPoint.category == category)
    if bbox:
        min_lng, min_lat, max_lng, max_lat = map(float, bbox.split(","))
        query = query.where(text(f"ST_Intersects(geometry, ST_MakeEnvelope(:min_lng, :min_lat, :max_lng, :max_lat, 4326))")).params(min_lng=min_lng, min_lat=min_lat, max_lng=max_lng, max_lat=max_lat)

    result = await db.execute(query)
    points = result.scalars().all()

    features = []
    for p in points:
        geom = to_shape(p.geometry)
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [geom.x, geom.y]},
            "properties": {"id": p.id, "name": p.name, "description": p.description, "category": p.category, "image_url": p.image_url, "tags": p.tags},
        })

    geojson = {"type": "FeatureCollection", "features": features}
    await cache_set(cache_key, json.dumps(geojson), expire=300)
    return geojson


async def create_map_point(db: AsyncSession, data) -> MapPoint:
    point = MapPoint(map_id=data.map_id, name=data.name, description=data.description, category=data.category, geometry=from_shape(Point(data.lng, data.lat), srid=4326), image_url=data.image_url, tags=data.tags)
    db.add(point)
    await db.flush()
    await db.refresh(point)
    await cache_delete(f"map_points:{data.map_id}:*")
    return point


async def update_map_point(db: AsyncSession, point_id: int, data) -> MapPoint | None:
    result = await db.execute(select(MapPoint).where(MapPoint.id == point_id))
    point = result.scalar_one_or_none()
    if not point:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        if field in ("lng", "lat"):
            continue
        setattr(point, field, value)
    if data.lng is not None and data.lat is not None:
        point.geometry = from_shape(Point(data.lng, data.lat), srid=4326)
    await db.flush()
    await db.refresh(point)
    await cache_delete(f"map_points:{point.map_id}:*")
    return point


async def delete_map_point(db: AsyncSession, point_id: int) -> bool:
    result = await db.execute(select(MapPoint).where(MapPoint.id == point_id))
    point = result.scalar_one_or_none()
    if not point:
        return False
    map_id = point.map_id
    await db.delete(point)
    await cache_delete(f"map_points:{map_id}:*")
    return True
