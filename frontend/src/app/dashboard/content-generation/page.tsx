"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface KnowledgeBase {
  id: string;
  name: string;
}

export default function ContentGenerationPage() {
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [selectedKbs, setSelectedKbs] = useState<string[]>([]);
  const [topic, setTopic] = useState("");
  const [contentType, setContentType] = useState("article");
  const [result, setResult] = useState<{ content: string; outline: string; credits_used: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.push("/login"); return; }
    api.get("/knowledge-bases/").then((res) => setKbs(res.data));
  }, [router]);

  const toggleKb = (id: string) => {
    setSelectedKbs((prev) =>
      prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]
    );
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedKbs.length === 0) { setError("请选择至少一个知识库"); return; }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await api.post("/content-generation/generate", {
        knowledge_base_ids: selectedKbs,
        topic,
        content_type: contentType,
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "生成失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="/dashboard" className="text-xl font-bold text-gray-900">Fillin</a>
          <span className="text-sm text-gray-500">AI 内容生成</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <h2 className="mb-6 text-2xl font-semibold text-gray-900">AI 内容生成</h2>

        <form onSubmit={handleGenerate} className="mb-8 rounded-lg border bg-white p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">选择知识库</label>
            <div className="flex flex-wrap gap-2">
              {kbs.map((kb) => (
                <button
                  key={kb.id}
                  type="button"
                  onClick={() => toggleKb(kb.id)}
                  className={`rounded-full px-3 py-1 text-sm border ${
                    selectedKbs.includes(kb.id)
                      ? "bg-blue-100 border-blue-500 text-blue-700"
                      : "bg-gray-50 border-gray-300 text-gray-600"
                  }`}
                >
                  {kb.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">主题</label>
            <input
              type="text"
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="输入你想生成内容的主题"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            >
              <option value="article">文章</option>
              <option value="summary">摘要</option>
              <option value="report">报告</option>
            </select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-blue-600 px-6 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "生成中..." : "生成内容 (消耗50积分)"}
          </button>
        </form>

        {result && (
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">生成结果</h3>
              <span className="text-sm text-gray-500">消耗 {result.credits_used} 积分</span>
            </div>
            <div className="prose max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-gray-800">{result.content}</pre>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
