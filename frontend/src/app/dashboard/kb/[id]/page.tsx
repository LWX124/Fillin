"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";

interface Content {
  id: string;
  title: string;
  content: string;
  source_platform: string | null;
  source_url: string | null;
  is_vectorized: boolean;
  created_at: string;
}

interface KnowledgeBase {
  id: string;
  name: string;
  description: string | null;
  content_count: number;
}

export default function KBDetailPage() {
  const params = useParams();
  const kbId = params.id as string;
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [kb, setKb] = useState<KnowledgeBase | null>(null);
  const [contents, setContents] = useState<Content[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.push("/login"); return; }
    api.get(`/knowledge-bases/${kbId}`).then((res) => setKb(res.data)).catch(() => router.push("/dashboard"));
    api.get(`/knowledge-bases/${kbId}/contents`).then((res) => setContents(res.data));
  }, [kbId, router, isAuthenticated]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post(`/knowledge-bases/${kbId}/contents`, {
      title,
      content: text,
      source_url: sourceUrl || null,
    });
    setContents([res.data, ...contents]);
    setTitle("");
    setText("");
    setSourceUrl("");
    setShowAdd(false);
  };

  const handleDelete = async (contentId: string) => {
    await api.delete(`/knowledge-bases/${kbId}/contents/${contentId}`);
    setContents(contents.filter((c) => c.id !== contentId));
  };

  if (!kb) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-4">
          <a href="/dashboard" className="text-sm text-blue-600 hover:underline">
            ← Back
          </a>
          <h1 className="text-xl font-bold text-gray-900">{kb.name}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {kb.description && (
          <p className="mb-6 text-gray-600">{kb.description}</p>
        )}

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Contents ({contents.length})
          </h2>
          <div className="flex gap-2">
            <a
              href={`/dashboard/kb/${kbId}/chat`}
              className="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
            >
              Chat with KB
            </a>
            <button
              onClick={() => setShowAdd(true)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              + Add Content
            </button>
          </div>
        </div>

        {showAdd && (
          <form onSubmit={handleAdd} className="mb-6 rounded-lg border bg-white p-6 shadow-sm">
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
              <textarea
                placeholder="Content text..."
                required
                rows={6}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
              <input
                type="url"
                placeholder="Source URL (optional)"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
                  Add
                </button>
                <button type="button" onClick={() => setShowAdd(false)} className="rounded-md border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        {contents.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-500">No content yet. Add some to start building your knowledge base.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contents.map((item) => (
              <div key={item.id} className="rounded-lg border bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{item.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">{item.content}</p>
                    <div className="mt-2 flex gap-3 text-xs text-gray-400">
                      {item.source_platform && <span>{item.source_platform}</span>}
                      <span>{item.is_vectorized ? "✓ Vectorized" : "○ Not vectorized"}</span>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(item.id)} className="text-sm text-red-500 hover:text-red-700">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
