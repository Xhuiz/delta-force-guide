"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DataTable from "@/components/admin/DataTable";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const TYPE_LABELS: Record<string, string> = {
  map_guide: "地图攻略",
  loadout: "配装推荐",
  beginner: "新手入门",
  patch_notes: "版本日志",
};

export default function AdminGuidesPage() {
  const [guides, setGuides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchGuides = async () => {
    const token = localStorage.getItem("access_token");
    const res = await fetch(`${API_BASE}/api/guides?page_size=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setGuides(data.items || []);
    setLoading(false);
  };

  useEffect(() => { fetchGuides(); }, []);

  const handleDelete = async (guide: any) => {
    if (!confirm(`确定删除攻略「${guide.title}」？`)) return;
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
        <button
          onClick={() => router.push("/admin/guides/new")}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          新建攻略
        </button>
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
