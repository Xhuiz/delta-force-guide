"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import MarkdownEditor from "@/components/admin/MarkdownEditor";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const DEMO_MAPS = [
  { id: 1, name: "攀升" },
  { id: 2, name: "暗区" },
  { id: 3, name: "港口" },
];

const DEMO_TAGS = [
  { id: 1, name: "攀升", category: "map" },
  { id: 2, name: "暗区", category: "map" },
  { id: 3, name: "港口", category: "map" },
  { id: 4, name: "排位", category: "mode" },
  { id: 5, name: "休闲", category: "mode" },
  { id: 6, name: "新手", category: "difficulty" },
  { id: 7, name: "进阶", category: "difficulty" },
  { id: 8, name: "专家", category: "difficulty" },
  { id: 9, name: "地图攻略", category: "type" },
  { id: 10, name: "配装推荐", category: "type" },
  { id: 11, name: "新手入门", category: "type" },
  { id: 12, name: "版本日志", category: "type" },
];

const DEMO_CONTENT: Record<string, any> = {
  "1": { title: "攀升地图完全攻略", slug: "ascent-full-guide", guide_type: "map_guide", map_id: 1, tags: [1, 9, 7], content: "# 攀升地图完全攻略\n\n## 地图概述\n\n攀升是三角洲行动中最受欢迎的地图之一。" },
  "2": { title: "M4A1 最佳配装推荐", slug: "m4a1-best-loadout", guide_type: "loadout", map_id: null, tags: [10, 7], content: "# M4A1 最佳配装推荐\n\n## 配装方案\n\n### 近战突击型" },
  "3": { title: "新手入门指南", slug: "beginner-guide", guide_type: "beginner", map_id: null, tags: [11, 6], content: "# 新手入门指南\n\n## 基础操作" },
  "4": { title: "v2.1 版本更新日志", slug: "patch-v2-1", guide_type: "patch_notes", map_id: null, tags: [12], content: "# v2.1 版本更新日志\n\n## 新内容" },
};

export default function EditGuidePage() {
  const { id } = useParams();
  const isNew = id === "new";
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [guideType, setGuideType] = useState("map_guide");
  const [coverUrl, setCoverUrl] = useState("");
  const [mapId, setMapId] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [maps, setMaps] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);

  useEffect(() => {
    // Load maps and tags
    const loadData = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const [mapsRes, tagsRes] = await Promise.all([
          fetch(`${API_BASE}/api/maps`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/api/tags`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const mapsData = await mapsRes.json();
        const tagsData = await tagsRes.json();
        setMaps(mapsData.length > 0 ? mapsData : DEMO_MAPS);
        setTags(tagsData.length > 0 ? tagsData : DEMO_TAGS);
      } catch {
        setMaps(DEMO_MAPS);
        setTags(DEMO_TAGS);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!isNew) {
      const s = id as string;
      // Try API first, fall back to demo
      const token = localStorage.getItem("access_token");
      fetch(`${API_BASE}/api/guides/${s}`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((data) => {
          if (data.id) {
            setTitle(data.title);
            setSlug(data.slug);
            setContent(data.content);
            setGuideType(data.guide_type);
            setCoverUrl(data.cover_url || "");
            setMapId(data.map_id || null);
            setSelectedTags(data.tags || []);
          } else {
            throw new Error("not found");
          }
        })
        .catch(() => {
          const demo = DEMO_CONTENT[s];
          if (demo) {
            setTitle(demo.title);
            setSlug(demo.slug);
            setContent(demo.content);
            setGuideType(demo.guide_type);
            setMapId(demo.map_id);
            setSelectedTags(demo.tags);
          }
        });
    }
  }, [id, isNew]);

  const handleSave = async () => {
    setSaving(true);
    const token = localStorage.getItem("access_token");
    const body = { title, slug, content, guide_type: guideType, cover_url: coverUrl || null, map_id: mapId, tags: selectedTags };

    const url = isNew ? `${API_BASE}/api/guides` : `${API_BASE}/api/guides/${id}`;
    const method = isNew ? "POST" : "PUT";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        router.push("/admin/guides");
      } else {
        alert("保存失败（演示模式下无法保存到后端）");
      }
    } catch {
      alert("保存失败（后端未启动）");
    }
    setSaving(false);
  };

  const toggleTag = (tagId: number) => {
    setSelectedTags((prev) => prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]);
  };

  const tagsByCategory = tags.reduce((acc: Record<string, any[]>, tag) => {
    if (!acc[tag.category]) acc[tag.category] = [];
    acc[tag.category].push(tag);
    return acc;
  }, {});

  const CATEGORY_LABELS: Record<string, string> = { map: "地图", mode: "模式", difficulty: "难度", type: "类型" };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{isNew ? "新建攻略" : "编辑攻略"}</h1>
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">标题</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded-lg px-4 py-2"
              placeholder="攻略标题"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Slug (URL 标识)</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full border rounded-lg px-4 py-2"
              placeholder="url-friendly-slug"
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
            <label className="block text-sm font-medium mb-1">关联地图</label>
            <select
              value={mapId || ""}
              onChange={(e) => setMapId(e.target.value ? Number(e.target.value) : null)}
              className="w-full border rounded-lg px-4 py-2"
            >
              <option value="">无</option>
              {maps.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">封面图 URL</label>
            <input
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              className="w-full border rounded-lg px-4 py-2"
              placeholder="https://..."
            />
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium mb-2">标签</label>
          <div className="space-y-3">
            {Object.entries(tagsByCategory).map(([cat, catTags]) => (
              <div key={cat}>
                <span className="text-xs text-gray-500 mb-1 block">{CATEGORY_LABELS[cat] || cat}</span>
                <div className="flex gap-2 flex-wrap">
                  {catTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={`px-3 py-1 rounded-full text-xs ${
                        selectedTags.includes(tag.id)
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">内容</label>
          <MarkdownEditor value={content} onChange={setContent} />
        </div>

        <div className="flex gap-3 pt-2">
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
