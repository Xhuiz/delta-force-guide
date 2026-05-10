"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "仪表盘", icon: "📊" },
  { href: "/admin/guides", label: "攻略管理", icon: "📝" },
  { href: "/admin/maps", label: "地图标注", icon: "🗺️" },
  { href: "/admin/weapons", label: "武器数据", icon: "🔫" },
  { href: "/admin/tags", label: "标签管理", icon: "🏷️" },
  { href: "/admin/users", label: "用户管理", icon: "👥" },
  { href: "/admin/comments", label: "评论管理", icon: "💬" },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold">管理后台</h1>
        <p className="text-xs text-gray-400 mt-1">三角洲地图攻略</p>
      </div>
      <nav className="space-y-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
                ? "bg-blue-600 text-white"
                : "text-gray-300 hover:bg-gray-800"
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="mt-8 pt-4 border-t border-gray-700">
        <Link href="/" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white">
          ← 返回前台
        </Link>
      </div>
    </aside>
  );
}
