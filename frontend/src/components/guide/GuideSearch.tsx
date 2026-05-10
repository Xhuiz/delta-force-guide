export default function GuideSearch({ search, onSearchChange, guideType, onTypeChange, sort, onSortChange }: any) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <input type="text" placeholder="搜索攻略..." value={search} onChange={(e) => onSearchChange(e.target.value)} className="flex-1 border rounded-lg px-4 py-2" />
      <select value={guideType} onChange={(e) => onTypeChange(e.target.value)} className="border rounded-lg px-4 py-2">
        <option value="">全部类型</option>
        <option value="map_guide">地图攻略</option>
        <option value="loadout">配装推荐</option>
        <option value="beginner">新手入门</option>
        <option value="patch_notes">版本日志</option>
      </select>
      <select value={sort} onChange={(e) => onSortChange(e.target.value)} className="border rounded-lg px-4 py-2">
        <option value="latest">最新</option>
        <option value="popular">最热</option>
        <option value="favorites">最多收藏</option>
      </select>
    </div>
  );
}
