"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  const [preview, setPreview] = useState(false);

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex border-b bg-gray-50">
        <button
          onClick={() => setPreview(false)}
          className={`px-4 py-2 text-sm ${!preview ? "bg-white border-b-2 border-blue-500" : ""}`}
        >
          编辑
        </button>
        <button
          onClick={() => setPreview(true)}
          className={`px-4 py-2 text-sm ${preview ? "bg-white border-b-2 border-blue-500" : ""}`}
        >
          预览
        </button>
      </div>
      {preview ? (
        <div className="p-4 prose prose-sm max-w-none min-h-[300px]">
          <ReactMarkdown>{value}</ReactMarkdown>
        </div>
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-4 min-h-[300px] resize-y focus:outline-none"
          placeholder="输入 Markdown 内容..."
        />
      )}
    </div>
  );
}
