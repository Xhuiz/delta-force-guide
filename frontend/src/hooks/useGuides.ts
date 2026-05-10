"use client";
import { useState, useEffect } from "react";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const DEMO_GUIDES = [
  {
    id: 1,
    title: "攀升地图完全攻略",
    slug: "ascent-full-guide",
    guide_type: "map_guide",
    cover_url: null,
    author: { username: "admin" },
    likes_count: 42,
    comments_count: 8,
    favorites_count: 15,
    published_at: "2026-05-01T10:00:00",
  },
  {
    id: 2,
    title: "M4A1 最佳配装推荐",
    slug: "m4a1-best-loadout",
    guide_type: "loadout",
    cover_url: null,
    author: { username: "admin" },
    likes_count: 35,
    comments_count: 5,
    favorites_count: 12,
    published_at: "2026-05-03T14:00:00",
  },
  {
    id: 3,
    title: "新手入门指南",
    slug: "beginner-guide",
    guide_type: "beginner",
    cover_url: null,
    author: { username: "admin" },
    likes_count: 88,
    comments_count: 20,
    favorites_count: 45,
    published_at: "2026-04-28T09:00:00",
  },
  {
    id: 4,
    title: "v2.1 版本更新日志",
    slug: "patch-v2-1",
    guide_type: "patch_notes",
    cover_url: null,
    author: { username: "admin" },
    likes_count: 25,
    comments_count: 12,
    favorites_count: 8,
    published_at: "2026-05-08T16:00:00",
  },
];

const DEMO_CONTENT: Record<string, string> = {
  "ascent-full-guide": `# 攀升地图完全攻略

## 地图概述

攀升是三角洲行动中最受欢迎的地图之一，以城市巷战为主要特色。

## 关键位置

### 狙击塔
地图中央的制高点，视野开阔，适合狙击手架枪。

### 地下通道
连接A区和B区的秘密通道，可以绕过正面火力。

### 武器库
地图中央的武器库包含高级装备，是双方争夺的焦点。

## 战术建议

1. **进攻方**：利用地下通道迂回，避免正面硬刚
2. **防守方**：控制狙击塔和武器库，建立火力优势
3. **通用**：注意听脚步声，室内战听力很重要`,

  "m4a1-best-loadout": `# M4A1 最佳配装推荐

## 配装方案

### 近战突击型
- 枪口：补偿器
- 握把：斜角握把
- 弹匣：快速弹匣
- 枪托：轻量枪托
- 瞄准：红点瞄准镜

**特点**：高机动性，适合室内CQB

### 中距离稳定型
- 枪口：消焰器
- 握把：垂直握把
- 弹匣：扩容弹匣
- 枪托：战术枪托
- 瞄准：全息瞄准镜

**特点**：后坐力低，适合中距离点射`,

  "beginner-guide": `# 新手入门指南

## 基础操作

- WASD 移动
- Shift 冲刺
- Ctrl 蹲下
- 鼠标左键 射击
- 鼠标右键 瞄准
- R 换弹

## 新手建议

1. 先在休闲模式熟悉地图
2. 选择一把主力武器，熟悉其弹道
3. 多听脚步声，声音信息很重要
4. 不要一个人冲，跟队友配合`,

  "patch-v2-1": `# v2.1 版本更新日志

## 新内容

### 新地图：港口
全新的港口地图已上线！

### 新武器：UMP45
紧凑型冲锋枪，适合近距离交战。

## 平衡调整

- AK-47：后坐力降低 5%
- AWM：伤害降低 10
- MP5：射速提升 5%`,
};

export function useGuides() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [guideType, setGuideType] = useState("");
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
      .then((d) => {
        if (d.items && d.items.length > 0) {
          setData(d);
        } else {
          throw new Error("empty");
        }
      })
      .catch(() => {
        // Filter demo data
        let items = [...DEMO_GUIDES];
        if (search) {
          items = items.filter((g) => g.title.includes(search));
        }
        if (guideType) {
          items = items.filter((g) => g.guide_type === guideType);
        }
        setData({ items, has_next: false, total: items.length });
      })
      .finally(() => setLoading(false));
  }, [search, guideType, sort, page]);

  return { data, loading, search, setSearch, guideType, setGuideType, sort, setSort, page, setPage };
}

export function getDemoGuideContent(slug: string): string | null {
  return DEMO_CONTENT[slug] || null;
}
