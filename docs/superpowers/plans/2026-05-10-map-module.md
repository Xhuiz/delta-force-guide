# 交互式地图模块 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现交互式地图功能，包含地图列表、标注点 CRUD（PostGIS 空间查询）、GeoJSON API、瓦片图层管理、Redis 缓存，以及 Next.js 前端地图页面（Leaflet 渲染、图层筛选、标注点聚合、移动端适配）。

**Architecture:** 后端提供 REST API 返回 GeoJSON，前端使用 react-leaflet 渲染地图。标注点通过 PostGIS 空间查询按视口范围加载，结果缓存到 Redis。前端按类别分图层，支持独立开关和聚合显示。

**Tech Stack:** FastAPI, PostGIS, GeoAlchemy2, Redis, Next.js 15, react-leaflet, Leaflet.js, TailwindCSS

---

## 文件结构

```
backend/
├── app/
│   ├── map/
│   │   ├── __init__.py
│   │   ├── router.py            # 地图相关路由
│   │   ├── service.py           # 业务逻辑（空间查询、缓存）
│   │   └── schemas.py           # Pydantic 模型
│   └── main.py                  # 注册路由

frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx           # 根布局
│   │   ├── page.tsx             # 首页
│   │   └── map/
│   │       └── page.tsx         # 地图页面
│   ├── components/
│   │   ├── map/
│   │   │   ├── MapView.tsx      # 地图主组件
│   │   │   ├── MapMarker.tsx    # 标注点组件
│   │   │   ├── MapFilter.tsx    # 筛选栏组件
│   │   │   ├── MapSidebar.tsx   # 侧边栏（PC）
│   │   │   └── MapBottomSheet.tsx # 底部弹窗（移动端）
│   │   └── ui/
│   │       └── ...              # 通用 UI 组件
│   ├── hooks/
│   │   ├── useMapPoints.ts      # 标注点数据 hook
│   │   └── useMapFilter.ts      # 筛选状态 hook
│   ├── lib/
│   │   └── api.ts               # API 请求封装
│   └── stores/
│       └── mapStore.ts          # Zustand 状态管理
```

---

### Task 1: 地图 API — 地图列表 + 标注点 GeoJSON

**Files:**
- Create: `backend/app/map/__init__.py`
- Create: `backend/app/map/schemas.py`
- Create: `backend/app/map/service.py`
- Create: `backend/app/map/router.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: 创建 map/schemas.py**

```python
from pydantic import BaseModel
from datetime import datetime


class MapResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: str | None
    tile_url: str | None
    bounds: dict | None

    class Config:
        from_attributes = True


class MapPointResponse(BaseModel):
    id: int
    map_id: int
    name: str
    description: str | None
    category: str
    lng: float
    lat: float
    image_url: str | None
    tags: list[int] | None
    created_at: datetime

    class Config:
        from_attributes = True


class MapPointCreate(BaseModel):
    map_id: int
    name: str
    description: str | None = None
    category: str
    lng: float
    lat: float
    image_url: str | None = None
    tags: list[int] | None = None


class MapPointUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    category: str | None = None
    lng: float | None = None
    lat: float | None = None
    image_url: str | None = None
    tags: list[int] | None = None


class GeoJSONFeature(BaseModel):
    type: str = "Feature"
    geometry: dict
    properties: dict


class GeoJSONResponse(BaseModel):
    type: str = "FeatureCollection"
    features: list[GeoJSONFeature]
```

- [ ] **Step 2: 创建 map/service.py**

```python
import json
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from geoalchemy2.shape import from_shape
from shapely.geometry import Point

from app.models.map import Map, MapPoint
from app.redis import cache_get, cache_set, cache_delete


async def get_maps(db: AsyncSession) -> list[Map]:
    result = await db.execute(select(Map).order_by(Map.id))
    return list(result.scalars().all())


async def get_map_points_geojson(
    db: AsyncSession,
    map_id: int,
    bbox: str | None = None,
    category: str | None = None,
) -> dict:
    cache_key = f"map_points:{map_id}:{bbox}:{category}"
    cached = await cache_get(cache_key)
    if cached:
        return json.loads(cached)

    query = select(MapPoint).where(MapPoint.map_id == map_id)

    if category:
        query = query.where(MapPoint.category == category)

    if bbox:
        min_lng, min_lat, max_lng, max_lat = map(float, bbox.split(","))
        query = query.where(
            text(f"ST_Intersects(geometry, ST_MakeEnvelope(:min_lng, :min_lat, :max_lng, :max_lat, 4326))")
        ).params(min_lng=min_lng, min_lat=min_lat, max_lng=max_lng, max_lat=max_lat)

    result = await db.execute(query)
    points = result.scalars().all()

    features = []
    for p in points:
        point_shape = from_shape(Point(p.geometry.x if hasattr(p.geometry, 'x') else 0, p.geometry.y if hasattr(p.geometry, 'y') else 0), srid=4326)
        # Extract coordinates from WKBElement
        from geoalchemy2.shape import to_shape
        geom = to_shape(p.geometry)
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [geom.x, geom.y]},
            "properties": {
                "id": p.id,
                "name": p.name,
                "description": p.description,
                "category": p.category,
                "image_url": p.image_url,
                "tags": p.tags,
            },
        })

    geojson = {"type": "FeatureCollection", "features": features}
    await cache_set(cache_key, json.dumps(geojson), expire=300)
    return geojson


async def create_map_point(db: AsyncSession, data) -> MapPoint:
    point = MapPoint(
        map_id=data.map_id,
        name=data.name,
        description=data.description,
        category=data.category,
        geometry=from_shape(Point(data.lng, data.lat), srid=4326),
        image_url=data.image_url,
        tags=data.tags,
    )
    db.add(point)
    await db.flush()
    await db.refresh(point)
    await cache_delete(f"map_points:{data.map_id}:*")
    return point


async def update_map_point(db: AsyncSession, point_id: int, data) -> MapPoint | None:
    result = await db.execute(select(MapPoint).where(MapPoint.id == point_id))
    point = result.scalar_one_or_none()
    if not point:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        if field in ("lng", "lat"):
            continue
        setattr(point, field, value)
    if data.lng is not None and data.lat is not None:
        point.geometry = from_shape(Point(data.lng, data.lat), srid=4326)
    await db.flush()
    await db.refresh(point)
    await cache_delete(f"map_points:{point.map_id}:*")
    return point


async def delete_map_point(db: AsyncSession, point_id: int) -> bool:
    result = await db.execute(select(MapPoint).where(MapPoint.id == point_id))
    point = result.scalar_one_or_none()
    if not point:
        return False
    map_id = point.map_id
    await db.delete(point)
    await cache_delete(f"map_points:{map_id}:*")
    return True
```

- [ ] **Step 3: 创建 map/router.py**

```python
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth.dependencies import get_current_user, require_admin
from app.models.user import User
from app.map.schemas import MapResponse, MapPointCreate, MapPointUpdate, GeoJSONResponse
from app.map.service import get_maps, get_map_points_geojson, create_map_point, update_map_point, delete_map_point

router = APIRouter(prefix="/api/maps", tags=["maps"])


@router.get("", response_model=list[MapResponse])
async def list_maps(db: AsyncSession = Depends(get_db)):
    return await get_maps(db)


@router.get("/{map_id}/points", response_model=GeoJSONResponse)
async def list_points(
    map_id: int,
    bbox: str | None = Query(None, description="min_lng,min_lat,max_lng,max_lat"),
    category: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    return await get_map_points_geojson(db, map_id, bbox, category)


@router.post("/{map_id}/points", status_code=status.HTTP_201_CREATED)
async def create_point(
    map_id: int,
    data: MapPointCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    data.map_id = map_id
    point = await create_map_point(db, data)
    return {"id": point.id, "message": "created"}


@router.put("/points/{point_id}")
async def update_point(
    point_id: int,
    data: MapPointUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    point = await update_map_point(db, point_id, data)
    if not point:
        raise HTTPException(status_code=404, detail="Point not found")
    return {"id": point.id, "message": "updated"}


@router.delete("/points/{point_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_point(
    point_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    deleted = await delete_map_point(db, point_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Point not found")
```

- [ ] **Step 4: 注册路由到 main.py**

在 `backend/app/main.py` 中添加：

```python
from app.map.router import router as map_router

app.include_router(map_router)
```

- [ ] **Step 5: 运行测试**

Run: `cd /d/Delta\ Force/backend && python -c "from app.map.router import router; print('Map router OK')"`
Expected: Map router OK

- [ ] **Step 6: Commit**

```bash
cd /d/Delta\ Force
git add backend/app/map/ backend/app/main.py
git commit -m "feat: add map API with GeoJSON endpoints and PostGIS queries"
```

---

### Task 2: 地图 API 测试

**Files:**
- Create: `backend/tests/test_map.py`

- [ ] **Step 1: 创建 test_map.py**

```python
import pytest


@pytest.mark.asyncio
async def test_list_maps_empty(client):
    response = await client.get("/api/maps")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_create_point_requires_admin(client):
    # Register normal user
    reg = await client.post("/api/auth/register", json={
        "username": "normal",
        "email": "normal@example.com",
        "password": "pass123"
    })
    token = reg.json()["access_token"]
    response = await client.post("/api/maps/1/points", json={
        "map_id": 1,
        "name": "test",
        "category": "spawn",
        "lng": 100.0,
        "lat": 50.0,
    }, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_get_points_empty(client):
    response = await client.get("/api/maps/1/points")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    assert data["features"] == []
```

- [ ] **Step 2: 运行测试**

Run: `cd /d/Delta\ Force/backend && pytest tests/test_map.py -v`
Expected: 3 passed

- [ ] **Step 3: Commit**

```bash
cd /d/Delta\ Force
git add backend/tests/test_map.py
git commit -m "test: add map API tests"
```

---

### Task 3: Next.js 项目初始化

**Files:**
- Create: `frontend/` (via create-next-app)

- [ ] **Step 1: 创建 Next.js 项目**

Run: `cd /d/Delta\ Force && npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git`
Expected: 创建 Next.js 15 项目

- [ ] **Step 2: 安装额外依赖**

Run: `cd /d/Delta\ Force/frontend && npm install react-leaflet leaflet @types/leaflet zustand`
Expected: 安装成功

- [ ] **Step 3: 清理默认页面**

替换 `frontend/src/app/page.tsx`：

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">三角洲地图攻略</h1>
      <p className="mt-4 text-lg text-gray-600">交互式地图 · 深度攻略 · 配装模拟</p>
    </main>
  );
}
```

- [ ] **Step 4: 创建 API 封装**

创建 `frontend/src/lib/api.ts`：

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchMaps() {
  const res = await fetch(`${API_BASE}/api/maps`);
  if (!res.ok) throw new Error("Failed to fetch maps");
  return res.json();
}

export async function fetchMapPoints(mapId: number, bbox?: string, category?: string) {
  const params = new URLSearchParams();
  if (bbox) params.set("bbox", bbox);
  if (category) params.set("category", category);
  const res = await fetch(`${API_BASE}/api/maps/${mapId}/points?${params}`);
  if (!res.ok) throw new Error("Failed to fetch points");
  return res.json();
}
```

- [ ] **Step 5: 验证前端启动**

Run: `cd /d/Delta\ Force/frontend && npm run dev`
Expected: 访问 http://localhost:3000 显示首页

- [ ] **Step 6: Commit**

```bash
cd /d/Delta\ Force
git add frontend/
git commit -m "feat: initialize Next.js 15 frontend with TailwindCSS"
```

---

### Task 4: Leaflet 地图组件

**Files:**
- Create: `frontend/src/components/map/MapView.tsx`
- Create: `frontend/src/components/map/MapMarker.tsx`
- Modify: `frontend/src/app/map/page.tsx`

- [ ] **Step 1: 创建 MapView.tsx**

```tsx
"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

interface MapViewProps {
  tileUrl: string;
  bounds?: [[number, number], [number, number]];
  children?: React.ReactNode;
  onBoundsChange?: (bbox: string, zoom: number) => void;
}

export default function MapView({ tileUrl, bounds, onBoundsChange }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      crs: L.CRS.Simple,
      zoomControl: false,
      attributionControl: false,
    });

    if (bounds) {
      L.imageOverlay(tileUrl, bounds).addTo(map);
      map.fitBounds(bounds);
    } else {
      L.tileLayer(tileUrl, { maxZoom: 5 }).addTo(map);
    }

    L.control.zoom({ position: "bottomright" }).addTo(map);

    map.on("moveend", () => {
      if (onBoundsChange) {
        const b = map.getBounds();
        const zoom = map.getZoom();
        onBoundsChange(
          `${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`,
          zoom
        );
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [tileUrl, bounds]);

  return (
    <div ref={mapRef} className="w-full h-full" style={{ minHeight: "400px" }} />
  );
}
```

- [ ] **Step 2: 创建 MapMarker.tsx**

```tsx
"use client";

import { useEffect } from "react";
import L from "leaflet";

const CATEGORY_COLORS: Record<string, string> = {
  spawn: "#22c55e",
  resource: "#eab308",
  tactical: "#3b82f6",
  extraction: "#a855f7",
  danger: "#ef4444",
};

interface MapMarkerProps {
  map: L.Map;
  points: Array<{
    id: number;
    name: string;
    category: string;
    lat: number;
    lng: number;
    description?: string;
  }>;
  onPointClick?: (id: number) => void;
}

export default function MapMarker({ map, points, onPointClick }: MapMarkerProps) {
  useEffect(() => {
    const markers: L.CircleMarker[] = [];

    points.forEach((point) => {
      const marker = L.circleMarker([point.lat, point.lng], {
        radius: 8,
        fillColor: CATEGORY_COLORS[point.category] || "#6b7280",
        color: "#fff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
      });

      marker.bindPopup(`<b>${point.name}</b><br/>${point.description || ""}`);

      if (onPointClick) {
        marker.on("click", () => onPointClick(point.id));
      }

      marker.addTo(map);
      markers.push(marker);
    });

    return () => {
      markers.forEach((m) => m.remove());
    };
  }, [map, points]);

  return null;
}
```

- [ ] **Step 3: 创建地图页面 frontend/src/app/map/page.tsx**

```tsx
"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { fetchMaps, fetchMapPoints } from "@/lib/api";

const MapView = dynamic(() => import("@/components/map/MapView"), { ssr: false });

export default function MapPage() {
  const [maps, setMaps] = useState<any[]>([]);
  const [selectedMap, setSelectedMap] = useState<any>(null);
  const [points, setPoints] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>(["spawn", "resource", "tactical", "extraction", "danger"]);

  useEffect(() => {
    fetchMaps().then((data) => {
      setMaps(data);
      if (data.length > 0) setSelectedMap(data[0]);
    });
  }, []);

  useEffect(() => {
    if (selectedMap) {
      fetchMapPoints(selectedMap.id).then((data) => setPoints(data.features || []));
    }
  }, [selectedMap]);

  const filteredPoints = points.filter((f) => categories.includes(f.properties.category));

  return (
    <div className="flex h-screen">
      {/* Sidebar - PC only */}
      <div className="hidden md:flex w-64 flex-col border-r bg-white">
        <div className="p-4 border-b">
          <h2 className="font-bold text-lg">地图选择</h2>
          <select
            className="mt-2 w-full border rounded p-2"
            value={selectedMap?.id || ""}
            onChange={(e) => {
              const m = maps.find((m) => m.id === Number(e.target.value));
              setSelectedMap(m);
            }}
          >
            {maps.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
        <div className="p-4 flex-1 overflow-auto">
          <h3 className="font-semibold mb-2">图层筛选</h3>
          {["spawn", "resource", "tactical", "extraction", "danger"].map((cat) => (
            <label key={cat} className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={categories.includes(cat)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setCategories([...categories, cat]);
                  } else {
                    setCategories(categories.filter((c) => c !== cat));
                  }
                }}
              />
              <span className="capitalize">{cat}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Map area */}
      <div className="flex-1 relative">
        {selectedMap && (
          <MapView
            tileUrl={selectedMap.tile_url || ""}
            bounds={selectedMap.bounds}
          />
        )}
      </div>

      {/* Mobile bottom bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-2">
        <button className="p-2 text-sm">筛选</button>
        <button className="p-2 text-sm">地图切换</button>
        <button className="p-2 text-sm">列表</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 验证页面**

Run: `cd /d/Delta\ Force/frontend && npm run dev`
Expected: 访问 http://localhost:3000/map 显示地图页面

- [ ] **Step 5: Commit**

```bash
cd /d/Delta\ Force
git add frontend/src/components/map/ frontend/src/app/map/
git commit -m "feat: add Leaflet map page with layer filtering and mobile layout"
```

---

### Task 5: Zustand 状态管理 + 标注点详情弹窗

**Files:**
- Create: `frontend/src/stores/mapStore.ts`
- Create: `frontend/src/hooks/useMapPoints.ts`
- Create: `frontend/src/components/map/MapBottomSheet.tsx`
- Modify: `frontend/src/app/map/page.tsx`

- [ ] **Step 1: 创建 mapStore.ts**

```typescript
import { create } from "zustand";

interface MapState {
  selectedMapId: number | null;
  activeCategories: string[];
  selectedPointId: number | null;
  setSelectedMapId: (id: number) => void;
  toggleCategory: (cat: string) => void;
  setSelectedPointId: (id: number | null) => void;
}

export const useMapStore = create<MapState>((set) => ({
  selectedMapId: null,
  activeCategories: ["spawn", "resource", "tactical", "extraction", "danger"],
  selectedPointId: null,
  setSelectedMapId: (id) => set({ selectedMapId: id }),
  toggleCategory: (cat) =>
    set((state) => ({
      activeCategories: state.activeCategories.includes(cat)
        ? state.activeCategories.filter((c) => c !== cat)
        : [...state.activeCategories, cat],
    })),
  setSelectedPointId: (id) => set({ selectedPointId: id }),
}));
```

- [ ] **Step 2: 创建 MapBottomSheet.tsx**

```tsx
"use client";

import { useMapStore } from "@/stores/mapStore";

interface PointDetail {
  id: number;
  name: string;
  description?: string;
  category: string;
  image_url?: string;
}

interface MapBottomSheetProps {
  point: PointDetail | null;
  onClose: () => void;
}

export default function MapBottomSheet({ point, onClose }: MapBottomSheetProps) {
  if (!point) return null;

  return (
    <div className="md:hidden fixed bottom-16 left-0 right-0 bg-white rounded-t-xl shadow-lg z-[1000] p-4 animate-slide-up">
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
            {point.category}
          </span>
          <h3 className="text-lg font-bold mt-1">{point.name}</h3>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
          ×
        </button>
      </div>
      {point.image_url && (
        <img src={point.image_url} alt={point.name} className="w-full h-40 object-cover rounded mb-2" />
      )}
      {point.description && <p className="text-gray-600 text-sm">{point.description}</p>}
      <div className="flex gap-2 mt-3">
        <button className="flex-1 py-2 bg-blue-500 text-white rounded text-sm">收藏</button>
        <button className="flex-1 py-2 border border-gray-300 rounded text-sm">评论</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 更新地图页面集成 BottomSheet**

在 `frontend/src/app/map/page.tsx` 中添加 BottomSheet 集成：

```tsx
// 添加 import
import MapBottomSheet from "@/components/map/MapBottomSheet";
import { useMapStore } from "@/stores/mapStore";

// 在组件内添加
const { selectedPointId, setSelectedPointId } = useMapStore();
const selectedPoint = points.find((f) => f.properties.id === selectedPointId)?.properties;

// 在 return 中添加
<MapBottomSheet
  point={selectedPoint ? { ...selectedPoint, id: selectedPoint.id } : null}
  onClose={() => setSelectedPointId(null)}
/>
```

- [ ] **Step 4: Commit**

```bash
cd /d/Delta\ Force
git add frontend/src/stores/ frontend/src/hooks/ frontend/src/components/map/ frontend/src/app/map/
git commit -m "feat: add Zustand store and mobile bottom sheet for point details"
```

---

### Task 6: 响应式适配 + PWA manifest

**Files:**
- Modify: `frontend/src/app/layout.tsx`
- Create: `frontend/public/manifest.json`

- [ ] **Step 1: 更新 layout.tsx 添加 viewport meta**

```tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "三角洲地图攻略",
  description: "三角洲行动交互式地图攻略平台",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: 创建 manifest.json**

```json
{
  "name": "三角洲地图攻略",
  "short_name": "三角洲攻略",
  "description": "三角洲行动交互式地图攻略平台",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

- [ ] **Step 3: Commit**

```bash
cd /d/Delta\ Force
git add frontend/src/app/layout.tsx frontend/public/manifest.json
git commit -m "feat: add responsive viewport and PWA manifest"
```
