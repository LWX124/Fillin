"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  useEffect(() => {
    const stored = localStorage.getItem("fillin-theme") as Theme | null;
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(stored || (systemDark ? "dark" : "light"));
  }, []);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

export function setTheme(theme: Theme) {
  localStorage.setItem("fillin-theme", theme);
  applyTheme(theme);
}

export function getTheme(): Theme {
  return (document.documentElement.dataset.theme as Theme) || "light";
}
