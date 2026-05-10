"use client";

interface PointDetail {
  id: number;
  name: string;
  description?: string;
  category: string;
  image_url?: string;
}

interface MapBottomSheetProps {
  point: PointDetail | null;
  onClose: () => void;
}

export default function MapBottomSheet({ point, onClose }: MapBottomSheetProps) {
  if (!point) return null;

  return (
    <div className="md:hidden fixed bottom-16 left-0 right-0 bg-white rounded-t-xl shadow-lg z-[1000] p-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">{point.category}</span>
          <h3 className="text-lg font-bold mt-1">{point.name}</h3>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
      </div>
      {point.image_url && <img src={point.image_url} alt={point.name} className="w-full h-40 object-cover rounded mb-2" />}
      {point.description && <p className="text-gray-600 text-sm">{point.description}</p>}
      <div className="flex gap-2 mt-3">
        <button className="flex-1 py-2 bg-blue-500 text-white rounded text-sm">收藏</button>
        <button className="flex-1 py-2 border border-gray-300 rounded text-sm">评论</button>
      </div>
    </div>
  );
}
