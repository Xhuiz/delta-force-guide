"use client";

import { useEffect, useState } from "react";
import DataTable from "@/components/admin/DataTable";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    fetch(`${API_BASE}/api/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => { setUsers(data || []); setLoading(false); });
  }, []);

  const columns = [
    { key: "id", label: "ID" },
    { key: "username", label: "昵称" },
    { key: "email", label: "邮箱" },
    { key: "role", label: "角色" },
    {
      key: "created_at",
      label: "注册时间",
      render: (item: any) => new Date(item.created_at).toLocaleDateString("zh-CN"),
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">用户管理</h1>
      <DataTable columns={columns} data={users} loading={loading} />
    </div>
  );
}
