from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth.dependencies import require_admin
from app.models.tag import Tag
from app.models.user import User

router = APIRouter(prefix="/api/tags", tags=["tags"])


class TagCreate(BaseModel):
    name: str
    category: str
    slug: str


@router.get("")
async def list_tags(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tag).order_by(Tag.id))
    tags = result.scalars().all()
    return [{"id": t.id, "name": t.name, "category": t.category, "slug": t.slug} for t in tags]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_tag(data: TagCreate, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    tag = Tag(name=data.name, category=data.category, slug=data.slug)
    db.add(tag)
    await db.flush()
    await db.refresh(tag)
    return {"id": tag.id, "message": "created"}


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(tag_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(Tag).where(Tag.id == tag_id))
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    await db.delete(tag)
