"use client";

import { useEffect, useState } from "react";
import DataTable from "@/components/admin/DataTable";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const DEMO_USERS = [
  { id: 1, username: "admin", email: "admin@example.com", role: "admin", created_at: "2026-05-01T00:00:00" },
  { id: 2, username: "玩家小明", email: "demo@example.com", role: "user", created_at: "2026-05-05T12:00:00" },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [useDemo, setUseDemo] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    fetch(`${API_BASE}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) throw new Error("API error");
        return r.json();
      })
      .then((data) => setUsers(data))
      .catch(() => { setUseDemo(true); setUsers(DEMO_USERS); })
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: "id", label: "ID" },
    { key: "username", label: "昵称" },
    { key: "email", label: "邮箱" },
    {
      key: "role",
      label: "角色",
      render: (item: any) => (
        <span className={`px-2 py-0.5 rounded text-xs ${item.role === "admin" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
          {item.role === "admin" ? "管理员" : "用户"}
        </span>
      ),
    },
    {
      key: "created_at",
      label: "注册时间",
      render: (item: any) => new Date(item.created_at).toLocaleDateString("zh-CN"),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">用户管理</h1>
        {useDemo && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">演示模式</span>}
      </div>
      <DataTable columns={columns} data={users} loading={loading} />
    </div>
  );
}
