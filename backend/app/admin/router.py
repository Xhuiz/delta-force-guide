from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth.dependencies import require_admin
from app.models.user import User
from app.models.comment import Comment
from app.models.guide import Guide
from app.models.map import Map, MapPoint
from app.models.weapon import Weapon
from app.models.tag import Tag

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    guides = (await db.execute(select(func.count()).select_from(Guide))).scalar() or 0
    maps = (await db.execute(select(func.count()).select_from(Map))).scalar() or 0
    weapons = (await db.execute(select(func.count()).select_from(Weapon))).scalar() or 0
    tags = (await db.execute(select(func.count()).select_from(Tag))).scalar() or 0
    users = (await db.execute(select(func.count()).select_from(User))).scalar() or 0
    comments = (await db.execute(select(func.count()).select_from(Comment))).scalar() or 0
    return {
        "guides": guides,
        "maps": maps,
        "weapons": weapons,
        "tags": tags,
        "users": users,
        "comments": comments,
    }


@router.get("/users")
async def list_users(db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "role": u.role,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]


@router.get("/comments")
async def list_comments(db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(
        select(Comment, User.username)
        .join(User, Comment.user_id == User.id)
        .order_by(Comment.created_at.desc())
        .limit(200)
    )
    return [
        {
            "id": c.id,
            "user_id": c.user_id,
            "username": u,
            "target_type": c.target_type,
            "target_id": c.target_id,
            "content": c.content,
            "created_at": c.created_at.isoformat(),
        }
        for c, u in result.all()
    ]
