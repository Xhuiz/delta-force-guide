"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DataTable from "@/components/admin/DataTable";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const DEMO_GUIDES = [
  { id: 1, title: "攀升地图完全攻略", guide_type: "map_guide", likes_count: 42, favorites_count: 15, published_at: "2026-05-01T10:00:00" },
  { id: 2, title: "M4A1 最佳配装推荐", guide_type: "loadout", likes_count: 35, favorites_count: 12, published_at: "2026-05-03T14:00:00" },
  { id: 3, title: "新手入门指南", guide_type: "beginner", likes_count: 88, favorites_count: 45, published_at: "2026-04-28T09:00:00" },
  { id: 4, title: "v2.1 版本更新日志", guide_type: "patch_notes", likes_count: 25, favorites_count: 8, published_at: "2026-05-08T16:00:00" },
];

const TYPE_LABELS: Record<string, string> = {
  map_guide: "地图攻略",
  loadout: "配装推荐",
  beginner: "新手入门",
  patch_notes: "版本日志",
};

export default function AdminGuidesPage() {
  const [guides, setGuides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [useDemo, setUseDemo] = useState(false);
  const router = useRouter();

  const fetchGuides = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE}/api/guides?page_size=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.items && data.items.length > 0) setGuides(data.items);
      else throw new Error("empty");
    } catch {
      setUseDemo(true);
      setGuides(DEMO_GUIDES);
    }
    setLoading(false);
  };

  useEffect(() => { fetchGuides(); }, []);

  const handleDelete = async (guide: any) => {
    if (!confirm(`确定删除攻略「${guide.title}」？`)) return;
    if (useDemo) {
      setGuides(guides.filter((g) => g.id !== guide.id));
      return;
    }
    const token = localStorage.getItem("access_token");
    await fetch(`${API_BASE}/api/guides/${guide.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchGuides();
  };

  const columns = [
    { key: "title", label: "标题" },
    { key: "guide_type", label: "类型", render: (item: any) => TYPE_LABELS[item.guide_type] || item.guide_type },
    { key: "likes_count", label: "点赞" },
    { key: "favorites_count", label: "收藏" },
    {
      key: "published_at",
      label: "发布时间",
      render: (item: any) => item.published_at ? new Date(item.published_at).toLocaleDateString("zh-CN") : "草稿",
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">攻略管理</h1>
        <div className="flex items-center gap-3">
          {useDemo && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">演示模式</span>}
          <button
            onClick={() => router.push("/admin/guides/new")}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
          >
            新建攻略
          </button>
        </div>
      </div>
      <DataTable
        columns={columns}
        data={guides}
        loading={loading}
        onEdit={(item) => router.push(`/admin/guides/${item.id}`)}
        onDelete={handleDelete}
      />
    </div>
  );
}
