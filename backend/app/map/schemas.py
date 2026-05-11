from pydantic import BaseModel
from datetime import datetime
from typing import Any


class MapResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: str | None
    tile_url: str | None
    bounds: Any | None

    class Config:
        from_attributes = True


class MapPointCreate(BaseModel):
    map_id: int
    name: str
    description: str | None = None
    category: str
    lng: float
    lat: float
    image_url: str | None = None
    tags: list[int] | None = None


class MapPointUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    category: str | None = None
    lng: float | None = None
    lat: float | None = None
    image_url: str | None = None
    tags: list[int] | None = None
