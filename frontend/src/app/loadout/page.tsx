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
          <div className="h-[400px]">
            <WeaponViewer3D modelUrl={weapon.model_url} fallbackImageUrl={weapon.image_url} />
          </div>

          <div>
            <h2 className="text-xl font-bold mb-4">{weapon.name}</h2>
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
