export default function CommentList({ comments }: { comments: any[] }) {
  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <div key={comment.id} className="border-b pb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm">{comment.username[0]}</div>
            <span className="font-medium text-sm">{comment.username}</span>
            <span className="text-xs text-gray-400">{new Date(comment.created_at).toLocaleString("zh-CN")}</span>
          </div>
          <p className="text-gray-700 ml-10">{comment.content}</p>
          {comment.replies?.length > 0 && (
            <div className="ml-10 mt-3 space-y-3 border-l-2 border-gray-100 pl-4">
              {comment.replies.map((reply: any) => (
                <div key={reply.id}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{reply.username}</span>
                    <span className="text-xs text-gray-400">{new Date(reply.created_at).toLocaleString("zh-CN")}</span>
                  </div>
                  <p className="text-gray-700 text-sm">{reply.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
