"use client";

import Link from "next/link";

const STATS = [
  { label: "攻略", value: 4, icon: "📝", href: "/admin/guides", color: "bg-blue-50 text-blue-600" },
  { label: "地图", value: 3, icon: "🗺️", href: "/admin/maps", color: "bg-green-50 text-green-600" },
  { label: "武器", value: 5, icon: "🔫", href: "/admin/weapons", color: "bg-orange-50 text-orange-600" },
  { label: "标签", value: 12, icon: "🏷️", href: "/admin/tags", color: "bg-purple-50 text-purple-600" },
  { label: "用户", value: 2, icon: "👥", href: "/admin/users", color: "bg-pink-50 text-pink-600" },
  { label: "评论", value: 0, icon: "💬", href: "/admin/comments", color: "bg-cyan-50 text-cyan-600" },
];

const QUICK_ACTIONS = [
  { label: "新建攻略", href: "/admin/guides/new", icon: "✏️" },
  { label: "管理地图标注", href: "/admin/maps", icon: "📍" },
  { label: "管理武器数据", href: "/admin/weapons", icon: "🔧" },
];

const RECENT_GUIDES = [
  { id: 1, title: "攀升地图完全攻略", type: "地图攻略", status: "已发布" },
  { id: 2, title: "M4A1 最佳配装推荐", type: "配装推荐", status: "已发布" },
  { id: 3, title: "新手入门指南", type: "新手入门", status: "已发布" },
  { id: 4, title: "v2.1 版本更新日志", type: "版本日志", status: "已发布" },
];

export default function AdminDashboard() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">仪表盘</h1>
        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">演示数据</span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {STATS.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className={`${stat.color} rounded-lg p-4 text-center hover:opacity-80 transition-opacity`}
          >
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-xs opacity-70">{stat.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">快捷操作</h2>
          <div className="space-y-2">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-xl">{action.icon}</span>
                <span className="text-sm font-medium">{action.label}</span>
                <span className="ml-auto text-gray-400">&rarr;</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent guides */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">最近攻略</h2>
            <Link href="/admin/guides" className="text-sm text-blue-500 hover:underline">查看全部</Link>
          </div>
          <div className="space-y-3">
            {RECENT_GUIDES.map((guide) => (
              <Link
                key={guide.id}
                href={`/admin/guides/${guide.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div>
                  <div className="text-sm font-medium">{guide.title}</div>
                  <div className="text-xs text-gray-400">{guide.type}</div>
                </div>
                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">{guide.status}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
