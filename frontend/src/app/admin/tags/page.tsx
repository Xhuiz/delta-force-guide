"use client";

import { useEffect, useState } from "react";
import DataTable from "@/components/admin/DataTable";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const DEMO_TAGS = [
  { id: 1, name: "攀升", category: "map", slug: "map-ascent" },
  { id: 2, name: "暗区", category: "map", slug: "map-dark-zone" },
  { id: 3, name: "港口", category: "map", slug: "map-harbor" },
  { id: 4, name: "排位", category: "mode", slug: "ranked" },
  { id: 5, name: "休闲", category: "mode", slug: "casual" },
  { id: 6, name: "新手", category: "difficulty", slug: "beginner" },
  { id: 7, name: "进阶", category: "difficulty", slug: "advanced" },
  { id: 8, name: "专家", category: "difficulty", slug: "expert" },
  { id: 9, name: "地图攻略", category: "type", slug: "map-guide" },
  { id: 10, name: "配装推荐", category: "type", slug: "loadout" },
  { id: 11, name: "新手入门", category: "type", slug: "beginner-guide" },
  { id: 12, name: "版本日志", category: "type", slug: "patch-notes" },
];

const CATEGORY_LABELS: Record<string, string> = { map: "地图", mode: "模式", difficulty: "难度", type: "类型" };

export default function AdminTagsPage() {
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [useDemo, setUseDemo] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("map");
  const [slug, setSlug] = useState("");

  const fetchTags = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE}/api/tags`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.length > 0) setTags(data);
      else throw new Error("empty");
    } catch {
      setUseDemo(true);
      setTags(DEMO_TAGS);
    }
    setLoading(false);
  };

  useEffect(() => { fetchTags(); }, []);

  const handleCreate = async () => {
    if (!name || !slug) return;
    if (useDemo) {
      setTags([...tags, { id: Date.now(), name, category, slug }]);
      setName("");
      setSlug("");
      return;
    }
    const token = localStorage.getItem("access_token");
    await fetch(`${API_BASE}/api/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, category, slug }),
    });
    setName("");
    setSlug("");
    fetchTags();
  };

  const handleDelete = async (tag: any) => {
    if (!confirm(`确定删除标签「${tag.name}」？`)) return;
    if (useDemo) {
      setTags(tags.filter((t) => t.id !== tag.id));
      return;
    }
    const token = localStorage.getItem("access_token");
    await fetch(`${API_BASE}/api/tags/${tag.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchTags();
  };

  const columns = [
    { key: "name", label: "标签名" },
    { key: "category", label: "维度", render: (item: any) => CATEGORY_LABELS[item.category] || item.category },
    { key: "slug", label: "Slug" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">标签管理</h1>
        {useDemo && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">演示模式</span>}
      </div>
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="text-sm font-medium mb-3">添加标签</h3>
        <div className="flex gap-3 flex-wrap">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="标签名"
            className="border rounded px-3 py-2 text-sm"
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="border rounded px-3 py-2 text-sm">
            <option value="map">地图</option>
            <option value="mode">模式</option>
            <option value="difficulty">难度</option>
            <option value="type">类型</option>
          </select>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="slug"
            className="border rounded px-3 py-2 text-sm"
          />
          <button onClick={handleCreate} className="px-4 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">添加</button>
        </div>
      </div>
      <DataTable columns={columns} data={tags} loading={loading} onDelete={handleDelete} />
    </div>
  );
}
