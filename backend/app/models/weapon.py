from sqlalchemy import Column, String, JSON
from app.models.base import Base


class Weapon(Base):
    __tablename__ = "weapons"

    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    category = Column(String(20), nullable=False, index=True)
    image_url = Column(String(500), nullable=True)
    model_url = Column(String(500), nullable=True)
    base_stats = Column(JSON, nullable=False)
    slots = Column(JSON, nullable=False)


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    slot = Column(String(20), nullable=False, index=True)
    image_url = Column(String(500), nullable=True)
    effects = Column(JSON, nullable=False)
