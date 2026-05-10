# 配装模拟器 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现武器配装模拟器，包含武器/配件数据 API、3D 模型渲染（Three.js）、属性实时计算、配装保存/分享功能。

**Architecture:** 后端提供武器/配件数据 API，数据缓存到 Redis。前端使用 Three.js 渲染 3D 武器模型，配件属性计算在前端本地完成。配装方案通过 URL 参数序列化实现分享。

**Tech Stack:** FastAPI, Redis, Next.js 15, Three.js, @react-three/fiber, @react-three/drei, Zustand, TailwindCSS

---

## 文件结构

```
backend/
├── app/
│   ├── weapon/
│   │   ├── __init__.py
│   │   ├── router.py
│   │   ├── service.py
│   │   └── schemas.py
│   └── main.py

frontend/
├── src/
│   ├── app/
│   │   └── loadout/
│   │       └── page.tsx           # 配装模拟器页面
│   ├── components/
│   │   └── loadout/
│   │       ├── WeaponViewer3D.tsx  # 3D 武器渲染
│   │       ├── StatBar.tsx         # 属性条
│   │       ├── StatRadar.tsx       # 属性雷达图（移动端）
│   │       ├── AttachmentSlot.tsx  # 配件槽位
│   │       └── AttachmentList.tsx  # 配件列表
│   ├── stores/
│   │   └── loadoutStore.ts
│   └── lib/
│       └── weaponData.ts           # 属性计算逻辑
```

---

### Task 1: 武器/配件 API

**Files:**
- Create: `backend/app/weapon/__init__.py`
- Create: `backend/app/weapon/schemas.py`
- Create: `backend/app/weapon/service.py`
- Create: `backend/app/weapon/router.py`

- [ ] **Step 1: 创建 weapon/schemas.py**

```python
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
```

- [ ] **Step 2: 创建 weapon/service.py**

```python
import json
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.weapon import Weapon, Attachment
from app.redis import cache_get, cache_set


async def get_weapons(db: AsyncSession) -> list[Weapon]:
    cached = await cache_get("weapons:all")
    if cached:
        return json.loads(cached)
    result = await db.execute(select(Weapon).order_by(Weapon.category, Weapon.name))
    weapons = list(result.scalars().all())
    await cache_set("weapons:all", json.dumps([{
        "id": w.id, "name": w.name, "category": w.category, "image_url": w.image_url
    } for w in weapons]), expire=600)
    return weapons


async def get_weapon_detail(db: AsyncSession, weapon_id: str) -> dict | None:
    cached = await cache_get(f"weapon:{weapon_id}")
    if cached:
        return json.loads(cached)

    result = await db.execute(select(Weapon).where(Weapon.id == weapon_id))
    weapon = result.scalar_one_or_none()
    if not weapon:
        return None

    att_result = await db.execute(select(Attachment).where(Attachment.slot.in_(weapon.slots)))
    attachments = att_result.scalars().all()

    data = {
        "id": weapon.id,
        "name": weapon.name,
        "category": weapon.category,
        "image_url": weapon.image_url,
        "model_url": weapon.model_url,
        "base_stats": weapon.base_stats,
        "slots": weapon.slots,
        "attachments": [
            {"id": a.id, "name": a.name, "slot": a.slot, "image_url": a.image_url, "effects": a.effects}
            for a in attachments
        ],
    }
    await cache_set(f"weapon:{weapon_id}", json.dumps(data), expire=600)
    return data


async def get_attachments(db: AsyncSession, slot: str | None = None) -> list[Attachment]:
    query = select(Attachment)
    if slot:
        query = query.where(Attachment.slot == slot)
    result = await db.execute(query.order_by(Attachment.slot, Attachment.name))
    return list(result.scalars().all())
```

- [ ] **Step 3: 创建 weapon/router.py**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.weapon.schemas import WeaponResponse, WeaponListItem, AttachmentResponse
from app.weapon.service import get_weapons, get_weapon_detail, get_attachments

router = APIRouter(prefix="/api/weapons", tags=["weapons"])


@router.get("", response_model=list[WeaponListItem])
async def list_weapons(db: AsyncSession = Depends(get_db)):
    return await get_weapons(db)


@router.get("/{weapon_id}", response_model=WeaponResponse)
async def get_weapon(weapon_id: str, db: AsyncSession = Depends(get_db)):
    data = await get_weapon_detail(db, weapon_id)
    if not data:
        raise HTTPException(status_code=404, detail="Weapon not found")
    return data


@router.get("/attachments/list", response_model=list[AttachmentResponse])
async def list_attachments(slot: str | None = None, db: AsyncSession = Depends(get_db)):
    return await get_attachments(db, slot)
```

- [ ] **Step 4: 注册路由**

在 `backend/app/main.py` 中添加：

```python
from app.weapon.router import router as weapon_router
app.include_router(weapon_router)
```

- [ ] **Step 5: Commit**

```bash
cd /d/Delta\ Force
git add backend/app/weapon/ backend/app/main.py
git commit -m "feat: add weapon/attachment API with Redis caching"
```

---

### Task 2: 前端 Zustand 状态 + 属性计算

**Files:**
- Create: `frontend/src/stores/loadoutStore.ts`
- Create: `frontend/src/lib/weaponData.ts`

- [ ] **Step 1: 创建 loadoutStore.ts**

```typescript
import { create } from "zustand";

interface Attachment {
  id: string;
  name: string;
  slot: string;
  effects: Record<string, number>;
}

interface Weapon {
  id: string;
  name: string;
  category: string;
  model_url: string | null;
  image_url: string | null;
  base_stats: Record<string, number>;
  slots: string[];
  attachments: Attachment[];
}

interface LoadoutState {
  weapons: Weapon[];
  selectedWeaponId: string | null;
  selectedAttachments: Record<string, string | null>; // slot -> attachment_id
  setWeapons: (weapons: Weapon[]) => void;
  selectWeapon: (id: string) => void;
  setAttachment: (slot: string, attachmentId: string | null) => void;
  resetLoadout: () => void;
  getSelectedWeapon: () => Weapon | undefined;
  getCalculatedStats: () => Record<string, number>;
}

export const useLoadoutStore = create<LoadoutState>((set, get) => ({
  weapons: [],
  selectedWeaponId: null,
  selectedAttachments: {},

  setWeapons: (weapons) => set({ weapons }),

  selectWeapon: (id) =>
    set({
      selectedWeaponId: id,
      selectedAttachments: {},
    }),

  setAttachment: (slot, attachmentId) =>
    set((state) => ({
      selectedAttachments: { ...state.selectedAttachments, [slot]: attachmentId },
    })),

  resetLoadout: () => set({ selectedAttachments: {} }),

  getSelectedWeapon: () => {
    const state = get();
    return state.weapons.find((w) => w.id === state.selectedWeaponId);
  },

  getCalculatedStats: () => {
    const state = get();
    const weapon = state.weapons.find((w) => w.id === state.selectedWeaponId);
    if (!weapon) return {};

    const stats = { ...weapon.base_stats };

    Object.entries(state.selectedAttachments).forEach(([slot, attId]) => {
      if (!attId) return;
      const att = weapon.attachments.find((a) => a.id === attId);
      if (!att) return;
      Object.entries(att.effects).forEach(([key, value]) => {
        stats[key] = (stats[key] || 0) + value;
      });
    });

    // Clamp values to 0-100
    Object.keys(stats).forEach((key) => {
      stats[key] = Math.max(0, Math.min(100, stats[key]));
    });

    return stats;
  },
}));
```

- [ ] **Step 2: 创建 weaponData.ts**

```typescript
export const STAT_LABELS: Record<string, string> = {
  damage: "伤害",
  fire_rate: "射速",
  accuracy: "精准度",
  recoil: "后坐力",
  mobility: "机动性",
  range: "射程",
};

export const SLOT_LABELS: Record<string, string> = {
  muzzle: "枪口",
  grip: "握把",
  magazine: "弹匣",
  stock: "枪托",
  sight: "瞄准镜",
};

export const CATEGORY_LABELS: Record<string, string> = {
  "突击步枪": "突击步枪",
  "冲锋枪": "冲锋枪",
  "狙击枪": "狙击枪",
  "霰弹枪": "霰弹枪",
  "手枪": "手枪",
  "机枪": "机枪",
};
```

- [ ] **Step 3: Commit**

```bash
cd /d/Delta\ Force
git add frontend/src/stores/loadoutStore.ts frontend/src/lib/weaponData.ts
git commit -m "feat: add loadout store with stat calculation"
```

---

### Task 3: 3D 武器渲染组件

**Files:**
- Create: `frontend/src/components/loadout/WeaponViewer3D.tsx`

- [ ] **Step 1: 创建 WeaponViewer3D.tsx**

```tsx
"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment } from "@react-three/drei";
import * as THREE from "three";

function WeaponModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const ref = useRef<THREE.Group>(null);

  useFrame(() => {
    if (ref.current) {
      ref.current.rotation.y += 0.003;
    }
  });

  return <primitive ref={ref} object={scene} scale={1} />;
}

function FallbackModel() {
  return (
    <mesh>
      <boxGeometry args={[2, 0.5, 0.5]} />
      <meshStandardMaterial color="#888" />
    </mesh>
  );
}

interface WeaponViewer3DProps {
  modelUrl: string | null;
  fallbackImageUrl: string | null;
}

export default function WeaponViewer3D({ modelUrl, fallbackImageUrl }: WeaponViewer3DProps) {
  if (!modelUrl) {
    if (fallbackImageUrl) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg">
          <img src={fallbackImageUrl} alt="Weapon" className="max-h-full object-contain" />
        </div>
      );
    }
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg text-gray-400">
        暂无模型
      </div>
    );
  }

  return (
    <div className="w-full h-full rounded-lg overflow-hidden bg-gray-900">
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <Suspense fallback={<FallbackModel />}>
          <WeaponModel url={modelUrl} />
          <Environment preset="studio" />
        </Suspense>
        <OrbitControls enableZoom={true} enablePan={false} minDistance={2} maxDistance={10} />
      </Canvas>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /d/Delta\ Force
git add frontend/src/components/loadout/WeaponViewer3D.tsx
git commit -m "feat: add 3D weapon viewer with Three.js"
```

---

### Task 4: 属性展示组件

**Files:**
- Create: `frontend/src/components/loadout/StatBar.tsx`
- Create: `frontend/src/components/loadout/StatRadar.tsx`
- Create: `frontend/src/components/loadout/AttachmentSlot.tsx`
- Create: `frontend/src/components/loadout/AttachmentList.tsx`

- [ ] **Step 1: 创建 StatBar.tsx**

```tsx
import { STAT_LABELS } from "@/lib/weaponData";

interface StatBarProps {
  statKey: string;
  value: number;
  maxValue?: number;
}

export default function StatBar({ statKey, value, maxValue = 100 }: StatBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / maxValue) * 100));

  return (
    <div className="flex items-center gap-3">
      <span className="w-16 text-sm text-gray-600">{STAT_LABELS[statKey] || statKey}</span>
      <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-8 text-right text-sm font-medium">{value}</span>
    </div>
  );
}
```

- [ ] **Step 2: 创建 StatRadar.tsx**

```tsx
"use client";

import { STAT_LABELS } from "@/lib/weaponData";

interface StatRadarProps {
  stats: Record<string, number>;
}

export default function StatRadar({ stats }: StatRadarProps) {
  const keys = Object.keys(stats);
  const centerX = 150;
  const centerY = 150;
  const radius = 100;
  const angleStep = (2 * Math.PI) / keys.length;

  const points = keys.map((key, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const value = stats[key] / 100;
    return {
      x: centerX + radius * value * Math.cos(angle),
      y: centerY + radius * value * Math.sin(angle),
      labelX: centerX + (radius + 20) * Math.cos(angle),
      labelY: centerY + (radius + 20) * Math.sin(angle),
      label: STAT_LABELS[key] || key,
    };
  });

  const polygonPoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg viewBox="0 0 300 300" className="w-full max-w-xs mx-auto">
      {/* Grid */}
      {[0.25, 0.5, 0.75, 1].map((scale) => (
        <polygon
          key={scale}
          points={keys
            .map((_, i) => {
              const angle = i * angleStep - Math.PI / 2;
              return `${centerX + radius * scale * Math.cos(angle)},${centerY + radius * scale * Math.sin(angle)}`;
            })
            .join(" ")}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="1"
        />
      ))}
      {/* Data */}
      <polygon points={polygonPoints} fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" strokeWidth="2" />
      {/* Labels */}
      {points.map((p, i) => (
        <text key={i} x={p.labelX} y={p.labelY} textAnchor="middle" dominantBaseline="middle" className="text-xs fill-gray-600">
          {p.label}
        </text>
      ))}
    </svg>
  );
}
```

- [ ] **Step 3: 创建 AttachmentSlot.tsx**

```tsx
import { SLOT_LABELS } from "@/lib/weaponData";

interface AttachmentSlotProps {
  slot: string;
  selectedId: string | null;
  attachments: Array<{ id: string; name: string }>;
  onSelect: (id: string | null) => void;
}

export default function AttachmentSlot({ slot, selectedId, attachments, onSelect }: AttachmentSlotProps) {
  const selected = attachments.find((a) => a.id === selectedId);

  return (
    <div className="border rounded-lg p-3">
      <div className="text-xs text-gray-500 mb-2">{SLOT_LABELS[slot] || slot}</div>
      <select
        value={selectedId || ""}
        onChange={(e) => onSelect(e.target.value || null)}
        className="w-full border rounded px-2 py-1 text-sm"
      >
        <option value="">默认</option>
        {attachments.map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>
      {selected && (
        <div className="mt-2 text-xs text-gray-600">
          {Object.entries(selected.effects || {}).map(([key, val]) => (
            <span key={key} className={`mr-2 ${val > 0 ? "text-green-600" : "text-red-600"}`}>
              {key} {val > 0 ? "+" : ""}{val}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 创建 AttachmentList.tsx**

```tsx
import { SLOT_LABELS } from "@/lib/weaponData";

interface Attachment {
  id: string;
  name: string;
  slot: string;
  effects: Record<string, number>;
}

interface AttachmentListProps {
  slot: string;
  attachments: Attachment[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function AttachmentList({ slot, attachments, selectedId, onSelect }: AttachmentListProps) {
  const filtered = attachments.filter((a) => a.slot === slot);

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-700">{SLOT_LABELS[slot] || slot} 配件</h4>
      {filtered.map((att) => (
        <button
          key={att.id}
          onClick={() => onSelect(att.id)}
          className={`w-full text-left border rounded-lg p-3 transition-colors ${
            selectedId === att.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <div className="font-medium text-sm">{att.name}</div>
          <div className="flex gap-2 mt-1">
            {Object.entries(att.effects).map(([key, val]) => (
              <span key={key} className={`text-xs ${val > 0 ? "text-green-600" : "text-red-600"}`}>
                {key} {val > 0 ? "+" : ""}{val}
              </span>
            ))}
          </div>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
cd /d/Delta\ Force
git add frontend/src/components/loadout/
git commit -m "feat: add stat display and attachment selection components"
```

---

### Task 5: 配装模拟器页面

**Files:**
- Create: `frontend/src/app/loadout/page.tsx`

- [ ] **Step 1: 创建 loadout/page.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useLoadoutStore } from "@/stores/loadoutStore";
import StatBar from "@/components/loadout/StatBar";
import AttachmentSlot from "@/components/loadout/AttachmentSlot";
import AttachmentList from "@/components/loadout/AttachmentList";
import { SLOT_LABELS } from "@/lib/weaponData";

const WeaponViewer3D = dynamic(() => import("@/components/loadout/WeaponViewer3D"), { ssr: false });
const StatRadar = dynamic(() => import("@/components/loadout/StatRadar"), { ssr: false });

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function LoadoutPage() {
  const {
    weapons,
    selectedWeaponId,
    selectedAttachments,
    setWeapons,
    selectWeapon,
    setAttachment,
    resetLoadout,
    getCalculatedStats,
  } = useLoadoutStore();

  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/weapons`)
      .then((r) => r.json())
      .then((data) => {
        setWeapons(data);
        if (data.length > 0) selectWeapon(data[0].id);
      });
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Fetch full weapon detail when selected
  const [weaponDetail, setWeaponDetail] = useState<any>(null);
  useEffect(() => {
    if (selectedWeaponId) {
      fetch(`${API_BASE}/api/weapons/${selectedWeaponId}`)
        .then((r) => r.json())
        .then(setWeaponDetail);
    }
  }, [selectedWeaponId]);

  const weapon = weaponDetail;
  const stats = getCalculatedStats();

  const handleShare = () => {
    const params = new URLSearchParams();
    params.set("w", selectedWeaponId || "");
    Object.entries(selectedAttachments).forEach(([slot, id]) => {
      if (id) params.set(slot, id);
    });
    const url = `${window.location.origin}/loadout?${params}`;
    navigator.clipboard.writeText(url);
    alert("链接已复制到剪贴板");
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">配装模拟器</h1>

      {/* Weapon selector */}
      <div className="mb-6">
        <select
          value={selectedWeaponId || ""}
          onChange={(e) => selectWeapon(e.target.value)}
          className="border rounded-lg px-4 py-2 text-lg"
        >
          {weapons.map((w) => (
            <option key={w.id} value={w.id}>{w.name} ({w.category})</option>
          ))}
        </select>
        <button onClick={resetLoadout} className="ml-3 px-4 py-2 border rounded-lg text-sm">重置</button>
        <button onClick={handleShare} className="ml-3 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm">分享链接</button>
      </div>

      {weapon && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: 3D viewer */}
          <div className="h-[400px]">
            <WeaponViewer3D modelUrl={weapon.model_url} fallbackImageUrl={weapon.image_url} />
          </div>

          {/* Right: Stats */}
          <div>
            <h2 className="text-xl font-bold mb-4">{weapon.name}</h2>
            {isMobile ? (
              <StatRadar stats={stats} />
            ) : (
              <div className="space-y-3">
                {Object.entries(stats).map(([key, value]) => (
                  <StatBar key={key} statKey={key} value={value} />
                ))}
              </div>
            )}
          </div>

          {/* Attachment slots */}
          <div className="md:col-span-2">
            <h3 className="text-lg font-bold mb-4">配件槽位</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
              {weapon.slots.map((slot: string) => (
                <AttachmentSlot
                  key={slot}
                  slot={slot}
                  selectedId={selectedAttachments[slot] || null}
                  attachments={weapon.attachments.filter((a: any) => a.slot === slot)}
                  onSelect={(id) => setAttachment(slot, id)}
                />
              ))}
            </div>

            {/* Attachment list for active slot */}
            {activeSlot && (
              <AttachmentList
                slot={activeSlot}
                attachments={weapon.attachments}
                selectedId={selectedAttachments[activeSlot] || null}
                onSelect={(id) => setAttachment(activeSlot, id)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /d/Delta\ Force
git add frontend/src/app/loadout/
git commit -m "feat: add loadout simulator page with 3D viewer and stat display"
```
