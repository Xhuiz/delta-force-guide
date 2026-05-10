"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

const NAV_ITEMS = [
  { href: "/map", label: "地图" },
  { href: "/guides", label: "攻略" },
  { href: "/loadout", label: "配装" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  // Don't show navbar on admin pages
  if (pathname.startsWith("/admin")) return null;

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-blue-600">
            <span className="text-xl">DF</span>
            <span className="hidden sm:inline">三角洲攻略</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link
                  href="/profile"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  {user.username}
                </Link>
                <button
                  onClick={logout}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  退出
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  登录
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
                >
                  注册
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-gray-600"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 py-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`block px-4 py-3 text-sm font-medium ${
                  pathname === item.href
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-600"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <div className="border-t border-gray-100 mt-2 pt-2 px-4">
              {user ? (
                <div className="flex items-center justify-between py-2">
                  <Link href="/profile" onClick={() => setMenuOpen(false)} className="text-sm text-gray-700">
                    {user.username}
                  </Link>
                  <button onClick={() => { logout(); setMenuOpen(false); }} className="text-sm text-red-500">
                    退出
                  </button>
                </div>
              ) : (
                <div className="flex gap-3 py-2">
                  <Link href="/login" onClick={() => setMenuOpen(false)} className="text-sm text-gray-600">
                    登录
                  </Link>
                  <Link href="/register" onClick={() => setMenuOpen(false)} className="text-sm text-blue-500 font-medium">
                    注册
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
