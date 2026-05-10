"use client";
import { useGuides } from "@/hooks/useGuides";
import GuideCard from "@/components/guide/GuideCard";
import GuideSearch from "@/components/guide/GuideSearch";

export default function GuidesPage() {
  const { data, loading, search, setSearch, guideType, setGuideType, sort, setSort, page, setPage } = useGuides();
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">攻略中心</h1>
      <GuideSearch search={search} onSearchChange={setSearch} guideType={guideType} onTypeChange={setGuideType} sort={sort} onSortChange={setSort} />
      {loading ? <div className="text-center py-12 text-gray-400">加载中...</div> : data?.items.length === 0 ? <div className="text-center py-12 text-gray-400">暂无攻略</div> : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {data?.items.map((guide: any) => <GuideCard key={guide.id} {...guide} />)}
          </div>
          <div className="flex justify-center gap-4 mt-8">
            {page > 1 && <button onClick={() => setPage(page - 1)} className="px-4 py-2 border rounded">上一页</button>}
            {data?.has_next && <button onClick={() => setPage(page + 1)} className="px-4 py-2 border rounded">下一页</button>}
          </div>
        </>
      )}
    </div>
  );
}
