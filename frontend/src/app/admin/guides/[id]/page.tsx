"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import MarkdownEditor from "@/components/admin/MarkdownEditor";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function EditGuidePage() {
  const { id } = useParams();
  const isNew = id === "new";
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [guideType, setGuideType] = useState("map_guide");
  const [coverUrl, setCoverUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isNew) {
      const token = localStorage.getItem("access_token");
      fetch(`${API_BASE}/api/guides/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          setTitle(data.title);
          setSlug(data.slug);
          setContent(data.content);
          setGuideType(data.guide_type);
          setCoverUrl(data.cover_url || "");
        });
    }
  }, [id, isNew]);

  const handleSave = async () => {
    setSaving(true);
    const token = localStorage.getItem("access_token");
    const body = { title, slug, content, guide_type: guideType, cover_url: coverUrl || null };

    const url = isNew ? `${API_BASE}/api/guides` : `${API_BASE}/api/guides/${id}`;
    const method = isNew ? "POST" : "PUT";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      router.push("/admin/guides");
    } else {
      alert("保存失败");
    }
    setSaving(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{isNew ? "新建攻略" : "编辑攻略"}</h1>
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">标题</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded-lg px-4 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Slug (URL 标识)</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full border rounded-lg px-4 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">类型</label>
          <select
            value={guideType}
            onChange={(e) => setGuideType(e.target.value)}
            className="w-full border rounded-lg px-4 py-2"
          >
            <option value="map_guide">地图攻略</option>
            <option value="loadout">配装推荐</option>
            <option value="beginner">新手入门</option>
            <option value="patch_notes">版本日志</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">封面图 URL</label>
          <input
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            className="w-full border rounded-lg px-4 py-2"
            placeholder="https://..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">内容</label>
          <MarkdownEditor value={content} onChange={setContent} />
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存"}
          </button>
          <button
            onClick={() => router.push("/admin/guides")}
            className="px-6 py-2 border rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
