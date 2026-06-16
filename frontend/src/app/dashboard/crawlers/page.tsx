"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Plus, RefreshCw, RadioTower, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { AppShell } from "@/components/AppShell";

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

const platforms = [
  ["wechat", "WeChat"],
  ["x", "X"],
  ["weibo", "Weibo"],
  ["xiaohongshu", "Xiaohongshu"],
  ["bilibili", "Bilibili"],
] as const;

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
      api.get("/crawlers/tasks").then((res) => setTasks(res.data));
      api.get("/crawlers/scheduled-crawls").then((res) => setScheduledCrawls(res.data));
      api.get("/knowledge-bases/").then((res) => {
        setKnowledgeBases(res.data);
        if (res.data.length > 0) setSelectedKb(res.data[0].id);
      });
    }
  }, [isAuthenticated]);

  const resetForm = () => {
    setTargetUrl("");
    setTargetName("");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post("/crawlers/tasks", {
      knowledge_base_id: selectedKb,
      platform,
      target_url: targetUrl,
      target_name: targetName || null,
    });
    setTasks([res.data, ...tasks]);
    resetForm();
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
    resetForm();
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

  return (
    <AppShell
      title="Signal Ingestion"
      subtitle="Launch platform crawlers, monitor imports, and schedule recurring signal collection."
    >
      <section className="grid gap-4 xl:grid-cols-[0.68fr_0.32fr]">
        <div className="surface-panel animate-enter rounded-2xl p-5 lg:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="eyebrow">Live crawler tasks</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">Ingestion queue</h2>
            </div>
            <div className="flex gap-2">
              <button onClick={refreshTasks} className="btn-secondary">
                <RefreshCw size={17} />
                Refresh
              </button>
              <button onClick={() => setShowCreate(true)} className="btn-primary">
                <Plus size={17} />
                New task
              </button>
            </div>
          </div>

          {showCreate && (
            <CrawlerForm
              onSubmit={handleCreate}
              onCancel={() => setShowCreate(false)}
              knowledgeBases={knowledgeBases}
              selectedKb={selectedKb}
              setSelectedKb={setSelectedKb}
              platform={platform}
              setPlatform={setPlatform}
              targetUrl={targetUrl}
              setTargetUrl={setTargetUrl}
              targetName={targetName}
              setTargetName={setTargetName}
              submitLabel="Start crawl"
            />
          )}

          <TaskList tasks={tasks} />
        </div>

        <div className="surface-panel animate-enter rounded-2xl p-5" style={{ "--i": 1 } as React.CSSProperties}>
          <RadioTower className="text-[var(--primary)]" size={28} />
          <h2 className="mt-4 text-xl font-black">Platform adapters</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {platforms.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPlatform(value)}
                className={`status-pill ${platform === value ? "border-[var(--primary)] bg-[color-mix(in_oklch,var(--primary)_18%,transparent)]" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="muted mt-4 text-sm leading-6">
            Use manual runs for immediate imports and schedules for recurring monitoring.
          </p>
        </div>
      </section>

      <section className="surface-panel mt-4 rounded-2xl p-5 lg:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow">Scheduled crawls</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">Recurring signal loops</h2>
          </div>
          <button onClick={() => setShowScheduleCreate(true)} className="btn-secondary">
            <Plus size={17} />
            New schedule
          </button>
        </div>

        {showScheduleCreate && (
          <CrawlerForm
            onSubmit={handleCreateScheduled}
            onCancel={() => setShowScheduleCreate(false)}
            knowledgeBases={knowledgeBases}
            selectedKb={selectedKb}
            setSelectedKb={setSelectedKb}
            platform={platform}
            setPlatform={setPlatform}
            targetUrl={targetUrl}
            setTargetUrl={setTargetUrl}
            targetName={targetName}
            setTargetName={setTargetName}
            intervalHours={intervalHours}
            setIntervalHours={setIntervalHours}
            submitLabel="Create schedule"
          />
        )}

        {scheduledCrawls.length === 0 ? (
          <div className="muted mt-5 rounded-2xl border border-dashed border-[var(--border)] p-8 text-center text-sm">
            No scheduled crawls yet.
          </div>
        ) : (
          <div className="mt-5 grid gap-3">
            {scheduledCrawls.map((sc, index) => (
              <article key={sc.id} className="surface-card animate-enter rounded-2xl p-4" style={{ "--i": index } as React.CSSProperties}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black">{sc.target_name || sc.target_url}</span>
                      <span className={`status-pill ${sc.is_active ? "text-[var(--success)]" : "muted"}`}>
                        {sc.is_active ? "Active" : "Paused"}
                      </span>
                    </div>
                    <p className="muted mt-2 text-sm">
                      {sc.platform} · every {sc.interval_hours}h · next {new Date(sc.next_run_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => toggleScheduled(sc.id)} className="btn-secondary">
                      <Play size={16} />
                      {sc.is_active ? "Pause" : "Enable"}
                    </button>
                    <button onClick={() => deleteScheduled(sc.id)} className="btn-danger">
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function CrawlerForm({
  onSubmit,
  onCancel,
  knowledgeBases,
  selectedKb,
  setSelectedKb,
  platform,
  setPlatform,
  targetUrl,
  setTargetUrl,
  targetName,
  setTargetName,
  intervalHours,
  setIntervalHours,
  submitLabel,
}: {
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  knowledgeBases: KnowledgeBase[];
  selectedKb: string;
  setSelectedKb: (value: string) => void;
  platform: string;
  setPlatform: (value: string) => void;
  targetUrl: string;
  setTargetUrl: (value: string) => void;
  targetName: string;
  setTargetName: (value: string) => void;
  intervalHours?: number;
  setIntervalHours?: (value: number) => void;
  submitLabel: string;
}) {
  return (
    <form onSubmit={onSubmit} className="surface-card animate-panel mt-5 rounded-2xl p-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold">
          Knowledge Base
          <select value={selectedKb} onChange={(e) => setSelectedKb(e.target.value)} className="field">
            {knowledgeBases.map((kb) => (
              <option key={kb.id} value={kb.id}>{kb.name}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold">
          Platform
          <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="field">
            {platforms.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold">
          Target URL
          <input type="text" required value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} className="field" placeholder="https://..." />
        </label>
        <label className="grid gap-2 text-sm font-bold">
          Target name
          <input type="text" value={targetName} onChange={(e) => setTargetName(e.target.value)} className="field" placeholder="Optional label" />
        </label>
        {typeof intervalHours === "number" && setIntervalHours && (
          <label className="grid gap-2 text-sm font-bold">
            Interval hours
            <input type="number" min={1} value={intervalHours} onChange={(e) => setIntervalHours(Number(e.target.value))} className="field" />
          </label>
        )}
      </div>
      <div className="mt-4 flex gap-2">
        <button type="submit" className="btn-primary">{submitLabel}</button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}

function TaskList({ tasks }: { tasks: CrawlerTask[] }) {
  if (tasks.length === 0) {
    return (
      <div className="muted mt-5 rounded-2xl border border-dashed border-[var(--border)] p-8 text-center text-sm">
        No crawler tasks yet.
      </div>
    );
  }

  return (
    <div className="mt-5 grid gap-3">
      {tasks.map((task, index) => (
        <article key={task.id} className="surface-card animate-enter rounded-2xl p-4" style={{ "--i": index } as React.CSSProperties}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate font-black">{task.target_name || task.target_url}</span>
                <Status status={task.status} />
              </div>
              <p className="muted mt-2 text-sm">
                {task.platform} · {task.items_crawled} crawled · {task.items_imported} imported
              </p>
              {task.error_message && <p className="mt-2 text-sm font-semibold text-[var(--danger)]">{task.error_message}</p>}
            </div>
            <span className="muted text-xs">{new Date(task.created_at).toLocaleString()}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

function Status({ status }: { status: string }) {
  const tone =
    status === "completed"
      ? "text-[var(--success)]"
      : status === "running"
        ? "text-[var(--primary)]"
        : status === "failed"
          ? "text-[var(--danger)]"
          : "muted";
  return <span className={`status-pill ${tone}`}>{status}</span>;
}
