# Frontend — overview

Cross-frontend conventions for every client that talks to the ChubiPocket backend. Today there's one client (Flutter app for Android + Flutter web shell). Phase 3 adds two more (Next.js admin, Nuxt 3 power-user web).

This file covers what's identical across all clients. Per-client implementation specifics live in subfolders.

---

## Clients

| Client | Folder | Phases | Stack | Audience |
|---|---|---|---|---|
| **App** | [`app/`](app/) | 0–3 | Flutter (Android + web shell) | End users, mobile-first |
| **Admin** | `admin/` *(Phase 3)* | 3+ | Next.js | Internal admin, moderation |
| **Web** | `web/` *(Phase 3)* | 3+ | Nuxt 3 | Power users, paid tier — focused on bulk management, import/export, free editing |

Per-client design + UX specs (screens, layouts, interactions, brand) live in [`../../product/ui-design/<client>/`](../../product/ui-design/) — designer-facing, plain UX language. This folder holds engineering-only detail.

---

## Cross-frontend conventions

### API contract

All clients consume the same REST API: `/api/v1/...`. Base URL and conventions in [`../spec/overview.md`](../spec/overview.md). No client-specific endpoints; if one client needs different data, the same endpoint either grows query-param flexibility or returns shape-flexible responses.

### Authentication

- Bearer JWT in `Authorization: Bearer <token>` header on every request
- Phase 0/1: single 30-day access token, no refresh
- Phase 2+: 15-min access token + 7-day refresh token; client interceptor handles transparent refresh on 401
- Token storage: secure store on mobile (`flutter_secure_storage`), `localStorage` on web (acceptable risk with short-lived tokens)
- Logout: client discards local token (Phase 1); revokes server-side refresh token (Phase 2+)

### Error handling

Standard error envelope across all endpoints (defined in [`../spec/overview.md`](../spec/overview.md)):

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": {...} } }
```

All clients render the same error codes the same way. UI strings can be localized; codes are not.

### Pagination

`page` + `per_page` query params; response has `pagination: { page, per_page, total, total_pages }`. All clients implement the same pattern (load page 1 on mount, infinite-scroll or paginator UI per screen).

### Date / timezone handling

- Server returns timestamps as ISO 8601 UTC
- Client converts to `user.preferences.timezone` (from `GET /v1/users/me`) for display
- "Today" / "this month" / period boundaries are always in user's tz, not UTC
- Calendar dates (`DATE` columns like `transactions.date`) are tz-naive — display as-is, no conversion

### Offline / sync (Phase 2+)

- Phase 1: clients require online; mutations fail if offline
- Phase 2: write-through queue for mutations; reads cached locally with TTL
- Sync resolution: last-write-wins per row (matches backend's no-edit-after-resolve model)

### Currency display

- Each transaction has its own currency (inherited from account)
- Client formats per locale (Intl APIs / `intl` package)
- Multi-currency aggregates show converted total in user's default currency + per-currency breakdown (Phase 2+)

### Notifications inbox

In-app inbox (`GET /v1/notifications`) consumed by all clients identically. Push delivery (FCM/APNs/Web Push) is per-client implementation but the server-side trigger registry is shared (see [`../spec/13-notifications.md`](../spec/13-notifications.md)).

### Modal-on-save UX

When a project_transaction is saved and the recorder is involved (actor or splittee), client shows a follow-up modal. Implementation differs per client; the trigger condition and behavior are the same. Suppressed per `auto_resolve_own_in_projects` setting.

---

## Per-client subfolders

Each subfolder owns:

- Stack choices (framework, state management, HTTP client, storage)
- Component / widget catalog
- State management conventions
- Routing implementation
- Build / deployment specifics

It does NOT own:

- Screen layouts (those live in [`../../product/ui-design/<client>/screens/`](../../product/ui-design/))
- Design tokens (those live in [`../../product/ui-design/<client>/design-sheet.md`](../../product/ui-design/))
- Brand identity (same)

---

## Status

- **Last updated** — 2026-04-26
- **Version** — 0.1 (initial extract from former `02-flutter/`; cross-frontend conventions consolidated; per-client subfolders introduced for Phase 3 readiness)
