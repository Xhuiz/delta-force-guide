"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const STAT_CONFIG = [
  { key: "guides", label: "攻略", icon: "📝", href: "/admin/guides", color: "bg-blue-50 text-blue-600" },
  { key: "maps", label: "地图", icon: "🗺️", href: "/admin/maps", color: "bg-green-50 text-green-600" },
  { key: "weapons", label: "武器", icon: "🔫", href: "/admin/weapons", color: "bg-orange-50 text-orange-600" },
  { key: "tags", label: "标签", icon: "🏷️", href: "/admin/tags", color: "bg-purple-50 text-purple-600" },
  { key: "users", label: "用户", icon: "👥", href: "/admin/users", color: "bg-pink-50 text-pink-600" },
  { key: "comments", label: "评论", icon: "💬", href: "/admin/comments", color: "bg-cyan-50 text-cyan-600" },
];

const QUICK_ACTIONS = [
  { label: "新建攻略", href: "/admin/guides/new", icon: "✏️" },
  { label: "管理地图标注", href: "/admin/maps", icon: "📍" },
  { label: "管理武器数据", href: "/admin/weapons", icon: "🔧" },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [recentGuides, setRecentGuides] = useState<any[]>([]);
  const [useDemo, setUseDemo] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const headers = { Authorization: `Bearer ${token}` };

    fetch(`${API_BASE}/api/admin/stats`, { headers })
      .then((r) => {
        if (!r.ok) throw new Error("API error");
        return r.json();
      })
      .then(setStats)
      .catch(() => {
        setUseDemo(true);
        setStats({ guides: 4, maps: 3, weapons: 5, tags: 12, users: 2, comments: 0 });
      });

    fetch(`${API_BASE}/api/guides?page_size=4`, { headers })
      .then((r) => r.json())
      .then((d) => setRecentGuides(d.items || []))
      .catch(() => setRecentGuides([]));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">仪表盘</h1>
        {useDemo && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">演示数据</span>}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {STAT_CONFIG.map((stat) => (
          <Link
            key={stat.key}
            href={stat.href}
            className={`${stat.color} rounded-lg p-4 text-center hover:opacity-80 transition-opacity`}
          >
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-2xl font-bold">{stats[stat.key] ?? 0}</div>
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
            {recentGuides.length > 0 ? recentGuides.map((guide: any) => (
              <Link
                key={guide.id}
                href={`/admin/guides/${guide.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div>
                  <div className="text-sm font-medium">{guide.title}</div>
                  <div className="text-xs text-gray-400">{guide.guide_type}</div>
                </div>
                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">已发布</span>
              </Link>
            )) : (
              <p className="text-sm text-gray-400 text-center py-4">暂无攻略</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
