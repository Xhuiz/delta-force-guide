import { useState } from "react";
export default function CommentForm({ onSubmit }: { onSubmit: (content: string) => void }) {
  const [content, setContent] = useState("");
  return (
    <div className="flex gap-2">
      <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="发表评论..." className="flex-1 border rounded-lg px-4 py-2 resize-none" rows={2} />
      <button onClick={() => { if (content.trim()) { onSubmit(content); setContent(""); } }} className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 self-end">发送</button>
    </div>
  );
}
