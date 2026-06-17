import type { Locale } from "./routing";
import { defaultLocale, isLocale } from "./routing";

export const localeCookieName = "NEXT_LOCALE";
const localeStorageKey = "fillin-locale";

export function getLocaleFromPathname(pathname: string): Locale | null {
  const segment = pathname.split("/").filter(Boolean)[0];
  return isLocale(segment) ? segment : null;
}

export function getClientLocale(): Locale {
  if (typeof window === "undefined") return defaultLocale;

  const pathLocale = getLocaleFromPathname(window.location.pathname);
  if (pathLocale) return pathLocale;

  const stored = localStorage.getItem(localeStorageKey);
  if (isLocale(stored || undefined)) return stored as Locale;

  const cookieLocale = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${localeCookieName}=`))
    ?.split("=")[1];
  if (isLocale(cookieLocale)) return cookieLocale;

  return defaultLocale;
}

export function setClientLocale(locale: Locale) {
  if (typeof window === "undefined") return;
  localStorage.setItem(localeStorageKey, locale);
  document.cookie = `${localeCookieName}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

export function localizedPath(pathname: string, locale: Locale) {
  const [pathPart, query = ""] = pathname.split("?");
  const segments = pathPart.split("/").filter(Boolean);
  if (segments.length > 0 && isLocale(segments[0])) {
    segments[0] = locale;
  } else {
    segments.unshift(locale);
  }
  return `/${segments.join("/")}${query ? `?${query}` : ""}`;
}

export function pathWithoutLocale(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0 && isLocale(segments[0])) {
    segments.shift();
  }
  return `/${segments.join("/")}`;
}
