# URL-Prefix Internationalization Design

## Context

Fillin currently uses Next.js App Router with hardcoded English UI strings in
page and shell components. Backend API errors are returned as English `detail`
strings, and the `users` table has no language preference field.

The first supported languages are Simplified Chinese and English. The design
must make later language expansion straightforward.

## Goals

- Use URL prefixes as the source of truth for the active UI language.
- Support `/zh/...` and `/en/...` routes.
- Default to Chinese when no stronger language signal exists.
- Localize frontend UI text, frontend-displayed errors, navigation, metadata,
  empty states, and form text.
- Store a user's preferred language for future entry points and post-login
  routing.
- Keep backend error responses stable and frontend-translatable.
- Preserve old unprefixed links with redirects.

## Non-Goals

- Automatically translating user-generated content.
- Forcing AI answers to match the UI language.
- Returning fully translated backend error strings for every API consumer.
- Introducing subdomain-based localization.

## Locale Model

Public URLs use short locale prefixes:

- `/zh` maps to `zh-CN`.
- `/en` maps to `en`.

The route prefix is always the source of truth for the active UI language. If a
user visits `/en/dashboard`, the interface renders in English even if the saved
preference is Chinese. Preferences only decide future redirects, such as a visit
to `/` or an unprefixed legacy path.

Default language resolution order:

1. Authenticated user's `preferred_locale`.
2. `NEXT_LOCALE` cookie or local storage.
3. Browser `Accept-Language`.
4. `zh`.

## Frontend Architecture

Use `next-intl` with a top-level App Router locale segment:

```text
frontend/src/app/[locale]/login/page.tsx
frontend/src/app/[locale]/register/page.tsx
frontend/src/app/[locale]/dashboard/page.tsx
frontend/src/app/[locale]/dashboard/...
frontend/src/app/[locale]/auth/callback/page.tsx
```

Add i18n support files:

```text
frontend/src/i18n/routing.ts
frontend/src/i18n/navigation.ts
frontend/src/i18n/request.ts
frontend/messages/zh.json
frontend/messages/en.json
frontend/middleware.ts
```

`routing.ts` defines supported locales, the default locale, and prefix behavior.
`navigation.ts` exports locale-aware `Link`, `useRouter`, and `usePathname`.
`request.ts` loads the correct message file for the active locale. Middleware
redirects `/`, `/login`, `/register`, `/dashboard`, and other unprefixed app
routes to the best locale-prefixed path.

The root layout keeps global providers and delegates locale-specific metadata
and messages to the `[locale]` layout. The document `lang` attribute should use
the active BCP 47 locale (`zh-CN` or `en`).

## Message Organization

Use domain-oriented message keys rather than page-file-oriented keys:

```json
{
  "common": {
    "appName": "Fillin",
    "loading": "Loading",
    "cancel": "Cancel",
    "create": "Create"
  },
  "auth": {
    "loginTitle": "Enter mission control",
    "email": "Email",
    "password": "Password",
    "invalidCredentials": "Invalid email or password"
  },
  "nav": {
    "knowledge": "Knowledge",
    "signals": "Signals",
    "compose": "Compose",
    "credits": "Credits",
    "settings": "Settings"
  },
  "dashboard": {
    "title": "Knowledge Mission Control",
    "newKnowledgeBase": "New knowledge base"
  },
  "errors": {
    "INVALID_CREDENTIALS": "Invalid email or password",
    "UNKNOWN": "Something went wrong"
  }
}
```

Components use scoped translation hooks, such as `useTranslations("auth")` or
`useTranslations("dashboard")`. Shared controls use `common`, and API error
messages use `errors`.

Formatting for dates, numbers, credits, and plural text should use `next-intl`
formatters so Chinese and English formatting stays consistent.

## Language Switching

Add a `LocaleSwitcher` in auth screens and the authenticated app shell. Switching
languages should:

1. Replace the current route prefix with the target locale while preserving the
   path and query string.
2. Write `NEXT_LOCALE` and local storage.
3. If authenticated, persist the preference to the backend.

Preference persistence failure must not block the UI route change. The UI should
switch immediately because the URL controls the rendered language.

## Backend Changes

Add `preferred_locale` to the user model:

```text
preferred_locale VARCHAR(10) NOT NULL DEFAULT 'zh'
```

Expose the field in `UserResponse`. Registration should accept an optional
locale from the current URL context so users who register from `/en/register`
get `preferred_locale = "en"`.

Add a small preference update endpoint, either:

- `PATCH /api/v1/auth/me/preferences`
- or extend the existing settings profile update endpoint.

The request should validate locale against the supported set: `zh`, `en`.

## API Error Strategy

Keep backend errors stable and frontend-translatable. Existing responses with
`detail` remain valid, but new or migrated errors should include a machine code:

```json
{
  "code": "INVALID_CREDENTIALS",
  "detail": "Invalid email or password"
}
```

Frontend error handling should use this priority:

1. Translate `response.data.code` via `errors.<code>`.
2. Show `response.data.detail`.
3. Show `errors.UNKNOWN`.

Start by migrating auth errors and common dashboard errors. Other endpoints can
move gradually as pages are localized.

## OAuth Compatibility

Google OAuth must preserve locale. When starting OAuth from a locale-prefixed
page, include locale in the state parameter. On callback success, the backend
redirects to:

```text
${FRONTEND_URL}/{locale}/auth/callback?access_token=...&refresh_token=...
```

If locale state is missing or invalid, fall back to cookie/browser/default
resolution.

## Migration Plan

1. Install and configure `next-intl`.
2. Add `src/i18n/*`, `messages/zh.json`, `messages/en.json`, and middleware.
3. Move existing app routes under `app/[locale]/...`.
4. Replace internal navigation with locale-aware navigation helpers.
5. Localize metadata, auth pages, `AppShell`, dashboard home, theme controls,
   language controls, and common errors.
6. Add `preferred_locale` to the backend user model, schema, and migration.
7. Add or extend a user preferences update endpoint.
8. Send `Accept-Language` from Axios based on the active locale.
9. Standardize auth API errors with `code` and `detail`.
10. Localize remaining dashboard pages in batches: knowledge base detail, chat,
    crawlers, content generation, credits, and settings.

## Testing Plan

- `/` redirects to the expected locale by cookie/browser/default rules.
- `/login`, `/register`, and `/dashboard` redirect to prefixed paths.
- `/zh/login` and `/en/login` render different localized UI text.
- Login, registration, logout, and protected-page redirects preserve locale.
- Language switching preserves the current path and query string.
- Registered users get `preferred_locale` from the active URL locale.
- Authenticated language changes persist to the backend.
- API errors render localized messages when `code` is present.
- OAuth callback returns to the locale-prefixed callback route.
- `npm run lint` and frontend build pass after each migration batch.

## Expansion Path

To add a new language later:

1. Add the new route prefix and BCP 47 mapping in i18n routing config.
2. Add a message JSON file.
3. Allow the locale in backend validation.
4. Add the option to `LocaleSwitcher`.
5. Run missing-key checks and smoke-test the new prefix.
