"use client";

import { useEffect, useState } from "react";
import DataTable from "@/components/admin/DataTable";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function AdminTagsPage() {
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("map");
  const [slug, setSlug] = useState("");

  const fetchTags = async () => {
    const token = localStorage.getItem("access_token");
    const res = await fetch(`${API_BASE}/api/tags`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setTags(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTags(); }, []);

  const handleCreate = async () => {
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
    const token = localStorage.getItem("access_token");
    await fetch(`${API_BASE}/api/tags/${tag.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchTags();
  };

  const columns = [
    { key: "name", label: "标签名" },
    { key: "category", label: "维度" },
    { key: "slug", label: "Slug" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">标签管理</h1>
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="标签名"
            className="border rounded px-3 py-2"
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="border rounded px-3 py-2">
            <option value="map">地图</option>
            <option value="mode">模式</option>
            <option value="difficulty">难度</option>
            <option value="type">类型</option>
          </select>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="slug"
            className="border rounded px-3 py-2"
          />
          <button onClick={handleCreate} className="px-4 py-2 bg-blue-500 text-white rounded">添加</button>
        </div>
      </div>
      <DataTable columns={columns} data={tags} loading={loading} onDelete={handleDelete} />
    </div>
  );
}
