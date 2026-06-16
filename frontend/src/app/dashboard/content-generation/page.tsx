"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Sparkles } from "lucide-react";
import api from "@/lib/api";
import { AppShell } from "@/components/AppShell";

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
    if (!token) {
      router.push("/login");
      return;
    }
    api.get("/knowledge-bases/").then((res) => setKbs(res.data));
  }, [router]);

  const toggleKb = (id: string) => {
    setSelectedKbs((prev) =>
      prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]
    );
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedKbs.length === 0) {
      setError("请选择至少一个知识库");
      return;
    }
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
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response
              ?.data?.detail
          : undefined;
      setError(msg || "生成失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell
      title="AI Composition Lab"
      subtitle="Generate drafts from selected knowledge bases with a clear source boundary and preview the output immediately."
    >
      <section className="grid gap-4 xl:grid-cols-[0.46fr_0.54fr]">
        <form onSubmit={handleGenerate} className="surface-panel animate-enter rounded-2xl p-5 lg:p-6">
          <p className="eyebrow">Generation setup</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">Compose from trusted context</h2>

          <div className="mt-6 grid gap-5">
            <div>
              <label className="text-sm font-bold">Knowledge bases</label>
              <div className="mt-3 flex flex-wrap gap-2">
                {kbs.map((kb) => (
                  <button
                    key={kb.id}
                    type="button"
                    onClick={() => toggleKb(kb.id)}
                    className={`status-pill transition-colors ${
                      selectedKbs.includes(kb.id)
                        ? "border-[var(--primary)] bg-[color-mix(in_oklch,var(--primary)_18%,transparent)] text-[var(--foreground)]"
                        : ""
                    }`}
                  >
                    {kb.name}
                  </button>
                ))}
              </div>
            </div>

            <label className="grid gap-2 text-sm font-bold">
              Topic
              <input
                type="text"
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="输入你想生成内容的主题"
                className="field"
              />
            </label>

            <label className="grid gap-2 text-sm font-bold">
              Type
              <select value={contentType} onChange={(e) => setContentType(e.target.value)} className="field">
                <option value="article">文章</option>
                <option value="summary">摘要</option>
                <option value="report">报告</option>
              </select>
            </label>

            {error && <p className="text-sm font-semibold text-[var(--danger)]">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              <Sparkles size={17} />
              {loading ? "Generating..." : "Generate content"}
            </button>
          </div>
        </form>

        <div className="surface-panel animate-enter rounded-2xl p-5 lg:p-6" style={{ "--i": 1 } as React.CSSProperties}>
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Preview</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">Generated output</h2>
            </div>
            <FileText className="text-[var(--primary)]" size={26} />
          </div>

          {loading && (
            <div className="mt-6 grid gap-3">
              <div className="h-4 rounded-full bg-[color-mix(in_oklch,var(--surface-3)_70%,transparent)]" />
              <div className="h-4 w-4/5 rounded-full bg-[color-mix(in_oklch,var(--surface-3)_70%,transparent)]" />
              <div className="h-36 rounded-2xl bg-[color-mix(in_oklch,var(--surface-3)_55%,transparent)]" style={{ animation: "pulse-soft 1.2s var(--ease-out-quart) infinite" }} />
            </div>
          )}

          {!loading && !result && (
            <div className="muted mt-12 rounded-2xl border border-dashed border-[var(--border)] p-8 text-center text-sm">
              Select knowledge bases and generate a draft to preview it here.
            </div>
          )}

          {result && (
            <article className="animate-panel mt-6">
              <span className="status-pill">Used {result.credits_used} credits</span>
              <pre className="mt-4 max-h-[34rem] overflow-auto whitespace-pre-wrap rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklch,var(--surface-2)_70%,transparent)] p-5 text-sm leading-7 text-[var(--foreground)]">
                {result.content}
              </pre>
            </article>
          )}
        </div>
      </section>
    </AppShell>
  );
}
