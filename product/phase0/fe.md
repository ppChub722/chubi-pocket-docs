# Phase 0 — Frontend

**Goal:** Flutter app builds for Android + Flutter web; user can register / login / logout / change password / view-and-edit profile on both targets; reusable state pattern widgets ready for Phase 1; reference Cubit + Repository pair (`AuthCubit` + `AuthRepository`) that Phase 1+ modules will copy.

**Stack** (locked): Flutter, **Bloc** (`flutter_bloc`, Cubit-by-default), `go_router` (declarative), `dio` + auth interceptor, `flutter_secure_storage`, Material 3, `intl`. See [`../../design/frontend/app/overview.md`](../../design/frontend/app/overview.md).

---

## Tasks

### Project scaffold

- [ ] **Folder structure** — feature-first: `lib/{main.dart, app/, core/, features/, shared/}`. Per-feature: `data/domain/presentation` layers
- [ ] **Routing** — `go_router` with declarative route table; auth-gated routes redirect to `/auth/login`
- [ ] **State management** — `flutter_bloc` set up; root `MultiBlocProvider` / `MultiRepositoryProvider`
- [ ] **HTTP client** — `dio` with base URL = `http://localhost:8080/api/v1` (dev); auth interceptor adds `Authorization: Bearer <token>`; 401 → logout (Phase 2 will add refresh)
- [ ] **Token storage** — `flutter_secure_storage` on mobile; `localStorage` fallback on web
- [ ] **Theme** — Material 3 (`useMaterial3: true`) with a **theme registry**: `mint` (default, seed `#00A389`) + `sweet` (alternative). Each entry produces light + dark via `ColorScheme.fromSeed`. Active `themeId` persisted in `shared_preferences`. Settings → theme picker is functional in Phase 0
- [ ] **Fonts** — `google_fonts` + per-language registry. Phase 0 ships one font per locale (`en`, `th`); Settings → font picker UI rendered with the single option (scaffold for Phase 2 expansion)
- [ ] **Localization scaffolding** — `intl` + ARB files for `th` (default) + `en` (fallback); strings added inline as you code

### Reference Cubit + Repository pair

This is the template Phase 1+ modules copy. Build it carefully:

- [ ] **`AuthRepository`** — only place that talks to dio for auth/users endpoints
- [ ] **`AuthCubit`** — depends on `AuthRepository` via constructor injection; states as sealed classes (initial / loading / authenticated / unauthenticated / error)
- [ ] **State transitions** — `login()`, `logout()`, `register()`, `changePassword()` methods; each emits loading → success/error states
- [ ] **Tests** — `bloc_test` package: each Cubit method tested with mocked Repository; Repository tested with mocked dio
- [ ] **Documentation** — code comments describing the pattern so Phase 1+ has a clear example

### Screens

Per [`../ui-design/app/screens/`](../ui-design/app/screens/) and the placeholdered design-sheet:

- [ ] **`auth/splash`** — auth-state check + redirect; placeholder logo (text wordmark "ChubiPocket"); 600 ms min display
- [ ] **`auth/register`** — form + validation + register call; error mapping (`USERNAME_EXISTS` → field error)
- [ ] **`auth/login`** — form + login call; generic 401 message ("Username or password incorrect")
- [ ] **`home/index`** — Phase 0 empty state demonstrating `EmptyView` pattern; app bar entry to `/settings`
- [ ] **`settings/index`** — profile card, change-password link, **theme switcher (functional: `mint` / `sweet`)**, **language switcher (functional: `th` / `en`)**, font switcher (UI rendered, single option per locale in Phase 0), app info, logout
- [ ] **`settings/edit-profile`** — display_name input, currency dropdown, avatar picker (Phase 0: letter initials default + URL input + remove); upload+crop affordances visible but disabled per design-sheet
- [ ] **`settings/change-password`** — current + new + confirm fields with show/hide toggles

### Reusable widgets (state pattern + others)

Built once in Phase 0; reused everywhere in Phase 1+:

- [ ] **`LoadingView`** — skeleton or shimmer per design-sheet §8.5
- [ ] **`ErrorView`** — error message + retry action; 3 variants (network / server / unknown) per design-sheet
- [ ] **`EmptyView`** — zero-state with icon + title + body + optional CTA
- [ ] **`OfflineBanner`** — shown when network unavailable; auto-dismisses on reconnect
- [ ] Toast/snackbar pattern for transient feedback
- [ ] **`AmountText`** — formatted amount with currency, tabular figures, color (used Phase 1+; build the API in Phase 0)
- [ ] **Avatar widget with initials fallback** — generates "AB" from `display_name`; color from name hash; used by edit-profile picker + future contact rows

### Demo / verification

- [ ] **Demo screen** — placeholder route showing each state widget rendered correctly (proves the pattern works)
- [ ] **Multiplatform verification** — APK builds; web bundle builds; auth flows work on both
- [ ] **Manual test** — register → login → view profile → edit profile → change password → logout, on both Android + Flutter web

---

## What you read

- [`../ui-design/app/design-sheet.md`](../ui-design/app/design-sheet.md) — design tokens (placeholdered values are ready)
- [`../ui-design/app/screens/`](../ui-design/app/screens/) — 7 Phase 0 screen text specs
- [`../../design/overview.md`](../../design/overview.md) — stack
- [`../../design/frontend/overview.md`](../../design/frontend/overview.md) — cross-frontend conventions (auth flow, error handling, pagination, dates)
- [`../../design/frontend/app/overview.md`](../../design/frontend/app/overview.md) — Flutter-specific patterns (Bloc/Cubit/Repository, navigation, widgets)
- [`../../design/spec/01-auth.md`](../../design/spec/01-auth.md) and [`02-users.md`](../../design/spec/02-users.md) — endpoint contracts (so you know what to call and what comes back)

## What you don't need to read

- `database/` (BE owns); other spec modules (Phase 1)

---

## Done when

- [ ] All Phase 0 exit criteria in [`overview.md`](overview.md) check
- [ ] Reference `AuthCubit` + `AuthRepository` pair documented as the Phase 1+ template
- [ ] All 4 state-pattern widgets built and demoed
- [ ] Theme renders with placeholdered design tokens
- [ ] Avatar picker works with letter initials default
