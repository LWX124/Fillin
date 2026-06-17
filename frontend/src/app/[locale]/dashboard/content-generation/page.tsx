"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { FileText, Sparkles } from "lucide-react";
import api from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { getApiErrorMessage } from "@/lib/errors";
import { useRouter } from "@/i18n/navigation";

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
  const t = useTranslations("generation");
  const errors = useTranslations("errors");

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
      setError(t("selectOne"));
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
      setError(getApiErrorMessage(err, errors, "UNKNOWN") || t("failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell
      title={t("title")}
      subtitle={t("subtitle")}
    >
      <section className="grid gap-4 xl:grid-cols-[0.46fr_0.54fr]">
        <form onSubmit={handleGenerate} className="surface-panel animate-enter rounded-2xl p-5 lg:p-6">
          <p className="eyebrow">{t("setup")}</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">{t("compose")}</h2>

          <div className="mt-6 grid gap-5">
            <div>
              <label className="text-sm font-bold">{t("knowledgeBases")}</label>
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
              {t("topic")}
              <input
                type="text"
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={t("topicPlaceholder")}
                className="field"
              />
            </label>

            <label className="grid gap-2 text-sm font-bold">
              {t("type")}
              <select value={contentType} onChange={(e) => setContentType(e.target.value)} className="field">
                <option value="article">{t("article")}</option>
                <option value="summary">{t("summary")}</option>
                <option value="report">{t("report")}</option>
              </select>
            </label>

            {error && <p className="text-sm font-semibold text-[var(--danger)]">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              <Sparkles size={17} />
              {loading ? t("generating") : t("generate")}
            </button>
          </div>
        </form>

        <div className="surface-panel animate-enter rounded-2xl p-5 lg:p-6" style={{ "--i": 1 } as React.CSSProperties}>
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">{t("preview")}</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">{t("output")}</h2>
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
              {t("empty")}
            </div>
          )}

          {result && (
            <article className="animate-panel mt-6">
              <span className="status-pill">{t("usedCredits", { count: result.credits_used })}</span>
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
