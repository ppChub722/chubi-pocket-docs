# Phases — development plan

Per-phase development plan: goal, modules, exit criteria, risks, dependencies. Replaces the four `phaseN.md` files (combined here at v0.5 of the product docs).

`phases.md` is **canonical** for what ships in each phase. Per-module Phase summary tables in the spec files (e.g., [`design/spec/06-shared-expenses.md`](../design/spec/06-shared-expenses.md)) are snapshot-from-write-time and updated at phase transitions, not continuously.

For schema details, see [`design/database/schema.md`](../design/database/schema.md). For module-level mechanics, see [`design/spec/`](../design/spec/). For UI screens, see [`ui-design/app/screens/`](ui-design/app/screens/).

---

## Phase 0 — Foundation

**Goal:** scaffolding ready for feature work. Backend + Flutter app builds, auth works end-to-end on Android + web, error/loading/empty UX patterns exist, CI runs.

### Scope

- **Backend foundation** — project structure (handlers / services / data layers), routing, middleware (auth + CORS + logging + error envelope), structured logging, DB connection pool, `/health` endpoint, **Docker setup** (`Dockerfile` + `docker-compose.yml` for `postgres` + `backend`; production deploys identical containers to VPS later)
- **Frontend foundation** — Flutter project structure (feature-first with `data`/`domain`/`presentation` layers per feature), routing (`go_router` declarative), state mgmt (Bloc / Cubit-by-default with Repository pattern), HTTP client (`dio`) with auth + refresh interceptor, secure token storage, design tokens, light theme, localization scaffolding (en/th)
- **Auth** — register, login, logout, change password (single 30-day JWT in 0/1; refresh added in Phase 2). See [`design/spec/01-auth.md`](../design/spec/01-auth.md)
- **User profile + settings** — `/users/me` read/update, change password, settings screen with profile/theme/language/logout. See [`design/spec/02-users.md`](../design/spec/02-users.md)
- **Multiplatform verification** — single codebase builds and runs on Android + Flutter web; auth flows work on both
- **State pattern widgets** — `LoadingView`, `ErrorView`, `EmptyView`, offline banner, toast/snackbar (the patterns Phase 1 will consume; not visual polish)

### Schema delta

New tables: `users`, `user_preferences`. See [`design/database/schema.md#01--auth`](../design/database/schema.md) and [`#02--users`](../design/database/schema.md).

### Exit criteria

- User can register, log in, log out on Android
- Same flows work on Flutter web
- Auth token persists across app restarts on both platforms
- Settings screen shows profile + supports change-password + logout
- Backend error envelope renders uniformly across screens (LoadingView / ErrorView / EmptyView demoed correctly)
- Offline banner appears when network is cut
- CI runs on push and passes

### Not in Phase 0

Any feature beyond auth + users (→ Phase 1). Visual polish (→ Phase 2). Production infrastructure (→ Phase 3). iOS. Dashboard, charts, notifications, exports.

### Risks

- **Monorepo vs split repos.** Monorepo = easier cross-cutting; split = cleaner separation. Current lean: monorepo.
- **State management is sticky.** Bloc (Cubit-by-default) is locked in `design/frontend/app/overview.md` §1; switching mid-Phase-1 would be painful — re-validate during Phase 0 if FE has strong reasons to reconsider.
- **Secure token storage on web.** No Keychain equivalent on Flutter web; tokens live in IndexedDB/localStorage. Accepted risk; mitigated by short-lived tokens in Phase 2.
- **Phase 0 can bloat.** Every "might as well" addition delays Phase 1. Keep minimal — scaffolding only, no features beyond auth.

### Dependencies

- Auth + users specs finalized
- Global conventions finalized: [`design/spec/overview.md`](../design/spec/overview.md)
- Repo structure decided (monorepo vs split)
- State management — **locked: Bloc + Cubit + Repository pattern**

---

## Phase 1 — Feature completeness

**Goal:** every product feature is implemented and works end-to-end. Three sub-milestones, each independently testable.

### Sub-milestones

| Sub | Focus | Modules touched |
|---|---|---|
| **1a** | Single-user core | accounts, transactions, categories, tags |
| **1b** | Multi-user + collaboration + dashboard + notifications | contacts, shared-expenses (splits), personal-debts, projects, project-members, notifications (in-app inbox) |
| **1c** | Planning | budgets, saving-goals, scheduled-transactions (recurring / installments / loans) |

---

### Phase 1a — Single-user core

**Goal:** user can replace their solo-finance spreadsheet — log, categorize, review their own transactions across multiple accounts.

**Modules:** [`03-accounts`](../design/spec/03-accounts.md), [`04-transactions`](../design/spec/04-transactions.md), [`05-categories-tags`](../design/spec/05-categories-tags.md)

**Schema delta:** `accounts`, `transactions`, `categories`, `tags`, `transaction_tags`. See [`schema.md#03--accounts`](../design/database/schema.md) through [`#05--categories--tags`](../design/database/schema.md).

**Exit criteria:**
- User can create accounts of every type (cash, bank, e-wallet, credit_card, pay_later)
- User can log expense, income, transfer transactions; transfer correctly debits source and credits destination
- Account balance updates atomically with each transaction
- User can filter transactions by account, category, date; pagination works
- User can categorize and tag transactions
- Summary returns correct totals for a date range
- Soft-deleted accounts excluded from default lists

---

### Phase 1b — Multi-user, collaboration, dashboard, notifications

**Goal:** user can split bills, coordinate IOUs across friends (whether they're on the app or not), track collaborative projects, and see notifications when others act on shared state.

**Modules:** [`06-shared-expenses`](../design/spec/06-shared-expenses.md), [`07-contacts`](../design/spec/07-contacts.md), [`10-projects`](../design/spec/10-projects.md), [`12-personal-debts`](../design/spec/12-personal-debts.md), [`13-notifications`](../design/spec/13-notifications.md)

**Key model decisions** (in spec):
- **Unified shared-expenses model** — no two-sided settlement handshake; per-caller computed settlement state; no `paid_amount`/`is_settled` columns; no `split_settlements` table
- **Polymorphic split source** — splits attach to either personal `transactions` or `project_transactions`
- **Project ledger as canonical** — every transaction in project context goes to `project_transactions`; personal mirrors derived via claim/pay/receive
- **Splits migrate on claim** — non-destructive; same split IDs
- **In-app notification inbox** in 1b; push delivery deferred to Phase 2
- **Modal-on-save UX** + auto-resolve user setting for project_transactions
- **Solo project** support (single linked member; no notifications fire)

**Schema delta:** new tables: `contacts`, `contact_invites`, `projects`, `project_members`, `project_invites`, `project_transactions`, `shared_expense_splits` (polymorphic source FKs), `personal_debts`, `notifications`, `user_notification_settings`. New `transactions` columns: `source_split_id`, `source_project_transaction_id` (with auto-derived `project_id`). See [`schema.md`](../design/database/schema.md) modules 06, 07, 10, 12, 13.

**Exit criteria:**

*Contacts*
- User can create / update / soft-delete contacts
- User can absorb `person_name` strings into a contact
- User can invite a contact to link via 8-char invite code; recipient accepts → `linked_user_id` populated
- Linked contact's user sees splits where they're the debtor on their side

*Shared expenses (splits)*
- User can split a personal expense with `contact_id` or `person_name` debtors (no `project_member_id` in personal context)
- User can split a project_transaction with `project_member_id` debtors
- Settlement state per-caller computed (no global `is_settled`)
- Debtor `pay` creates personal expense + auto-closes any matching `personal_debts` + fires `split_paid` notification
- Creditor `receive` creates personal income + fires `split_received` notification
- Splits migrate to personal mirror on claim (same split IDs)

*Personal debts*
- User can manually create a debt (no split, no project)
- Add-as-debt from a split creates the row with `source_split_id`
- Paying via personal-debts endpoint records expense + bumps `paid_amount` + flips status
- Dashboard joins "I owe" (debts) + "owed to me" (splits)

*Projects*
- User can create projects with three member types (linked / contact / ad-hoc)
- User can record a project_transaction on someone else's behalf (`transaction_member_id` ≠ self)
- No personal account is touched on project_transaction insert
- Modal-on-save fires for the recorder if they're involved (suppressed by user setting)
- Linked actor can claim a project_transaction; splits migrate
- Project's debt matrix correctly reflects per-caller settlement
- Lifecycle rules enforced: `completed` blocks new project_transactions; `archived` is read-only
- Solo project (single linked member) works end-to-end
- Ownership transfer + soft-remove + resolve-all batch all work

*Notifications (in-app)*
- All 6 trigger types fire correctly (`split_created`, `split_paid`, `split_received`, `project_tx_recorded_for_you`, `project_tx_changed`, `project_invite`)
- User can list, mark-read, mark-actioned, dismiss
- User can configure auto-toggles + default account
- No push delivery yet (Phase 2)

---

### Phase 1c — Planning

**Goal:** user can stay within budget, save toward a goal, and automate scheduled transactions.

**Modules:** [`08-budgets`](../design/spec/08-budgets.md), [`09-saving-goals`](../design/spec/09-saving-goals.md), [`11-scheduled-transactions`](../design/spec/11-scheduled-transactions.md)

**Schema delta:** new tables: `budgets`, `saving_goals`, `scheduled_transactions`. See [`schema.md`](../design/database/schema.md) modules 08, 09, 11.

**Exit criteria:**
- Budget correctly tracks spending for the current period
- Child-category spending rolls up to parent budget
- Project-scope budgets coexist with user-scope on the same category
- Saving goal linked to an account reflects current balance × allocation as progress
- Allocation_pct sum ≤ 100 enforced at API layer
- Recurring entry auto-generates a transaction on `next_billing_date` (or via manual "trigger now" in 1c; real scheduler in Phase 3)
- Loan (installment with `interest_rate`) tracks remaining payments correctly
- Installment plan auto-completes when paid off
- User can pause and resume any scheduled entry

---

### Overall Phase 1 exit criteria

- All of 1a, 1b, 1c exit criteria met
- Every endpoint in [`design/spec/`](../design/spec/) is live (except those explicitly deferred)
- Flutter app (Android + web) exposes UI for every action
- All flows in [`overview.md`](overview.md) §Flow index work end-to-end
- Schema in [`design/database/schema.md`](../design/database/schema.md) matches running database
- No crash bugs on happy paths; data persists across restarts

### Phase 1 does NOT include

- Visual polish (→ Phase 2)
- Multi-currency (→ Phase 2)
- Push notification delivery (→ Phase 2; in-app inbox ships in 1b)
- Dashboard, charts, exports, receipt photos (→ Phase 2)
- Production infrastructure (→ Phase 3)

### Risks

- **Per-caller settlement state computation** is a hot read. May need a materialized view in Phase 2+ if performance degrades.
- **Splits-migrate-on-claim atomicity** — must be one DB transaction with careful lock ordering.
- **Modal-on-save UX is client-side** — backend doesn't know about modals; client decides whether to fire follow-up resolve actions per user setting.
- **Scheduled-transactions auto-generation needs a real scheduler** — Phase 1c uses manual "trigger now" button; real scheduler in Phase 3.
- **Lazy consolidation UX conflicts** — absorb endpoint must reject `ALREADY_CONSOLIDATED` if a string already links to another contact.
- **1c can be truncated if time is tight** — saving goals are nice-to-have and could slip to Phase 2.
- **Sub-milestone boundaries are guidance, not law.** Cross-milestone flows ship the minimum needed to close the flow.

### Dependencies

- Phase 0 complete
- All 13 module specs in [`design/spec/`](../design/spec/) finalized
- Schema reference matches per-module specs

---

## Phase 2 — UX polish

**Goal:** the app is pleasant to use. Every feature from Phase 1 is still there, but now the UX turns "it works" into "I actually enjoy using this."

### Scope

- **Project Report tab** — per-member paid / owes / net breakdown; by-category spend totals. UI shows "Coming soon" in Phase 1c; logic to be built in Phase 2 once report calculation rules (how splits affect member net) are validated with real data.
- **Project Resolve tab** — resolve project transactions to personal book (create personal expense/income or debt entry). UI shows "Coming soon" in Phase 1c; full settlement flow (resolve-to-personal, mark, debt matrix) deferred to Phase 2 to redesign after Phase 1c UX feedback.
- **Dashboard & reports** — landing screen with monthly income vs expense, spending breakdown by category (pie/donut), trends over time, budget utilization, savings rate, top categories/accounts, owed-to-me/I-owe summary card; drill-down everywhere
- **Multi-currency** — per-transaction currency, per-account currency honored end-to-end, exchange-rate provider, daily-cached rates with last-known fallback, historical rate per transaction date
- **Auth hardening** — short access token (15 min) + refresh token (7 days), `dio` interceptor handles refresh on 401, logout revokes refresh token; existing long-lived tokens invalidated on deploy
- **Notifications — push delivery + new triggers** — in-app inbox already exists from Phase 1b; Phase 2 adds:
  - Push delivery (FCM Android, Web Push for Flutter web)
  - Email delivery (provider TBD)
  - Per-event channel preferences (`notification_preferences` table activates)
  - New trigger types: `scheduled_due_soon`, `scheduled_generated`, `budget_exceeded`, `budget_nearing_limit`, `saving_goal_reached`, `personal_debt_cancelled`
  - Notification grouping ("5 splits created in Japan trip")
  - Per-trigger mute settings
- **Onboarding** — first-run intro (skippable), prompt to create first account, sample transaction walkthrough, optional CSV import
- **Contact UX polish** — fuzzy autocomplete (edit-distance), proactive consolidation suggestions, bulk absorb UI
- **Receipt photos** — upload, multi-photo per transaction, S3-compatible storage, thumbnail caching; OCR is NOT in Phase 2
- **Export** — CSV (per-list / per-project / per-budget); Excel later; PDF in Phase 3
- **Empty / error / loading polish** — skeletons, illustrated empty states, retry affordances
- **Theming** — real dark mode toggle (Phase 0 stubbed it); accessibility (semantic labels, color contrast, text scaling, screen reader)
- **Performance** — list virtualization, image lazy-load, query optimization, response caching (short TTL), Flutter build optimization

### Exit criteria

- Dashboard shows the cards above with live data
- A user can create a transaction in USD while their default is THB; dashboard shows correct converted total
- Push notification fires within 60 seconds of a `split_created` event
- All Phase 1b in-app trigger types deliverable via push when user has push enabled
- All new Phase 2 trigger types fire correctly
- Per-event channel preferences (push / email / in-app) work end-to-end
- First-time user completes onboarding in under 3 minutes
- Every transaction can have ≥1 photo attached, viewable on detail
- CSV export produces valid file (Excel + Google Sheets compatible)
- No list janks on 1000+ rows
- Dark mode works on every screen
- App passes "would I recommend to a friend" subjective test

### Phase 2 does NOT include

- Deployment, infra, monitoring (→ Phase 3)
- Admin web app (→ Phase 3)
- Power-user web app (→ Phase 3)
- Monetization (→ Phase 3)
- Legal docs (→ Phase 3)
- iOS (not planned)
- OCR receipt parsing
- Bank feed integration
- Crypto / investment tracking

### Risks

- **Notifications are sticky.** Bad notifications get noticed more than good features. Conservative defaults, easy mute, per-event preferences are non-negotiable.
- **Multi-currency has hidden complexity.** Historical rates, FX fees, rounding decisions can produce "wrong" totals that are actually right. Worth writing the math out before coding.
- **Export fidelity.** CSV easy, Excel medium, PDF hardest. Phase 2 = CSV + Excel; PDF in Phase 3.
- **Photos add ops burden.** Storage cost, CDN, orphan cleanup. May justify deferring to Phase 3 if free-tier storage isn't enough.

### Dependencies

- Phase 1 complete
- Exchange-rate provider selected
- Email provider selected
- Push notification setup (FCM project, certs)
- Object storage provisioned for photos

---

## Phase 3 — Production, admin & monetization

**Goal:** ready to sell, ready to deploy. App leaves developer's laptop, lives on real infrastructure, handles paying users, is maintainable by someone who isn't on call 24/7.

### Scope

- **Deployment infra** — VPS (provider TBD: DO, Hetzner, Linode; SEA region), Ubuntu LTS, Caddy (auto-HTTPS via Let's Encrypt), Docker + Compose, managed PostgreSQL, S3-compatible object storage, Cloudflare CDN
- **CI/CD** — GitHub Actions for backend / Flutter / Next.js / Nuxt 3; staging environment; manual production deploys with rollback plan
- **Domain, DNS, SSL** — `chubipocket.com`, `api.`, `admin.`, `app.` subdomains; DNS via Cloudflare
- **Database operations** — nightly full + hourly WAL backups, weekly automated restore-to-scratch verification, documented RTO/RPO
- **Monitoring** — Sentry (errors), Prometheus + Grafana or hosted alternative (metrics), structured logs centralized (Loki or hosted), uptime checks, on-call alerts
- **Security hardening** — rate limiting, account lockout, audit log, secrets management, dependency scanning, security headers, one penetration test before launch
- **Admin web (Next.js)** — restricted to `role=admin`; user list/search, impersonate-for-debug, platform metrics, feature flags, manual data corrections (audit-logged). Spec lives in [`design/frontend/admin/`](../design/frontend/admin/) (Phase 3 work)
- **Power-user web (Nuxt 3)** — paid-tier feature for users who want bulk management. Excel-like transaction grid with inline edit, bulk operations (delete, recategorize, tag), advanced filters, saved views, rich reports + export (CSV / Excel / PDF), batch import. Spec lives in [`design/frontend/web/`](../design/frontend/web/) (Phase 3 work)
- **Monetization** — likely freemium with subscription upgrade. Stripe (global) + optional Thai gateway (Omise / 2C2P) for local. Pricing TBD in Phase 3 planning.
- **Legal & compliance** — TOS, Privacy Policy, PDPA (Thailand) compliance, GDPR if targeting EU, cookie consent, DPAs with subprocessors
- **App store submission** — Google Play (developer account, screenshots, privacy URL, content rating, internal → closed beta → production)
- **Launch readiness** — load testing (1000 concurrent), incident runbook, support channel, public changelog, marketing landing page

### Exit criteria

- Production VPS live with Caddy + backend + managed Postgres
- Domain resolves with valid SSL
- CI builds and deploys on merge to `main`
- Backups run nightly; test restore passes
- Sentry captures errors from all 3 surfaces (mobile, admin, power-user web)
- A paying user can sign up, subscribe, and use premium features
- Admin can search a user and view their data with audit-log entry
- Power-user web lets a user bulk-edit 100+ transactions in <30 seconds
- TOS, Privacy Policy, PDPA compliance, GDPR export/delete are live
- Android app approved and live on Google Play
- Load test passes at target concurrency
- You can take a weekend off without the app falling over

### Phase 3 does NOT include

- iOS (post-Phase 3; needs Mac + dev account + App Store review)
- Multi-region hosting (post-Phase 3 if demand appears)
- Bank feed integration (post-Phase 3; Plaid + KBank/SCB APIs)
- Investment / insurance / crypto tracking (never planned)

### Risks

- **Solo ops is risky.** Mitigations: managed DB, aggressive alerting, second person with prod access.
- **Monetization is product, not just engineering.** Paywall line affects what Phase 2 features look like; revisit during Phase 2 planning so paid features are built with billing in mind.
- **Admin vs power-user web — one app or two?** Current lean: one app (Next.js for admin, Nuxt 3 for power-user — separate stacks because different audiences). Revisit if maintenance becomes a burden.
- **Legal compliance is non-trivial.** PDPA + GDPR fines are real. Budget time and possibly money for review.
- **Support burden scales with users.** Runbook + support inbox aren't optional.

### Dependencies

- Phase 2 complete
- VPS provider decided
- Billing provider decided
- Monetization model decided
- Legal counsel (or thorough self-review)
- Sentry / monitoring accounts set up
- Google Play developer account created

---

## Post-Phase 3 (rough)

- iOS app (Mac + dev account + App Store review)
- Bank feed integration (Plaid for global, SCB / KBank for Thailand)
- Collaborative accounts (shared wallets with real-time sync)
- AI-assisted categorization and insights
- Multi-region deployment (EU, US) as user base dictates

---

## Status

- **Phase** — Phase 1c in progress (project module complete through migrations 000032; budgets/saving-goals/scheduled-transactions next)
- **Last updated** — 2026-05-05
- **Version** — 0.6 (added Phase 2 deferrals: project Report tab + project Resolve tab deferred from Phase 1c)
- **Version 0.4** — unified shared-expenses model in 1b; in-app notifications moved from Phase 2 to Phase 1b
- **Version 0.3** — initial per-phase docs with two-sided settlement handshake
