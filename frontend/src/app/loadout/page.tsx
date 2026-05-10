"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useLoadoutStore } from "@/stores/loadoutStore";
import StatBar from "@/components/loadout/StatBar";
import AttachmentSlot from "@/components/loadout/AttachmentSlot";
import { SLOT_LABELS } from "@/lib/weaponData";

const WeaponViewer3D = dynamic(() => import("@/components/loadout/WeaponViewer3D"), { ssr: false });
const StatRadar = dynamic(() => import("@/components/loadout/StatRadar"), { ssr: false });

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const DEMO_WEAPONS: any[] = [
  {
    id: "m4a1", name: "M4A1", category: "突击步枪", model_url: null, image_url: null,
    base_stats: { damage: 42, fire_rate: 75, accuracy: 68, recoil: 55, mobility: 60, range: 55 },
    slots: ["muzzle", "grip", "magazine", "stock", "sight"],
    attachments: [
      { id: "flash_hider", name: "消焰器", slot: "muzzle", effects: { recoil: 5, accuracy: 3 } },
      { id: "compensator", name: "补偿器", slot: "muzzle", effects: { recoil: 8, accuracy: 2 } },
      { id: "suppressor", name: "消音器", slot: "muzzle", effects: { recoil: 3, range: -5 } },
      { id: "vertical_grip", name: "垂直握把", slot: "grip", effects: { recoil: 8, mobility: -3 } },
      { id: "angled_grip", name: "斜角握把", slot: "grip", effects: { recoil: 4, mobility: 5 } },
      { id: "extended_mag", name: "扩容弹匣", slot: "magazine", effects: { mobility: -5 } },
      { id: "fast_mag", name: "快速弹匣", slot: "magazine", effects: { fire_rate: 5, mobility: -2 } },
      { id: "tactical_stock", name: "战术枪托", slot: "stock", effects: { accuracy: 5, recoil: 3 } },
      { id: "lightweight_stock", name: "轻量枪托", slot: "stock", effects: { mobility: 8, recoil: -3 } },
      { id: "red_dot", name: "红点瞄准镜", slot: "sight", effects: { accuracy: 5 } },
      { id: "holo", name: "全息瞄准镜", slot: "sight", effects: { accuracy: 7, mobility: -2 } },
      { id: "acog", name: "ACOG 4x", slot: "sight", effects: { accuracy: 10, range: 8, mobility: -5 } },
    ],
  },
  {
    id: "ak47", name: "AK-47", category: "突击步枪", model_url: null, image_url: null,
    base_stats: { damage: 55, fire_rate: 60, accuracy: 50, recoil: 35, mobility: 55, range: 50 },
    slots: ["muzzle", "grip", "magazine", "stock", "sight"],
    attachments: [
      { id: "flash_hider", name: "消焰器", slot: "muzzle", effects: { recoil: 5, accuracy: 3 } },
      { id: "compensator", name: "补偿器", slot: "muzzle", effects: { recoil: 8, accuracy: 2 } },
      { id: "vertical_grip", name: "垂直握把", slot: "grip", effects: { recoil: 8, mobility: -3 } },
      { id: "angled_grip", name: "斜角握把", slot: "grip", effects: { recoil: 4, mobility: 5 } },
      { id: "extended_mag", name: "扩容弹匣", slot: "magazine", effects: { mobility: -5 } },
      { id: "tactical_stock", name: "战术枪托", slot: "stock", effects: { accuracy: 5, recoil: 3 } },
      { id: "red_dot", name: "红点瞄准镜", slot: "sight", effects: { accuracy: 5 } },
      { id: "holo", name: "全息瞄准镜", slot: "sight", effects: { accuracy: 7, mobility: -2 } },
    ],
  },
  {
    id: "mp5", name: "MP5", category: "冲锋枪", model_url: null, image_url: null,
    base_stats: { damage: 30, fire_rate: 85, accuracy: 60, recoil: 70, mobility: 80, range: 30 },
    slots: ["muzzle", "grip", "magazine", "sight"],
    attachments: [
      { id: "flash_hider", name: "消焰器", slot: "muzzle", effects: { recoil: 5, accuracy: 3 } },
      { id: "suppressor", name: "消音器", slot: "muzzle", effects: { recoil: 3, range: -5 } },
      { id: "vertical_grip", name: "垂直握把", slot: "grip", effects: { recoil: 8, mobility: -3 } },
      { id: "fast_mag", name: "快速弹匣", slot: "magazine", effects: { fire_rate: 5, mobility: -2 } },
      { id: "red_dot", name: "红点瞄准镜", slot: "sight", effects: { accuracy: 5 } },
      { id: "holo", name: "全息瞄准镜", slot: "sight", effects: { accuracy: 7, mobility: -2 } },
    ],
  },
  {
    id: "awm", name: "AWM", category: "狙击枪", model_url: null, image_url: null,
    base_stats: { damage: 95, fire_rate: 15, accuracy: 90, recoil: 20, mobility: 25, range: 95 },
    slots: ["muzzle", "magazine", "stock", "sight"],
    attachments: [
      { id: "suppressor", name: "消音器", slot: "muzzle", effects: { recoil: 3, range: -5 } },
      { id: "fast_mag", name: "快速弹匣", slot: "magazine", effects: { fire_rate: 5, mobility: -2 } },
      { id: "heavy_stock", name: "重型枪托", slot: "stock", effects: { accuracy: 8, mobility: -8 } },
      { id: "acog", name: "ACOG 4x", slot: "sight", effects: { accuracy: 10, range: 8, mobility: -5 } },
      { id: "sniper_scope", name: "狙击镜 8x", slot: "sight", effects: { accuracy: 15, range: 15, mobility: -8 } },
    ],
  },
];

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

  const [isMobile, setIsMobile] = useState(false);
  const [useDemo, setUseDemo] = useState(false);

  // Load weapons
  useEffect(() => {
    fetch(`${API_BASE}/api/weapons`)
      .then((r) => r.json())
      .then((data) => {
        if (data.length > 0) {
          setWeapons(data);
          selectWeapon(data[0].id);
        } else {
          throw new Error("empty");
        }
      })
      .catch(() => {
        setUseDemo(true);
        setWeapons(DEMO_WEAPONS);
        selectWeapon(DEMO_WEAPONS[0].id);
      });
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Fetch full weapon detail (only for non-demo mode)
  const [weaponDetail, setWeaponDetail] = useState<any>(null);
  useEffect(() => {
    if (useDemo) {
      const w = DEMO_WEAPONS.find((w) => w.id === selectedWeaponId);
      setWeaponDetail(w || null);
    } else if (selectedWeaponId) {
      fetch(`${API_BASE}/api/weapons/${selectedWeaponId}`)
        .then((r) => r.json())
        .then(setWeaponDetail)
        .catch(() => {
          const w = DEMO_WEAPONS.find((w) => w.id === selectedWeaponId);
          setWeaponDetail(w || null);
        });
    }
  }, [selectedWeaponId, useDemo]);

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
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-3xl font-bold">配装模拟器</h1>
        {useDemo && (
          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">演示模式</span>
        )}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <select
          value={selectedWeaponId || ""}
          onChange={(e) => selectWeapon(e.target.value)}
          className="border rounded-lg px-4 py-2 text-base"
        >
          {weapons.map((w) => (
            <option key={w.id} value={w.id}>{w.name} ({w.category})</option>
          ))}
        </select>
        <button onClick={resetLoadout} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">重置</button>
        <button onClick={handleShare} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">分享链接</button>
      </div>

      {weapon && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 3D viewer / placeholder */}
          <div className="h-[400px]">
            <WeaponViewer3D modelUrl={weapon.model_url} fallbackImageUrl={weapon.image_url} />
          </div>

          {/* Stats */}
          <div>
            <h2 className="text-xl font-bold mb-1">{weapon.name}</h2>
            <p className="text-sm text-gray-500 mb-4">{weapon.category}</p>
            {isMobile ? (
              <StatRadar stats={stats} />
            ) : (
              <div className="space-y-3">
                {Object.entries(stats).map(([key, value]) => (
                  <StatBar key={key} statKey={key} value={value as number} />
                ))}
              </div>
            )}
          </div>

          {/* Attachment slots */}
          <div className="md:col-span-2">
            <h3 className="text-lg font-bold mb-4">配件槽位</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
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
          </div>
        </div>
      )}
    </div>
  );
}
