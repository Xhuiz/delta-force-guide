from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.comment.schemas import CommentCreate
from app.comment.service import get_comments, create_comment, delete_comment

router = APIRouter(prefix="/api/comments", tags=["comments"])

@router.get("")
async def list_comments(target_type: str = Query(...), target_id: int = Query(...), db: AsyncSession = Depends(get_db)):
    return await get_comments(db, target_type, target_id)

@router.post("", status_code=status.HTTP_201_CREATED)
async def create(data: CommentCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    comment = await create_comment(db, user.id, data)
    return {"id": comment.id, "message": "created"}

@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(comment_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    if not await delete_comment(db, comment_id, user.id): raise HTTPException(status_code=404, detail="Comment not found")
