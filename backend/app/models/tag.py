from sqlalchemy import Column, Integer, String
from app.models.base import Base


class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False)
    category = Column(String(20), nullable=False, index=True)
    slug = Column(String(50), unique=True, nullable=False, index=True)
