"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bot,
  BrainCircuit,
  Coins,
  Database,
  LogOut,
  RadioTower,
  Settings,
  Sparkles,
} from "lucide-react";
import { ThemeSignal, ThemeToggle } from "./ThemeToggle";
import { useAuthStore } from "@/lib/store";

const navItems = [
  { href: "/dashboard", label: "Knowledge", icon: Database },
  { href: "/dashboard/crawlers", label: "Signals", icon: RadioTower },
  { href: "/dashboard/content-generation", label: "Compose", icon: Sparkles },
  { href: "/dashboard/credits", label: "Credits", icon: Coins },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function AppShell({
  children,
  title = "Mission Control",
  subtitle = "AI content aggregation and knowledge operations.",
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  return (
    <div className="app-bg relative min-h-screen overflow-x-hidden">
      <div className="grid-overlay pointer-events-none absolute inset-0" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1500px] flex-col gap-4 px-4 py-4 lg:flex-row lg:px-6">
        <aside className="surface-panel z-20 flex h-auto shrink-0 flex-col rounded-2xl p-3 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:w-72">
          <Link href="/dashboard" className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-[color-mix(in_oklch,var(--surface-2)_70%,transparent)]">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[color-mix(in_oklch,var(--primary)_18%,transparent)] text-[var(--primary)]">
              <BrainCircuit size={22} />
            </span>
            <span>
              <span className="block text-lg font-black tracking-tight">Fillin</span>
              <span className="muted block text-xs font-semibold">Knowledge OS</span>
            </span>
          </Link>

          <nav className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold transition-all duration-200 ${
                    active
                      ? "bg-[color-mix(in_oklch,var(--primary)_18%,transparent)] text-[var(--foreground)] shadow-[0_10px_30px_color-mix(in_oklch,var(--primary)_16%,transparent)]"
                      : "muted hover:bg-[color-mix(in_oklch,var(--surface-2)_75%,transparent)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <Icon size={18} className={active ? "text-[var(--primary)]" : "transition-colors group-hover:text-[var(--primary)]"} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 grid gap-3 lg:mt-auto">
            <div className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklch,var(--surface-2)_72%,transparent)] p-4">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Bot size={16} className="text-[var(--accent)]" />
                AI Runtime
              </div>
              <div className="mt-3 h-2 rounded-full bg-[color-mix(in_oklch,var(--surface-3)_70%,transparent)]">
                <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]" />
              </div>
              <p className="muted mt-2 text-xs">Retrieval, crawl, compose lanes online.</p>
            </div>

            <div className="flex items-center justify-between gap-2">
              <ThemeToggle />
              <button
                type="button"
                onClick={() => {
                  logout();
                  router.push("/login");
                }}
                className="btn-ghost h-11 px-3"
              >
                <LogOut size={17} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </aside>

        <div className="z-10 flex min-w-0 flex-1 flex-col">
          <header className="surface-panel sticky top-4 z-10 rounded-2xl px-4 py-4 lg:px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <ThemeSignal />
                  {user && <span className="status-pill">{user.credits} credits</span>}
                </div>
                <h1 className="text-2xl font-black tracking-tight md:text-3xl">{title}</h1>
                <p className="muted mt-1 max-w-2xl text-sm leading-6">{subtitle}</p>
              </div>
              {user && (
                <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklch,var(--surface-2)_70%,transparent)] px-3 py-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_oklch,var(--accent)_18%,transparent)] text-sm font-black text-[var(--accent)]">
                    {user.username?.slice(0, 1).toUpperCase() || "U"}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{user.username}</p>
                    <p className="muted text-xs">{user.email}</p>
                  </div>
                </div>
              )}
            </div>
          </header>

          <main className="flex-1 py-4">{children}</main>
        </div>
      </div>
    </div>
  );
}

export function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-bg relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="grid-overlay pointer-events-none absolute inset-0" />
      <div className="animate-enter relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}
