"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { localizedPath, setClientLocale } from "@/i18n/locale";
import { localeLabels, locales, type Locale } from "@/i18n/routing";
import { useAuthStore } from "@/lib/store";

export function LocaleSwitcher() {
  const activeLocale = useLocale() as Locale;
  const router = useRouter();
  const t = useTranslations("common");
  const { user, setUser } = useAuthStore();

  const switchLocale = (locale: Locale) => {
    if (locale === activeLocale) return;

    setClientLocale(locale);
    const nextPath = localizedPath(`${window.location.pathname}${window.location.search}`, locale);
    router.replace(nextPath);

    if (user) {
      setUser({ ...user, preferred_locale: locale });
      api.patch("/auth/me/preferences", { preferred_locale: locale }).catch(() => {
        // Preference persistence is non-blocking because URL locale is authoritative.
      });
    }
  };

  return (
    <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklch,var(--surface-2)_72%,transparent)] p-1">
      <span className="sr-only">{t("language")}</span>
      <Languages size={16} className="mx-2 text-[var(--muted)]" aria-hidden />
      {locales.map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => switchLocale(locale)}
          aria-pressed={activeLocale === locale}
          className={`h-9 rounded-lg px-3 text-xs font-black transition-colors ${
            activeLocale === locale
              ? "bg-[color-mix(in_oklch,var(--primary)_20%,transparent)] text-[var(--foreground)]"
              : "muted hover:bg-[color-mix(in_oklch,var(--surface-3)_65%,transparent)] hover:text-[var(--foreground)]"
          }`}
        >
          {localeLabels[locale]}
        </button>
      ))}
    </div>
  );
}
