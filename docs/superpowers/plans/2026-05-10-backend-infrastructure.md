# 后端基础设施 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建 FastAPI 后端骨架，包含项目结构、数据库连接、ORM 模型、Redis 缓存、JWT 认证、CORS 配置，为后续功能模块提供基础设施。

**Architecture:** FastAPI 应用采用分层架构：router（路由）→ service（业务逻辑）→ repository（数据访问）。数据库使用 SQLAlchemy 2.0 + GeoAlchemy2，缓存使用 Redis，认证使用 JWT。

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2.0, GeoAlchemy2, PostgreSQL 15, PostGIS, Redis, python-jose, Alembic, pytest

---

## 文件结构

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI 应用入口
│   ├── config.py                # 配置管理（环境变量）
│   ├── database.py              # 数据库连接 + Session 管理
│   ├── redis.py                 # Redis 连接
│   ├── auth/
│   │   ├── __init__.py
│   │   ├── router.py            # 认证路由（注册/登录/刷新）
│   │   ├── service.py           # 认证业务逻辑
│   │   ├── dependencies.py      # 认证依赖注入（get_current_user）
│   │   └── schemas.py           # Pydantic 模型
│   ├── models/
│   │   ├── __init__.py
│   │   ├── base.py              # Base 声明
│   │   ├── user.py              # User 模型
│   │   ├── map.py               # Map + MapPoint 模型
│   │   ├── guide.py             # Guide 模型
│   │   ├── tag.py               # Tag 模型
│   │   ├── weapon.py            # Weapon + Attachment 模型
│   │   ├── favorite.py          # Favorite 模型
│   │   ├── like.py              # Like 模型
│   │   └── comment.py           # Comment 模型
│   └── schemas/
│       ├── __init__.py
│       └── common.py            # 通用响应模型
├── alembic/
│   ├── env.py
│   └── versions/
├── alembic.ini
├── tests/
│   ├── __init__.py
│   ├── conftest.py              # 测试 fixtures
│   └── test_auth.py
├── requirements.txt
└── .env.example
```

---

### Task 1: 项目初始化 + 依赖安装

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/.env.example`
- Create: `backend/app/__init__.py`
- Create: `backend/app/config.py`

- [ ] **Step 1: 创建 requirements.txt**

```txt
fastapi==0.115.0
uvicorn[standard]==0.30.0
sqlalchemy[asyncio]==2.0.35
asyncpg==0.29.0
geoalchemy2==0.15.2
alembic==1.13.0
redis[hiredis]==5.1.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.12
pydantic[email-validator]==2.9.0
pydantic-settings==2.5.0
httpx==0.27.0
pytest==8.3.0
pytest-asyncio==0.24.0
httpx==0.27.0
```

- [ ] **Step 2: 创建 .env.example**

```env
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/delta_force
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
CORS_ORIGINS=["http://localhost:3000"]
```

- [ ] **Step 3: 创建 config.py**

```python
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/delta_force"
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"


settings = Settings()
```

- [ ] **Step 4: 安装依赖并验证**

Run: `cd backend && pip install -r requirements.txt`
Expected: 成功安装所有依赖

- [ ] **Step 5: Commit**

```bash
cd /d/Delta\ Force
git add backend/requirements.txt backend/.env.example backend/app/__init__.py backend/app/config.py
git commit -m "feat: initialize backend project with dependencies"
```

---

### Task 2: 数据库连接 + SQLAlchemy Base

**Files:**
- Create: `backend/app/database.py`
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/models/base.py`

- [ ] **Step 1: 创建 database.py**

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```

- [ ] **Step 2: 创建 models/base.py**

```python
from app.database import Base

__all__ = ["Base"]
```

- [ ] **Step 3: Commit**

```bash
cd /d/Delta\ Force
git add backend/app/database.py backend/app/models/__init__.py backend/app/models/base.py
git commit -m "feat: add database connection and SQLAlchemy base"
```

---

### Task 3: Redis 连接

**Files:**
- Create: `backend/app/redis.py`

- [ ] **Step 1: 创建 redis.py**

```python
import redis.asyncio as redis
from app.config import settings

redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)


async def get_redis() -> redis.Redis:
    return redis_client


async def cache_get(key: str) -> str | None:
    return await redis_client.get(key)


async def cache_set(key: str, value: str, expire: int = 300) -> None:
    await redis_client.set(key, value, ex=expire)


async def cache_delete(key: str) -> None:
    await redis_client.delete(key)
```

- [ ] **Step 2: Commit**

```bash
cd /d/Delta\ Force
git add backend/app/redis.py
git commit -m "feat: add Redis connection and cache utilities"
```

---

### Task 4: User 模型

**Files:**
- Create: `backend/app/models/user.py`

- [ ] **Step 1: 创建 user.py 模型**

```python
from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, func
from app.models.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), nullable=False)
    email = Column(String(100), unique=True, nullable=False, index=True)
    phone = Column(String(20), unique=True, nullable=True)
    password_hash = Column(String(255), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    bio = Column(Text, nullable=True)
    role = Column(String(20), default="user", nullable=False)  # user / admin
    created_at = Column(TIMESTAMP, server_default=func.now())
```

- [ ] **Step 2: Commit**

```bash
cd /d/Delta\ Force
git add backend/app/models/user.py
git commit -m "feat: add User model"
```

---

### Task 5: 其他 ORM 模型

**Files:**
- Create: `backend/app/models/map.py`
- Create: `backend/app/models/guide.py`
- Create: `backend/app/models/tag.py`
- Create: `backend/app/models/weapon.py`
- Create: `backend/app/models/favorite.py`
- Create: `backend/app/models/like.py`
- Create: `backend/app/models/comment.py`

- [ ] **Step 1: 创建 map.py**

```python
from sqlalchemy import Column, Integer, String, Text, JSON, func, TIMESTAMP
from geoalchemy2 import Geometry
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
    category = Column(String(20), nullable=False, index=True)  # spawn/resource/tactical/extraction/danger
    geometry = Column(Geometry("POINT", srid=4326), nullable=False)
    image_url = Column(String(500), nullable=True)
    tags = Column(JSON, nullable=True)  # [tag_id, ...]
    created_at = Column(TIMESTAMP, server_default=func.now())
```

- [ ] **Step 2: 创建 guide.py**

```python
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
    guide_type = Column(String(20), nullable=False, index=True)  # map_guide/loadout/beginner/patch_notes
    map_id = Column(Integer, nullable=True, index=True)
    tags = Column(JSON, nullable=True)  # [tag_id, ...]
    likes_count = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    favorites_count = Column(Integer, default=0)
    published_at = Column(TIMESTAMP, nullable=True)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
```

- [ ] **Step 3: 创建 tag.py**

```python
from sqlalchemy import Column, Integer, String
from app.models.base import Base


class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False)
    category = Column(String(20), nullable=False, index=True)  # map/mode/difficulty/type
    slug = Column(String(50), unique=True, nullable=False, index=True)
```

- [ ] **Step 4: 创建 weapon.py**

```python
from sqlalchemy import Column, String, Integer, JSON
from app.models.base import Base


class Weapon(Base):
    __tablename__ = "weapons"

    id = Column(String(50), primary_key=True)  # m4a1
    name = Column(String(100), nullable=False)
    category = Column(String(20), nullable=False, index=True)  # 突击步枪/冲锋枪/狙击枪/...
    image_url = Column(String(500), nullable=True)
    model_url = Column(String(500), nullable=True)  # glTF/GLB
    base_stats = Column(JSON, nullable=False)  # {damage, fire_rate, accuracy, recoil, mobility, range}
    slots = Column(JSON, nullable=False)  # ["muzzle", "grip", "magazine", "stock", "sight"]


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    slot = Column(String(20), nullable=False, index=True)
    image_url = Column(String(500), nullable=True)
    effects = Column(JSON, nullable=False)  # {accuracy: 2, recoil: -3}
```

- [ ] **Step 5: 创建 favorite.py**

```python
from sqlalchemy import Column, Integer, String, TIMESTAMP, func, UniqueConstraint
from app.models.base import Base


class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True)
    target_type = Column(String(20), nullable=False)  # guide/map_point
    target_id = Column(Integer, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "target_type", "target_id", name="uq_favorite"),
    )
```

- [ ] **Step 6: 创建 like.py**

```python
from sqlalchemy import Column, Integer, String, TIMESTAMP, func, UniqueConstraint
from app.models.base import Base


class Like(Base):
    __tablename__ = "likes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True)
    target_type = Column(String(20), nullable=False)  # guide/comment
    target_id = Column(Integer, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "target_type", "target_id", name="uq_like"),
    )
```

- [ ] **Step 7: 创建 comment.py**

```python
from sqlalchemy import Column, Integer, Text, String, TIMESTAMP, func, ForeignKey
from app.models.base import Base


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True)
    target_type = Column(String(20), nullable=False)  # guide/map_point
    target_id = Column(Integer, nullable=False, index=True)
    content = Column(Text, nullable=False)
    parent_id = Column(Integer, ForeignKey("comments.id"), nullable=True)
    likes_count = Column(Integer, default=0)
    created_at = Column(TIMESTAMP, server_default=func.now())
```

- [ ] **Step 8: Commit**

```bash
cd /d/Delta\ Force
git add backend/app/models/
git commit -m "feat: add all ORM models (map, guide, tag, weapon, favorite, like, comment)"
```

---

### Task 6: Alembic 迁移配置

**Files:**
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/script.py.mako`

- [ ] **Step 1: 初始化 Alembic**

Run: `cd /d/Delta\ Force/backend && alembic init alembic`
Expected: 创建 alembic/ 目录和 alembic.ini

- [ ] **Step 2: 修改 alembic.ini 数据库 URL**

```ini
sqlalchemy.url = postgresql+asyncpg://postgres:password@localhost:5432/delta_force
```

- [ ] **Step 3: 修改 alembic/env.py 支持异步 + PostGIS**

```python
import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context

from app.database import Base
from app.models import user, map, guide, tag, weapon, favorite, like, comment

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations():
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

- [ ] **Step 4: 生成初始迁移**

Run: `cd /d/Delta\ Force/backend && alembic revision --autogenerate -m "initial schema"`
Expected: 生成迁移文件

- [ ] **Step 5: 执行迁移（需要 PostgreSQL 运行）**

Run: `cd /d/Delta\ Force/backend && alembic upgrade head`
Expected: 创建所有表

- [ ] **Step 6: Commit**

```bash
cd /d/Delta\ Force
git add backend/alembic.ini backend/alembic/
git commit -m "feat: add Alembic migration config with async support"
```

---

### Task 7: JWT 认证 — 注册/登录 API

**Files:**
- Create: `backend/app/auth/__init__.py`
- Create: `backend/app/auth/schemas.py`
- Create: `backend/app/auth/service.py`
- Create: `backend/app/auth/router.py`
- Create: `backend/app/auth/dependencies.py`

- [ ] **Step 1: 创建 auth/schemas.py**

```python
from pydantic import BaseModel, EmailStr
from datetime import datetime


class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    avatar_url: str | None
    bio: str | None
    role: str
    created_at: datetime

    class Config:
        from_attributes = True
```

- [ ] **Step 2: 创建 auth/service.py**

```python
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": str(user_id), "exp": expire, "type": "access"}, settings.SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    return jwt.encode({"sub": str(user_id), "exp": expire, "type": "refresh"}, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


async def register_user(db: AsyncSession, username: str, email: str, password: str) -> User:
    user = User(
        username=username,
        email=email,
        password_hash=hash_password(password),
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user and verify_password(password, user.password_hash):
        return user
    return None


async def get_user_by_id(db: AsyncSession, user_id: int) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()
```

- [ ] **Step 3: 创建 auth/dependencies.py**

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth.service import decode_token, get_user_by_id
from app.models.user import User

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_token(credentials.credentials)
    if payload is None or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = await get_user_by_id(db, int(payload["sub"]))
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin required")
    return user
```

- [ ] **Step 4: 创建 auth/router.py**

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth.schemas import UserRegister, UserLogin, TokenResponse, UserResponse
from app.auth.service import register_user, authenticate_user, create_access_token, create_refresh_token, decode_token, get_user_by_id
from app.auth.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    user = await register_user(db, data.username, data.email, data.password)
    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, data.email, data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(token: str, db: AsyncSession = Depends(get_db)):
    payload = decode_token(token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    user = await get_user_by_id(db, int(payload["sub"]))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    return user
```

- [ ] **Step 5: Commit**

```bash
cd /d/Delta\ Force
git add backend/app/auth/
git commit -m "feat: add JWT auth with register/login/refresh endpoints"
```

---

### Task 8: FastAPI 应用入口 + CORS + 路由注册

**Files:**
- Create: `backend/app/main.py`
- Create: `backend/app/schemas/__init__.py`
- Create: `backend/app/schemas/common.py`

- [ ] **Step 1: 创建 main.py**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.auth.router import router as auth_router

app = FastAPI(title="Delta Force Map Guide API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 2: 创建 schemas/common.py**

```python
from pydantic import BaseModel
from typing import Generic, TypeVar

T = TypeVar("T")


class PageResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    has_next: bool
```

- [ ] **Step 3: 启动验证**

Run: `cd /d/Delta\ Force/backend && uvicorn app.main:app --reload --port 8000`
Expected: 服务启动，访问 http://localhost:8000/api/health 返回 `{"status": "ok"}`

- [ ] **Step 4: Commit**

```bash
cd /d/Delta\ Force
git add backend/app/main.py backend/app/schemas/
git commit -m "feat: add FastAPI app entry with CORS and health endpoint"
```

---

### Task 9: 测试基础设施 + 认证测试

**Files:**
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_auth.py`

- [ ] **Step 1: 创建 tests/conftest.py**

```python
import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.main import app
from app.database import Base, get_db

TEST_DATABASE_URL = "postgresql+asyncpg://postgres:password@localhost:5432/delta_force_test"

engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def override_get_db():
    async with TestSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
```

- [ ] **Step 2: 创建 tests/test_auth.py**

```python
import pytest


@pytest.mark.asyncio
async def test_register(client):
    response = await client.post("/api/auth/register", json={
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpassword123"
    })
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    await client.post("/api/auth/register", json={
        "username": "user1",
        "email": "dup@example.com",
        "password": "pass123"
    })
    response = await client.post("/api/auth/register", json={
        "username": "user2",
        "email": "dup@example.com",
        "password": "pass456"
    })
    assert response.status_code in [400, 409, 422]


@pytest.mark.asyncio
async def test_login(client):
    await client.post("/api/auth/register", json={
        "username": "loginuser",
        "email": "login@example.com",
        "password": "mypassword"
    })
    response = await client.post("/api/auth/login", json={
        "email": "login@example.com",
        "password": "mypassword"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    await client.post("/api/auth/register", json={
        "username": "wrongpass",
        "email": "wrong@example.com",
        "password": "correct"
    })
    response = await client.post("/api/auth/login", json={
        "email": "wrong@example.com",
        "password": "wrong"
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me(client):
    reg = await client.post("/api/auth/register", json={
        "username": "meuser",
        "email": "me@example.com",
        "password": "pass123"
    })
    token = reg.json()["access_token"]
    response = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "me@example.com"
    assert data["username"] == "meuser"


@pytest.mark.asyncio
async def test_get_me_no_token(client):
    response = await client.get("/api/auth/me")
    assert response.status_code == 403
```

- [ ] **Step 3: 运行测试**

Run: `cd /d/Delta\ Force/backend && pytest tests/test_auth.py -v`
Expected: 6 passed

- [ ] **Step 4: Commit**

```bash
cd /d/Delta\ Force
git add backend/tests/
git commit -m "test: add auth tests with async test fixtures"
```

---

### Task 10: Docker Compose（PostgreSQL + Redis）

**Files:**
- Create: `docker-compose.yml`

- [ ] **Step 1: 创建 docker-compose.yml**

```yaml
version: "3.9"

services:
  postgres:
    image: postgis/postgis:15-3.3
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: delta_force
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

- [ ] **Step 2: 启动服务**

Run: `cd /d/Delta\ Force && docker-compose up -d`
Expected: PostgreSQL (PostGIS) 和 Redis 启动

- [ ] **Step 3: 创建测试数据库**

Run: `docker exec -it delta-force-postgres-1 psql -U postgres -c "CREATE DATABASE delta_force_test;"`
Expected: 测试数据库创建成功

- [ ] **Step 4: 执行迁移**

Run: `cd /d/Delta\ Force/backend && alembic upgrade head`
Expected: 所有表创建成功

- [ ] **Step 5: Commit**

```bash
cd /d/Delta\ Force
git add docker-compose.yml
git commit -m "feat: add Docker Compose for PostgreSQL + Redis"
```
