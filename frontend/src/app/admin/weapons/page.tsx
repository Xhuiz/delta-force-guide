"use client";

import { useEffect, useState } from "react";
import DataTable from "@/components/admin/DataTable";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const DEMO_WEAPONS = [
  { id: "m4a1", name: "M4A1", category: "突击步枪", slots_count: 5 },
  { id: "ak47", name: "AK-47", category: "突击步枪", slots_count: 5 },
  { id: "mp5", name: "MP5", category: "冲锋枪", slots_count: 4 },
  { id: "awm", name: "AWM", category: "狙击枪", slots_count: 4 },
  { id: "ump45", name: "UMP45", category: "冲锋枪", slots_count: 4 },
];

const DEMO_ATTACHMENTS = [
  { id: "flash_hider", name: "消焰器", slot: "muzzle", effects: { recoil: 5, accuracy: 3 } },
  { id: "compensator", name: "补偿器", slot: "muzzle", effects: { recoil: 8, accuracy: 2 } },
  { id: "suppressor", name: "消音器", slot: "muzzle", effects: { recoil: 3, range: -5 } },
  { id: "vertical_grip", name: "垂直握把", slot: "grip", effects: { recoil: 8, mobility: -3 } },
  { id: "angled_grip", name: "斜角握把", slot: "grip", effects: { recoil: 4, mobility: 5 } },
  { id: "extended_mag", name: "扩容弹匣", slot: "magazine", effects: { mobility: -5 } },
  { id: "fast_mag", name: "快速弹匣", slot: "magazine", effects: { fire_rate: 5, mobility: -2 } },
  { id: "tactical_stock", name: "战术枪托", slot: "stock", effects: { accuracy: 5, recoil: 3 } },
  { id: "red_dot", name: "红点瞄准镜", slot: "sight", effects: { accuracy: 5 } },
  { id: "holo", name: "全息瞄准镜", slot: "sight", effects: { accuracy: 7, mobility: -2 } },
  { id: "acog", name: "ACOG 4x", slot: "sight", effects: { accuracy: 10, range: 8, mobility: -5 } },
];

const SLOT_LABELS: Record<string, string> = {
  muzzle: "枪口",
  grip: "握把",
  magazine: "弹匣",
  stock: "枪托",
  sight: "瞄准镜",
};

export default function AdminWeaponsPage() {
  const [weapons, setWeapons] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [useDemo, setUseDemo] = useState(false);
  const [tab, setTab] = useState<"weapons" | "attachments">("weapons");

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const [wRes, aRes] = await Promise.all([
        fetch(`${API_BASE}/api/weapons`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/weapons/attachments/list`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (!wRes.ok) throw new Error("API error");
      const wData = await wRes.json();
      const aData = await aRes.json();
      setWeapons(wData);
      setAttachments(aData || []);
    } catch {
      setUseDemo(true);
      setWeapons(DEMO_WEAPONS);
      setAttachments(DEMO_ATTACHMENTS);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const weaponColumns = [
    { key: "id", label: "ID" },
    { key: "name", label: "名称" },
    { key: "category", label: "类别" },
  ];

  const attachmentColumns = [
    { key: "id", label: "ID" },
    { key: "name", label: "名称" },
    {
      key: "slot",
      label: "槽位",
      render: (item: any) => SLOT_LABELS[item.slot] || item.slot,
    },
    {
      key: "effects",
      label: "效果",
      render: (item: any) => (
        <div className="flex gap-1 flex-wrap">
          {Object.entries(item.effects || {}).map(([k, v]) => (
            <span key={k} className={`text-xs px-1.5 py-0.5 rounded ${(v as number) > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {k} {(v as number) > 0 ? "+" : ""}{v as number}
            </span>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">武器数据管理</h1>
        {useDemo && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">演示模式</span>}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab("weapons")}
          className={`px-4 py-2 rounded text-sm font-medium ${
            tab === "weapons" ? "bg-white shadow text-gray-900" : "text-gray-500"
          }`}
        >
          武器 ({weapons.length})
        </button>
        <button
          onClick={() => setTab("attachments")}
          className={`px-4 py-2 rounded text-sm font-medium ${
            tab === "attachments" ? "bg-white shadow text-gray-900" : "text-gray-500"
          }`}
        >
          配件 ({attachments.length})
        </button>
      </div>

      {tab === "weapons" ? (
        <DataTable columns={weaponColumns} data={weapons} loading={loading} />
      ) : (
        <DataTable columns={attachmentColumns} data={attachments} loading={loading} />
      )}
    </div>
  );
}
