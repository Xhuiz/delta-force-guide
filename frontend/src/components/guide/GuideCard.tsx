const TYPE_LABELS: Record<string, string> = { map_guide: "地图攻略", loadout: "配装推荐", beginner: "新手入门", patch_notes: "版本日志" };

export default function GuideCard({ title, slug, coverUrl, guideType, likesCount, publishedAt }: any) {
  return (
    <a href={`/guides/${slug}`} className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {coverUrl ? <img src={coverUrl} alt={title} className="w-full h-40 object-cover" /> : <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400">暂无封面</div>}
      <div className="p-4">
        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">{TYPE_LABELS[guideType] || guideType}</span>
        <h3 className="font-semibold mt-2 line-clamp-2">{title}</h3>
        <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
          <span>{publishedAt ? new Date(publishedAt).toLocaleDateString("zh-CN") : ""}</span>
          <span>👍 {likesCount}</span>
        </div>
      </div>
    </a>
  );
}
