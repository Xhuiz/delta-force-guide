"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import CommentList from "@/components/comment/CommentList";
import CommentForm from "@/components/comment/CommentForm";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function GuideDetailPage() {
  const { slug } = useParams();
  const [guide, setGuide] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/guides/${slug}`).then((r) => r.json()).then(setGuide);
  }, [slug]);

  useEffect(() => {
    if (guide) fetch(`${API_BASE}/api/comments?target_type=guide&target_id=${guide.id}`).then((r) => r.json()).then(setComments);
  }, [guide]);

  const handleLike = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const res = await fetch(`${API_BASE}/api/guides/${guide.id}/like`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setGuide((prev: any) => ({ ...prev, likes_count: data.liked ? prev.likes_count + 1 : prev.likes_count - 1 }));
  };

  const handleFavorite = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const res = await fetch(`${API_BASE}/api/guides/${guide.id}/favorite`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setGuide((prev: any) => ({ ...prev, favorites_count: data.favorited ? prev.favorites_count + 1 : prev.favorites_count - 1 }));
  };

  const handleComment = async (content: string) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    await fetch(`${API_BASE}/api/comments`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ target_type: "guide", target_id: guide.id, content }) });
    fetch(`${API_BASE}/api/comments?target_type=guide&target_id=${guide.id}`).then((r) => r.json()).then(setComments);
  };

  if (!guide) return <div className="text-center py-12">加载中...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <article>
        <header className="mb-8">
          <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">{guide.guide_type}</span>
          <h1 className="text-3xl font-bold mt-2">{guide.title}</h1>
          <div className="flex gap-3 mt-4">
            <button onClick={handleLike} className="px-4 py-2 border rounded hover:bg-gray-50">👍 {guide.likes_count}</button>
            <button onClick={handleFavorite} className="px-4 py-2 border rounded hover:bg-gray-50">⭐ {guide.favorites_count}</button>
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
