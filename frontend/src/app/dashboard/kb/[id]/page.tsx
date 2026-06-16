"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bot, FilePlus2, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { AppShell } from "@/components/AppShell";

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
    if (!token) {
      router.push("/login");
      return;
    }
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
      <div className="app-bg flex min-h-screen items-center justify-center">
        <div className="status-pill animate-enter">Loading base</div>
      </div>
    );
  }

  return (
    <AppShell
      title={kb.name}
      subtitle={kb.description || "Operational knowledge base. Add raw notes or crawled material, then move into chat or generation."}
    >
      <section className="grid gap-4 xl:grid-cols-[0.72fr_0.28fr]">
        <div className="surface-panel animate-enter rounded-2xl p-5 lg:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/dashboard" className="btn-ghost h-10 px-3">
              <ArrowLeft size={16} />
              Back
            </Link>
            <span className="status-pill">{contents.length} contents</span>
            <span className="status-pill">{kb.content_count} indexed</span>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link href={`/dashboard/kb/${kbId}/chat`} className="btn-primary">
              <Bot size={17} />
              Chat with base
            </Link>
            <button onClick={() => setShowAdd(true)} className="btn-secondary">
              <FilePlus2 size={17} />
              Add content
            </button>
          </div>

          {showAdd && (
            <form onSubmit={handleAdd} className="surface-card mt-5 rounded-2xl p-5">
              <div className="grid gap-4">
                <label className="grid gap-2 text-sm font-bold">
                  Title
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="field"
                    placeholder="Topic or source title"
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold">
                  Content
                  <textarea
                    required
                    rows={8}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="field resize-none"
                    placeholder="Paste or type content here"
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold">
                  Source URL
                  <input
                    type="url"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    className="field"
                    placeholder="https://..."
                  />
                </label>
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary">Save</button>
                  <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
                </div>
              </div>
            </form>
          )}
        </div>

        <div className="surface-panel animate-enter rounded-2xl p-5" style={{ "--i": 1 } as React.CSSProperties}>
          <p className="eyebrow">Signal status</p>
          <h3 className="mt-2 text-xl font-black">Vector readiness</h3>
          <p className="muted mt-2 text-sm leading-6">
            Newly added content enters the base immediately; vectorization can be tracked from the content lane.
          </p>
        </div>
      </section>

      <section className="mt-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="eyebrow">Content lane</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">Knowledge entries</h2>
          </div>
        </div>

        {contents.length === 0 ? (
          <div className="surface-panel rounded-2xl p-10 text-center">
            <p className="muted text-sm">No content yet. Add a note or bring data in through crawlers.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {contents.map((item, index) => (
              <article
                key={item.id}
                className="surface-card animate-enter rounded-2xl p-5"
                style={{ "--i": index } as React.CSSProperties}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-lg font-black">{item.title}</h3>
                    <p className="muted mt-2 line-clamp-3 text-sm leading-6">{item.content}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.source_platform && <span className="status-pill">{item.source_platform}</span>}
                      <span className="status-pill">{item.is_vectorized ? "Vectorized" : "Pending vector"}</span>
                      {item.source_url && (
                        <a href={item.source_url} target="_blank" rel="noreferrer" className="btn-ghost h-9 px-3">
                          Source
                        </a>
                      )}
                    </div>
                  </div>
                  <button type="button" onClick={() => handleDelete(item.id)} className="btn-danger h-10 w-10 shrink-0 px-0" aria-label={`Delete ${item.title}`}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
