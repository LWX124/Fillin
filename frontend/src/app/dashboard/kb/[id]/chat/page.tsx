"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";

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

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.push("/login"); return; }
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
      title: "New Chat",
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
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", content: msg || "Error: failed to get response", credits_used: 0, created_at: new Date().toISOString() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-4">
          <a href={`/dashboard/kb/${kbId}`} className="text-sm text-blue-600 hover:underline">
            ← Back to KB
          </a>
          <h1 className="text-lg font-bold text-gray-900">Chat</h1>
          {user && (
            <span className="ml-auto text-sm text-gray-500">
              Credits: {user.credits}
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-4">
        <div className="flex-1 space-y-4 overflow-y-auto pb-4">
          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <p className="text-gray-400">Ask a question about your knowledge base...</p>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-white border shadow-sm text-gray-900"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.sources?.references && msg.sources.references.length > 0 && (
                  <div className="mt-3 border-t pt-2">
                    <p className="text-xs font-medium text-gray-500">Sources:</p>
                    {msg.sources.references.slice(0, 3).map((s, i) => (
                      <p key={i} className="mt-1 text-xs text-gray-400 line-clamp-2">
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
              <div className="rounded-lg border bg-white px-4 py-3 shadow-sm">
                <p className="text-gray-400">Thinking...</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="flex gap-2 border-t bg-white p-4 rounded-lg shadow-sm">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question..."
            className="flex-1 rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </main>
    </div>
  );
}
