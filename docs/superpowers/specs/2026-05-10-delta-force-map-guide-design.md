# 三角洲地图攻略网站 — 设计文档

> 日期：2026-05-10
> 状态：设计完成，待用户审阅

## 1. 项目概述

为《三角洲行动》玩家打造一个交互式地图攻略平台，包含交互式地图标注、深度攻略内容、配装模拟器、搜索标签系统、用户社区互动等功能。支持手机、平板、PC 三端丝滑使用。

**参考标杆**：MapGenie（全球最受欢迎交互式游戏地图平台）、原神互动地图（中文社区最成功案例）

---

## 2. 技术栈

### 前端
- **框架**：Next.js 15 (App Router + React Server Components)
- **地图**：Leaflet.js + react-leaflet
- **3D 渲染**：Three.js + @react-three/fiber + @react-three/drei
- **样式**：TailwindCSS（mobile-first 响应式）
- **状态管理**：Zustand

### 后端
- **框架**：FastAPI + SQLAlchemy 2.0 + GeoAlchemy2
- **数据库**：PostgreSQL 15 + PostGIS 3.3
- **缓存**：Redis（地图标注、武器数据热点缓存）
- **认证**：JWT (python-jose)
- **迁移**：Alembic

### 存储 / CDN
- **对象存储**：阿里云 OSS（地图瓦片、武器图片、攻略配图、静态资源）
- **CDN**：阿里云 CDN（全国加速，降低 ECS 带宽压力）

### 部署
- 阿里云 ECS
- Nginx 反向代理
- ECS 自建 PostgreSQL

---

## 3. 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                    用户设备                               │
│         手机 / 平板 / PC（响应式自适应）                    │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Next.js 15 前端 (App Router)                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ 地图页面  │ │ 攻略页面  │ │ 配装模拟器│ │ 用户中心  │   │
│  │ Leaflet  │ │ RSC/SSG  │ │ 客户端渲染│ │ SSR      │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
└──────────────────────────┬──────────────────────────────┘
                           │ REST API
                           ▼
┌─────────────────────────────────────────────────────────┐
│                FastAPI 后端                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ 认证/用户 │ │ 地图标注  │ │ 内容管理  │ │ 配装数据  │   │
│  │ JWT Auth │ │ GeoJSON  │ │ CRUD     │ │ 计算引擎  │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
└────────┬──────────────────┬─────────────────────────────┘
         │                  │
         ▼                  ▼
┌─────────────┐  ┌──────────────────────────────────────┐
│   Redis     │  │        PostgreSQL + PostGIS           │
│  热点缓存    │  │ users│map_points│guides│tags│weapons │
│  标注/武器   │  │ favorites│comments                    │
└─────────────┘  └──────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│            阿里云 OSS + CDN                              │
│     地图瓦片 / 武器图片 / 攻略配图 / 静态资源              │
└─────────────────────────────────────────────────────────┘
```

---

## 4. 数据库设计

### 核心表

#### users
| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PK | 用户 ID |
| username | VARCHAR(50) | 昵称 |
| email | VARCHAR(100) | 邮箱（唯一） |
| phone | VARCHAR(20) | 手机号（唯一，可选） |
| password_hash | VARCHAR(255) | 密码哈希 |
| avatar_url | VARCHAR(500) | 头像 URL（OSS） |
| bio | TEXT | 个人简介 |
| created_at | TIMESTAMP | 注册时间 |

#### map_points
| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PK | 标注点 ID |
| map_id | INTEGER | 所属地图 ID |
| name | VARCHAR(100) | 标注点名称 |
| description | TEXT | 描述 |
| category | VARCHAR(20) | 类型：spawn/resource/tactical/extraction/danger |
| geometry | GEOMETRY(Point, 4326) | PostGIS 地理坐标 |
| image_url | VARCHAR(500) | 配图 URL（OSS） |
| tags | INTEGER[] | 关联标签 ID 数组 |
| created_at | TIMESTAMP | 创建时间 |

#### maps
| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PK | 地图 ID |
| name | VARCHAR(100) | 地图名称 |
| slug | VARCHAR(100) | URL 友好标识 |
| description | TEXT | 地图描述 |
| tile_url | VARCHAR(500) | 瓦片图层 URL（OSS） |
| bounds | JSON | 地图边界坐标 |

#### guides
| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PK | 攻略 ID |
| title | VARCHAR(200) | 标题 |
| slug | VARCHAR(200) | URL 友好标识 |
| content | TEXT | Markdown 正文 |
| cover_url | VARCHAR(500) | 封面图 URL（OSS） |
| author_id | INTEGER FK | 作者 ID |
| guide_type | VARCHAR(20) | 类型：map_guide/loadout/beginner/patch_notes |
| map_id | INTEGER FK | 关联地图（可选） |
| tags | INTEGER[] | 关联标签 ID 数组 |
| likes_count | INTEGER DEFAULT 0 | 点赞数 |
| comments_count | INTEGER DEFAULT 0 | 评论数 |
| favorites_count | INTEGER DEFAULT 0 | 收藏数 |
| published_at | TIMESTAMP | 发布时间 |
| updated_at | TIMESTAMP | 更新时间 |

#### tags
| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PK | 标签 ID |
| name | VARCHAR(50) | 标签名 |
| category | VARCHAR(20) | 维度：map/mode/difficulty/type |
| slug | VARCHAR(50) | URL 友好标识 |

#### weapons
| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(50) PK | 武器 ID（如 m4a1） |
| name | VARCHAR(100) | 武器名称 |
| category | VARCHAR(20) | 类别：突击步枪/冲锋枪/狙击枪/... |
| image_url | VARCHAR(500) | 武器图片 URL（OSS，降级用） |
| model_url | VARCHAR(500) | 3D 模型 URL（glTF/GLB，OSS） |
| base_stats | JSONB | 基础属性：damage/fire_rate/accuracy/recoil/mobility/range |
| slots | VARCHAR(20)[0] | 可用配件槽位：muzzle/grip/magazine/stock/sight |

#### attachments
| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(50) PK | 配件 ID |
| name | VARCHAR(100) | 配件名称 |
| slot | VARCHAR(20) | 所属槽位 |
| image_url | VARCHAR(500) | 配件图片 URL（OSS） |
| effects | JSONB | 属性效果：{ accuracy: 2, recoil: -3 } |

#### favorites
| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PK | 收藏 ID |
| user_id | INTEGER FK | 用户 ID |
| target_type | VARCHAR(20) | 收藏类型：guide/map_point |
| target_id | INTEGER | 目标 ID |
| created_at | TIMESTAMP | 收藏时间 |
| UNIQUE(user_id, target_type, target_id) | | |

#### likes
| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PK | 点赞 ID |
| user_id | INTEGER FK | 用户 ID |
| target_type | VARCHAR(20) | 点赞类型：guide/comment |
| target_id | INTEGER | 目标 ID |
| created_at | TIMESTAMP | 点赞时间 |
| UNIQUE(user_id, target_type, target_id) | | |

#### comments
| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PK | 评论 ID |
| user_id | INTEGER FK | 用户 ID |
| target_type | VARCHAR(20) | 评论类型：guide/map_point |
| target_id | INTEGER | 目标 ID |
| content | TEXT | 评论内容 |
| parent_id | INTEGER FK | 回复的评论 ID（一级回复） |
| likes_count | INTEGER DEFAULT 0 | 点赞数 |
| created_at | TIMESTAMP | 评论时间 |

---

## 5. 功能模块设计

### 5.1 交互式地图

**核心功能**：
- 双指缩放 / 滑动平移（移动端触控优化）
- 标注点按类型分图层，支持独立开关
- 筛选栏实时过滤（前端本地过滤 + 后端分页加载）
- 标注点聚合（zoom 级别低时合并显示，避免密集区域卡顿）
- 点击标注点弹出详情（名称、描述、图片、评论、收藏按钮）
- 已收藏标注点高亮标记

**PC 端布局**：
- 左侧筛选栏 + 右侧地图区域
- 标注点详情弹窗在地图内展开

**移动端布局**：
- 地图默认全屏，最大化可视区域
- 底部操作栏（筛选 / 地图切换 / 列表）
- 标注点点击后底部弹出详情卡片（类似高德地图 POI）

**数据流**：
1. 页面加载 → 请求地图元数据（地图列表 + bounds）
2. 用户选择地图 → 加载对应瓦片图层（OSS + CDN）
3. 地图就绪 → 按当前视口 + zoom 级别请求标注点（PostGIS 空间查询 + Redis 缓存）
4. 用户操作筛选 → 前端过滤图层，无需重新请求

### 5.2 攻略内容

**攻略类型**：
- 单图攻略（地形分析、路线推荐、战术要点）
- 配装推荐（角色/武器搭配方案）
- 新手入门（基础教学、机制讲解）
- 版本日志（游戏更新内容、平衡调整）

**攻略列表页**：
- 搜索框（标题 + 正文全文检索，PostgreSQL tsvector）
- 标签筛选：地图名、模式、难度、类型
- 卡片网格展示（PC 3 列 / 移动端 1 列）
- 排序：最新 / 最热 / 最多收藏
- 无限滚动加载

**攻略详情页**：
- Markdown 渲染（支持图片、表格、代码块）
- 可关联地图标注点，点击跳转到地图页面对应位置
- 点赞 / 收藏 / 评论功能
- 相关标注点列表

**攻略与标注点关系**：多对多（一篇攻略可引用多个标注点，一个标注点可被多篇攻略引用）

### 5.3 配装模拟器

**核心功能**：
- 选择武器 → 选择配件槽位 → 选择配件 → 实时查看属性变化
- 属性变化前端本地计算，无需请求后端
- 配件属性数据从后端加载后缓存到 Redis + 前端 Zustand
- 保存配装需要登录，生成分享链接（短链）

**武器 3D 模型**：
- 使用 Three.js + @react-three/fiber 渲染 3D 武器模型
- 模型格式：glTF/GLB（Web 标准 3D 格式，体积小、加载快）
- 模型存储：阿里云 OSS，CDN 加速分发
- 支持旋转、缩放交互（鼠标/触控拖拽旋转）
- 配件切换时实时更新 3D 模型（更换枪口/握把等部件）
- 移动端降级：低端设备自动降级为 2D 图片展示
- 模型来源：从游戏提取或社区资源，需确认版权

**PC 端布局**：
- 左侧 3D 武器预览（可旋转）+ 右侧属性面板
- 底部配件槽位 + 配件列表

**移动端布局**：
- 上下滚动布局
- 3D 预览区域支持触控旋转
- 配件槽位横向滑动
- 属性展示用雷达图（更直观）

**数据结构**：
```json
{
  "weapon_id": "m4a1",
  "model_url": "https://oss.example.com/weapons/m4a1.glb",
  "attachments": {
    "muzzle": "flash_hider",
    "grip": "vertical_grip",
    "magazine": "extended_mag",
    "stock": "default_stock",
    "sight": "red_dot"
  }
}
```

### 5.4 搜索 + 标签系统

**标签维度**：
- 地图名（map_a / map_b / ...）
- 模式（ranked / casual）
- 难度（beginner / advanced / expert）
- 类型（guide / loadout / patch_notes）

**搜索功能**：
- 支持标题 + 正文全文检索（PostgreSQL tsvector）
- 前端筛选 + 后端分页
- 支持排序（最新 / 最热 / 最多收藏）

### 5.5 用户系统

**认证方式**：
- 邮箱 + 密码注册/登录
- 手机号 + 验证码（可选，后期扩展）
- JWT Token 认证

**用户功能**：
- 个人主页（头像、昵称、收藏列表、评论历史）
- 收藏（攻略 + 地图标注点）
- 点赞（攻略 + 评论）
- 评论（攻略详情页 + 标注点详情弹窗）

**评论规则**：
- 一级回复（不做多层嵌套，保持简洁）
- 评论支持点赞
- 评论对象：攻略、标注点（通过 target_type + target_id 关联）
- 登录后才能评论/点赞/收藏
- 评论支持删除（仅限自己发的）

---

## 6. 响应式设计策略

### 断点
- 移动端：< 768px（手机竖屏）
- 平板端：768-1024px（平板横屏/竖屏）
- PC 端：> 1024px（桌面）

### 各模块适配

| 模块 | PC 端 | 移动端 |
|------|-------|--------|
| 地图页面 | 左侧筛选栏 + 右侧地图 | 地图全屏，底部操作栏，抽屉式面板 |
| 攻略列表 | 3 列网格 | 1 列卡片流 |
| 攻略详情 | 正文 + 侧边相关标注点 | 正文全宽，相关标注点折叠到底部 |
| 配装模拟器 | 左右分栏 | 上下滚动，配件槽位横向滑动 |
| 筛选/标签 | 侧边栏展示 | 底部弹出 sheet |
| 导航栏 | 水平菜单 | 汉堡菜单 + 底部 Tab 栏 |

### 触控优化
- 所有可点击元素最小 44x44px（Apple HIG 标准）
- 地图双指缩放 + 单指平移，禁用双击缩放（避免误触）
- 标注点点击区域放大（视觉 24px，可点击区域 44px）
- 长按标注点弹出快捷操作（收藏/分享）
- 滑动手势：左滑关闭弹窗、下拉收起面板

### 性能优化
- 地图瓦片懒加载（只加载当前视口 + 1 级缓存）
- 标注点聚合（zoom < 12 时合并为聚合气泡）
- 图片统一走 OSS + CDN，WebP 格式，按设备分辨率返回不同尺寸
- 攻略列表无限滚动（不用分页按钮）
- 首屏 SSR / SSG，交互部分 hydration
- 关键 CSS 内联，非关键资源延迟加载

### PWA 支持
- 添加到主屏幕（manifest.json + service worker）
- 离线缓存已访问的地图瓦片和攻略
- 推送通知（新版本日志、关注的攻略更新）

---

## 7. API 设计概览

### 认证
- `POST /api/auth/register` — 注册
- `POST /api/auth/login` — 登录
- `POST /api/auth/refresh` — 刷新 Token

### 地图
- `GET /api/maps` — 地图列表
- `GET /api/maps/{map_id}/points` — 获取标注点（支持 bbox + category 查询）
- `GET /api/maps/{map_id}/points/{point_id}` — 标注点详情

### 攻略
- `GET /api/guides` — 攻略列表（支持搜索、标签、排序、分页）
- `GET /api/guides/{guide_id}` — 攻略详情
- `POST /api/guides/{guide_id}/like` — 点赞
- `POST /api/guides/{guide_id}/favorite` — 收藏

### 评论
- `GET /api/comments?target_type=guide&target_id=1` — 获取评论
- `POST /api/comments` — 发表评论
- `DELETE /api/comments/{comment_id}` — 删除评论

### 配装
- `GET /api/weapons` — 武器列表
- `GET /api/weapons/{weapon_id}` — 武器详情（含配件）
- `GET /api/attachments` — 配件列表

### 用户
- `GET /api/users/me` — 当前用户信息
- `GET /api/users/me/favorites` — 收藏列表
- `GET /api/users/me/comments` — 评论历史

### 标签
- `GET /api/tags` — 标签列表（按维度分组）

---

## 8. 管理后台

管理后台用于维护网站内容，仅管理员可访问。

### 功能模块

**攻略管理**：
- 攻略列表（搜索、筛选、排序）
- 创建/编辑/删除攻略
- Markdown 编辑器（支持图片上传到 OSS）
- 关联地图标注点
- 设置标签、分类
- 发布/草稿/下架状态切换

**地图标注管理**：
- 地图列表管理（创建/编辑/删除地图）
- 标注点管理（在地图上点击添加/编辑/删除标注点）
- 标注点分类设置（出生点/资源点/战术位/撤离点/高危区）
- 批量导入/导出标注点（JSON/CSV）
- 标注点关联标签

**武器数据管理**：
- 武器列表管理（创建/编辑/删除武器）
- 上传 3D 模型（glTF/GLB 格式，自动上传到 OSS）
- 配件管理（创建/编辑/删除配件）
- 设置武器配件槽位
- 编辑武器/配件属性数据

**标签管理**：
- 标签 CRUD
- 按维度分组管理（地图/模式/难度/类型）

**用户管理**：
- 用户列表（搜索、筛选）
- 禁用/启用用户
- 查看用户评论/收藏

**评论管理**：
- 评论列表（搜索、筛选）
- 删除违规评论

### 技术方案

- 管理后台与用户端共享同一后端 API
- 管理后台前端独立路由（`/admin/*`）
- 使用 Next.js 15 单独的 layout，与用户端隔离
- 管理员角色通过 JWT 中的 `role` 字段区分
- 权限控制：FastAPI 依赖注入检查 `is_admin`

### 页面布局

```
┌──────────────────────────────────────────────────────┐
│  管理后台导航栏（Logo / 管理员头像）                     │
├────────┬─────────────────────────────────────────────┤
│ 侧边栏  │                                             │
│        │                                             │
│ 攻略管理│          内 容 区 域                         │
│ 标注管理│       （CRUD 表单 / 列表）                    │
│ 武器管理│                                             │
│ 标签管理│                                             │
│ 用户管理│                                             │
│ 评论管理│                                             │
│        │                                             │
└────────┴─────────────────────────────────────────────┘
```

---

## 9. 待确认事项

1. **地图数据来源**：游戏截图/官方素材/社区资源 — 待确定
2. **配装模拟器数据来源**：手动维护/游戏 API/爬虫 — 待确定
3. **武器 3D 模型来源**：初期从游戏提取，国内攻略社区普遍做法，厂商通常默许；后续如有版权顾虑可替换为自制模型
