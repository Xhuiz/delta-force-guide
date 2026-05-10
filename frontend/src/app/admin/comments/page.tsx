"use client";

import { useEffect, useState } from "react";
import DataTable from "@/components/admin/DataTable";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = async () => {
    const token = localStorage.getItem("access_token");
    const res = await fetch(`${API_BASE}/api/admin/comments`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setComments(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchComments(); }, []);

  const handleDelete = async (comment: any) => {
    if (!confirm("确定删除这条评论？")) return;
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
    { key: "target_type", label: "类型" },
    {
      key: "created_at",
      label: "时间",
      render: (item: any) => new Date(item.created_at).toLocaleString("zh-CN"),
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">评论管理</h1>
      <DataTable columns={columns} data={comments} loading={loading} onDelete={handleDelete} />
    </div>
  );
}
