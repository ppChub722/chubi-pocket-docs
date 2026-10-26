# Roadmap to 1.0 — canonical plan

_Owner decision 2026-10-15. Replaces the phase plan in [`phases.md`](../archive/product/phases.md) (Phase 2 / Phase 3 are cancelled; that file is history only)._

**The plan ends at 1.0.** 1.0 = the app is stable for the owner's circle of users and is then frozen: no more changes planned after it.

- Distribution stays as today: APK through Firebase App Distribution + the web build. **No Play Store** (maybe never).
- Out of scope: Play Store, TOS / Privacy / PDPA docs, monetization, the Next.js web / admin app, receipt photos, multi-currency conversion.

## Releases (re-planned by the owner 2026-10-26)

The 0.4.0-N rounds became the UI rounds (0.4.0 to 0.4.0-4, all shipped). What the old plan put in 0.3.1-11, 0.3.2, 0.3.3 and 0.4 and is still open moved into 0.4.1 / 0.4.2 below.

| Version | Scope |
|---|---|
| **0.4.1-0** | Leftovers: everything still open from the earlier rounds (list below). |
| **0.4.1-1** | LLM: free text → LLM → pending draft (JSON), then LLM drafts for every module (was 0.3.2 / 0.3.3). |
| **0.4.2** | The old 0.4 features: dashboard incl. "แผนเดือนนี้", push notifications (FCM, no Play Store needed), auth refresh token, CSV export, onboarding, accessibility (dark mode is done), l10n sweep, **per-user navigation** (bottom bar and More page arranged by each user: group, reorder, hide; a hidden module disappears app-wide; details in `ai/backlog.md`). |
| **0.5** | Hardening: migration squash + reset / seed scripts, monitoring (errors + uptime alerts), backup restore test, rate limiting, list performance (1000+ rows). |
| **1.0** | Stable for the circle. Freeze. |

Versions between these keep the `0.x.y-N` patch style; every release forces the update (`MIN_APP_BUILD`).

Done from the old plan: 0.3.1-11 currency (user setting, relabel only), 0.3.3 delete / archive (archived hub, restore, wallet hard delete), dark mode.

### 0.4.1-0 leftovers
Code-checked plan with files, sizes, order and owner questions: [`ai/briefs/0.4.1-0-plan.md`](../ai/briefs/0.4.1-0-plan.md) (2026-10-26). In short:
- **Broken today:** confirming selected recurring rows with no amount (BE refuses 0); editing a booked event bill never updates my books.
- **Quick fixes:** currency ฿ leaks (incl. the quick-create amount prefix), saving amounts shown red, goal page caption + monthly fact, two pages stuck on a skeleton, `/health` (app pings a 404), the future-date hint + "อีก N วัน" on tx detail.
- **Offline gating** for recurring actions, menus and settings dropdowns.
- **Recurring bulk API** across rules.
- **Events:** the "แก้บิลที่ลงบัญชีแล้ว" setting + prompt (debt sync optional), my-books tests.
- **Kit:** buttons (~15 kit / shell spots), list heads (0 pages moved; the biggest item), detail rows → AppListRow, delete hub-only pieces.
- **Goals list month stepper** (conflicts with the 2026-10-21 decision).
- **Cleanup:** old-BE recurring fallback, settle / resolve sheets, quick create project mode, `saving_plan_preview`, 515 unused l10n keys.
- **Owner questions** (income tabs, debt open count, person filter, small UI choices) and **docs** (STATUS, decisions, 0.4.0-4 release note, schema, spec 12 / 13, api-document).
- Already done: the pending 🐷 edit sheet, most of one-off upcoming, hero / icons 9a–9d, future tx as expected in budgets.

## Currency (owner 2026-10-15)
- One currency per user, picked at first setup (default THB). Every record still carries its currency column; the server fills it from the user's setting. Forms have no currency picker.
- The user can change it at any time: a **relabel only**, no conversion, with a warning before saving.
- **Calculations ignore currency.** Everyone is treated as using the same currency; shared splits / debts / events pass amounts as-is.
- Display always uses the viewer's current setting (symbol + decimals of that currency, e.g. JPY has 0 decimals). Hard-coded THB / ฿ in the app becomes "the user's currency".

## Separate track: ppForge UI library
The owner will have another AI extract this app's UI (kit, hub templates, shell pieces) into a separate, ready-made Flutter library that future projects use for their UI. It is not a chubi-pocket release; see `ai/decisions.md` → UI library.
