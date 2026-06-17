"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { KeyRound, Plus, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import { useRouter } from "@/i18n/navigation";

interface APIKey {
  id: string;
  provider: string;
  api_key_preview: string;
  is_active: boolean;
  created_at: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, setUser, isAuthenticated } = useAuthStore();
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [provider, setProvider] = useState("deepseek");
  const [apiKey, setApiKey] = useState("");
  const t = useTranslations("settings");
  const common = useTranslations("common");

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
    if (isAuthenticated) {
      api.get("/settings/api-keys").then((res) => setApiKeys(res.data));
    }
  }, [isAuthenticated]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post("/settings/api-keys", { provider, api_key: apiKey });
    setApiKeys([res.data, ...apiKeys.filter((k) => k.provider !== provider)]);
    setApiKey("");
    setShowAdd(false);
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/settings/api-keys/${id}`);
    setApiKeys(apiKeys.filter((k) => k.id !== id));
  };

  return (
    <AppShell
      title={t("title")}
      subtitle={t("subtitle")}
    >
      <section className="surface-panel animate-enter rounded-2xl p-5 lg:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow">{t("providers")}</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">{t("vault")}</h2>
          </div>
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus size={17} />
            {t("addKey")}
          </button>
        </div>

        {showAdd && (
          <form onSubmit={handleAdd} className="surface-card animate-panel mt-5 rounded-2xl p-5">
            <div className="grid gap-4 md:grid-cols-[0.35fr_1fr_auto] md:items-end">
              <label className="grid gap-2 text-sm font-bold">
                {t("provider")}
                <select value={provider} onChange={(e) => setProvider(e.target.value)} className="field">
                  <option value="deepseek">DeepSeek</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-bold">
                {t("apiKey")}
                <input
                  type="password"
                  required
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="field"
                />
              </label>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary">{common("save")}</button>
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">{common("cancel")}</button>
              </div>
            </div>
          </form>
        )}
      </section>

      <section className="mt-4 grid gap-4">
        {apiKeys.length === 0 ? (
          <div className="surface-panel rounded-2xl p-10 text-center">
            <KeyRound className="mx-auto text-[var(--primary)]" size={30} />
            <p className="muted mt-3 text-sm">{t("empty")}</p>
          </div>
        ) : (
          apiKeys.map((k, index) => (
            <article key={k.id} className="surface-card animate-enter rounded-2xl p-5" style={{ "--i": index } as React.CSSProperties}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[color-mix(in_oklch,var(--primary)_16%,transparent)] text-[var(--primary)]">
                    <KeyRound size={19} />
                  </span>
                  <div>
                    <p className="font-black capitalize">{k.provider}</p>
                    <p className="muted text-sm">{k.api_key_preview}</p>
                  </div>
                </div>
                <button onClick={() => handleDelete(k.id)} className="btn-danger">
                  <Trash2 size={16} />
                  {common("delete")}
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </AppShell>
  );
}
