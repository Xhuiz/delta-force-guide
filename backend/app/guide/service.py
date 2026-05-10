from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.guide import Guide
from app.models.like import Like
from app.models.favorite import Favorite
from app.redis import cache_get, cache_set, cache_delete

async def get_guides(db, search=None, guide_type=None, map_id=None, tag_id=None, sort="latest", page=1, page_size=20):
    query = select(Guide).where(Guide.published_at.isnot(None))
    count_query = select(func.count()).select_from(Guide).where(Guide.published_at.isnot(None))
    if search:
        ts_query = func.plainto_tsquery("simple", search)
        search_filter = or_(func.to_tsvector("simple", Guide.title).op("@@")(ts_query), func.to_tsvector("simple", Guide.content).op("@@")(ts_query))
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)
    if guide_type:
        query = query.where(Guide.guide_type == guide_type)
        count_query = count_query.where(Guide.guide_type == guide_type)
    if map_id:
        query = query.where(Guide.map_id == map_id)
        count_query = count_query.where(Guide.map_id == map_id)
    if tag_id:
        query = query.where(Guide.tags.contains([tag_id]))
        count_query = count_query.where(Guide.tags.contains([tag_id]))
    if sort == "popular":
        query = query.order_by(Guide.likes_count.desc())
    elif sort == "favorites":
        query = query.order_by(Guide.favorites_count.desc())
    else:
        query = query.order_by(Guide.published_at.desc())
    total = (await db.execute(count_query)).scalar()
    guides = list((await db.execute(query.offset((page - 1) * page_size).limit(page_size))).scalars().all())
    return guides, total

async def get_guide_by_slug(db, slug):
    result = await db.execute(select(Guide).where(Guide.slug == slug))
    return result.scalar_one_or_none()

async def create_guide(db, data, author_id):
    guide = Guide(title=data.title, slug=data.slug, content=data.content, cover_url=data.cover_url, author_id=author_id, guide_type=data.guide_type, map_id=data.map_id, tags=data.tags)
    db.add(guide)
    await db.flush()
    await db.refresh(guide)
    return guide

async def update_guide(db, guide_id, data):
    result = await db.execute(select(Guide).where(Guide.id == guide_id))
    guide = result.scalar_one_or_none()
    if not guide:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(guide, field, value)
    await db.flush()
    await db.refresh(guide)
    return guide

async def delete_guide(db, guide_id):
    result = await db.execute(select(Guide).where(Guide.id == guide_id))
    guide = result.scalar_one_or_none()
    if not guide:
        return False
    await db.delete(guide)
    return True

async def toggle_like(db, user_id, guide_id):
    result = await db.execute(select(Like).where(Like.user_id == user_id, Like.target_type == "guide", Like.target_id == guide_id))
    existing = result.scalar_one_or_none()
    guide_result = await db.execute(select(Guide).where(Guide.id == guide_id))
    guide = guide_result.scalar_one_or_none()
    if existing:
        await db.delete(existing)
        if guide: guide.likes_count = max(0, guide.likes_count - 1)
        return False
    else:
        db.add(Like(user_id=user_id, target_type="guide", target_id=guide_id))
        if guide: guide.likes_count += 1
        return True

async def toggle_favorite(db, user_id, guide_id):
    result = await db.execute(select(Favorite).where(Favorite.user_id == user_id, Favorite.target_type == "guide", Favorite.target_id == guide_id))
    existing = result.scalar_one_or_none()
    guide_result = await db.execute(select(Guide).where(Guide.id == guide_id))
    guide = guide_result.scalar_one_or_none()
    if existing:
        await db.delete(existing)
        if guide: guide.favorites_count = max(0, guide.favorites_count - 1)
        return False
    else:
        db.add(Favorite(user_id=user_id, target_type="guide", target_id=guide_id))
        if guide: guide.favorites_count += 1
        return True
