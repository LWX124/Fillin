"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";

interface KnowledgeBase {
  id: string;
  name: string;
  description: string | null;
  content_count: number;
  created_at: string;
}

export default function DashboardPage() {
  const { user, setUser, logout, isAuthenticated } = useAuthStore();
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }
    api.get("/auth/me").then((res) => setUser(res.data)).catch(() => {
      logout();
      router.push("/login");
    });
  }, [router, setUser, logout]);

  useEffect(() => {
    if (isAuthenticated) {
      api.get("/knowledge-bases/").then((res) => setKnowledgeBases(res.data));
    }
  }, [isAuthenticated]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post("/knowledge-bases/", {
      name: newName,
      description: newDesc || null,
    });
    setKnowledgeBases([res.data, ...knowledgeBases]);
    setNewName("");
    setNewDesc("");
    setShowCreate(false);
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/knowledge-bases/${id}`);
    setKnowledgeBases(knowledgeBases.filter((kb) => kb.id !== id));
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">Fillin</h1>
          <div className="flex items-center gap-4">
            <a href="/dashboard/credits" className="text-sm text-blue-600 hover:underline">充值</a>
            <a href="/dashboard/content-generation" className="text-sm text-blue-600 hover:underline">AI生成</a>
            <a href="/dashboard/crawlers" className="text-sm text-blue-600 hover:underline">爬虫</a>
            <a href="/dashboard/settings" className="text-sm text-blue-600 hover:underline">设置</a>
            <span className="text-sm text-gray-600">
              Credits: <strong>{user.credits}</strong>
            </span>
            <span className="text-sm text-gray-600">{user.username}</span>
            <button
              onClick={() => { logout(); router.push("/login"); }}
              className="text-sm text-red-600 hover:underline"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-900">Knowledge Bases</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            + New Knowledge Base
          </button>
        </div>

        {showCreate && (
          <form
            onSubmit={handleCreate}
            className="mb-6 rounded-lg border bg-white p-6 shadow-sm"
          >
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Knowledge base name"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-md border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        {knowledgeBases.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-500">No knowledge bases yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {knowledgeBases.map((kb) => (
              <div
                key={kb.id}
                className="rounded-lg border bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <a
                    href={`/dashboard/kb/${kb.id}`}
                    className="text-lg font-medium text-gray-900 hover:text-blue-600"
                  >
                    {kb.name}
                  </a>
                  <button
                    onClick={() => handleDelete(kb.id)}
                    className="text-sm text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
                {kb.description && (
                  <p className="mt-1 text-sm text-gray-500">{kb.description}</p>
                )}
                <p className="mt-3 text-xs text-gray-400">
                  {kb.content_count} items
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
