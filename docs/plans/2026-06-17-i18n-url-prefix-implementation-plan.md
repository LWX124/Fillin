# URL-Prefix Internationalization Implementation Plan

## Goal

Implement URL-prefix internationalization for Fillin with `/zh/...` and
`/en/...` routes, localized frontend UI, localized frontend-displayed API
errors, and persisted user language preference.

Design reference:

- `docs/plans/2026-06-17-i18n-url-prefix-design.md`

## Scope

In scope:

- Next.js App Router locale-prefixed routes.
- Chinese and English message files.
- Locale-aware navigation and redirects.
- Language switcher.
- User `preferred_locale` persistence.
- Frontend error translation using backend error codes.
- Compatibility redirects for old unprefixed routes.

Out of scope:

- Translating user-generated content.
- Forcing AI output language.
- Full backend-side translated error catalogs.
- Subdomain-based locale routing.

## Phase 1: Frontend i18n Foundation

Status: pending

Files likely touched:

- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/next.config.ts`
- `frontend/src/proxy.ts` or `frontend/middleware.ts` as a compatibility
  fallback
- `frontend/src/i18n/routing.ts`
- `frontend/src/i18n/navigation.ts`
- `frontend/src/i18n/request.ts`
- `frontend/messages/zh.json`
- `frontend/messages/en.json`
- `frontend/src/app/layout.tsx`
- `frontend/src/app/[locale]/layout.tsx`

Tasks:

1. Install `next-intl`.
2. Wrap `frontend/next.config.ts` with the `next-intl` plugin.
3. Configure supported locales: `zh`, `en`.
4. Map locale prefixes to document languages: `zh -> zh-CN`, `en -> en`.
5. Add `next-intl` request config and message loading.
6. Add `frontend/src/proxy.ts` to redirect `/`, `/login`, `/register`,
   `/dashboard`, and other app routes without locale prefixes.
7. Exclude API routes, `_next`, static assets, and file-extension paths from the
   proxy matcher.
8. If the installed Next.js version requires the older convention, use the same
   redirect logic in `middleware.ts` and keep it easy to rename later.
9. Add a locale layout that provides messages to client components.

Acceptance checks:

- `/zh/login` and `/en/login` resolve without 404 after route migration.
- `/` redirects to `/zh` by default when no locale signal exists.
- Invalid locale prefixes return `notFound()` or redirect consistently.
- Static assets, Next internals, and API requests are not locale-redirected.
- `npm run build` can find the `next-intl` request config.

## Phase 2: Route Migration and Navigation

Status: pending

Files likely touched:

- `frontend/src/app/page.tsx`
- `frontend/src/app/login/page.tsx`
- `frontend/src/app/register/page.tsx`
- `frontend/src/app/auth/callback/page.tsx`
- `frontend/src/app/dashboard/**`
- `frontend/src/components/AppShell.tsx`
- `frontend/src/lib/store.ts`
- `frontend/src/lib/api.ts`

Tasks:

1. Move user-facing routes under `frontend/src/app/[locale]/`.
2. Keep or replace old unprefixed route files with redirects if proxy handling
   alone is not enough.
3. Replace `next/link` and `next/navigation` usage with locale-aware helpers
   where internal navigation must preserve locale.
4. Update hardcoded `router.push("/login")`, `router.push("/dashboard")`, and
   links to use locale-aware routes.
5. Update non-router redirects, including `window.location.href`, plain
   `<a href>`, OAuth start URLs, and Axios interceptor fallbacks.
6. Preserve query strings for auth callback and language changes.
7. Grep for hardcoded route strings after migration:
   `"/login"`, `"/register"`, `"/dashboard"`, `href="/`, and
   `window.location.href`.

Acceptance checks:

- `/login` redirects to `/{resolvedLocale}/login`.
- `/dashboard` redirects to `/{resolvedLocale}/dashboard`.
- Login success from `/en/login` lands on `/en/dashboard`.
- Protected-route failures from `/zh/dashboard` land on `/zh/login`.
- Existing dashboard links do not drop the locale prefix.
- Refresh-token failure from `/en/...` redirects to `/en/login`.

## Phase 3: Core UI Localization

Status: pending

Files likely touched:

- `frontend/messages/zh.json`
- `frontend/messages/en.json`
- `frontend/src/components/AppShell.tsx`
- `frontend/src/components/ThemeToggle.tsx`
- `frontend/src/components/LocaleSwitcher.tsx`
- `frontend/src/app/[locale]/login/page.tsx`
- `frontend/src/app/[locale]/register/page.tsx`
- `frontend/src/app/[locale]/dashboard/page.tsx`

Tasks:

1. Add message namespaces: `common`, `auth`, `nav`, `dashboard`, `errors`.
2. Localize app metadata, auth pages, app shell, dashboard home, empty states,
   buttons, labels, loading text, and common errors.
3. Add `LocaleSwitcher` to auth pages and authenticated shell.
4. On language switch, replace only the locale segment and preserve path/query.
5. Persist anonymous user choice with `NEXT_LOCALE` cookie and local storage.
6. After login, registration, or `/auth/me`, sync the returned
   `preferred_locale` into `NEXT_LOCALE` unless the current URL explicitly
   chooses a different locale.

Acceptance checks:

- `/zh/login` displays Chinese UI text.
- `/en/login` displays English UI text.
- Switching language on a nested dashboard route stays on the same route.
- Theme switching and language switching do not conflict.
- Visiting `/` after a language switch uses the last selected locale.

## Phase 4: Backend Preference Support

Status: pending

Files likely touched:

- `backend/app/models/user.py`
- `backend/app/schemas/user.py`
- `backend/app/api/v1/auth.py`
- `backend/app/api/v1/settings.py` or a new preferences endpoint
- `backend/alembic/versions/*.py`
- `backend/tests/**` if backend tests are added

Tasks:

1. Add `preferred_locale` to `User`.
2. Create Alembic migration with default `zh`.
3. Add locale validation for `zh` and `en`.
4. Include `preferred_locale` in `UserResponse`.
5. Accept optional locale during registration.
6. Add or extend an authenticated endpoint to update language preference.
7. Ensure Google OAuth-created users get a valid preferred locale when locale
   state is available.
8. Ensure login, registration, and `/auth/me` responses provide enough data for
   the frontend to sync `NEXT_LOCALE`.

Acceptance checks:

- Existing users migrate with `preferred_locale = "zh"`.
- Registering from `/en/register` creates a user with `preferred_locale = "en"`.
- `GET /api/v1/auth/me` returns `preferred_locale`.
- Authenticated language switch persists preference.
- Invalid locale values are rejected with 400.
- The frontend can sync `preferred_locale` to `NEXT_LOCALE` after `/auth/me`.

## Phase 5: API Error Codes and Frontend Error Mapping

Status: pending

Files likely touched:

- `backend/app/api/v1/auth.py`
- `backend/app/api/deps.py`
- shared backend error helper if added
- `frontend/src/lib/api.ts`
- `frontend/src/lib/errors.ts`
- `frontend/messages/zh.json`
- `frontend/messages/en.json`

Tasks:

1. Add a small backend helper or pattern for `{code, detail}` API errors.
2. Migrate auth errors first: invalid credentials, duplicate email, invalid
   refresh token, inactive user.
3. Add frontend `getApiErrorMessage` helper.
4. Prefer translated `errors.<code>` messages; fall back to `detail`, then
   generic unknown error.
5. Send `Accept-Language` from Axios based on active locale.

Acceptance checks:

- Wrong password on `/zh/login` shows Chinese error text.
- Wrong password on `/en/login` shows English error text.
- Old error responses with only `detail` still display safely.

## Phase 6: OAuth Locale Preservation

Status: pending

Files likely touched:

- `frontend/src/app/[locale]/login/page.tsx`
- `backend/app/api/v1/oauth.py`
- backend OAuth state handling helpers if added

Tasks:

1. Send active locale in Google OAuth `state`.
2. Validate callback locale state against `zh` and `en`.
3. Redirect OAuth success to `/{locale}/auth/callback`.
4. Fall back to default locale if state is missing or invalid.

Acceptance checks:

- Starting Google login from `/en/login` returns to `/en/auth/callback`.
- Starting Google login from `/zh/login` returns to `/zh/auth/callback`.
- Invalid or missing state does not break login.

## Phase 7: Remaining Page Localization

Status: pending

Files likely touched:

- `frontend/src/app/[locale]/dashboard/kb/[id]/page.tsx`
- `frontend/src/app/[locale]/dashboard/kb/[id]/chat/page.tsx`
- `frontend/src/app/[locale]/dashboard/crawlers/page.tsx`
- `frontend/src/app/[locale]/dashboard/content-generation/page.tsx`
- `frontend/src/app/[locale]/dashboard/credits/page.tsx`
- `frontend/src/app/[locale]/dashboard/settings/page.tsx`
- `frontend/messages/zh.json`
- `frontend/messages/en.json`

Tasks:

1. Localize knowledge base detail and content ingestion UI.
2. Localize chat UI and citations labels.
3. Localize crawler task UI.
4. Localize content generation UI.
5. Localize credits UI.
6. Localize settings UI, including language preference controls.

Acceptance checks:

- No user-facing fixed English remains in localized dashboard pages except
  brand names, user content, URLs, or technical model/provider names.
- English and Chinese pages fit within existing responsive layouts.

## Phase 8: Verification

Status: pending

Commands:

```bash
cd frontend && npm run lint
cd frontend && npm run build
cd backend && .venv/bin/alembic upgrade head
```

Browser checks:

- `/`
- `/zh/login`
- `/en/login`
- `/zh/register`
- `/en/register`
- `/zh/dashboard`
- `/en/dashboard`
- Language switching on dashboard nested pages.
- Registration, login, logout, refresh, protected redirect.
- Refresh-token failure redirect from both `/zh/...` and `/en/...`.
- Static asset and API URLs are not captured by locale redirects.

Optional if Playwright is available:

- Add smoke tests for redirects, locale switch, auth-page text, and protected
  route behavior.

## Risks and Mitigations

- Risk: Moving routes under `[locale]` breaks internal links.
  Mitigation: migrate navigation helpers early and grep for hardcoded route
  pushes after each phase.

- Risk: Middleware redirects API or static asset paths.
  Mitigation: exclude `_next`, `api`, assets, and files with extensions in the
  middleware matcher.

- Risk: Text expansion breaks compact UI controls.
  Mitigation: test both locales on mobile and desktop after each page batch.

- Risk: OAuth state handling conflicts with provider state validation.
  Mitigation: encode locale inside a structured state value or store it
  server-side if the OAuth library already uses state for CSRF.

- Risk: Existing users have null preferences after migration.
  Mitigation: database migration must use a non-null default and backfill.

## Definition of Done

- All user-facing app routes are available under `/zh` and `/en`.
- Old unprefixed app routes redirect to locale-prefixed routes.
- Core UI and all dashboard pages are localized.
- User language preference is stored and returned by the API.
- Frontend errors are localized when backend error codes are present.
- Locale switching preserves the current route and query.
- Lint, build, and database migration checks pass.
