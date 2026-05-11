from sqlalchemy import Column, Integer, String, Text, JSON, Float, func, TIMESTAMP
from app.models.base import Base


class Map(Base):
    __tablename__ = "maps"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    tile_url = Column(String(500), nullable=True)
    bounds = Column(JSON, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())


class MapPoint(Base):
    __tablename__ = "map_points"

    id = Column(Integer, primary_key=True, autoincrement=True)
    map_id = Column(Integer, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(20), nullable=False, index=True)
    lng = Column(Float, nullable=False)
    lat = Column(Float, nullable=False)
    image_url = Column(String(500), nullable=True)
    tags = Column(JSON, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
