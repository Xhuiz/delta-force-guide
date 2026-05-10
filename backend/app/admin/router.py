from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth.dependencies import require_admin
from app.models.user import User
from app.models.comment import Comment

router = APIRouter(prefix="/api/admin", tags=["admin"])


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
