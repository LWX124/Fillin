"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Database, Plus, Trash2, Waves } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { AppShell } from "@/components/AppShell";

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
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }
    api
      .get("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => {
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
    setCreating(true);
    try {
      const res = await api.post("/knowledge-bases/", {
        name: newName,
        description: newDesc || null,
      });
      setKnowledgeBases([res.data, ...knowledgeBases]);
      setNewName("");
      setNewDesc("");
      setShowCreate(false);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/knowledge-bases/${id}`);
    setKnowledgeBases(knowledgeBases.filter((kb) => kb.id !== id));
  };

  if (!user) {
    return (
      <div className="app-bg flex min-h-screen items-center justify-center">
        <div className="status-pill animate-enter">Loading control plane</div>
      </div>
    );
  }

  const totalContents = knowledgeBases.reduce((sum, kb) => sum + kb.content_count, 0);

  return (
    <AppShell
      title="Knowledge Mission Control"
      subtitle="Organize platform signals into searchable knowledge bases, then query or generate from the same operational view."
    >
      <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="surface-panel animate-enter rounded-2xl p-5 lg:p-7">
          <div className="grid gap-4 md:grid-cols-3">
            <Metric label="Knowledge bases" value={knowledgeBases.length.toString()} />
            <Metric label="Indexed items" value={totalContents.toString()} />
            <Metric label="Available credits" value={user.credits.toString()} />
          </div>
        </div>
        <div className="surface-panel animate-enter rounded-2xl p-5" style={{ "--i": 1 } as React.CSSProperties}>
          <p className="eyebrow">Next action</p>
          <h2 className="mt-2 text-xl font-black">Build a focused source cluster</h2>
          <p className="muted mt-2 text-sm leading-6">
            Start with one topic-specific knowledge base, then connect crawlers or manual notes.
          </p>
          <button type="button" onClick={() => setShowCreate(true)} className="btn-primary mt-4 w-full">
            <Plus size={17} />
            New knowledge base
          </button>
        </div>
      </section>

      {showCreate && (
        <form onSubmit={handleCreate} className="surface-panel animate-panel mt-4 rounded-2xl p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
            <label className="grid gap-2 text-sm font-bold">
              Name
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="field"
                placeholder="e.g. AI market signals"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Description
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="field"
                placeholder="Optional operating context"
              />
            </label>
            <div className="flex gap-2">
              <button type="submit" disabled={creating} className="btn-primary">
                Create
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      <section className="mt-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Knowledge grid</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">Active knowledge bases</h2>
          </div>
          <button type="button" onClick={() => setShowCreate(true)} className="btn-secondary">
            <Plus size={17} />
            Add base
          </button>
        </div>

        {knowledgeBases.length === 0 ? (
          <div className="surface-panel animate-enter rounded-2xl p-10 text-center">
            <Waves className="mx-auto text-[var(--primary)]" size={36} />
            <h3 className="mt-4 text-xl font-black">No knowledge base online</h3>
            <p className="muted mx-auto mt-2 max-w-md text-sm leading-6">
              Create the first base to unlock content ingestion, vector search, chat, and generation.
            </p>
            <button type="button" onClick={() => setShowCreate(true)} className="btn-primary mt-5">
              <Plus size={17} />
              Initialize base
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {knowledgeBases.map((kb, index) => (
              <article
                key={kb.id}
                className="surface-card scan-line animate-enter rounded-2xl p-5"
                style={{ "--i": index } as React.CSSProperties}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklch,var(--primary)_16%,transparent)] text-[var(--primary)]">
                      <Database size={20} />
                    </span>
                    <div>
                      <Link href={`/dashboard/kb/${kb.id}`} className="text-lg font-black hover:text-[var(--primary)]">
                        {kb.name}
                      </Link>
                      <p className="muted mt-1 line-clamp-2 text-sm leading-6">
                        {kb.description || "No description configured."}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={`Delete ${kb.name}`}
                    onClick={() => handleDelete(kb.id)}
                    className="btn-danger h-10 w-10 shrink-0 px-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-[var(--border)] pt-4">
                  <span className="status-pill">{kb.content_count} items</span>
                  <Link href={`/dashboard/kb/${kb.id}`} className="btn-ghost h-10 px-3">
                    Open
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklch,var(--surface-2)_72%,transparent)] p-4">
      <p className="muted text-xs font-bold uppercase tracking-[0.08em]">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-tight">{value}</p>
    </div>
  );
}
