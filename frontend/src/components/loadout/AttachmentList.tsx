import { SLOT_LABELS } from "@/lib/weaponData";

interface Attachment {
  id: string;
  name: string;
  slot: string;
  effects: Record<string, number>;
}

interface AttachmentListProps {
  slot: string;
  attachments: Attachment[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function AttachmentList({ slot, attachments, selectedId, onSelect }: AttachmentListProps) {
  const filtered = attachments.filter((a) => a.slot === slot);

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-700">{SLOT_LABELS[slot] || slot} 配件</h4>
      {filtered.map((att) => (
        <button
          key={att.id}
          onClick={() => onSelect(att.id)}
          className={`w-full text-left border rounded-lg p-3 transition-colors ${
            selectedId === att.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <div className="font-medium text-sm">{att.name}</div>
          <div className="flex gap-2 mt-1">
            {Object.entries(att.effects).map(([key, val]) => (
              <span key={key} className={`text-xs ${val > 0 ? "text-green-600" : "text-red-600"}`}>
                {key} {val > 0 ? "+" : ""}{val}
              </span>
            ))}
          </div>
        </button>
      ))}
    </div>
  );
}
