from pydantic import BaseModel


class AttachmentResponse(BaseModel):
    id: str
    name: str
    slot: str
    image_url: str | None
    effects: dict

    class Config:
        from_attributes = True


class WeaponResponse(BaseModel):
    id: str
    name: str
    category: str
    image_url: str | None
    model_url: str | None
    base_stats: dict
    slots: list[str]
    attachments: list[AttachmentResponse] = []

    class Config:
        from_attributes = True


class WeaponListItem(BaseModel):
    id: str
    name: str
    category: str
    image_url: str | None

    class Config:
        from_attributes = True
