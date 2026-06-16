"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BrainCircuit, Sparkles } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { AuthFrame } from "@/components/AppShell";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/register", { email, username, password });
      login(res.data.access_token, res.data.refresh_token);
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response
              ?.data?.detail
          : undefined;
      setError(msg || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFrame>
      <div className="surface-panel rounded-3xl p-6">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color-mix(in_oklch,var(--primary)_18%,transparent)] text-[var(--primary)]">
              <BrainCircuit size={24} />
            </span>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Fillin</h1>
              <p className="muted text-sm">Knowledge OS</p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <p className="eyebrow">Initialize account</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight">Create your signal hub</h2>
        <p className="muted mt-2 text-sm leading-6">
          New users start with credits for ingestion, chat, and AI-assisted composition.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 grid gap-4">
          {error && (
            <div className="rounded-2xl border border-[color-mix(in_oklch,var(--danger)_45%,var(--border))] bg-[color-mix(in_oklch,var(--danger)_10%,transparent)] p-3 text-sm font-semibold text-[var(--danger)]">
              {error}
            </div>
          )}
          <label className="grid gap-2 text-sm font-bold">
            Username
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="field"
              placeholder="Operator name"
            />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field"
              placeholder="you@example.com"
            />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            Password
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field"
              placeholder="6 characters minimum"
            />
          </label>
          <button type="submit" disabled={loading} className="btn-primary mt-2 w-full">
            {loading ? "Creating account" : "Create account"}
            <ArrowRight size={17} />
          </button>
        </form>

        <div className="mt-5 flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklch,var(--accent)_10%,transparent)] p-3 text-sm">
          <Sparkles size={17} className="text-[var(--accent)]" />
          <span className="font-bold">100 starter credits included</span>
        </div>

        <p className="muted mt-6 text-center text-sm">
          Already have access?{" "}
          <a href="/login" className="font-bold text-[var(--primary)] hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </AuthFrame>
  );
}
