# 攻略内容模块 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现攻略内容系统，包含攻略 CRUD、搜索标签系统、评论点赞收藏功能，以及前端攻略列表/详情页面。

**Architecture:** 后端提供 REST API，攻略内容使用 Markdown 存储，前端使用 react-markdown 渲染。搜索使用 PostgreSQL tsvector 全文检索。评论/点赞/收藏通过 target_type + target_id 多态关联。

**Tech Stack:** FastAPI, SQLAlchemy, PostgreSQL tsvector, Next.js 15, react-markdown, TailwindCSS

---

## 文件结构

```
backend/
├── app/
│   ├── guide/
│   │   ├── __init__.py
│   │   ├── router.py
│   │   ├── service.py
│   │   └── schemas.py
│   ├── comment/
│   │   ├── __init__.py
│   │   ├── router.py
│   │   ├── service.py
│   │   └── schemas.py
│   └── main.py

frontend/
├── src/
│   ├── app/
│   │   └── guides/
│   │       ├── page.tsx           # 攻略列表
│   │       └── [slug]/
│   │           └── page.tsx       # 攻略详情
│   ├── components/
│   │   ├── guide/
│   │   │   ├── GuideCard.tsx
│   │   │   ├── GuideDetail.tsx
│   │   │   └── GuideSearch.tsx
│   │   └── comment/
│   │       ├── CommentList.tsx
│   │       └── CommentForm.tsx
│   └── hooks/
│       └── useGuides.ts
```

---

### Task 1: 攻略 API — CRUD + 搜索

**Files:**
- Create: `backend/app/guide/__init__.py`
- Create: `backend/app/guide/schemas.py`
- Create: `backend/app/guide/service.py`
- Create: `backend/app/guide/router.py`

- [ ] **Step 1: 创建 guide/schemas.py**

```python
from pydantic import BaseModel
from datetime import datetime


class GuideCreate(BaseModel):
    title: str
    slug: str
    content: str
    cover_url: str | None = None
    guide_type: str  # map_guide/loadout/beginner/patch_notes
    map_id: int | None = None
    tags: list[int] | None = None


class GuideUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    cover_url: str | None = None
    guide_type: str | None = None
    map_id: int | None = None
    tags: list[int] | None = None


class GuideResponse(BaseModel):
    id: int
    title: str
    slug: str
    content: str
    cover_url: str | None
    author_id: int
    guide_type: str
    map_id: int | None
    tags: list[int] | None
    likes_count: int
    comments_count: int
    favorites_count: int
    published_at: datetime | None
    updated_at: datetime

    class Config:
        from_attributes = True


class GuideListItem(BaseModel):
    id: int
    title: str
    slug: str
    cover_url: str | None
    guide_type: str
    likes_count: int
    favorites_count: int
    published_at: datetime | None

    class Config:
        from_attributes = True
```

- [ ] **Step 2: 创建 guide/service.py**

```python
from sqlalchemy import select, func, text, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.guide import Guide
from app.redis import cache_get, cache_set, cache_delete


async def get_guides(
    db: AsyncSession,
    search: str | None = None,
    guide_type: str | None = None,
    map_id: int | None = None,
    tag_id: int | None = None,
    sort: str = "latest",
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Guide], int]:
    query = select(Guide).where(Guide.published_at.isnot(None))
    count_query = select(func.count()).select_from(Guide).where(Guide.published_at.isnot(None))

    if search:
        ts_query = func.plainto_tsquery("simple", search)
        query = query.where(
            or_(
                func.to_tsvector("simple", Guide.title).op("@@")(ts_query),
                func.to_tsvector("simple", Guide.content).op("@@")(ts_query),
            )
        )
        count_query = count_query.where(
            or_(
                func.to_tsvector("simple", Guide.title).op("@@")(ts_query),
                func.to_tsvector("simple", Guide.content).op("@@")(ts_query),
            )
        )

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

    total_result = await db.execute(count_query)
    total = total_result.scalar()

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    guides = list(result.scalars().all())

    return guides, total


async def get_guide_by_slug(db: AsyncSession, slug: str) -> Guide | None:
    cache_key = f"guide:{slug}"
    cached = await cache_get(cache_key)
    if cached:
        import json
        data = json.loads(cached)
        result = await db.execute(select(Guide).where(Guide.slug == slug))
        return result.scalar_one_or_none()

    result = await db.execute(select(Guide).where(Guide.slug == slug))
    guide = result.scalar_one_or_none()
    if guide:
        import json
        await cache_set(cache_key, json.dumps({"id": guide.id}), expire=600)
    return guide


async def create_guide(db: AsyncSession, data: GuideCreate, author_id: int) -> Guide:
    guide = Guide(
        title=data.title,
        slug=data.slug,
        content=data.content,
        cover_url=data.cover_url,
        author_id=author_id,
        guide_type=data.guide_type,
        map_id=data.map_id,
        tags=data.tags,
    )
    db.add(guide)
    await db.flush()
    await db.refresh(guide)
    return guide


async def update_guide(db: AsyncSession, guide_id: int, data: GuideUpdate) -> Guide | None:
    result = await db.execute(select(Guide).where(Guide.id == guide_id))
    guide = result.scalar_one_or_none()
    if not guide:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(guide, field, value)
    await db.flush()
    await db.refresh(guide)
    await cache_delete(f"guide:{guide.slug}")
    return guide


async def delete_guide(db: AsyncSession, guide_id: int) -> bool:
    result = await db.execute(select(Guide).where(Guide.id == guide_id))
    guide = result.scalar_one_or_none()
    if not guide:
        return False
    await cache_delete(f"guide:{guide.slug}")
    await db.delete(guide)
    return True


async def toggle_like(db: AsyncSession, user_id: int, guide_id: int) -> bool:
    from app.models.like import Like
    result = await db.execute(
        select(Like).where(Like.user_id == user_id, Like.target_type == "guide", Like.target_id == guide_id)
    )
    existing = result.scalar_one_or_none()
    if existing:
        await db.delete(existing)
        guide_result = await db.execute(select(Guide).where(Guide.id == guide_id))
        guide = guide_result.scalar_one_or_none()
        if guide:
            guide.likes_count = max(0, guide.likes_count - 1)
        return False
    else:
        like = Like(user_id=user_id, target_type="guide", target_id=guide_id)
        db.add(like)
        guide_result = await db.execute(select(Guide).where(Guide.id == guide_id))
        guide = guide_result.scalar_one_or_none()
        if guide:
            guide.likes_count += 1
        return True


async def toggle_favorite(db: AsyncSession, user_id: int, guide_id: int) -> bool:
    from app.models.favorite import Favorite
    result = await db.execute(
        select(Favorite).where(Favorite.user_id == user_id, Favorite.target_type == "guide", Favorite.target_id == guide_id)
    )
    existing = result.scalar_one_or_none()
    if existing:
        await db.delete(existing)
        guide_result = await db.execute(select(Guide).where(Guide.id == guide_id))
        guide = guide_result.scalar_one_or_none()
        if guide:
            guide.favorites_count = max(0, guide.favorites_count - 1)
        return False
    else:
        fav = Favorite(user_id=user_id, target_type="guide", target_id=guide_id)
        db.add(fav)
        guide_result = await db.execute(select(Guide).where(Guide.id == guide_id))
        guide = guide_result.scalar_one_or_none()
        if guide:
            guide.favorites_count += 1
        return True
```

- [ ] **Step 3: 创建 guide/router.py**

```python
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
async def list_guides(
    search: str | None = None,
    guide_type: str | None = None,
    map_id: int | None = None,
    tag_id: int | None = None,
    sort: str = Query("latest", regex="^(latest|popular|favorites)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    guides, total = await get_guides(db, search, guide_type, map_id, tag_id, sort, page, page_size)
    return PageResponse(
        items=[GuideListItem.model_validate(g) for g in guides],
        total=total,
        page=page,
        page_size=page_size,
        has_next=(page * page_size) < total,
    )


@router.get("/{slug}", response_model=GuideResponse)
async def get_guide(slug: str, db: AsyncSession = Depends(get_db)):
    guide = await get_guide_by_slug(db, slug)
    if not guide:
        raise HTTPException(status_code=404, detail="Guide not found")
    return guide


@router.post("", response_model=GuideResponse, status_code=status.HTTP_201_CREATED)
async def create(data: GuideCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_admin)):
    guide = await create_guide(db, data, user.id)
    return guide


@router.put("/{guide_id}", response_model=GuideResponse)
async def update(guide_id: int, data: GuideUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(require_admin)):
    guide = await update_guide(db, guide_id, data)
    if not guide:
        raise HTTPException(status_code=404, detail="Guide not found")
    return guide


@router.delete("/{guide_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(guide_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(require_admin)):
    deleted = await delete_guide(db, guide_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Guide not found")


@router.post("/{guide_id}/like")
async def like_guide(guide_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    liked = await toggle_like(db, user.id, guide_id)
    return {"liked": liked}


@router.post("/{guide_id}/favorite")
async def favorite_guide(guide_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    favorited = await toggle_favorite(db, user.id, guide_id)
    return {"favorited": favorited}
```

- [ ] **Step 4: 注册路由**

在 `backend/app/main.py` 中添加：

```python
from app.guide.router import router as guide_router
app.include_router(guide_router)
```

- [ ] **Step 5: Commit**

```bash
cd /d/Delta\ Force
git add backend/app/guide/ backend/app/main.py
git commit -m "feat: add guide API with search, like, and favorite"
```

---

### Task 2: 评论 API

**Files:**
- Create: `backend/app/comment/__init__.py`
- Create: `backend/app/comment/schemas.py`
- Create: `backend/app/comment/service.py`
- Create: `backend/app/comment/router.py`

- [ ] **Step 1: 创建 comment/schemas.py**

```python
from pydantic import BaseModel
from datetime import datetime


class CommentCreate(BaseModel):
    target_type: str  # guide/map_point
    target_id: int
    content: str
    parent_id: int | None = None


class CommentResponse(BaseModel):
    id: int
    user_id: int
    username: str
    avatar_url: str | None
    target_type: str
    target_id: int
    content: str
    parent_id: int | None
    likes_count: int
    created_at: datetime
    replies: list["CommentResponse"] = []

    class Config:
        from_attributes = True
```

- [ ] **Step 2: 创建 comment/service.py**

```python
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.comment import Comment
from app.models.user import User


async def get_comments(db: AsyncSession, target_type: str, target_id: int) -> list[dict]:
    result = await db.execute(
        select(Comment, User.username, User.avatar_url)
        .join(User, Comment.user_id == User.id)
        .where(Comment.target_type == target_type, Comment.target_id == target_id, Comment.parent_id.is_(None))
        .order_by(Comment.created_at.desc())
    )
    comments = []
    for comment, username, avatar_url in result.all():
        replies_result = await db.execute(
            select(Comment, User.username, User.avatar_url)
            .join(User, Comment.user_id == User.id)
            .where(Comment.parent_id == comment.id)
            .order_by(Comment.created_at.asc())
        )
        replies = [
            {
                "id": r.id,
                "user_id": r.user_id,
                "username": u,
                "avatar_url": a,
                "target_type": r.target_type,
                "target_id": r.target_id,
                "content": r.content,
                "parent_id": r.parent_id,
                "likes_count": r.likes_count,
                "created_at": r.created_at.isoformat(),
                "replies": [],
            }
            for r, u, a in replies_result.all()
        ]
        comments.append({
            "id": comment.id,
            "user_id": comment.user_id,
            "username": username,
            "avatar_url": avatar_url,
            "target_type": comment.target_type,
            "target_id": comment.target_id,
            "content": comment.content,
            "parent_id": comment.parent_id,
            "likes_count": comment.likes_count,
            "created_at": comment.created_at.isoformat(),
            "replies": replies,
        })
    return comments


async def create_comment(db: AsyncSession, user_id: int, data) -> Comment:
    comment = Comment(
        user_id=user_id,
        target_type=data.target_type,
        target_id=data.target_id,
        content=data.content,
        parent_id=data.parent_id,
    )
    db.add(comment)
    await db.flush()
    await db.refresh(comment)

    # Update count on target
    if data.target_type == "guide":
        from app.models.guide import Guide
        result = await db.execute(select(Guide).where(Guide.id == data.target_id))
        guide = result.scalar_one_or_none()
        if guide:
            guide.comments_count += 1

    return comment


async def delete_comment(db: AsyncSession, comment_id: int, user_id: int) -> bool:
    result = await db.execute(select(Comment).where(Comment.id == comment_id))
    comment = result.scalar_one_or_none()
    if not comment or comment.user_id != user_id:
        return False
    await db.delete(comment)
    return True
```

- [ ] **Step 3: 创建 comment/router.py**

```python
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.comment.schemas import CommentCreate
from app.comment.service import get_comments, create_comment, delete_comment

router = APIRouter(prefix="/api/comments", tags=["comments"])


@router.get("")
async def list_comments(
    target_type: str = Query(...),
    target_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
):
    return await get_comments(db, target_type, target_id)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create(data: CommentCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    comment = await create_comment(db, user.id, data)
    return {"id": comment.id, "message": "created"}


@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(comment_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    deleted = await delete_comment(db, comment_id, user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Comment not found or not authorized")
```

- [ ] **Step 4: 注册路由**

在 `backend/app/main.py` 中添加：

```python
from app.comment.router import router as comment_router
app.include_router(comment_router)
```

- [ ] **Step 5: Commit**

```bash
cd /d/Delta\ Force
git add backend/app/comment/ backend/app/main.py
git commit -m "feat: add comment API with nested replies"
```

---

### Task 3: 前端攻略列表页

**Files:**
- Create: `frontend/src/app/guides/page.tsx`
- Create: `frontend/src/components/guide/GuideCard.tsx`
- Create: `frontend/src/components/guide/GuideSearch.tsx`
- Create: `frontend/src/hooks/useGuides.ts`

- [ ] **Step 1: 创建 useGuides.ts**

```typescript
"use client";

import { useState, useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Guide {
  id: number;
  title: string;
  slug: string;
  cover_url: string | null;
  guide_type: string;
  likes_count: number;
  favorites_count: number;
  published_at: string | null;
}

interface PageData {
  items: Guide[];
  total: number;
  page: number;
  has_next: boolean;
}

export function useGuides() {
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [guideType, setGuideType] = useState<string>("");
  const [sort, setSort] = useState("latest");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (guideType) params.set("guide_type", guideType);
    params.set("sort", sort);
    params.set("page", String(page));
    params.set("page_size", "20");

    fetch(`${API_BASE}/api/guides?${params}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [search, guideType, sort, page]);

  return { data, loading, search, setSearch, guideType, setGuideType, sort, setSort, page, setPage };
}
```

- [ ] **Step 2: 创建 GuideCard.tsx**

```tsx
interface GuideCardProps {
  title: string;
  slug: string;
  coverUrl: string | null;
  guideType: string;
  likesCount: number;
  publishedAt: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  map_guide: "地图攻略",
  loadout: "配装推荐",
  beginner: "新手入门",
  patch_notes: "版本日志",
};

export default function GuideCard({ title, slug, coverUrl, guideType, likesCount, publishedAt }: GuideCardProps) {
  return (
    <a href={`/guides/${slug}`} className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {coverUrl ? (
        <img src={coverUrl} alt={title} className="w-full h-40 object-cover" />
      ) : (
        <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400">暂无封面</div>
      )}
      <div className="p-4">
        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">{TYPE_LABELS[guideType] || guideType}</span>
        <h3 className="font-semibold mt-2 line-clamp-2">{title}</h3>
        <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
          <span>{publishedAt ? new Date(publishedAt).toLocaleDateString("zh-CN") : ""}</span>
          <span>👍 {likesCount}</span>
        </div>
      </div>
    </a>
  );
}
```

- [ ] **Step 3: 创建 GuideSearch.tsx**

```tsx
interface GuideSearchProps {
  search: string;
  onSearchChange: (v: string) => void;
  guideType: string;
  onTypeChange: (v: string) => void;
  sort: string;
  onSortChange: (v: string) => void;
}

export default function GuideSearch({ search, onSearchChange, guideType, onTypeChange, sort, onSortChange }: GuideSearchProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <input
        type="text"
        placeholder="搜索攻略..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="flex-1 border rounded-lg px-4 py-2"
      />
      <select
        value={guideType}
        onChange={(e) => onTypeChange(e.target.value)}
        className="border rounded-lg px-4 py-2"
      >
        <option value="">全部类型</option>
        <option value="map_guide">地图攻略</option>
        <option value="loadout">配装推荐</option>
        <option value="beginner">新手入门</option>
        <option value="patch_notes">版本日志</option>
      </select>
      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value)}
        className="border rounded-lg px-4 py-2"
      >
        <option value="latest">最新</option>
        <option value="popular">最热</option>
        <option value="favorites">最多收藏</option>
      </select>
    </div>
  );
}
```

- [ ] **Step 4: 创建攻略列表页 frontend/src/app/guides/page.tsx**

```tsx
"use client";

import { useGuides } from "@/hooks/useGuides";
import GuideCard from "@/components/guide/GuideCard";
import GuideSearch from "@/components/guide/GuideSearch";

export default function GuidesPage() {
  const { data, loading, search, setSearch, guideType, setGuideType, sort, setSort, page, setPage } = useGuides();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">攻略中心</h1>
      <GuideSearch
        search={search}
        onSearchChange={setSearch}
        guideType={guideType}
        onTypeChange={setGuideType}
        sort={sort}
        onSortChange={setSort}
      />
      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : data?.items.length === 0 ? (
        <div className="text-center py-12 text-gray-400">暂无攻略</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {data?.items.map((guide) => (
              <GuideCard
                key={guide.id}
                title={guide.title}
                slug={guide.slug}
                coverUrl={guide.cover_url}
                guideType={guide.guide_type}
                likesCount={guide.likes_count}
                publishedAt={guide.published_at}
              />
            ))}
          </div>
          <div className="flex justify-center gap-4 mt-8">
            {page > 1 && (
              <button onClick={() => setPage(page - 1)} className="px-4 py-2 border rounded">上一页</button>
            )}
            {data?.has_next && (
              <button onClick={() => setPage(page + 1)} className="px-4 py-2 border rounded">下一页</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
cd /d/Delta\ Force
git add frontend/src/app/guides/ frontend/src/components/guide/ frontend/src/hooks/
git commit -m "feat: add guides list page with search and filtering"
```

---

### Task 4: 前端攻略详情页 + 评论

**Files:**
- Create: `frontend/src/app/guides/[slug]/page.tsx`
- Create: `frontend/src/components/guide/GuideDetail.tsx`
- Create: `frontend/src/components/comment/CommentList.tsx`
- Create: `frontend/src/components/comment/CommentForm.tsx`

- [ ] **Step 1: 创建 GuideDetail.tsx**

```tsx
import ReactMarkdown from "react-markdown";

interface GuideDetailProps {
  title: string;
  content: string;
  authorId: number;
  guideType: string;
  likesCount: number;
  favoritesCount: number;
  publishedAt: string | null;
  onLike: () => void;
  onFavorite: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  map_guide: "地图攻略",
  loadout: "配装推荐",
  beginner: "新手入门",
  patch_notes: "版本日志",
};

export default function GuideDetail({
  title, content, guideType, likesCount, favoritesCount, publishedAt, onLike, onFavorite,
}: GuideDetailProps) {
  return (
    <article className="max-w-3xl mx-auto">
      <header className="mb-8">
        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">{TYPE_LABELS[guideType]}</span>
        <h1 className="text-3xl font-bold mt-2">{title}</h1>
        <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
          {publishedAt && <span>{new Date(publishedAt).toLocaleDateString("zh-CN")}</span>}
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={onLike} className="px-4 py-2 border rounded hover:bg-gray-50">👍 {likesCount}</button>
          <button onClick={onFavorite} className="px-4 py-2 border rounded hover:bg-gray-50">⭐ {favoritesCount}</button>
        </div>
      </header>
      <div className="prose prose-lg max-w-none">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </article>
  );
}
```

- [ ] **Step 2: 创建 CommentList.tsx + CommentForm.tsx**

```tsx
// CommentList.tsx
interface Comment {
  id: number;
  user_id: number;
  username: string;
  avatar_url: string | null;
  content: string;
  likes_count: number;
  created_at: string;
  replies: Comment[];
}

interface CommentListProps {
  comments: Comment[];
}

export default function CommentList({ comments }: CommentListProps) {
  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <div key={comment.id} className="border-b pb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm">
              {comment.username[0]}
            </div>
            <span className="font-medium text-sm">{comment.username}</span>
            <span className="text-xs text-gray-400">{new Date(comment.created_at).toLocaleString("zh-CN")}</span>
          </div>
          <p className="text-gray-700 ml-10">{comment.content}</p>
          {comment.replies.length > 0 && (
            <div className="ml-10 mt-3 space-y-3 border-l-2 border-gray-100 pl-4">
              {comment.replies.map((reply) => (
                <div key={reply.id}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{reply.username}</span>
                    <span className="text-xs text-gray-400">{new Date(reply.created_at).toLocaleString("zh-CN")}</span>
                  </div>
                  <p className="text-gray-700 text-sm">{reply.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

```tsx
// CommentForm.tsx
import { useState } from "react";

interface CommentFormProps {
  onSubmit: (content: string) => void;
}

export default function CommentForm({ onSubmit }: CommentFormProps) {
  const [content, setContent] = useState("");

  return (
    <div className="flex gap-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="发表评论..."
        className="flex-1 border rounded-lg px-4 py-2 resize-none"
        rows={2}
      />
      <button
        onClick={() => {
          if (content.trim()) {
            onSubmit(content);
            setContent("");
          }
        }}
        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 self-end"
      >
        发送
      </button>
    </div>
  );
}
```

- [ ] **Step 3: 创建攻略详情页 frontend/src/app/guides/[slug]/page.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import GuideDetail from "@/components/guide/GuideDetail";
import CommentList from "@/components/comment/CommentList";
import CommentForm from "@/components/comment/CommentForm";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function GuideDetailPage() {
  const { slug } = useParams();
  const [guide, setGuide] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/guides/${slug}`).then((r) => r.json()).then(setGuide);
    fetch(`${API_BASE}/api/comments?target_type=guide&target_id=${slug}`).then((r) => r.json()).then(setComments);
  }, [slug]);

  const handleLike = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const res = await fetch(`${API_BASE}/api/guides/${guide.id}/like`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setGuide((prev: any) => ({
      ...prev,
      likes_count: data.liked ? prev.likes_count + 1 : prev.likes_count - 1,
    }));
  };

  const handleFavorite = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const res = await fetch(`${API_BASE}/api/guides/${guide.id}/favorite`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setGuide((prev: any) => ({
      ...prev,
      favorites_count: data.favorited ? prev.favorites_count + 1 : prev.favorites_count - 1,
    }));
  };

  const handleComment = async (content: string) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    await fetch(`${API_BASE}/api/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ target_type: "guide", target_id: guide.id, content }),
    });
    // Refresh comments
    fetch(`${API_BASE}/api/comments?target_type=guide&target_id=${guide.id}`).then((r) => r.json()).then(setComments);
  };

  if (!guide) return <div className="text-center py-12">加载中...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <GuideDetail
        title={guide.title}
        content={guide.content}
        authorId={guide.author_id}
        guideType={guide.guide_type}
        likesCount={guide.likes_count}
        favoritesCount={guide.favorites_count}
        publishedAt={guide.published_at}
        onLike={handleLike}
        onFavorite={handleFavorite}
      />
      <section className="mt-12 border-t pt-8">
        <h2 className="text-xl font-bold mb-4">评论 ({comments.length})</h2>
        <CommentForm onSubmit={handleComment} />
        <div className="mt-6">
          <CommentList comments={comments} />
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd /d/Delta\ Force
git add frontend/src/app/guides/ frontend/src/components/guide/ frontend/src/components/comment/
git commit -m "feat: add guide detail page with comments and like/favorite"
```
