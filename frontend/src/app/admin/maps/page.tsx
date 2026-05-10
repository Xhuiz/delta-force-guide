"use client";

import { useEffect, useState } from "react";
import DataTable from "@/components/admin/DataTable";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const DEMO_MAPS = [
  { id: 1, name: "攀升", slug: "ascent", description: "城市巷战地图", points_count: 5 },
  { id: 2, name: "暗区", slug: "dark-zone", description: "地下设施地图", points_count: 3 },
  { id: 3, name: "港口", slug: "harbor", description: "港口开阔地图", points_count: 4 },
];

const DEMO_POINTS: Record<number, any[]> = {
  1: [
    { id: 1, name: "A点出生区", category: "spawn", description: "进攻方出生点" },
    { id: 2, name: "武器库", category: "resource", description: "高级装备" },
    { id: 3, name: "狙击塔", category: "tactical", description: "制高点" },
    { id: 4, name: "撤离点", category: "extraction", description: "直升机接应" },
    { id: 5, name: "雷区", category: "danger", description: "地雷密集" },
  ],
  2: [
    { id: 6, name: "入口A", category: "spawn", description: "主入口" },
    { id: 7, name: "补给室", category: "resource", description: "医疗包弹药" },
    { id: 8, name: "控制室", category: "tactical", description: "核心区域" },
  ],
  3: [
    { id: 9, name: "码头", category: "spawn", description: "登陆点" },
    { id: 10, name: "集装箱堆场", category: "tactical", description: "掩体密集" },
    { id: 11, name: "弹药库", category: "resource", description: "物资丰富" },
    { id: 12, name: "灯塔", category: "tactical", description: "观察哨" },
  ],
};

const CATEGORY_LABELS: Record<string, string> = {
  spawn: "出生点",
  resource: "资源点",
  tactical: "战术位",
  extraction: "撤离点",
  danger: "高危区",
};

const CATEGORY_COLORS: Record<string, string> = {
  spawn: "bg-green-100 text-green-700",
  resource: "bg-yellow-100 text-yellow-700",
  tactical: "bg-blue-100 text-blue-700",
  extraction: "bg-purple-100 text-purple-700",
  danger: "bg-red-100 text-red-700",
};

export default function AdminMapsPage() {
  const [maps, setMaps] = useState<any[]>([]);
  const [selectedMap, setSelectedMap] = useState<any>(null);
  const [points, setPoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [useDemo, setUseDemo] = useState(false);

  // New point form
  const [showForm, setShowForm] = useState(false);
  const [newPoint, setNewPoint] = useState({ name: "", description: "", category: "spawn", lng: 0, lat: 0 });

  const fetchMaps = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE}/api/maps`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.length > 0) {
        setMaps(data);
        setSelectedMap(data[0]);
      } else {
        throw new Error("empty");
      }
    } catch {
      setUseDemo(true);
      setMaps(DEMO_MAPS);
      setSelectedMap(DEMO_MAPS[0]);
    }
    setLoading(false);
  };

  const fetchPoints = async (mapId: number) => {
    if (useDemo) {
      setPoints(DEMO_POINTS[mapId] || []);
      return;
    }
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE}/api/maps/${mapId}/points`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPoints((data.features || []).map((f: any) => ({ id: f.properties.id, ...f.properties })));
    } catch {
      setPoints(DEMO_POINTS[mapId] || []);
    }
  };

  useEffect(() => { fetchMaps(); }, []);
  useEffect(() => { if (selectedMap) fetchPoints(selectedMap.id); }, [selectedMap]);

  const handleDeletePoint = async (point: any) => {
    if (!confirm(`确定删除标注点「${point.name}」？`)) return;
    if (useDemo) {
      setPoints(points.filter((p) => p.id !== point.id));
      return;
    }
    const token = localStorage.getItem("access_token");
    await fetch(`${API_BASE}/api/maps/points/${point.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchPoints(selectedMap.id);
  };

  const handleAddPoint = async () => {
    if (!newPoint.name) return;
    if (useDemo) {
      setPoints([...points, { id: Date.now(), ...newPoint }]);
      setShowForm(false);
      setNewPoint({ name: "", description: "", category: "spawn", lng: 0, lat: 0 });
      return;
    }
    const token = localStorage.getItem("access_token");
    await fetch(`${API_BASE}/api/maps/${selectedMap.id}/points`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(newPoint),
    });
    setShowForm(false);
    setNewPoint({ name: "", description: "", category: "spawn", lng: 0, lat: 0 });
    fetchPoints(selectedMap.id);
  };

  const columns = [
    { key: "name", label: "名称" },
    {
      key: "category",
      label: "类型",
      render: (item: any) => (
        <span className={`px-2 py-0.5 rounded text-xs ${CATEGORY_COLORS[item.category] || "bg-gray-100"}`}>
          {CATEGORY_LABELS[item.category] || item.category}
        </span>
      ),
    },
    { key: "description", label: "描述", render: (item: any) => <span className="text-gray-500 text-xs">{item.description}</span> },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">地图标注管理</h1>
        {useDemo && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">演示模式</span>}
      </div>

      {/* Map selector */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <label className="block text-sm font-medium mb-2">选择地图</label>
        <div className="flex gap-2 flex-wrap">
          {maps.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedMap(m)}
              className={`px-4 py-2 rounded-lg text-sm ${
                selectedMap?.id === m.id ? "bg-blue-500 text-white" : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
        {selectedMap && <p className="text-xs text-gray-500 mt-2">{selectedMap.description}</p>}
      </div>

      {/* Points table */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">标注点 ({points.length})</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
        >
          {showForm ? "取消" : "添加标注点"}
        </button>
      </div>

      {/* Add point form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">名称</label>
              <input
                value={newPoint.name}
                onChange={(e) => setNewPoint({ ...newPoint, name: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="标注点名称"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">类型</label>
              <select
                value={newPoint.category}
                onChange={(e) => setNewPoint({ ...newPoint, category: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">经度</label>
              <input
                type="number"
                value={newPoint.lng}
                onChange={(e) => setNewPoint({ ...newPoint, lng: Number(e.target.value) })}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">纬度</label>
              <input
                type="number"
                value={newPoint.lat}
                onChange={(e) => setNewPoint({ ...newPoint, lat: Number(e.target.value) })}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1">描述</label>
              <input
                value={newPoint.description}
                onChange={(e) => setNewPoint({ ...newPoint, description: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="标注点描述"
              />
            </div>
          </div>
          <button
            onClick={handleAddPoint}
            className="mt-3 px-4 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600"
          >
            确认添加
          </button>
        </div>
      )}

      <DataTable columns={columns} data={points} loading={loading} onDelete={handleDeletePoint} />
    </div>
  );
}
