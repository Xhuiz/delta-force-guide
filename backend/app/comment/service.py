from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.comment import Comment
from app.models.user import User
from app.models.guide import Guide

async def get_comments(db, target_type, target_id):
    result = await db.execute(select(Comment, User.username, User.avatar_url).join(User, Comment.user_id == User.id).where(Comment.target_type == target_type, Comment.target_id == target_id, Comment.parent_id.is_(None)).order_by(Comment.created_at.desc()))
    comments = []
    for comment, username, avatar_url in result.all():
        replies_result = await db.execute(select(Comment, User.username, User.avatar_url).join(User, Comment.user_id == User.id).where(Comment.parent_id == comment.id).order_by(Comment.created_at.asc()))
        replies = [{"id": r.id, "user_id": r.user_id, "username": u, "avatar_url": a, "content": r.content, "parent_id": r.parent_id, "likes_count": r.likes_count, "created_at": r.created_at.isoformat(), "replies": []} for r, u, a in replies_result.all()]
        comments.append({"id": comment.id, "user_id": comment.user_id, "username": username, "avatar_url": avatar_url, "content": comment.content, "parent_id": comment.parent_id, "likes_count": comment.likes_count, "created_at": comment.created_at.isoformat(), "replies": replies})
    return comments

async def create_comment(db, user_id, data):
    comment = Comment(user_id=user_id, target_type=data.target_type, target_id=data.target_id, content=data.content, parent_id=data.parent_id)
    db.add(comment)
    await db.flush()
    if data.target_type == "guide":
        guide = (await db.execute(select(Guide).where(Guide.id == data.target_id))).scalar_one_or_none()
        if guide: guide.comments_count += 1
    return comment

async def delete_comment(db, comment_id, user_id):
    result = await db.execute(select(Comment).where(Comment.id == comment_id))
    comment = result.scalar_one_or_none()
    if not comment or comment.user_id != user_id: return False
    await db.delete(comment)
    return True
