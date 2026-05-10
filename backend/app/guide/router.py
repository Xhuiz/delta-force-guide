from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.auth.dependencies import get_current_user, require_admin
from app.models.user import User
from app.guide.schemas import GuideCreate, GuideUpdate, GuideResponse, GuideListItem
from app.guide.service import get_guides, get_guide_by_slug, create_guide, update_guide, delete_guide, toggle_like, toggle_favorite
from app.schemas.common import PageResponse

router = APIRouter(prefix="/api/guides", tags=["guides"])

@router.get("", response_model=PageResponse[GuideListItem])
async def list_guides(search: str | None = None, guide_type: str | None = None, map_id: int | None = None, tag_id: int | None = None, sort: str = Query("latest", regex="^(latest|popular|favorites)$"), page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100), db: AsyncSession = Depends(get_db)):
    guides, total = await get_guides(db, search, guide_type, map_id, tag_id, sort, page, page_size)
    return PageResponse(items=[GuideListItem.model_validate(g) for g in guides], total=total, page=page, page_size=page_size, has_next=(page * page_size) < total)

@router.get("/{slug}", response_model=GuideResponse)
async def get_guide(slug: str, db: AsyncSession = Depends(get_db)):
    guide = await get_guide_by_slug(db, slug)
    if not guide: raise HTTPException(status_code=404, detail="Guide not found")
    return guide

@router.post("", response_model=GuideResponse, status_code=status.HTTP_201_CREATED)
async def create(data: GuideCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_admin)):
    return await create_guide(db, data, user.id)

@router.put("/{guide_id}", response_model=GuideResponse)
async def update(guide_id: int, data: GuideUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(require_admin)):
    guide = await update_guide(db, guide_id, data)
    if not guide: raise HTTPException(status_code=404, detail="Guide not found")
    return guide

@router.delete("/{guide_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(guide_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(require_admin)):
    if not await delete_guide(db, guide_id): raise HTTPException(status_code=404, detail="Guide not found")

@router.post("/{guide_id}/like")
async def like_guide(guide_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return {"liked": await toggle_like(db, user.id, guide_id)}

@router.post("/{guide_id}/favorite")
async def favorite_guide(guide_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return {"favorited": await toggle_favorite(db, user.id, guide_id)}
