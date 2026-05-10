from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.favorite import Favorite
from app.models.like import Like
from app.models.comment import Comment
from app.models.guide import Guide

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me/favorites")
async def get_favorites(
    target_type: str = Query("guide"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = (
        select(Favorite)
        .where(Favorite.user_id == user.id, Favorite.target_type == target_type)
        .order_by(Favorite.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    favorites = result.scalars().all()

    items = []
    for fav in favorites:
        if target_type == "guide":
            guide_result = await db.execute(select(Guide).where(Guide.id == fav.target_id))
            guide = guide_result.scalar_one_or_none()
            if guide:
                items.append({
                    "id": guide.id,
                    "title": guide.title,
                    "slug": guide.slug,
                    "cover_url": guide.cover_url,
                    "guide_type": guide.guide_type,
                    "favorited_at": fav.created_at.isoformat(),
                })
        else:
            items.append({
                "target_id": fav.target_id,
                "target_type": fav.target_type,
                "favorited_at": fav.created_at.isoformat(),
            })

    return {"items": items, "page": page, "page_size": page_size}


@router.get("/me/comments")
async def get_my_comments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = (
        select(Comment)
        .where(Comment.user_id == user.id)
        .order_by(Comment.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    comments = result.scalars().all()

    return {
        "items": [
            {
                "id": c.id,
                "target_type": c.target_type,
                "target_id": c.target_id,
                "content": c.content,
                "created_at": c.created_at.isoformat(),
            }
            for c in comments
        ],
        "page": page,
        "page_size": page_size,
    }
