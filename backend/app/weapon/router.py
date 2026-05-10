from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.weapon.schemas import WeaponResponse, WeaponListItem, AttachmentResponse
from app.weapon.service import get_weapons, get_weapon_detail, get_attachments

router = APIRouter(prefix="/api/weapons", tags=["weapons"])


@router.get("", response_model=list[WeaponListItem])
async def list_weapons(db: AsyncSession = Depends(get_db)):
    return await get_weapons(db)


@router.get("/{weapon_id}", response_model=WeaponResponse)
async def get_weapon(weapon_id: str, db: AsyncSession = Depends(get_db)):
    data = await get_weapon_detail(db, weapon_id)
    if not data:
        raise HTTPException(status_code=404, detail="Weapon not found")
    return data


@router.get("/attachments/list", response_model=list[AttachmentResponse])
async def list_attachments(slot: str | None = None, db: AsyncSession = Depends(get_db)):
    return await get_attachments(db, slot)
