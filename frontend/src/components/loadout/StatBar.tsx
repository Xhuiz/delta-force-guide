import { STAT_LABELS } from "@/lib/weaponData";

interface StatBarProps {
  statKey: string;
  value: number;
  maxValue?: number;
}

export default function StatBar({ statKey, value, maxValue = 100 }: StatBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / maxValue) * 100));

  return (
    <div className="flex items-center gap-3">
      <span className="w-16 text-sm text-gray-600">{STAT_LABELS[statKey] || statKey}</span>
      <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-8 text-right text-sm font-medium">{value}</span>
    </div>
  );
}
