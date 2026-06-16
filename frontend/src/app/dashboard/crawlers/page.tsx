"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";

interface CrawlerTask {
  id: string;
  knowledge_base_id: string;
  platform: string;
  target_url: string;
  target_name: string | null;
  status: string;
  items_crawled: number;
  items_imported: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface ScheduledCrawl {
  id: string;
  knowledge_base_id: string;
  platform: string;
  target_url: string;
  target_name: string | null;
  interval_hours: number;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string;
  created_at: string;
}

interface KnowledgeBase {
  id: string;
  name: string;
}

export default function CrawlersPage() {
  const router = useRouter();
  const { user, setUser, isAuthenticated } = useAuthStore();
  const [tasks, setTasks] = useState<CrawlerTask[]>([]);
  const [scheduledCrawls, setScheduledCrawls] = useState<ScheduledCrawl[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showScheduleCreate, setShowScheduleCreate] = useState(false);
  const [platform, setPlatform] = useState("wechat");
  const [targetUrl, setTargetUrl] = useState("");
  const [targetName, setTargetName] = useState("");
  const [selectedKb, setSelectedKb] = useState("");
  const [intervalHours, setIntervalHours] = useState(24);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.push("/login"); return; }
    if (!user) {
      api.get("/auth/me").then((res) => setUser(res.data)).catch(() => router.push("/login"));
    }
  }, [router, user, setUser]);

  useEffect(() => {
    if (isAuthenticated) {
      api.get("/crawlers/tasks").then((res) => setTasks(res.data));
      api.get("/crawlers/scheduled-crawls").then((res) => setScheduledCrawls(res.data));
      api.get("/knowledge-bases/").then((res) => {
        setKnowledgeBases(res.data);
        if (res.data.length > 0) setSelectedKb(res.data[0].id);
      });
    }
  }, [isAuthenticated]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post("/crawlers/tasks", {
      knowledge_base_id: selectedKb,
      platform,
      target_url: targetUrl,
      target_name: targetName || null,
    });
    setTasks([res.data, ...tasks]);
    setTargetUrl("");
    setTargetName("");
    setShowCreate(false);
  };

  const refreshTasks = async () => {
    const res = await api.get("/crawlers/tasks");
    setTasks(res.data);
    const res2 = await api.get("/crawlers/scheduled-crawls");
    setScheduledCrawls(res2.data);
  };

  const handleCreateScheduled = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post("/crawlers/scheduled-crawls", {
      knowledge_base_id: selectedKb,
      platform,
      target_url: targetUrl,
      target_name: targetName || null,
      interval_hours: intervalHours,
    });
    setScheduledCrawls([res.data, ...scheduledCrawls]);
    setTargetUrl("");
    setTargetName("");
    setShowScheduleCreate(false);
  };

  const toggleScheduled = async (id: string) => {
    const res = await api.patch(`/crawlers/scheduled-crawls/${id}/toggle`);
    setScheduledCrawls(scheduledCrawls.map((s) => (s.id === id ? res.data : s)));
  };

  const deleteScheduled = async (id: string) => {
    await api.delete(`/crawlers/scheduled-crawls/${id}`);
    setScheduledCrawls(scheduledCrawls.filter((s) => s.id !== id));
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "running": return "bg-blue-100 text-blue-800";
      case "failed": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="text-sm text-blue-600 hover:underline">← Dashboard</a>
            <h1 className="text-xl font-bold text-gray-900">Crawlers</h1>
          </div>
          <button onClick={refreshTasks} className="text-sm text-gray-500 hover:text-gray-700">
            Refresh
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Crawler Tasks</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            + New Task
          </button>
        </div>

        {showCreate && (
          <form onSubmit={handleCreate} className="mb-6 rounded-lg border bg-white p-6 shadow-sm">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Knowledge Base</label>
                <select
                  value={selectedKb}
                  onChange={(e) => setSelectedKb(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  {knowledgeBases.map((kb) => (
                    <option key={kb.id} value={kb.id}>{kb.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Platform</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="wechat">WeChat</option>
                  <option value="x">X (Twitter)</option>
                  <option value="weibo">Weibo</option>
                  <option value="xiaohongshu">小红书</option>
                  <option value="bilibili">Bilibili</option>
                </select>
              </div>
              <input
                type="text"
                placeholder="Target URL"
                required
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2"
              />
              <input
                type="text"
                placeholder="Target name (optional)"
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2"
              />
              <div className="flex gap-2">
                <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
                  Start Crawl
                </button>
                <button type="button" onClick={() => setShowCreate(false)} className="rounded-md border px-4 py-2 text-sm text-gray-600">
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        {tasks.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-500">No crawler tasks yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="rounded-lg border bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {task.target_name || task.target_url}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(task.status)}`}>
                        {task.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {task.platform} · {task.items_crawled} crawled · {task.items_imported} imported
                    </p>
                    {task.error_message && (
                      <p className="mt-1 text-sm text-red-600">{task.error_message}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(task.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Scheduled Crawls Section */}
        <div className="mt-10 mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">定时爬取</h2>
          <button
            onClick={() => setShowScheduleCreate(true)}
            className="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
          >
            + 新建定时任务
          </button>
        </div>

        {showScheduleCreate && (
          <form onSubmit={handleCreateScheduled} className="mb-6 rounded-lg border bg-white p-6 shadow-sm">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Knowledge Base</label>
                <select
                  value={selectedKb}
                  onChange={(e) => setSelectedKb(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  {knowledgeBases.map((kb) => (
                    <option key={kb.id} value={kb.id}>{kb.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Platform</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="wechat">WeChat</option>
                  <option value="x">X (Twitter)</option>
                  <option value="weibo">Weibo</option>
                  <option value="xiaohongshu">小红书</option>
                  <option value="bilibili">Bilibili</option>
                </select>
              </div>
              <input
                type="text"
                placeholder="Target URL"
                required
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2"
              />
              <input
                type="text"
                placeholder="Target name (optional)"
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700">间隔 (小时)</label>
                <input
                  type="number"
                  min={1}
                  value={intervalHours}
                  onChange={(e) => setIntervalHours(Number(e.target.value))}
                  className="mt-1 block w-32 rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700">
                  创建
                </button>
                <button type="button" onClick={() => setShowScheduleCreate(false)} className="rounded-md border px-4 py-2 text-sm text-gray-600">
                  取消
                </button>
              </div>
            </div>
          </form>
        )}

        {scheduledCrawls.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
            <p className="text-gray-500">暂无定时爬取任务</p>
          </div>
        ) : (
          <div className="space-y-3">
            {scheduledCrawls.map((sc) => (
              <div key={sc.id} className="rounded-lg border bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {sc.target_name || sc.target_url}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${sc.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                        {sc.is_active ? "活跃" : "暂停"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {sc.platform} · 每 {sc.interval_hours} 小时 · 下次: {new Date(sc.next_run_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleScheduled(sc.id)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {sc.is_active ? "暂停" : "启用"}
                    </button>
                    <button
                      onClick={() => deleteScheduled(sc.id)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
