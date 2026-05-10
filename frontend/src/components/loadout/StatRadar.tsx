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
      <polygon points={polygonPoints} fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" strokeWidth="2" />
      {points.map((p, i) => (
        <text key={i} x={p.labelX} y={p.labelY} textAnchor="middle" dominantBaseline="middle" className="text-xs fill-gray-600">
          {p.label}
        </text>
      ))}
    </svg>
  );
}
