"""Seed script: populate database with demo data.

Usage: python seed_data.py
Requires: PostgreSQL running with delta_force database (run docker-compose up first)
"""

import asyncio
from passlib.context import CryptContext
from sqlalchemy import text
from app.database import engine, async_session
from app.models.user import User
from app.models.map import Map, MapPoint
from app.models.guide import Guide
from app.models.tag import Tag
from app.models.weapon import Weapon, Attachment

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

MAPS = [
    {
        "name": "攀升",
        "slug": "ascent",
        "description": "攀升是三角洲行动中的一张经典地图，以城市巷战为主，包含大量室内战斗场景。",
        "tile_url": "/tiles/ascent/{z}/{x}/{y}.png",
        "bounds": [[0, 0], [1024, 1024]],
    },
    {
        "name": "暗区",
        "slug": "dark-zone",
        "description": "暗区地图以地下设施为主，光线昏暗，适合潜入和近战。",
        "tile_url": "/tiles/dark-zone/{z}/{x}/{y}.png",
        "bounds": [[0, 0], [1024, 1024]],
    },
    {
        "name": "港口",
        "slug": "harbor",
        "description": "港口地图包含开阔地带和集装箱区域，中远距离交战频繁。",
        "tile_url": "/tiles/harbor/{z}/{x}/{y}.png",
        "bounds": [[0, 0], [1024, 1024]],
    },
]

MAP_POINTS = [
    # Ascent points
    {"map_slug": "ascent", "name": "A点出生区", "desc": "进攻方出生点，靠近东侧街道", "cat": "spawn", "lng": 120.1, "lat": 30.2},
    {"map_slug": "ascent", "name": "B点出生区", "desc": "防守方出生点，靠近西侧建筑", "cat": "spawn", "lng": 120.0, "lat": 30.1},
    {"map_slug": "ascent", "name": "武器库", "desc": "地图中央的武器库，包含高级装备", "cat": "resource", "lng": 120.05, "lat": 30.15},
    {"map_slug": "ascent", "name": "狙击塔", "desc": "制高点，适合狙击手架枪", "cat": "tactical", "lng": 120.08, "lat": 30.18},
    {"map_slug": "ascent", "name": "地下通道", "desc": "连接A区和B区的秘密通道", "cat": "tactical", "lng": 120.03, "lat": 30.13},
    {"map_slug": "ascent", "name": "撤离点 Alpha", "desc": "主要撤离点，直升机接应", "cat": "extraction", "lng": 120.12, "lat": 30.22},
    {"map_slug": "ascent", "name": "雷区", "desc": "地雷密集区域，需小心通过", "cat": "danger", "lng": 120.06, "lat": 30.16},
    # Dark Zone points
    {"map_slug": "dark-zone", "name": "入口A", "desc": "主入口，有守卫巡逻", "cat": "spawn", "lng": 121.1, "lat": 31.2},
    {"map_slug": "dark-zone", "name": "补给室", "desc": "地下补给室，有医疗包和弹药", "cat": "resource", "lng": 121.05, "lat": 31.15},
    {"map_slug": "dark-zone", "name": "控制室", "desc": "地图核心区域，可控制灯光和门禁", "cat": "tactical", "lng": 121.08, "lat": 31.18},
    # Harbor points
    {"map_slug": "harbor", "name": "码头出生点", "desc": "进攻方从码头登陆", "cat": "spawn", "lng": 122.1, "lat": 32.2},
    {"map_slug": "harbor", "name": "集装箱堆场", "desc": "大量集装箱提供掩体", "cat": "tactical", "lng": 122.05, "lat": 32.15},
    {"map_slug": "harbor", "name": "弹药库", "desc": "港口弹药库，物资丰富", "cat": "resource", "lng": 122.08, "lat": 32.18},
    {"map_slug": "harbor", "name": "灯塔", "desc": "制高点观察哨", "cat": "tactical", "lng": 122.12, "lat": 32.22},
]

TAGS = [
    {"name": "攀升", "category": "map", "slug": "map-ascent"},
    {"name": "暗区", "category": "map", "slug": "map-dark-zone"},
    {"name": "港口", "category": "map", "slug": "map-harbor"},
    {"name": "排位", "category": "mode", "slug": "ranked"},
    {"name": "休闲", "category": "mode", "slug": "casual"},
    {"name": "新手", "category": "difficulty", "slug": "beginner"},
    {"name": "进阶", "category": "difficulty", "slug": "advanced"},
    {"name": "专家", "category": "difficulty", "slug": "expert"},
    {"name": "地图攻略", "category": "type", "slug": "map-guide"},
    {"name": "配装推荐", "category": "type", "slug": "loadout"},
    {"name": "新手入门", "category": "type", "slug": "beginner-guide"},
    {"name": "版本日志", "category": "type", "slug": "patch-notes"},
]

WEAPONS = [
    {
        "id": "m4a1",
        "name": "M4A1",
        "category": "突击步枪",
        "base_stats": {"damage": 42, "fire_rate": 75, "accuracy": 68, "recoil": 55, "mobility": 60, "range": 55},
        "slots": ["muzzle", "grip", "magazine", "stock", "sight"],
    },
    {
        "id": "ak47",
        "name": "AK-47",
        "category": "突击步枪",
        "base_stats": {"damage": 55, "fire_rate": 60, "accuracy": 50, "recoil": 35, "mobility": 55, "range": 50},
        "slots": ["muzzle", "grip", "magazine", "stock", "sight"],
    },
    {
        "id": "mp5",
        "name": "MP5",
        "category": "冲锋枪",
        "base_stats": {"damage": 30, "fire_rate": 85, "accuracy": 60, "recoil": 70, "mobility": 80, "range": 30},
        "slots": ["muzzle", "grip", "magazine", "sight"],
    },
    {
        "id": "awm",
        "name": "AWM",
        "category": "狙击枪",
        "base_stats": {"damage": 95, "fire_rate": 15, "accuracy": 90, "recoil": 20, "mobility": 25, "range": 95},
        "slots": ["muzzle", "magazine", "stock", "sight"],
    },
    {
        "id": "ump45",
        "name": "UMP45",
        "category": "冲锋枪",
        "base_stats": {"damage": 35, "fire_rate": 70, "accuracy": 55, "recoil": 65, "mobility": 75, "range": 35},
        "slots": ["muzzle", "grip", "magazine", "sight"],
    },
]

ATTACHMENTS = [
    # Muzzle
    {"id": "flash_hider", "name": "消焰器", "slot": "muzzle", "effects": {"recoil": 5, "accuracy": 3}},
    {"id": "suppressor", "name": "消音器", "slot": "muzzle", "effects": {"recoil": 3, "range": -5}},
    {"id": "compensator", "name": "补偿器", "slot": "muzzle", "effects": {"recoil": 8, "accuracy": 2}},
    {"id": "muzzle_brake", "name": "枪口制退器", "slot": "muzzle", "effects": {"recoil": 6, "damage": 2}},
    # Grip
    {"id": "vertical_grip", "name": "垂直握把", "slot": "grip", "effects": {"recoil": 8, "mobility": -3}},
    {"id": "angled_grip", "name": "斜角握把", "slot": "grip", "effects": {"recoil": 4, "mobility": 5}},
    {"id": "laser_grip", "name": "激光握把", "slot": "grip", "effects": {"accuracy": 6, "mobility": 2}},
    # Magazine
    {"id": "extended_mag", "name": "扩容弹匣", "slot": "magazine", "effects": {"mobility": -5, "fire_rate": 0}},
    {"id": "fast_mag", "name": "快速弹匣", "slot": "magazine", "effects": {"fire_rate": 5, "mobility": -2}},
    {"id": "drum_mag", "name": "鼓式弹匣", "slot": "magazine", "effects": {"mobility": -10, "fire_rate": -5}},
    # Stock
    {"id": "tactical_stock", "name": "战术枪托", "slot": "stock", "effects": {"accuracy": 5, "recoil": 3}},
    {"id": "lightweight_stock", "name": "轻量枪托", "slot": "stock", "effects": {"mobility": 8, "recoil": -3}},
    {"id": "heavy_stock", "name": "重型枪托", "slot": "stock", "effects": {"accuracy": 8, "mobility": -8}},
    # Sight
    {"id": "red_dot", "name": "红点瞄准镜", "slot": "sight", "effects": {"accuracy": 5}},
    {"id": "holo", "name": "全息瞄准镜", "slot": "sight", "effects": {"accuracy": 7, "mobility": -2}},
    {"id": "acog", "name": "ACOG 4x", "slot": "sight", "effects": {"accuracy": 10, "range": 8, "mobility": -5}},
    {"id": "sniper_scope", "name": "狙击镜 8x", "slot": "sight", "effects": {"accuracy": 15, "range": 15, "mobility": -8}},
]

GUIDES = [
    {
        "title": "攀升地图完全攻略",
        "slug": "ascent-full-guide",
        "guide_type": "map_guide",
        "map_slug": "ascent",
        "tags": ["map-ascent", "map-guide", "advanced"],
        "content": """# 攀升地图完全攻略

## 地图概述

攀升是三角洲行动中最受欢迎的地图之一，以城市巷战为主要特色。地图结构复杂，包含大量室内场景和多层建筑。

## 关键位置

### 狙击塔
地图中央的制高点，视野开阔，适合狙击手架枪。但要注意，这里也是敌方重点清理的区域。

### 地下通道
连接A区和B区的秘密通道，可以绕过正面火力，但通道内光线昏暗，需要小心伏击。

### 武器库
地图中央的武器库包含高级装备，是双方争夺的焦点。建议组队前往，注意清理周围敌人。

## 战术建议

1. **进攻方**：利用地下通道迂回，避免正面硬刚
2. **防守方**：控制狙击塔和武器库，建立火力优势
3. **通用**：注意听脚步声，室内战听力很重要
""",
    },
    {
        "title": "M4A1 最佳配装推荐",
        "slug": "m4a1-best-loadout",
        "guide_type": "loadout",
        "tags": ["loadout", "advanced"],
        "content": """# M4A1 最佳配装推荐

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

**特点**：后坐力低，适合中距离点射

## 使用技巧

1. M4A1 射速适中，适合点射和短连发
2. 中距离优先使用 2-3 发点射
3. 近距离可以扫射，但要注意压枪
""",
    },
    {
        "title": "新手入门指南",
        "slug": "beginner-guide",
        "guide_type": "beginner",
        "tags": ["beginner-guide", "beginner"],
        "content": """# 新手入门指南

## 基础操作

### 移动
- WASD 移动
- Shift 冲刺
- Ctrl 蹲下
- Space 跳跃

### 射击
- 鼠标左键 射击
- 鼠标右键 瞄准
- R 换弹

## 游戏模式

### 排位模式
正式的竞技模式，有段位系统。建议熟悉地图后再进入。

### 休闲模式
无段位压力，适合练习和娱乐。

## 新手建议

1. 先在休闲模式熟悉地图
2. 选择一把主力武器，熟悉其弹道
3. 多听脚步声，声音信息很重要
4. 不要一个人冲，跟队友配合
""",
    },
    {
        "title": "v2.1 版本更新日志",
        "slug": "patch-v2-1",
        "guide_type": "patch_notes",
        "tags": ["patch-notes"],
        "content": """# v2.1 版本更新日志

## 新内容

### 新地图：港口
全新的港口地图已上线！包含开阔码头区和密集集装箱区域，提供多样化的战斗体验。

### 新武器：UMP45
紧凑型冲锋枪，适合近距离交战。低后坐力，高机动性。

## 平衡调整

### 武器调整
- AK-47：后坐力降低 5%
- AWM：伤害降低 10（95→85）
- MP5：射速提升 5%

### 地图调整
- 攀升：修复了狙击塔穿模bug
- 暗区：增加了补给室的物资刷新率

## Bug修复
- 修复了换弹动画卡顿问题
- 修复了某些角度可以穿墙的bug
""",
    },
]


async def seed():
    async with engine.begin() as conn:
        # Create tables if not exist
        from app.models.base import Base
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        # Check if data already exists
        from sqlalchemy import select, func
        result = await db.execute(select(func.count()).select_from(User))
        count = result.scalar()
        if count > 0:
            print(f"Database already has {count} users. Skipping seed.")
            return

        # Create admin user
        admin = User(
            username="admin",
            email="admin@example.com",
            password_hash=pwd_context.hash("admin123"),
            role="admin",
            bio="系统管理员",
        )
        db.add(admin)
        await db.flush()

        # Create demo user
        demo = User(
            username="玩家小明",
            email="demo@example.com",
            password_hash=pwd_context.hash("demo123"),
            role="user",
            bio="三角洲行动资深玩家",
        )
        db.add(demo)
        await db.flush()

        print(f"Created users: admin (id={admin.id}), demo (id={demo.id})")

        # Create tags
        tag_map = {}
        for t in TAGS:
            tag = Tag(**t)
            db.add(tag)
            await db.flush()
            tag_map[t["slug"]] = tag.id
        print(f"Created {len(TAGS)} tags")

        # Create maps
        map_slug_to_id = {}
        for m in MAPS:
            map_obj = Map(**m)
            db.add(map_obj)
            await db.flush()
            map_slug_to_id[m["slug"]] = map_obj.id
        print(f"Created {len(MAPS)} maps")

        # Create map points
        from geoalchemy2.elements import WKTElement
        for p in MAP_POINTS:
            slug = p["map_slug"]
            map_id = map_slug_to_id.get(slug)
            if not map_id:
                continue
            point = MapPoint(
                map_id=map_id,
                name=p["name"],
                description=p["desc"],
                category=p["cat"],
                geometry=WKTElement(f"POINT({p['lng']} {p['lat']})", srid=4326),
            )
            db.add(point)
        await db.flush()
        print(f"Created {len(MAP_POINTS)} map points")

        # Create weapons and attachments
        for w in WEAPONS:
            weapon = Weapon(**w)
            db.add(weapon)
        await db.flush()
        print(f"Created {len(WEAPONS)} weapons")

        for a in ATTACHMENTS:
            att = Attachment(**a)
            db.add(att)
        await db.flush()
        print(f"Created {len(ATTACHMENTS)} attachments")

        # Create guides
        for g in GUIDES:
            tag_slugs = g.pop("tags", [])
            map_slug = g.pop("map_slug", None)
            tag_ids = [tag_map[s] for s in tag_slugs if s in tag_map]
            guide = Guide(
                title=g["title"],
                slug=g["slug"],
                content=g["content"],
                guide_type=g["guide_type"],
                author_id=admin.id,
                map_id=map_slug_to_id.get(map_slug) if map_slug else None,
                tags=tag_ids,
                likes_count=10,
                comments_count=2,
                favorites_count=5,
                published_at=func.now(),
            )
            db.add(guide)
        await db.flush()
        print(f"Created {len(GUIDES)} guides")

        await db.commit()
        print("Seed data inserted successfully!")


if __name__ == "__main__":
    asyncio.run(seed())
