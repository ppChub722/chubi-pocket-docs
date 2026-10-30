# App-wide error reporting: audit (Lead, 2026-10-28; read-only survey of feat/approw; NOT briefed)

Map: global = ConnectionShell → OfflineBanner → ConnectionBanner (10 s × 6 retries, /dev muted); 426 → UpdateRequiredPage; 401 → silent logout; 429 not produced / not handled. Page = ErrorView in AsyncStateView (via ListPageBody / DashboardPageBody 21 files, direct 10, ErrorView 4, PickerSheet). Action = showErrorSnackBar (7 files) vs showAppSnackBar (151 calls / 35 files, ~50 pass raw `e.message`). Mapper = `_AppErrors.describe` (app_ui_config.dart:94, 5 codes) + 4 feature mappers (wallet / event / pending / category), all fall back to `e.message`. 48 of the BE's 69 error codes are never referenced in the FE.

Confirmed:
1. HIGH raw English / exception text to users (~50 snackbars: BE message, Go err.Error(), Dio text, TypeError.toString()). Fix: one mapper, every BE code → arb, feature mappers folded in, no `.message` in presentation (grep / lint gate).
2. HIGH failed saves have no retry (~100 catches build their own danger snackbar). Fix: kit `showActionFailure(context, e, retry:)` used by every save / delete / reorder.
3. MED detail-page refresh failures hand-rolled with raw text (contact_detail_page.dart:118 …). Fix: AsyncStateView / DetailPageBody owns it.
4. MED duplicate messages offline: banner + "ไม่มีการเชื่อมต่อ" snackbar (async_state_view.dart:115-131). Fix: network snackbars skipped while ConnectionScope is offline.
5. MED silent failures: saving_goal_cubit.dart:90 load-more, saving_entry_form.dart:100 (shows "no goals"), transactions_cubit.dart:208 `catch (_) {}`.
6. MED hand-rolled error UI: period_summary_card.dart:136-150 → kit inline-error molecule.
7. LOW banner vs mapper disagree on DioExceptionType.unknown (api_client.dart:180 vs api_exception.dart:50) → one classifier.
8. LOW slow (8 s) / server down shown as "ตรวจสอบอินเทอร์เน็ต" (async_state_view.dart:149-153) → separate texts.
9. LOW 401 → login with no "session expired" notice, open edits lost; dashboard stale banner has no retry (home_page.dart:148).
10. LOW BootErrorApp hardcoded text + raw error (probably intended); OfflineBanner kit → core import.
Suspected: non-API throws skip setSaving(false) → endless save overlay (budget_detail_page.dart:371; fix: try/finally base save runner or repos wrap every throw); inbox errors shown twice (home + inbox page); first failed save online = banner + snackbar.

## Loading overlays + brand screens scan (app main fb958e0, 2026-10-28)
- App-wide `SavingOverlay` on `AppRefresh.busy` (app.dart:398-401): scrim 0.32 + spinner, blocks all taps, above the Navigator. Shows on resume after > 5 min hidden (app_refresh.dart:23, 60-76: sync + refreshCurrent, cap 10 s, no minimum time → flashes) and on sign-in with no cache.
- `SavingOverlay` per save: editScope (edit_mode_mixin.dart:202, 12 pages), direct (accounts, categories, pending batch add, recurring body `_busy`, event tags sheet, quick create, FormSheet ×13). Doubled scrims: transaction_detail_page.dart:809, debt_entry_detail_page.dart:957, contact_detail_page.dart:448 (two scrims ≈ 54 %); recurring_detail_page.dart:802 two styles.
- Suspected: 401 / logout flashes SplashPage in the shell (app_router.dart:105) before /auth/login.
- `LoadingView` has 0 call sites (dead kit widget).
- Logo: splash = BrandLogo 128 centred at H/2 (splash_page.dart:54-63, no SafeArea); login = BrandHeader 88 at the top of a centred ~600 dp form (≈ 230 dp above splash, moves with the keyboard); update required = BrandLogo 128 at the top of a centred block (≈ 100 dp above splash); boot error = no logo, red icon, own MaterialApp; first-load failure = ErrorView in the page body.

## Owner direction (2026-10-28, discussing, not briefed)
- No top banner: bottom snackbars only; several at once stack (connection one at the bottom, above the nav bar).
- One brand-screen template: splash, login, start-up failure, update required (and boot error) share the logo at one position (the login position); only the part under the logo changes. In-app page load failures stay in the page body.
- Resume after > 5 min: refresh silently, no scrim (owner agreed).
- No scrims anywhere (owner agreed): `SavingOverlay` removed from the kit. Loading rule (owner): only the control that was pressed shows loading (spinner in place, size unchanged); controls that must not be used meanwhile are just faded (the kit disabled look); unrelated controls stay normal. Every interactive kit widget gets the state: AppButton, icon buttons, AppChip, switches, dropdown / pick rows, AppDetailRow / AppListRow actions, DangerRow; inputs fade when locked. editScope provides a BusyScope so a form locks without per-field wiring.

## Plan (Lead draft, waiting for the owner's go)
Phase A (kit, one FE dev):
- A1 `SnackStack`: bottom only, above the nav bar, several stack; the connection snack (connecting n/6 → can't connect + ลองใหม่, close X) sits at the bottom and stays; the top banner removed.
- A2 loading states on every interactive kit widget + BusyScope (rule above); `SavingOverlay` + the app-wide resume overlay removed; `LoadingView` (unused) removed; ratchet: no scrim widgets in lib.
- A3 `BrandScreen` template: one logo size at one fixed y (the login position, measured from the safe top, not moved by the form or keyboard) for splash, login, start-up failure, update required, boot error.
- Tests: geometry (stack order / position, no size change while loading, logo y equal on every brand screen).
Phase B (mapper + call sites, after A1):
- B1 one `describe(e)`: every BE error code → Thai arb, grouped (not found, validation, immutable, server, specific ~15-20); feature mappers folded in; a test fails if a BE code has no mapping; no `.message` / `errorMessage` in presentation (gate).
- B2 `showActionFailure(e, retry:)` for every save / delete / reorder (~150 snackbar calls); inputs kept.
- B3 offline = the connection snack only (no duplicate snacks); one network classifier; slow vs server-down texts; the 3 silent failures; period_summary_card error into the kit; 401 → "session expired" snack on login.
