import { SLOT_LABELS } from "@/lib/weaponData";

interface AttachmentSlotProps {
  slot: string;
  selectedId: string | null;
  attachments: Array<{ id: string; name: string; effects: Record<string, number> }>;
  onSelect: (id: string | null) => void;
}

export default function AttachmentSlot({ slot, selectedId, attachments, onSelect }: AttachmentSlotProps) {
  const selected = attachments.find((a) => a.id === selectedId);

  return (
    <div className="border rounded-lg p-3">
      <div className="text-xs text-gray-500 mb-2">{SLOT_LABELS[slot] || slot}</div>
      <select
        value={selectedId || ""}
        onChange={(e) => onSelect(e.target.value || null)}
        className="w-full border rounded px-2 py-1 text-sm"
      >
        <option value="">默认</option>
        {attachments.map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>
      {selected && (
        <div className="mt-2 text-xs text-gray-600">
          {Object.entries(selected.effects || {}).map(([key, val]) => (
            <span key={key} className={`mr-2 ${val > 0 ? "text-green-600" : "text-red-600"}`}>
              {key} {val > 0 ? "+" : ""}{val}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
