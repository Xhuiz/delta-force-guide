"use client";

import Link from "next/link";

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">仪表盘</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { label: "攻略管理", href: "/admin/guides", icon: "📝", desc: "创建和管理攻略内容" },
          { label: "地图标注", href: "/admin/maps", icon: "🗺️", desc: "管理地图和标注点" },
          { label: "武器数据", href: "/admin/weapons", icon: "🔫", desc: "管理武器和配件数据" },
          { label: "标签管理", href: "/admin/tags", icon: "🏷️", desc: "管理标签分类" },
          { label: "用户管理", href: "/admin/users", icon: "👥", desc: "查看和管理用户" },
          { label: "评论管理", href: "/admin/comments", icon: "💬", desc: "审核和管理评论" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
          >
            <div className="text-3xl mb-3">{item.icon}</div>
            <h3 className="font-bold text-lg">{item.label}</h3>
            <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
