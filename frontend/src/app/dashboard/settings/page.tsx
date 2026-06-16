"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";

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

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.push("/login"); return; }
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
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="text-sm text-blue-600 hover:underline">← Dashboard</a>
            <h1 className="text-xl font-bold text-gray-900">设置</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">API Keys</h2>
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            + 添加 API Key
          </button>
        </div>

        {showAdd && (
          <form onSubmit={handleAdd} className="mb-6 rounded-lg border bg-white p-6 shadow-sm">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Provider</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="deepseek">DeepSeek</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">API Key</label>
                <input
                  type="password"
                  required
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
                  保存
                </button>
                <button type="button" onClick={() => setShowAdd(false)} className="rounded-md border px-4 py-2 text-sm text-gray-600">
                  取消
                </button>
              </div>
            </div>
          </form>
        )}

        {apiKeys.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-500">暂无 API Key，添加后可使用 AI 功能。</p>
          </div>
        ) : (
          <div className="space-y-3">
            {apiKeys.map((k) => (
              <div key={k.id} className="rounded-lg border bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-900 capitalize">{k.provider}</span>
                    <span className="ml-3 text-sm text-gray-500">{k.api_key_preview}</span>
                  </div>
                  <button
                    onClick={() => handleDelete(k.id)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
