# 13 — Notifications

In-app notification inbox + delivery infrastructure. Under the unified shared-expenses model, the system has no two-sided settlement handshake — each user's actions only mutate their own book. Notifications are how the *other* side learns "you should check and update your book."

This module owns the `notifications` table, the trigger registry, the delivery dispatcher (in-app inbox; push deferred to Phase 2+), and the per-user notification preferences.

References: `users` (recipient), and via payload — `transactions`, `project_transactions`, `shared_expense_splits`, `personal_debts`, `projects`, `project_invites`.

Global conventions (base URL, error envelope, data types, HTTP verbs) are in [`overview.md`](overview.md).

---

## Phase summary

| Concern | Phase 1b | Phase 2 | Phase 3 |
|---|---|---|---|
| `notifications` table + in-app inbox | ✅ | ✅ | ✅ |
| Triggers: `split_created`, `split_paid`, `split_received`, `project_tx_recorded_for_you`, `project_invite`, `project_tx_changed`, `personal_debt_cancelled` | ✅ | ✅ | ✅ |
| Per-user preferences (`auto_notify`, `auto_resolve`, `default_account_id`, etc.) | ✅ | ✅ | ✅ |
| Mark-read / mark-actioned / dismiss | ✅ | ✅ | ✅ |
| Push delivery (FCM / APNs) | — | ✅ | ✅ |
| Email digest | — | — | ✅ |
| Per-trigger mute settings (granular) | — | ✅ | ✅ |
| Notification grouping / threading | — | ✅ | ✅ |

---

## 1. Schema

Tables owned by this module: `notifications`, `user_notification_settings`.

Full column definitions, constraints, and indexes: see [`../database/schema.md#13--notifications`](../database/schema.md#13--notifications).

`notifications` carries a JSONB `payload` whose shape varies by `type` — see §2 trigger registry for per-type shapes.

`user_notification_settings` is one row per user, auto-created on registration with defaults. May be physically merged into a broader `user_settings` table in [02-users.md](02-users.md) at implementation time. Phase 2+ may add per-trigger mute toggles.

---

## 2. Trigger registry

The full set of notification types in Phase 1b. Each entry: when it fires, recipient(s), payload shape, deep-link target.

### 2.1 `split_created`

**Fires when:** a `shared_expense_splits` row is inserted with a debtor identifier that resolves to a linked user — either:
- `contact_id` whose `contact.app_user_id` is set, OR
- `project_member_id` whose `project_member.user_id` is set

**Recipient:** the resolved debtor user.

**Payload:**

```json
{
  "split_id": "0190e5-split1",
  "parent_kind": "transaction" | "project_transaction",
  "parent_id": "...",
  "project_id": "0190e5-japan",      // null if no project
  "splitter_display_name": "Alice",  // creditor's display name
  "amount": 1000.00,
  "currency": "THB",
  "note": "Hotel split"
}
```

**Deep-link:** project view (if `project_id` set) → split detail; otherwise personal split detail.

**Suppressed when:** the splitter's `auto_notify_linked_split_contacts = false` and no manual "send notification" choice was made.

### 2.2 `split_paid`

**Fires when:** a personal `transactions` row of type `expense` is inserted with `source_split_id` set, AND the split's creditor resolves to a linked user.

**Recipient:** the creditor user.

**Payload:**

```json
{
  "split_id": "...",
  "payer_user_id": "...",
  "payer_display_name": "Bob",
  "amount": 1000.00,
  "currency": "THB",
  "payer_transaction_id": "0190e5-tx2",
  "project_id": "..." // null if no project
}
```

**Deep-link:** project view → split detail (project context) or personal split detail.

### 2.3 `split_received`

**Fires when:** a personal `transactions` row of type `income` is inserted with `source_split_id` set (creditor recorded receipt), AND the split's debtor resolves to a linked user.

**Recipient:** the debtor user.

**Payload:** mirror of `split_paid` (with `receiver_*` fields instead of `payer_*`).

**Deep-link:** split detail.

Closure signal — tells the debtor "the creditor confirmed they got it." Mostly informational; suppressible per-user in Phase 2+.

### 2.4 `project_tx_recorded_for_you`

**Fires when:** a `project_transactions` row is inserted where `transaction_member_id` resolves to a linked user OTHER than `record_user_id` (i.e., someone recorded on your behalf).

**Recipient:** the actor user.

**Payload:**

```json
{
  "project_transaction_id": "0190e5-pt1",
  "project_id": "0190e5-japan",
  "recorder_user_id": "...",
  "recorder_display_name": "Alice",
  "amount": 3000.00,
  "currency": "THB",
  "type": "expense",
  "note": "Dinner"
}
```

**Deep-link:** project view → project_transaction detail. From there, the actor can claim, edit, or ignore.

### 2.5 `project_tx_changed`

**Fires when:** a `project_transactions` row is updated or deleted, AND any user (other than the editor) has either:
- A personal `transactions` row with `source_project_transaction_id` pointing at it (claimed it), OR
- A personal `transactions` row referencing one of its splits via `source_split_id`, OR
- A `personal_debts` row referencing one of its splits

**Recipients:** all such users.

**Payload:**

```json
{
  "project_transaction_id": "...",
  "project_id": "...",
  "editor_user_id": "...",
  "editor_display_name": "Alice",
  "change_kind": "edited" | "deleted",
  "diff": { "amount": [3000, 2800] }   // basic diff for edits; null for deletes
}
```

**Deep-link:** project view → project_transaction detail (or project view if deleted).

### 2.6 `project_invite`

**Fires when:** a `project_invites` row is created (someone is invited to a project as a linked member).

**Recipient:** the invitee — when the invite has been resolved to a known user (e.g., the invite accepted by user_id is pre-targeted at a known phone/email). For raw invite codes shared out-of-band, no notification fires until accept.

**Payload:**

```json
{
  "invite_id": "...",
  "invite_code": "K3F8R4M7",
  "project_id": "...",
  "project_name": "Japan Trip 2026",
  "inviter_user_id": "...",
  "inviter_display_name": "Alice"
}
```

**Deep-link:** invite accept screen.

### 2.7 `personal_debt_cancelled`

**Fires when:** a `personal_debts` row is updated to `status = 'cancelled'`, AND the debt's `source_split_id` is set, AND the split's creditor resolves to a linked user.

**Recipient:** the creditor user.

**Payload:**

```json
{
  "personal_debt_id": "...",
  "split_id": "...",
  "debtor_user_id": "...",
  "debtor_display_name": "Bob",
  "amount": 1000.00,
  "currency": "THB",
  "note": "(optional cancel reason)"
}
```

**Deep-link:** split detail. Lets the creditor know "Bob cancelled his tracking of this debt."

Phase 2+. (Phase 1b: the cancel happens silently on the debtor's side; the creditor finds out at next sync.)

---

## 3. API

All endpoints require authentication. Paths rooted at `/api`.

### 3.1 `GET /v1/notifications`

List the caller's notifications.

**Query parameters:**

| Name | Description |
|---|---|
| `read` | `true` / `false` / `all` (default `all`) |
| `actioned` | `true` / `false` / `all` (default `all`) |
| `type` | Filter by trigger type |
| `from`, `to` | Date range (`created_at`) |
| `page`, `per_page` | Standard pagination |

**Response:**

```json
{
  "data": [
    {
      "id": "0190e5-n1",
      "type": "split_created",
      "actor_user_id": "...",
      "actor_display_name": "Alice",
      "payload": { ... },
      "deep_link": "/projects/0190e5-japan/transactions/0190e5-pt1",
      "read_at": null,
      "actioned_at": null,
      "dismissed_at": null,
      "created_at": "..."
    }
  ],
  "unread_count": 3,
  "pagination": { "page": 1, "per_page": 20, "total": 12, "total_pages": 1 }
}
```

### 3.2 `POST /v1/notifications/:id/read`

Mark a single notification as read. Idempotent.

### 3.3 `POST /v1/notifications/read-all`

Mark all of caller's unread notifications as read. Bulk.

### 3.4 `POST /v1/notifications/:id/actioned`

Mark as `actioned` (the user followed through on the suggested action). Sets `actioned_at`. Also implies `read`.

### 3.5 `POST /v1/notifications/:id/dismiss`

Mark as `dismissed` (user saw it but won't act). Sets `dismissed_at`. Also implies `read`.

### 3.6 `DELETE /v1/notifications/:id`

Hard-delete from the caller's inbox. Only the recipient can delete their own.

### 3.7 `GET /v1/notifications/settings`

Fetch the caller's `user_notification_settings` row.

### 3.8 `PUT /v1/notifications/settings`

Update settings. Body accepts any subset of the columns in §1.2.

```json
{
  "auto_notify_linked_split_contacts": true,
  "auto_resolve_own_in_projects": true,
  "default_account_id": "0190e5-kbank"
}
```

---

## 4. Design decisions

### 4.1 Notifications, not events

Notifications are stored as rows the recipient can see, mark, dismiss. They are NOT a generic event bus or audit log. Internal cross-module signaling (e.g., "split was paid → bump personal_debt") happens in the same database transaction via direct table updates, not via the notifications table.

This keeps notifications small (only user-visible signals) and avoids accidentally building a brittle event-driven architecture out of UI-facing state.

### 4.2 Per-recipient row, not per-event row

When a project_transaction's edit affects 5 users, 5 notification rows are inserted (one per recipient). Tradeoff: more rows, but each user's read/actioned/dismissed state is independent and queries are simple (`WHERE recipient_user_id = ?`).

A "single event row, joined to user state" model would require a junction table — unnecessary complexity for Phase 1b volume.

### 4.3 Payload as JSONB, not normalized

Each trigger has its own payload shape. JSONB stores them generically; the consumer deserializes per `type`. Avoids 7 separate notification subtables.

Trade-off: payload schema isn't enforced by the database. Mitigation: each trigger's payload shape is documented in §2 and validated at write time by the trigger code.

### 4.4 Deep-link as a string, not a structured route

Stored as a string the client interprets (`/projects/:id/...`). Allows the server to control routing without bumping a notification schema version every time the client adds new routes.

### 4.5 Notifications are NOT created by mirror/claim/own actions

When Alice mirrors a project_transaction onto her own book, no notification fires. Mirroring affects only Alice's book — there's no "other side" that needs to know.

Triggers fire only when one user's action affects another user's *project state awareness* (a split was created against them, a payment was recorded for them, a project_transaction they're the actor of was recorded).

This is the "user-visible signals only" boundary — keeps the inbox useful, not noise.

### 4.6 `actor_user_id` for "who caused this"

Every notification has an `actor_user_id` (nullable for pure system events). Lets the inbox display "Alice marked herself as paying you ฿1,000" with the actor's avatar/name. Also useful for per-actor mute settings in Phase 2+ ("never notify me about Alice's actions" — for archived relationships).

### 4.7 Settings auto-create on registration

`user_notification_settings` row is inserted at user signup with all defaults. Defaults aim for least-noise:
- Auto-notify on splits with linked contacts: ON (the splitter expects coordination)
- Auto-add to debt on receiving a split notification: OFF (forces the receiver to consciously decide)
- Auto-record received payment: OFF (forces the receiver to confirm)
- Auto-resolve own project_transactions: OFF (gives the user explicit control of their personal book)

Users tune these in settings as they get familiar with the workflows.

### 4.8 In-app delivery only in Phase 1b

Phase 1b: client polls `GET /v1/notifications` (or uses a websocket / SSE subscription if available — see [`overview.md`](overview.md)). Push notifications via FCM/APNs are Phase 2+ — they require provisioning, device tokens, platform infra, opt-in flows.

The data model is the same in both phases; Phase 2 just adds a separate dispatcher that delivers via FCM/APNs in addition to writing the inbox row.

---

## 5. Open questions

- **Push delivery infrastructure** — FCM token table, APNs cert handling, opt-in flow — Phase 2+ scope.
- **Notification grouping** — "5 splits created in Japan trip" instead of 5 separate notifications. Phase 2+ UX.
- **Per-trigger mute** — "don't notify me on `split_received`" — Phase 2+ granular settings.
- **Email digest** — Daily/weekly summary email — Phase 3+.
- **Notification expiry** — Auto-delete read notifications after X days? — Phase 2+ cleanup job.
- **Locale-aware notification text** — Server-side rendered display strings vs. client-side i18n. Phase 1b: client-side, payload is data only.
- **Cross-device read state sync** — `read_at` is server-side, so trivially synced across devices. Confirm.
- **`split_received` may be noisy** — if Alice does 10 receives across a trip, Bob gets 10 notifications. Phase 2+ grouping helps.

---

## 6. Status

- **Phase** — spec; Phase 1b implementation pending
- **Last updated** — 2026-04-26
- **Version** — 0.1 (initial draft)
  - In-app inbox + 7 trigger types covering Phase 1b shared-expenses + project flows
  - Per-user settings table with 4 auto-toggles + default account
  - Push delivery scoped to Phase 2+
