"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Send, Sparkles } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import { getApiErrorMessage } from "@/lib/errors";
import { useRouter } from "@/i18n/navigation";

interface Message {
  id: string;
  role: string;
  content: string;
  sources?: { references?: { text: string; score: number }[] };
  credits_used: number;
  created_at: string;
}

export default function ChatPage() {
  const params = useParams();
  const kbId = params.id as string;
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [convId, setConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("chat");
  const common = useTranslations("common");
  const errors = useTranslations("errors");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }
    if (!user) {
      api.get("/auth/me").then((res) => setUser(res.data)).catch(() => router.push("/login"));
    }
  }, [router, user, setUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const ensureConversation = async (): Promise<string> => {
    if (convId) return convId;
    const res = await api.post("/conversations/", {
      title: t("newTitle"),
      knowledge_base_ids: [kbId],
    });
    setConvId(res.data.id);
    return res.data.id;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput("");
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", content: userMessage, credits_used: 0, created_at: new Date().toISOString() },
    ]);
    setLoading(true);

    try {
      const cId = await ensureConversation();
      const res = await api.post(`/conversations/${cId}/chat`, { content: userMessage });
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: res.data.answer,
          sources: { references: res.data.sources },
          credits_used: res.data.credits_used,
          created_at: new Date().toISOString(),
        },
      ]);
      if (user) {
        setUser({ ...user, credits: user.credits - res.data.credits_used });
      }
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, errors, "UNKNOWN");
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", content: msg || t("failed"), credits_used: 0, created_at: new Date().toISOString() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell
      title={t("title")}
      subtitle={t("subtitle")}
    >
      <section className="surface-panel flex min-h-[calc(100vh-8rem)] flex-col rounded-2xl p-4 lg:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <button onClick={() => router.push(`/dashboard/kb/${kbId}`)} className="btn-ghost h-10 px-3">
            <ArrowLeft size={16} />
            {common("back")}
          </button>
          {user && <span className="status-pill">{user.credits} {common("credits")}</span>}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklch,var(--surface)_84%,transparent)] p-4">
          {messages.length === 0 && (
            <div className="flex min-h-[24rem] flex-col items-center justify-center text-center">
              <Sparkles className="text-[var(--accent)]" size={28} />
              <p className="mt-3 text-lg font-black">{t("emptyTitle")}</p>
              <p className="muted mt-2 max-w-md text-sm leading-6">{t("emptyText")}</p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[min(42rem,92%)] rounded-2xl px-4 py-3 ${msg.role === "user" ? "bg-[linear-gradient(135deg,var(--primary),var(--accent))] text-[oklch(14%_0.03_250)]" : "surface-card text-[var(--foreground)]"}`}>
                <p className="whitespace-pre-wrap text-sm leading-6">{msg.content}</p>
                {msg.sources?.references && msg.sources.references.length > 0 && (
                  <div className="mt-3 border-t border-[var(--border)] pt-2">
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--muted)]">{t("sources")}</p>
                    {msg.sources.references.slice(0, 3).map((s, i) => (
                      <p key={i} className="mt-1 text-xs leading-5 text-[var(--muted)]">
                        [{i + 1}] {s.text}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="surface-card rounded-2xl px-4 py-3">
                <p className="muted text-sm">{t("thinking")}</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="mt-4 flex gap-3 rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklch,var(--surface)_84%,transparent)] p-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("placeholder")}
            className="field flex-1"
            disabled={loading}
          />
          <button type="submit" disabled={loading || !input.trim()} className="btn-primary">
            <Send size={16} />
            {t("send")}
          </button>
        </form>
      </section>
    </AppShell>
  );
}
