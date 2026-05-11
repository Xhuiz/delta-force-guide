"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import CommentList from "@/components/comment/CommentList";
import CommentForm from "@/components/comment/CommentForm";
import { getDemoGuideContent } from "@/hooks/useGuides";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const DEMO_GUIDE_DATA: Record<string, any> = {
  "ascent-full-guide": { id: 1, title: "攀升地图完全攻略", guide_type: "map_guide", likes_count: 42, favorites_count: 15 },
  "m4a1-best-loadout": { id: 2, title: "M4A1 最佳配装推荐", guide_type: "loadout", likes_count: 35, favorites_count: 12 },
  "beginner-guide": { id: 3, title: "新手入门指南", guide_type: "beginner", likes_count: 88, favorites_count: 45 },
  "patch-v2-1": { id: 4, title: "v2.1 版本更新日志", guide_type: "patch_notes", likes_count: 25, favorites_count: 8 },
};

export default function GuideDetailPage() {
  const { slug } = useParams();
  const [guide, setGuide] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(false);

  useEffect(() => {
    const s = slug as string;
    setLoading(true);
    setError(false);
    fetch(`${API_BASE}/api/guides/${s}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((data) => {
        setGuide(data);
        setLiked(data.liked ?? false);
        setFavorited(data.favorited ?? false);
      })
      .catch(() => {
        const demo = DEMO_GUIDE_DATA[s];
        const content = getDemoGuideContent(s);
        if (demo && content) {
          setGuide({ ...demo, content, slug: s });
        } else {
          setError(true);
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (guide && guide.id) {
      fetch(`${API_BASE}/api/comments?target_type=guide&target_id=${guide.id}`)
        .then((r) => r.json())
        .then(setComments)
        .catch(() => setComments([]));
    }
  }, [guide]);

  const handleLike = async () => {
    const token = localStorage.getItem("access_token");
    if (!token || !guide) return;
    try {
      const res = await fetch(`${API_BASE}/api/guides/${guide.id}/like`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setLiked(data.liked);
      setGuide((prev: any) => ({ ...prev, likes_count: data.liked ? prev.likes_count + 1 : prev.likes_count - 1 }));
    } catch {}
  };

  const handleFavorite = async () => {
    const token = localStorage.getItem("access_token");
    if (!token || !guide) return;
    try {
      const res = await fetch(`${API_BASE}/api/guides/${guide.id}/favorite`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setFavorited(data.favorited);
      setGuide((prev: any) => ({ ...prev, favorites_count: data.favorited ? prev.favorites_count + 1 : prev.favorites_count - 1 }));
    } catch {}
  };

  const handleComment = async (content: string) => {
    const token = localStorage.getItem("access_token");
    if (!token || !guide) return;
    try {
      await fetch(`${API_BASE}/api/comments`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ target_type: "guide", target_id: guide.id, content }) });
      fetch(`${API_BASE}/api/comments?target_type=guide&target_id=${guide.id}`).then((r) => r.json()).then(setComments);
    } catch {}
  };

  if (loading) return <div className="text-center py-12 text-gray-400">加载中...</div>;

  if (error) return (
    <div className="text-center py-12">
      <p className="text-gray-400 text-lg">攻略不存在</p>
      <a href="/guides" className="text-blue-500 hover:underline mt-2 inline-block">返回攻略列表</a>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <article>
        <header className="mb-8">
          <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">{guide.guide_type}</span>
          <h1 className="text-3xl font-bold mt-2">{guide.title}</h1>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleLike}
              className={`px-4 py-2 border rounded text-sm transition-colors ${liked ? "bg-blue-50 border-blue-300 text-blue-600" : "hover:bg-gray-50"}`}
            >
              👍 {guide.likes_count}
            </button>
            <button
              onClick={handleFavorite}
              className={`px-4 py-2 border rounded text-sm transition-colors ${favorited ? "bg-yellow-50 border-yellow-300 text-yellow-600" : "hover:bg-gray-50"}`}
            >
              ⭐ {guide.favorites_count}
            </button>
          </div>
        </header>
        <div className="prose prose-lg max-w-none"><ReactMarkdown>{guide.content}</ReactMarkdown></div>
      </article>
      <section className="mt-12 border-t pt-8">
        <h2 className="text-xl font-bold mb-4">评论 ({comments.length})</h2>
        <CommentForm onSubmit={handleComment} />
        <div className="mt-6"><CommentList comments={comments} /></div>
      </section>
    </div>
  );
}
