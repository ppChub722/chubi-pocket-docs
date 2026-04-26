# 01 — Spec

Backend behavior — what the system does and why, organized per feature module. Each numbered file documents one feature end-to-end: schema reference, API endpoints, flows, and design decisions.

**Audience:** backend engineers (primary), AI tools consuming context for codegen, frontend devs cross-checking flows.

**Not in this folder:**
- API request/response contracts → [`../api/api-document.md`](../api/api-document.md)
- Column-level schema (types, constraints, indexes) → [`../database/schema.md`](../database/schema.md)
- Frontend / Flutter design → [`../frontend/app/`](../frontend/app/)
- Product context (what we're building, for whom) → [`../../product/overview.md`](../../product/overview.md)

---

## Cross-cutting documents

These describe rules that span multiple modules:

| File | Purpose |
|---|---|
| [data-model.md](data-model.md) | Cross-table inventory + ERD + key relationship notes |
| [business-rules.md](business-rules.md) | Global invariants enforced across multiple modules |
| [design-decisions.md](design-decisions.md) | Schema-wide architecture choices (UUID v7, JWT, archive-on-delete, FK naming rule, audit columns) |
| [soft-delete-policy.md](soft-delete-policy.md) | Per-table delete behavior (hard-delete vs archive vs anonymize) |

---

## Per-module specs

Each `NN-*.md` file owns one feature module. File numbering matches `../database/schema.md` section numbering.

| File | Module | Tables it owns |
|---|---|---|
| [01-auth.md](01-auth.md) | Authentication | `users`, `refresh_tokens`, `email_verification_tokens`, `password_reset_tokens`, `oauth_identities` |
| [02-users.md](02-users.md) | User profile + preferences | `user_preferences`, `notification_preferences` (additions to `users`) |
| [03-accounts.md](03-accounts.md) | Financial accounts | `accounts` |
| [04-transactions.md](04-transactions.md) | Personal transactions | `transactions` |
| [05-categories-tags.md](05-categories-tags.md) | Categories + tags | `categories`, `tags`, `transaction_tags` |
| [06-shared-expenses.md](06-shared-expenses.md) | Split bills | `shared_expense_splits` |
| [07-contacts.md](07-contacts.md) | Contact book + linking | `contacts`, `contact_invites` |
| [08-budgets.md](08-budgets.md) | Budgets | `budgets` |
| [09-saving-goals.md](09-saving-goals.md) | Saving goals | `saving_goals` |
| [10-projects.md](10-projects.md) | Projects + project ledger | `projects`, `project_members`, `project_invites`, `project_transactions` |
| [11-scheduled-transactions.md](11-scheduled-transactions.md) | Recurring + installments | `scheduled_transactions` |
| [12-personal-debts.md](12-personal-debts.md) | Personal debt tracking | `personal_debts` |
| [13-notifications.md](13-notifications.md) | Notifications + settings | `notifications`, `user_notification_settings` |

---

## Per-module file structure

Each `NN-*.md` follows this shape:

1. **Phase summary** — what's available in Phase 0/1, 2, 3
2. **Schema** — short table inventory; full definitions in [`../database/schema.md`](../database/schema.md)
3. **API** — endpoints with flow / behavior context (formal contracts in [`../api/api-document.md`](../api/api-document.md))
4. **Core concepts / flows** — how the module behaves end-to-end
5. **Design decisions** — module-specific rationale (cross-cutting decisions live in [design-decisions.md](design-decisions.md))
6. **Open questions** — TBD items
7. **Status** — phase, last updated, version

---

## Where to start

- **New to the system** → read modules in numeric order (`01-auth.md` first, then `02-users.md`, ...).
- **Implementing one feature** → jump straight to that module.
- **Need cross-cutting context** → start with [data-model.md](data-model.md) for the ERD, [business-rules.md](business-rules.md) for invariants, [design-decisions.md](design-decisions.md) for the "why".
- **Calling the API from frontend** → go to [`../api/api-document.md`](../api/api-document.md). The spec files explain *why* an endpoint behaves a certain way; the API doc is the contract.
- **Adding a new table** → check [design-decisions.md](design-decisions.md) for FK naming + audit-column rules first, then update [`../database/schema.md`](../database/schema.md) and the relevant module spec.

---

## Status

- **Phase** — Planning (pre–Phase 1)
- **Last updated** — 2026-04-26
- **Version** — 0.2 (restructured as pure entry point: API conventions moved to `../api/api-document.md`; cross-cutting content extracted to dedicated files in this folder)
