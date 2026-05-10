"use client";

import { useEffect, useState } from "react";
import { useRequireAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/stores/authStore";
import FavoriteList from "@/components/profile/FavoriteList";
import CommentHistory from "@/components/profile/CommentHistory";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ProfilePage() {
  const { user, loading: authLoading } = useRequireAuth();
  const logout = useAuthStore((s) => s.logout);
  const [activeTab, setActiveTab] = useState<"favorites" | "comments">("favorites");
  const [favorites, setFavorites] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;

    setLoading(true);
    const headers = { Authorization: `Bearer ${token}` };

    if (activeTab === "favorites") {
      fetch(`${API_BASE}/api/users/me/favorites?target_type=guide`, { headers })
        .then((r) => r.json())
        .then((data) => setFavorites(data.items || []))
        .finally(() => setLoading(false));
    } else {
      fetch(`${API_BASE}/api/users/me/comments`, { headers })
        .then((r) => r.json())
        .then((data) => setComments(data.items || []))
        .finally(() => setLoading(false));
    }
  }, [user, activeTab]);

  if (authLoading || !user) {
    return <div className="text-center py-12">加载中...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            user.username[0]
          )}
        </div>
        <div>
          <h1 className="text-xl font-bold">{user.username}</h1>
          <p className="text-sm text-gray-500">{user.email}</p>
          {user.bio && <p className="text-sm text-gray-600 mt-1">{user.bio}</p>}
        </div>
        <button onClick={logout} className="ml-auto px-4 py-2 border rounded-lg text-sm text-red-500 hover:bg-red-50">
          退出登录
        </button>
      </div>

      <div className="flex border-b mb-6">
        <button
          onClick={() => setActiveTab("favorites")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "favorites" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500"
          }`}
        >
          收藏攻略
        </button>
        <button
          onClick={() => setActiveTab("comments")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "comments" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500"
          }`}
        >
          我的评论
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">加载中...</div>
      ) : activeTab === "favorites" ? (
        <FavoriteList items={favorites} />
      ) : (
        <CommentHistory items={comments} />
      )}
    </div>
  );
}
