"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BrainCircuit, ShieldCheck } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { AuthFrame } from "@/components/AppShell";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LoginPage() {
  const [email, setEmail] = useState("");
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
      const res = await api.post("/auth/login", { email, password });
      login(res.data.access_token, res.data.refresh_token);
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response
              ?.data?.detail
          : undefined;
      setError(msg || "Login failed");
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

        <p className="eyebrow">Secure access</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight">Enter mission control</h2>
        <p className="muted mt-2 text-sm leading-6">
          Continue collecting signals, querying your knowledge graph, and composing from verified context.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 grid gap-4">
          {error && (
            <div className="rounded-2xl border border-[color-mix(in_oklch,var(--danger)_45%,var(--border))] bg-[color-mix(in_oklch,var(--danger)_10%,transparent)] p-3 text-sm font-semibold text-[var(--danger)]">
              {error}
            </div>
          )}
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field"
              placeholder="••••••••"
            />
          </label>
          <button type="submit" disabled={loading} className="btn-primary mt-2 w-full">
            {loading ? "Authenticating" : "Sign in"}
            <ArrowRight size={17} />
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/google/login`;
          }}
          className="btn-secondary mt-3 w-full"
        >
          <ShieldCheck size={17} />
          Continue with Google
        </button>

        <p className="muted mt-6 text-center text-sm">
          Need access?{" "}
          <a href="/register" className="font-bold text-[var(--primary)] hover:underline">
            Create account
          </a>
        </p>
      </div>
    </AuthFrame>
  );
}
