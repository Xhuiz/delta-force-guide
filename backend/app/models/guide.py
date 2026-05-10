from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, func, JSON
from app.models.base import Base


class Guide(Base):
    __tablename__ = "guides"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    slug = Column(String(200), unique=True, nullable=False, index=True)
    content = Column(Text, nullable=False)
    cover_url = Column(String(500), nullable=True)
    author_id = Column(Integer, nullable=False, index=True)
    guide_type = Column(String(20), nullable=False, index=True)
    map_id = Column(Integer, nullable=True, index=True)
    tags = Column(JSON, nullable=True)
    likes_count = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    favorites_count = Column(Integer, default=0)
    published_at = Column(TIMESTAMP, nullable=True)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
