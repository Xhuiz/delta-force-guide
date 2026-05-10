from pydantic import BaseModel
from datetime import datetime

class GuideCreate(BaseModel):
    title: str
    slug: str
    content: str
    cover_url: str | None = None
    guide_type: str
    map_id: int | None = None
    tags: list[int] | None = None

class GuideUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    cover_url: str | None = None
    guide_type: str | None = None
    map_id: int | None = None
    tags: list[int] | None = None

class GuideResponse(BaseModel):
    id: int
    title: str
    slug: str
    content: str
    cover_url: str | None
    author_id: int
    guide_type: str
    map_id: int | None
    tags: list[int] | None
    likes_count: int
    comments_count: int
    favorites_count: int
    published_at: datetime | None
    updated_at: datetime
    class Config:
        from_attributes = True

class GuideListItem(BaseModel):
    id: int
    title: str
    slug: str
    cover_url: str | None
    guide_type: str
    likes_count: int
    favorites_count: int
    published_at: datetime | None
    class Config:
        from_attributes = True
