import { defineRouting } from "next-intl/routing";

export const locales = ["zh", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "zh";

export const localeLabels: Record<Locale, string> = {
  zh: "中文",
  en: "English",
};

export const localeLanguageTags: Record<Locale, string> = {
  zh: "zh-CN",
  en: "en",
};

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
});

export function isLocale(value: string | undefined): value is Locale {
  return !!value && locales.includes(value as Locale);
}

export function getLanguageTag(locale: Locale) {
  return localeLanguageTags[locale];
}
