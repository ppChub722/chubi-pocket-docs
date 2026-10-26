# Modules — how each feature works

One file per feature module: schema reference, API behaviour, flows and design decisions. Start with [`product.md`](product.md) for what the app is and the user flows, then open the module you need.

**For one module, look in this order:**
1. Its spec below (`NN-*.md`). A `§0` / "0.x" block at the top replaces older text further down.
2. The owner's rules for it in [`../rules/decisions.md`](../rules/decisions.md) (search the rule names in the table). **The newest owner rule wins** over the spec.
3. The exact contract: `chubi-pocket-be/internal/apidoc/openapi.yaml` + [`../ref/api-v2-notes.md`](../ref/api-v2-notes.md), the tables in [`../ref/schema.md`](../ref/schema.md), the screens in [`../ref/app-map.md`](../ref/app-map.md).
4. What the team did last: the inbox in the last column.

| File | Module | Owner rules (`rules/decisions.md`) | Team inbox |
|---|---|---|---|
| [01-auth.md](01-auth.md) | Authentication | — | `be` |
| [02-users.md](02-users.md) | User profile + preferences | Profile settings page, Currency | `be` |
| [03-accounts.md](03-accounts.md) | Wallets (accounts) | Wallet, Wallet "no balance" mode, Delete vs archive | `be` |
| [04-transactions.md](04-transactions.md) | Transactions | Quick create, "ผูกกับ" section, Paid by someone else, Pending drafts, Splits | `fe-core`, `be` |
| [05-categories-tags.md](05-categories-tags.md) | Categories + tags | Delete vs archive, Chips | `be` |
| [06-shared-expenses.md](06-shared-expenses.md) | Split bills | Splits, Paid by someone else | `be` |
| [07-contacts.md](07-contacts.md) | Contacts | Contacts vs debts, Contact page, Contact detail page, Contact picker, Person look, Person display name, Avatars | `be` |
| [08-budgets.md](08-budgets.md) | Budgets | Budgets, Budgets v2 | `be` |
| [09-saving-goals.md](09-saving-goals.md) | Saving goals | Saving goals, Saving goals v2 | `be` |
| [10-projects.md](10-projects.md) | Events (was projects) | Events, Event tags, Deleting an event with bills, My book vs the event book | `fe-events`, `be` |
| [11-scheduled-transactions.md](11-scheduled-transactions.md) | Recurring (replaced scheduled) | Recurring + upcoming, Recurring occurrences, Recurring list page, One-off upcoming is CUT | `fe-recurrent`, `be` |
| [12-personal-debts.md](12-personal-debts.md) | Debts | Debt model, Debt direction words, Debt quick create, Debts people list, Wording, Ledger, not sync | `fe-debts`, `be` |
| [13-notifications.md](13-notifications.md) | Notifications | — | `be` |
| [14-shared-wallets.md](14-shared-wallets.md) | Shared wallets | Wallet | `be` |
| [15-slip-import.md](15-slip-import.md) | Slip import → pending drafts | Pending drafts | `be` |

Inboxes are in [`../team/inbox/`](../team/inbox/README.md). UI-wide rules (hub first, list pages, hero card, chips, edit mode…) are in the UI part of `rules/decisions.md`, and the kit itself in [`../build/app-hub.md`](../build/app-hub.md).

## Cross-cutting

| File | Purpose |
|---|---|
| [data-model.md](data-model.md) | Cross-table inventory + ERD + key relationship notes |
| [business-rules.md](business-rules.md) | Global invariants enforced across multiple modules |
| [design-decisions.md](design-decisions.md) | Schema-wide architecture choices (UUID v7, JWT, archive-on-delete, FK naming rule, audit columns) |
| [soft-delete-policy.md](soft-delete-policy.md) | Per-table delete behavior (hard delete vs archive vs anonymize) |

## Per-module file structure

Each `NN-*.md` follows this shape: phase / version summary → schema (full definitions in [`../ref/schema.md`](../ref/schema.md)) → API with behaviour context → core concepts / flows → design decisions → open questions → status. File numbers match the section numbers in `ref/schema.md`.

- **New to the system** → read modules in numeric order.
- **Adding a new table** → [design-decisions.md](design-decisions.md) for FK naming + audit columns, then update [`../ref/schema.md`](../ref/schema.md) and the module spec.
