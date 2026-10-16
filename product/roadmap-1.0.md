# Roadmap to 1.0 — canonical plan

_Owner decision 2026-10-15. Replaces the phase plan in [`phases.md`](phases.md) (Phase 2 / Phase 3 are cancelled; that file is history only)._

**The plan ends at 1.0.** 1.0 = the app is stable for the owner's circle of users and is then frozen: no more changes planned after it.

- Distribution stays as today: APK through Firebase App Distribution + the web build. **No Play Store** (maybe never).
- Out of scope: Play Store, TOS / Privacy / PDPA docs, monetization, the Next.js web / admin app, receipt photos, multi-currency conversion.

## Releases

| Version | Scope |
|---|---|
| **0.3.1-11** | UI review round (owner: "UI แปลกมาก"): fixes at the kit / template root, the page leftovers in `ai/backlog.md` (events, budgets, recurring, goals), offline-mode leftovers, the pending 🐷 draft edit sheet. **Currency auto from the user setting** (rules below). |
| **0.3.2** | Free text → LLM → pending draft (JSON). |
| **0.3.3** | Delete / archive everywhere ([`engineering/v0.3.3-delete-archive-plan.md`](../engineering/v0.3.3-delete-archive-plan.md)) + LLM drafts for every module. |
| **0.4** | Dashboard (incl. "แผนเดือนนี้"), push notifications (FCM, no Play Store needed), auth refresh token, CSV export, onboarding, dark mode / accessibility, l10n sweep. |
| **0.5** | Hardening: migration squash + reset / seed scripts, monitoring (errors + uptime alerts), backup restore test, rate limiting, list performance (1000+ rows). |
| **1.0** | Stable for the circle. Freeze. |

Versions between these keep the `0.3.1-N` / `0.x.y-N` patch style; every release forces the update (`MIN_APP_BUILD`).

## Currency (owner 2026-10-15)
- One currency per user, picked at first setup (default THB). Every record still carries its currency column; the server fills it from the user's setting. Forms have no currency picker.
- The user can change it at any time: a **relabel only**, no conversion, with a warning before saving.
- **Calculations ignore currency.** Everyone is treated as using the same currency; shared splits / debts / events pass amounts as-is.
- Display always uses the viewer's current setting (symbol + decimals of that currency, e.g. JPY has 0 decimals). Hard-coded THB / ฿ in the app becomes "the user's currency".

## Separate track: ppForge UI library
The owner will have another AI extract this app's UI (kit, hub templates, shell pieces) into a separate, ready-made Flutter library that future projects use for their UI. It is not a chubi-pocket release; see `ai/decisions.md` → UI library.
