"use client";

import { MonitorCog, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { setTheme } from "@/app/providers";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof document === "undefined") return "light";
    return (document.documentElement.dataset.theme as Theme | undefined) || "light";
  });

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setThemeState(next);
    setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className="btn-secondary h-11 w-11 px-0"
      title={theme === "dark" ? "Light theme" : "Dark theme"}
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export function ThemeSignal() {
  return (
    <span className="status-pill">
      <MonitorCog size={14} />
      Adaptive UI
    </span>
  );
}
