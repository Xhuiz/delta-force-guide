"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { fetchMaps, fetchMapPoints } from "@/lib/api";
import { useMapStore } from "@/stores/mapStore";
import MapBottomSheet from "@/components/map/MapBottomSheet";

const MapView = dynamic(() => import("@/components/map/MapView"), { ssr: false });

export default function MapPage() {
  const [maps, setMaps] = useState<any[]>([]);
  const [selectedMap, setSelectedMap] = useState<any>(null);
  const [points, setPoints] = useState<any[]>([]);
  const { activeCategories, toggleCategory, selectedPointId, setSelectedPointId } = useMapStore();

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

  const filteredPoints = points.filter((f) => activeCategories.includes(f.properties.category));
  const selectedPoint = points.find((f) => f.properties.id === selectedPointId)?.properties;

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
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div className="p-4 flex-1 overflow-auto">
          <h3 className="font-semibold mb-2">图层筛选</h3>
          {["spawn", "resource", "tactical", "extraction", "danger"].map((cat) => (
            <label key={cat} className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={activeCategories.includes(cat)}
                onChange={() => toggleCategory(cat)}
              />
              <span className="capitalize">{cat}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Map area */}
      <div className="flex-1 relative">
        {selectedMap && <MapView tileUrl={selectedMap.tile_url || ""} bounds={selectedMap.bounds} />}
      </div>

      {/* Mobile bottom bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-2">
        <button className="p-2 text-sm">筛选</button>
        <button className="p-2 text-sm">地图切换</button>
        <button className="p-2 text-sm">列表</button>
      </div>

      <MapBottomSheet
        point={selectedPoint ? { ...selectedPoint } : null}
        onClose={() => setSelectedPointId(null)}
      />
    </div>
  );
}
