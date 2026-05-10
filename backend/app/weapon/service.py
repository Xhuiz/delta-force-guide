import json
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.weapon import Weapon, Attachment
from app.redis import cache_get, cache_set


async def get_weapons(db: AsyncSession) -> list[Weapon]:
    cached = await cache_get("weapons:all")
    if cached:
        return json.loads(cached)
    result = await db.execute(select(Weapon).order_by(Weapon.category, Weapon.name))
    weapons = list(result.scalars().all())
    await cache_set("weapons:all", json.dumps([{
        "id": w.id, "name": w.name, "category": w.category, "image_url": w.image_url
    } for w in weapons]), expire=600)
    return weapons


async def get_weapon_detail(db: AsyncSession, weapon_id: str) -> dict | None:
    cached = await cache_get(f"weapon:{weapon_id}")
    if cached:
        return json.loads(cached)

    result = await db.execute(select(Weapon).where(Weapon.id == weapon_id))
    weapon = result.scalar_one_or_none()
    if not weapon:
        return None

    att_result = await db.execute(select(Attachment).where(Attachment.slot.in_(weapon.slots)))
    attachments = att_result.scalars().all()

    data = {
        "id": weapon.id,
        "name": weapon.name,
        "category": weapon.category,
        "image_url": weapon.image_url,
        "model_url": weapon.model_url,
        "base_stats": weapon.base_stats,
        "slots": weapon.slots,
        "attachments": [
            {"id": a.id, "name": a.name, "slot": a.slot, "image_url": a.image_url, "effects": a.effects}
            for a in attachments
        ],
    }
    await cache_set(f"weapon:{weapon_id}", json.dumps(data), expire=600)
    return data


async def get_attachments(db: AsyncSession, slot: str | None = None) -> list[Attachment]:
    query = select(Attachment)
    if slot:
        query = query.where(Attachment.slot == slot)
    result = await db.execute(query.order_by(Attachment.slot, Attachment.name))
    return list(result.scalars().all())
