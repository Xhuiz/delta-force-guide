"use client";

import { useEffect, useState } from "react";
import DataTable from "@/components/admin/DataTable";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const DEMO_COMMENTS = [
  { id: 1, username: "玩家小明", content: "这个地图攻略太详细了，收藏！", target_type: "guide", created_at: "2026-05-09T14:30:00" },
  { id: 2, username: "玩家小明", content: "M4A1 配装方案试了很好用", target_type: "guide", created_at: "2026-05-08T10:15:00" },
  { id: 3, username: "admin", content: "感谢支持，后续会更新更多攻略", target_type: "guide", created_at: "2026-05-08T11:00:00" },
];

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [useDemo, setUseDemo] = useState(false);

  const fetchComments = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE}/api/admin/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setComments(data);
    } catch {
      setUseDemo(true);
      setComments(DEMO_COMMENTS);
    }
    setLoading(false);
  };

  useEffect(() => { fetchComments(); }, []);

  const handleDelete = async (comment: any) => {
    if (!confirm("确定删除这条评论？")) return;
    if (useDemo) {
      setComments(comments.filter((c) => c.id !== comment.id));
      return;
    }
    const token = localStorage.getItem("access_token");
    await fetch(`${API_BASE}/api/comments/${comment.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchComments();
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "username", label: "用户" },
    { key: "content", label: "内容", render: (item: any) => <span className="line-clamp-2">{item.content}</span> },
    {
      key: "target_type",
      label: "类型",
      render: (item: any) => (
        <span className="px-2 py-0.5 rounded text-xs bg-gray-100">
          {item.target_type === "guide" ? "攻略" : "标注点"}
        </span>
      ),
    },
    {
      key: "created_at",
      label: "时间",
      render: (item: any) => new Date(item.created_at).toLocaleString("zh-CN"),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">评论管理</h1>
        {useDemo && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">演示模式</span>}
      </div>
      <DataTable columns={columns} data={comments} loading={loading} onDelete={handleDelete} />
    </div>
  );
}
