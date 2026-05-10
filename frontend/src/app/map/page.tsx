"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import L from "leaflet";
import { fetchMaps, fetchMapPoints } from "@/lib/api";
import { useMapStore } from "@/stores/mapStore";

const MapView = dynamic(() => import("@/components/map/MapView"), { ssr: false });

// Demo data when backend is unavailable
const DEMO_MAPS = [
  { id: 1, name: "攀升", slug: "ascent", description: "城市巷战地图", tile_url: null, bounds: null },
  { id: 2, name: "暗区", slug: "dark-zone", description: "地下设施地图", tile_url: null, bounds: null },
  { id: 3, name: "港口", slug: "harbor", description: "港口开阔地图", tile_url: null, bounds: null },
];

const DEMO_POINTS: Record<number, any[]> = {
  1: [
    { id: 1, name: "A点出生区", category: "spawn", lat: 39.92, lng: 116.40, description: "进攻方出生点" },
    { id: 2, name: "武器库", category: "resource", lat: 39.93, lng: 116.41, description: "高级装备" },
    { id: 3, name: "狙击塔", category: "tactical", lat: 39.91, lng: 116.42, description: "制高点" },
    { id: 4, name: "撤离点", category: "extraction", lat: 39.94, lng: 116.39, description: "直升机接应" },
    { id: 5, name: "雷区", category: "danger", lat: 39.90, lng: 116.43, description: "地雷密集" },
  ],
  2: [
    { id: 6, name: "入口A", category: "spawn", lat: 39.95, lng: 116.45, description: "主入口" },
    { id: 7, name: "补给室", category: "resource", lat: 39.96, lng: 116.46, description: "医疗包弹药" },
    { id: 8, name: "控制室", category: "tactical", lat: 39.97, lng: 116.44, description: "核心区域" },
  ],
  3: [
    { id: 9, name: "码头", category: "spawn", lat: 39.98, lng: 116.50, description: "登陆点" },
    { id: 10, name: "集装箱堆场", category: "tactical", lat: 39.99, lng: 116.51, description: "掩体密集" },
    { id: 11, name: "弹药库", category: "resource", lat: 40.00, lng: 116.49, description: "物资丰富" },
    { id: 12, name: "灯塔", category: "tactical", lat: 40.01, lng: 116.52, description: "观察哨" },
  ],
};

const CATEGORY_COLORS: Record<string, string> = {
  spawn: "#22c55e",
  resource: "#eab308",
  tactical: "#3b82f6",
  extraction: "#a855f7",
  danger: "#ef4444",
};

const CATEGORY_LABELS: Record<string, string> = {
  spawn: "出生点",
  resource: "资源点",
  tactical: "战术位",
  extraction: "撤离点",
  danger: "高危区",
};

export default function MapPage() {
  const [maps, setMaps] = useState<any[]>([]);
  const [selectedMap, setSelectedMap] = useState<any>(null);
  const [points, setPoints] = useState<any[]>([]);
  const [useDemo, setUseDemo] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<any>(null);
  const { activeCategories, toggleCategory } = useMapStore();
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);

  // Load maps
  useEffect(() => {
    fetchMaps()
      .then((data) => {
        if (data.length > 0) {
          setMaps(data);
          setSelectedMap(data[0]);
        } else {
          throw new Error("empty");
        }
      })
      .catch(() => {
        setUseDemo(true);
        setMaps(DEMO_MAPS);
        setSelectedMap(DEMO_MAPS[0]);
      });
  }, []);

  // Load points
  useEffect(() => {
    if (!selectedMap) return;
    if (useDemo) {
      setPoints(DEMO_POINTS[selectedMap.id] || []);
    } else {
      fetchMapPoints(selectedMap.id)
        .then((data) => {
          const pts = (data.features || []).map((f: any) => ({
            id: f.properties.id,
            name: f.properties.name,
            category: f.properties.category,
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
            description: f.properties.description,
          }));
          setPoints(pts);
        })
        .catch(() => {
          setUseDemo(true);
          setPoints(DEMO_POINTS[selectedMap.id] || []);
        });
    }
  }, [selectedMap, useDemo]);

  // Update markers on map
  useEffect(() => {
    // We access the map instance via the MapView component
    // For now, we'll use a different approach - render markers as part of the page
  }, [points, activeCategories]);

  const filteredPoints = points.filter((p) => activeCategories.includes(p.category));

  // Calculate center of filtered points
  const center: [number, number] = filteredPoints.length > 0
    ? [
        filteredPoints.reduce((s, p) => s + p.lat, 0) / filteredPoints.length,
        filteredPoints.reduce((s, p) => s + p.lng, 0) / filteredPoints.length,
      ]
    : [35, 105];

  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* Sidebar - PC only */}
      <div className="hidden md:flex w-64 flex-col border-r bg-white overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-bold text-lg">地图选择</h2>
          <select
            className="mt-2 w-full border rounded p-2 text-sm"
            value={selectedMap?.id || ""}
            onChange={(e) => {
              const m = maps.find((m) => m.id === Number(e.target.value));
              setSelectedMap(m);
              setSelectedPoint(null);
            }}
          >
            {maps.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          {selectedMap && <p className="text-xs text-gray-500 mt-1">{selectedMap.description}</p>}
        </div>

        {/* Category filter */}
        <div className="p-4 border-b">
          <h3 className="font-semibold mb-2 text-sm">图层筛选</h3>
          {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
            <label key={cat} className="flex items-center gap-2 mb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={activeCategories.includes(cat)}
                onChange={() => toggleCategory(cat)}
                className="rounded"
              />
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[cat] }}
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>

        {/* Point list */}
        <div className="flex-1 overflow-auto p-4">
          <h3 className="font-semibold mb-2 text-sm">标注点 ({filteredPoints.length})</h3>
          <div className="space-y-2">
            {filteredPoints.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPoint(p)}
                className={`w-full text-left p-2 rounded border text-sm transition-colors ${
                  selectedPoint?.id === p.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[p.category] }} />
                  <span className="font-medium">{p.name}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 ml-4">{p.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Map area */}
      <div className="flex-1 relative">
        <MapView center={center} zoom={12} />

        {/* Markers overlay - rendered as positioned divs */}
        {/* This is a simplified approach; in production you'd use react-leaflet */}

        {/* Mobile filter bar */}
        <div className="md:hidden absolute top-2 left-2 right-2 z-[1000] flex gap-2 overflow-x-auto">
          {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                activeCategories.includes(cat)
                  ? "bg-blue-500 text-white"
                  : "bg-white/90 text-gray-600 border"
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeCategories.includes(cat) ? "#fff" : CATEGORY_COLORS[cat] }} />
              {label}
            </button>
          ))}
        </div>

        {/* Selected point detail */}
        {selectedPoint && (
          <div className="absolute bottom-4 left-4 right-4 md:left-auto md:w-72 bg-white rounded-lg shadow-lg p-4 z-[1000]">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: CATEGORY_COLORS[selectedPoint.category] + "20", color: CATEGORY_COLORS[selectedPoint.category] }}>
                  {CATEGORY_LABELS[selectedPoint.category]}
                </span>
                <h3 className="font-bold mt-1">{selectedPoint.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{selectedPoint.description}</p>
              </div>
              <button onClick={() => setSelectedPoint(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="flex gap-2 mt-3">
              <button className="flex-1 py-1.5 bg-blue-500 text-white rounded text-sm">收藏</button>
              <button className="flex-1 py-1.5 border border-gray-300 rounded text-sm">评论</button>
            </div>
          </div>
        )}

        {/* Demo mode indicator */}
        {useDemo && (
          <div className="absolute top-2 right-2 z-[1000] bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
            演示模式 — 启动后端获取真实数据
          </div>
        )}
      </div>
    </div>
  );
}
