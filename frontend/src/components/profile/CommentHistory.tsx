interface CommentItem {
  id: number;
  target_type: string;
  target_id: number;
  content: string;
  created_at: string;
}

interface CommentHistoryProps {
  items: CommentItem[];
}

export default function CommentHistory({ items }: CommentHistoryProps) {
  if (items.length === 0) {
    return <div className="text-center py-8 text-gray-400">暂无评论</div>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="p-3 border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">
              评论于 {item.target_type === "guide" ? "攻略" : "标注点"} #{item.target_id}
            </span>
            <span className="text-xs text-gray-400">{new Date(item.created_at).toLocaleString("zh-CN")}</span>
          </div>
          <p className="text-gray-700">{item.content}</p>
        </div>
      ))}
    </div>
  );
}
