# 用户系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现用户系统前端页面，包含登录/注册页面、个人主页（收藏列表、评论历史），以及前端认证状态管理。

**Architecture:** 前端使用 Zustand 管理认证状态（token 存储在 localStorage），通过 API 调用后端认证接口。个人主页展示用户的收藏和评论历史。

**Tech Stack:** Next.js 15, Zustand, TailwindCSS

---

## 文件结构

```
frontend/
├── src/
│   ├── app/
│   │   ├── login/
│   │   │   └── page.tsx           # 登录页
│   │   ├── register/
│   │   │   └── page.tsx           # 注册页
│   │   └── profile/
│   │       └── page.tsx           # 个人主页
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   └── RegisterForm.tsx
│   │   └── profile/
│   │       ├── FavoriteList.tsx
│   │       └── CommentHistory.tsx
│   ├── stores/
│   │   └── authStore.ts
│   └── hooks/
│       └── useAuth.ts
```

---

### Task 1: 前端认证状态管理

**Files:**
- Create: `frontend/src/stores/authStore.ts`
- Create: `frontend/src/hooks/useAuth.ts`

- [ ] **Step 1: 创建 authStore.ts**

```typescript
import { create } from "zustand";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface User {
  id: number;
  username: string;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  init: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  loading: true,

  init: () => {
    const token = localStorage.getItem("access_token");
    if (token) {
      set({ token });
      get().fetchUser();
    } else {
      set({ loading: false });
    }
  },

  login: async (email, password) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error("登录失败");
    const data = await res.json();
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    set({ token: data.access_token });
    await get().fetchUser();
  },

  register: async (username, email, password) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });
    if (!res.ok) throw new Error("注册失败");
    const data = await res.json();
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    set({ token: data.access_token });
    await get().fetchUser();
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    set({ user: null, token: null });
  },

  fetchUser: async () => {
    const token = get().token;
    if (!token) {
      set({ loading: false });
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const user = await res.json();
      set({ user, loading: false });
    } catch {
      localStorage.removeItem("access_token");
      set({ user: null, token: null, loading: false });
    }
  },
}));
```

- [ ] **Step 2: 创建 useAuth.ts**

```typescript
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

export function useRequireAuth() {
  const { user, loading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  return { user, loading };
}

export function useAuthInit() {
  const init = useAuthStore((s) => s.init);
  useEffect(() => {
    init();
  }, [init]);
}
```

- [ ] **Step 3: Commit**

```bash
cd /d/Delta\ Force
git add frontend/src/stores/authStore.ts frontend/src/hooks/useAuth.ts
git commit -m "feat: add auth store and hooks"
```

---

### Task 2: 登录/注册页面

**Files:**
- Create: `frontend/src/app/login/page.tsx`
- Create: `frontend/src/app/register/page.tsx`
- Create: `frontend/src/components/auth/LoginForm.tsx`
- Create: `frontend/src/components/auth/RegisterForm.tsx`

- [ ] **Step 1: 创建 LoginForm.tsx**

```tsx
"use client";

import { useState } from "react";

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  error: string | null;
}

export default function LoginForm({ onSubmit, error }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(email, password);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-red-500 text-sm">{error}</div>}
      <div>
        <label className="block text-sm font-medium mb-1">邮箱</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border rounded-lg px-4 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">密码</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full border rounded-lg px-4 py-2"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? "登录中..." : "登录"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: 创建 RegisterForm.tsx**

```tsx
"use client";

import { useState } from "react";

interface RegisterFormProps {
  onSubmit: (username: string, email: string, password: string) => Promise<void>;
  error: string | null;
}

export default function RegisterForm({ onSubmit, error }: RegisterFormProps) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(username, email, password);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-red-500 text-sm">{error}</div>}
      <div>
        <label className="block text-sm font-medium mb-1">昵称</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="w-full border rounded-lg px-4 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">邮箱</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border rounded-lg px-4 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">密码</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full border rounded-lg px-4 py-2"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? "注册中..." : "注册"}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: 创建 login/page.tsx**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const login = useAuthStore((s) => s.login);
  const router = useRouter();

  const handleSubmit = async (email: string, password: string) => {
    try {
      setError(null);
      await login(email, password);
      router.push("/");
    } catch {
      setError("邮箱或密码错误");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-8">登录</h1>
        <LoginForm onSubmit={handleSubmit} error={error} />
        <p className="text-center mt-4 text-sm text-gray-600">
          还没有账号？{" "}
          <Link href="/register" className="text-blue-500 hover:underline">注册</Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 创建 register/page.tsx**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import RegisterForm from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const register = useAuthStore((s) => s.register);
  const router = useRouter();

  const handleSubmit = async (username: string, email: string, password: string) => {
    try {
      setError(null);
      await register(username, email, password);
      router.push("/");
    } catch {
      setError("注册失败，邮箱可能已被使用");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-8">注册</h1>
        <RegisterForm onSubmit={handleSubmit} error={error} />
        <p className="text-center mt-4 text-sm text-gray-600">
          已有账号？{" "}
          <Link href="/login" className="text-blue-500 hover:underline">登录</Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
cd /d/Delta\ Force
git add frontend/src/app/login/ frontend/src/app/register/ frontend/src/components/auth/
git commit -m "feat: add login and register pages"
```

---

### Task 3: 用户后端 API — 收藏列表 + 评论历史

**Files:**
- Create: `backend/app/user/router.py`

- [ ] **Step 1: 创建 user/router.py**

```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.favorite import Favorite
from app.models.like import Like
from app.models.comment import Comment
from app.models.guide import Guide

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me/favorites")
async def get_favorites(
    target_type: str = Query("guide"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = (
        select(Favorite)
        .where(Favorite.user_id == user.id, Favorite.target_type == target_type)
        .order_by(Favorite.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    favorites = result.scalars().all()

    items = []
    for fav in favorites:
        if target_type == "guide":
            guide_result = await db.execute(select(Guide).where(Guide.id == fav.target_id))
            guide = guide_result.scalar_one_or_none()
            if guide:
                items.append({
                    "id": guide.id,
                    "title": guide.title,
                    "slug": guide.slug,
                    "cover_url": guide.cover_url,
                    "guide_type": guide.guide_type,
                    "favorited_at": fav.created_at.isoformat(),
                })
        else:
            items.append({
                "target_id": fav.target_id,
                "target_type": fav.target_type,
                "favorited_at": fav.created_at.isoformat(),
            })

    return {"items": items, "page": page, "page_size": page_size}


@router.get("/me/comments")
async def get_my_comments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = (
        select(Comment)
        .where(Comment.user_id == user.id)
        .order_by(Comment.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    comments = result.scalars().all()

    return {
        "items": [
            {
                "id": c.id,
                "target_type": c.target_type,
                "target_id": c.target_id,
                "content": c.content,
                "created_at": c.created_at.isoformat(),
            }
            for c in comments
        ],
        "page": page,
        "page_size": page_size,
    }
```

- [ ] **Step 2: 注册路由**

在 `backend/app/main.py` 中添加：

```python
from app.user.router import router as user_router
app.include_router(user_router)
```

- [ ] **Step 3: Commit**

```bash
cd /d/Delta\ Force
git add backend/app/user/ backend/app/main.py
git commit -m "feat: add user favorites and comments API"
```

---

### Task 4: 个人主页

**Files:**
- Create: `frontend/src/app/profile/page.tsx`
- Create: `frontend/src/components/profile/FavoriteList.tsx`
- Create: `frontend/src/components/profile/CommentHistory.tsx`

- [ ] **Step 1: 创建 FavoriteList.tsx**

```tsx
interface Favorite {
  id: number;
  title: string;
  slug: string;
  cover_url: string | null;
  guide_type: string;
  favorited_at: string;
}

interface FavoriteListProps {
  items: Favorite[];
}

const TYPE_LABELS: Record<string, string> = {
  map_guide: "地图攻略",
  loadout: "配装推荐",
  beginner: "新手入门",
  patch_notes: "版本日志",
};

export default function FavoriteList({ items }: FavoriteListProps) {
  if (items.length === 0) {
    return <div className="text-center py-8 text-gray-400">暂无收藏</div>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <a
          key={item.id}
          href={`/guides/${item.slug}`}
          className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50"
        >
          {item.cover_url ? (
            <img src={item.cover_url} alt="" className="w-16 h-16 object-cover rounded" />
          ) : (
            <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">无封面</div>
          )}
          <div className="flex-1">
            <h3 className="font-medium">{item.title}</h3>
            <span className="text-xs text-gray-500">{TYPE_LABELS[item.guide_type]}</span>
          </div>
          <span className="text-xs text-gray-400">{new Date(item.favorited_at).toLocaleDateString("zh-CN")}</span>
        </a>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: 创建 CommentHistory.tsx**

```tsx
interface CommentItem {
  id: number;
  target_type: string;
  target_id: number;
  content: string;
  created_at: string;
}

interface CommentHistoryProps {
  items: CommentItem[];
}

export default function CommentHistory({ items }: CommentHistoryProps) {
  if (items.length === 0) {
    return <div className="text-center py-8 text-gray-400">暂无评论</div>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="p-3 border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">
              评论于 {item.target_type === "guide" ? "攻略" : "标注点"} #{item.target_id}
            </span>
            <span className="text-xs text-gray-400">{new Date(item.created_at).toLocaleString("zh-CN")}</span>
          </div>
          <p className="text-gray-700">{item.content}</p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: 创建 profile/page.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRequireAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/stores/authStore";
import FavoriteList from "@/components/profile/FavoriteList";
import CommentHistory from "@/components/profile/CommentHistory";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ProfilePage() {
  const { user, loading: authLoading } = useRequireAuth();
  const logout = useAuthStore((s) => s.logout);
  const [activeTab, setActiveTab] = useState<"favorites" | "comments">("favorites");
  const [favorites, setFavorites] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;

    setLoading(true);
    const headers = { Authorization: `Bearer ${token}` };

    if (activeTab === "favorites") {
      fetch(`${API_BASE}/api/users/me/favorites?target_type=guide`, { headers })
        .then((r) => r.json())
        .then((data) => setFavorites(data.items || []))
        .finally(() => setLoading(false));
    } else {
      fetch(`${API_BASE}/api/users/me/comments`, { headers })
        .then((r) => r.json())
        .then((data) => setComments(data.items || []))
        .finally(() => setLoading(false));
    }
  }, [user, activeTab]);

  if (authLoading || !user) {
    return <div className="text-center py-12">加载中...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* User info */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            user.username[0]
          )}
        </div>
        <div>
          <h1 className="text-xl font-bold">{user.username}</h1>
          <p className="text-sm text-gray-500">{user.email}</p>
          {user.bio && <p className="text-sm text-gray-600 mt-1">{user.bio}</p>}
        </div>
        <button onClick={logout} className="ml-auto px-4 py-2 border rounded-lg text-sm text-red-500 hover:bg-red-50">
          退出登录
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button
          onClick={() => setActiveTab("favorites")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "favorites" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500"
          }`}
        >
          收藏攻略
        </button>
        <button
          onClick={() => setActiveTab("comments")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "comments" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500"
          }`}
        >
          我的评论
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">加载中...</div>
      ) : activeTab === "favorites" ? (
        <FavoriteList items={favorites} />
      ) : (
        <CommentHistory items={comments} />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd /d/Delta\ Force
git add frontend/src/app/profile/ frontend/src/components/profile/
git commit -m "feat: add profile page with favorites and comments"
```
