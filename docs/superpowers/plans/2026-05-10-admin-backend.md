# 管理后台 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现管理后台前端页面，包含攻略管理、地图标注管理、武器数据管理、标签管理、用户管理、评论管理，使用独立的 layout 和路由，通过 JWT role 字段控制权限。

**Architecture:** 管理后台与用户端共享同一后端 API，前端使用 `/admin/*` 独立路由和 layout。管理员通过 JWT 中的 `role` 字段区分，后端使用 `require_admin` 依赖注入检查权限。

**Tech Stack:** Next.js 15, TailwindCSS, react-markdown (编辑器预览)

---

## 文件结构

```
frontend/
├── src/
│   ├── app/
│   │   └── admin/
│   │       ├── layout.tsx           # 管理后台布局
│   │       ├── page.tsx             # 管理后台首页（仪表盘）
│   │       ├── guides/
│   │       │   ├── page.tsx         # 攻略列表
│   │       │   └── [id]/
│   │       │       └── page.tsx     # 编辑攻略
│   │       ├── maps/
│   │       │   ├── page.tsx         # 地图列表
│   │       │   └── [id]/
│   │       │       └── page.tsx     # 地图标注管理
│   │       ├── weapons/
│   │       │   ├── page.tsx         # 武器列表
│   │       │   └── [id]/
│   │       │       └── page.tsx     # 武器编辑
│   │       ├── tags/
│   │       │   └── page.tsx         # 标签管理
│   │       ├── users/
│   │       │   └── page.tsx         # 用户管理
│   │       └── comments/
│   │           └── page.tsx         # 评论管理
│   └── components/
│       └── admin/
│           ├── AdminSidebar.tsx
│           ├── DataTable.tsx
│           └── MarkdownEditor.tsx
```

---

### Task 1: 管理后台 Layout + 权限守卫

**Files:**
- Create: `frontend/src/app/admin/layout.tsx`
- Create: `frontend/src/components/admin/AdminSidebar.tsx`

- [ ] **Step 1: 创建 AdminSidebar.tsx**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "仪表盘", icon: "📊" },
  { href: "/admin/guides", label: "攻略管理", icon: "📝" },
  { href: "/admin/maps", label: "地图标注", icon: "🗺️" },
  { href: "/admin/weapons", label: "武器数据", icon: "🔫" },
  { href: "/admin/tags", label: "标签管理", icon: "🏷️" },
  { href: "/admin/users", label: "用户管理", icon: "👥" },
  { href: "/admin/comments", label: "评论管理", icon: "💬" },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold">管理后台</h1>
        <p className="text-xs text-gray-400 mt-1">三角洲地图攻略</p>
      </div>
      <nav className="space-y-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
                ? "bg-blue-600 text-white"
                : "text-gray-300 hover:bg-gray-800"
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="mt-8 pt-4 border-t border-gray-700">
        <Link href="/" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white">
          ← 返回前台
        </Link>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: 创建 admin/layout.tsx**

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">加载中...</div>;
  }

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 bg-gray-50 p-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /d/Delta\ Force
git add frontend/src/app/admin/layout.tsx frontend/src/components/admin/AdminSidebar.tsx
git commit -m "feat: add admin layout with sidebar and auth guard"
```

---

### Task 2: 通用组件 — DataTable + MarkdownEditor

**Files:**
- Create: `frontend/src/components/admin/DataTable.tsx`
- Create: `frontend/src/components/admin/MarkdownEditor.tsx`

- [ ] **Step 1: 创建 DataTable.tsx**

```tsx
"use client";

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
}

export default function DataTable<T extends { id: number | string }>({
  columns,
  data,
  loading,
  onEdit,
  onDelete,
}: DataTableProps<T>) {
  if (loading) {
    return <div className="text-center py-8 text-gray-400">加载中...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                {col.label}
              </th>
            ))}
            {(onEdit || onDelete) && <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">操作</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-sm">
                  {col.render ? col.render(item) : (item as any)[col.key]}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td className="px-4 py-3 text-right text-sm space-x-2">
                  {onEdit && (
                    <button onClick={() => onEdit(item)} className="text-blue-500 hover:underline">编辑</button>
                  )}
                  {onDelete && (
                    <button onClick={() => onDelete(item)} className="text-red-500 hover:underline">删除</button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && <div className="text-center py-8 text-gray-400">暂无数据</div>}
    </div>
  );
}
```

- [ ] **Step 2: 创建 MarkdownEditor.tsx**

```tsx
"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  const [preview, setPreview] = useState(false);

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex border-b bg-gray-50">
        <button
          onClick={() => setPreview(false)}
          className={`px-4 py-2 text-sm ${!preview ? "bg-white border-b-2 border-blue-500" : ""}`}
        >
          编辑
        </button>
        <button
          onClick={() => setPreview(true)}
          className={`px-4 py-2 text-sm ${preview ? "bg-white border-b-2 border-blue-500" : ""}`}
        >
          预览
        </button>
      </div>
      {preview ? (
        <div className="p-4 prose prose-sm max-w-none min-h-[300px]">
          <ReactMarkdown>{value}</ReactMarkdown>
        </div>
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-4 min-h-[300px] resize-y focus:outline-none"
          placeholder="输入 Markdown 内容..."
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /d/Delta\ Force
git add frontend/src/components/admin/
git commit -m "feat: add admin DataTable and MarkdownEditor components"
```

---

### Task 3: 管理后台首页 + 攻略管理

**Files:**
- Create: `frontend/src/app/admin/page.tsx`
- Create: `frontend/src/app/admin/guides/page.tsx`
- Create: `frontend/src/app/admin/guides/[id]/page.tsx`

- [ ] **Step 1: 创建 admin/page.tsx (仪表盘)**

```tsx
"use client";

import Link from "next/link";

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">仪表盘</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { label: "攻略管理", href: "/admin/guides", icon: "📝", desc: "创建和管理攻略内容" },
          { label: "地图标注", href: "/admin/maps", icon: "🗺️", desc: "管理地图和标注点" },
          { label: "武器数据", href: "/admin/weapons", icon: "🔫", desc: "管理武器和配件数据" },
          { label: "标签管理", href: "/admin/tags", icon: "🏷️", desc: "管理标签分类" },
          { label: "用户管理", href: "/admin/users", icon: "👥", desc: "查看和管理用户" },
          { label: "评论管理", href: "/admin/comments", icon: "💬", desc: "审核和管理评论" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
          >
            <div className="text-3xl mb-3">{item.icon}</div>
            <h3 className="font-bold text-lg">{item.label}</h3>
            <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 创建 admin/guides/page.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DataTable from "@/components/admin/DataTable";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const TYPE_LABELS: Record<string, string> = {
  map_guide: "地图攻略",
  loadout: "配装推荐",
  beginner: "新手入门",
  patch_notes: "版本日志",
};

export default function AdminGuidesPage() {
  const [guides, setGuides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchGuides = async () => {
    const token = localStorage.getItem("access_token");
    const res = await fetch(`${API_BASE}/api/guides?page_size=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setGuides(data.items || []);
    setLoading(false);
  };

  useEffect(() => { fetchGuides(); }, []);

  const handleDelete = async (guide: any) => {
    if (!confirm(`确定删除攻略「${guide.title}」？`)) return;
    const token = localStorage.getItem("access_token");
    await fetch(`${API_BASE}/api/guides/${guide.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchGuides();
  };

  const columns = [
    { key: "title", label: "标题" },
    { key: "guide_type", label: "类型", render: (item: any) => TYPE_LABELS[item.guide_type] || item.guide_type },
    { key: "likes_count", label: "点赞" },
    { key: "favorites_count", label: "收藏" },
    {
      key: "published_at",
      label: "发布时间",
      render: (item: any) => item.published_at ? new Date(item.published_at).toLocaleDateString("zh-CN") : "草稿",
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">攻略管理</h1>
        <button
          onClick={() => router.push("/admin/guides/new")}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          新建攻略
        </button>
      </div>
      <DataTable
        columns={columns}
        data={guides}
        loading={loading}
        onEdit={(item) => router.push(`/admin/guides/${item.id}`)}
        onDelete={handleDelete}
      />
    </div>
  );
}
```

- [ ] **Step 3: 创建 admin/guides/[id]/page.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import MarkdownEditor from "@/components/admin/MarkdownEditor";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function EditGuidePage() {
  const { id } = useParams();
  const isNew = id === "new";
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [guideType, setGuideType] = useState("map_guide");
  const [coverUrl, setCoverUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isNew) {
      const token = localStorage.getItem("access_token");
      fetch(`${API_BASE}/api/guides/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          setTitle(data.title);
          setSlug(data.slug);
          setContent(data.content);
          setGuideType(data.guide_type);
          setCoverUrl(data.cover_url || "");
        });
    }
  }, [id, isNew]);

  const handleSave = async () => {
    setSaving(true);
    const token = localStorage.getItem("access_token");
    const body = { title, slug, content, guide_type: guideType, cover_url: coverUrl || null };

    const url = isNew ? `${API_BASE}/api/guides` : `${API_BASE}/api/guides/${id}`;
    const method = isNew ? "POST" : "PUT";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      router.push("/admin/guides");
    } else {
      alert("保存失败");
    }
    setSaving(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{isNew ? "新建攻略" : "编辑攻略"}</h1>
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">标题</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded-lg px-4 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Slug (URL 标识)</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full border rounded-lg px-4 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">类型</label>
          <select
            value={guideType}
            onChange={(e) => setGuideType(e.target.value)}
            className="w-full border rounded-lg px-4 py-2"
          >
            <option value="map_guide">地图攻略</option>
            <option value="loadout">配装推荐</option>
            <option value="beginner">新手入门</option>
            <option value="patch_notes">版本日志</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">封面图 URL</label>
          <input
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            className="w-full border rounded-lg px-4 py-2"
            placeholder="https://..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">内容</label>
          <MarkdownEditor value={content} onChange={setContent} />
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存"}
          </button>
          <button
            onClick={() => router.push("/admin/guides")}
            className="px-6 py-2 border rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd /d/Delta\ Force
git add frontend/src/app/admin/
git commit -m "feat: add admin dashboard and guide management pages"
```

---

### Task 4: 标签管理 + 用户管理 + 评论管理

**Files:**
- Create: `frontend/src/app/admin/tags/page.tsx`
- Create: `frontend/src/app/admin/users/page.tsx`
- Create: `frontend/src/app/admin/comments/page.tsx`

- [ ] **Step 1: 创建 admin/tags/page.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import DataTable from "@/components/admin/DataTable";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function AdminTagsPage() {
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("map");
  const [slug, setSlug] = useState("");

  const fetchTags = async () => {
    const token = localStorage.getItem("access_token");
    const res = await fetch(`${API_BASE}/api/tags`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setTags(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTags(); }, []);

  const handleCreate = async () => {
    const token = localStorage.getItem("access_token");
    await fetch(`${API_BASE}/api/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, category, slug }),
    });
    setName("");
    setSlug("");
    fetchTags();
  };

  const handleDelete = async (tag: any) => {
    if (!confirm(`确定删除标签「${tag.name}」？`)) return;
    const token = localStorage.getItem("access_token");
    await fetch(`${API_BASE}/api/tags/${tag.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchTags();
  };

  const columns = [
    { key: "name", label: "标签名" },
    { key: "category", label: "维度" },
    { key: "slug", label: "Slug" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">标签管理</h1>
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="标签名"
            className="border rounded px-3 py-2"
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="border rounded px-3 py-2">
            <option value="map">地图</option>
            <option value="mode">模式</option>
            <option value="difficulty">难度</option>
            <option value="type">类型</option>
          </select>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="slug"
            className="border rounded px-3 py-2"
          />
          <button onClick={handleCreate} className="px-4 py-2 bg-blue-500 text-white rounded">添加</button>
        </div>
      </div>
      <DataTable columns={columns} data={tags} loading={loading} onDelete={handleDelete} />
    </div>
  );
}
```

- [ ] **Step 2: 创建 admin/users/page.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import DataTable from "@/components/admin/DataTable";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    fetch(`${API_BASE}/api/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => { setUsers(data || []); setLoading(false); });
  }, []);

  const columns = [
    { key: "id", label: "ID" },
    { key: "username", label: "昵称" },
    { key: "email", label: "邮箱" },
    { key: "role", label: "角色" },
    {
      key: "created_at",
      label: "注册时间",
      render: (item: any) => new Date(item.created_at).toLocaleDateString("zh-CN"),
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">用户管理</h1>
      <DataTable columns={columns} data={users} loading={loading} />
    </div>
  );
}
```

- [ ] **Step 3: 创建 admin/comments/page.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import DataTable from "@/components/admin/DataTable";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = async () => {
    const token = localStorage.getItem("access_token");
    const res = await fetch(`${API_BASE}/api/admin/comments`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setComments(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchComments(); }, []);

  const handleDelete = async (comment: any) => {
    if (!confirm("确定删除这条评论？")) return;
    const token = localStorage.getItem("access_token");
    await fetch(`${API_BASE}/api/comments/${comment.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchComments();
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "username", label: "用户" },
    { key: "content", label: "内容", render: (item: any) => <span className="line-clamp-2">{item.content}</span> },
    { key: "target_type", label: "类型" },
    {
      key: "created_at",
      label: "时间",
      render: (item: any) => new Date(item.created_at).toLocaleString("zh-CN"),
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">评论管理</h1>
      <DataTable columns={columns} data={comments} loading={loading} onDelete={handleDelete} />
    </div>
  );
}
```

- [ ] **Step 4: 后端 admin API — 用户列表 + 评论列表**

创建 `backend/app/admin/router.py`：

```python
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth.dependencies import require_admin
from app.models.user import User
from app.models.comment import Comment

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users")
async def list_users(db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "role": u.role,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]


@router.get("/comments")
async def list_comments(db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(
        select(Comment, User.username)
        .join(User, Comment.user_id == User.id)
        .order_by(Comment.created_at.desc())
        .limit(200)
    )
    return [
        {
            "id": c.id,
            "user_id": c.user_id,
            "username": u,
            "target_type": c.target_type,
            "target_id": c.target_id,
            "content": c.content,
            "created_at": c.created_at.isoformat(),
        }
        for c, u in result.all()
    ]
```

在 `backend/app/main.py` 中注册：

```python
from app.admin.router import router as admin_router
app.include_router(admin_router)
```

- [ ] **Step 5: Commit**

```bash
cd /d/Delta\ Force
git add frontend/src/app/admin/ backend/app/admin/ backend/app/main.py
git commit -m "feat: add admin pages for tags, users, comments and backend admin API"
```
