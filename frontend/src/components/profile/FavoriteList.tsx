interface Favorite {
  id: number;
  title: string;
  slug: string;
  cover_url: string | null;
  guide_type: string;
  favorited_at: string;
}

interface FavoriteListProps {
  items: Favorite[];
}

const TYPE_LABELS: Record<string, string> = {
  map_guide: "地图攻略",
  loadout: "配装推荐",
  beginner: "新手入门",
  patch_notes: "版本日志",
};

export default function FavoriteList({ items }: FavoriteListProps) {
  if (items.length === 0) {
    return <div className="text-center py-8 text-gray-400">暂无收藏</div>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <a
          key={item.id}
          href={`/guides/${item.slug}`}
          className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50"
        >
          {item.cover_url ? (
            <img src={item.cover_url} alt="" className="w-16 h-16 object-cover rounded" />
          ) : (
            <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">无封面</div>
          )}
          <div className="flex-1">
            <h3 className="font-medium">{item.title}</h3>
            <span className="text-xs text-gray-500">{TYPE_LABELS[item.guide_type]}</span>
          </div>
          <span className="text-xs text-gray-400">{new Date(item.favorited_at).toLocaleDateString("zh-CN")}</span>
        </a>
      ))}
    </div>
  );
}
