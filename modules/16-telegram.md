# 16 — Telegram bot, connections, profile pictures

Telegram is a way to send Chubi free text (0.4.2). The app never forces or opens Telegram (owner 2026-10-28). Plan and later steps (1b-2 log in with Telegram, 1c LLM drafts): [`../now/briefs/0.4.2-plan.md`](../now/briefs/0.4.2-plan.md). UI mock (final): https://claude.ai/artifact/DBDqM2xj9HgPkjyBo6A3ry.

References: `telegram_messages`, `user_connections`, `connection_link_codes`, `user_avatars`, `users.avatar_settings`, `avatar_src()` ([schema §16](../ref/schema.md#16--telegram)); `POST /v1/telegram/webhook` + tag Connections in `openapi.yaml` ([api-document §02 note](../ref/api-document.md#02--users)); env keys ([ops-runbook §3 "Telegram bot"](../ops/ops-runbook.md)). Code: `chubi-pocket-be/internal/modules/telegram/` (bot), `internal/modules/connections/` (links, pictures, logos), `internal/shared/avatar.go` (the avatar builder).

Status: **1a "hello" live (v0.4.2-0). 1b linking + avatars and 1b-2 sign up / log in with Telegram built 2026-10-28** (ship together with an APK + forced update).

---

## 1. Bot shape
- **Webhook only** (owner 2026-10-28). No polling. The Bot API is called over plain `net/http` (no library): `getMe`, `setWebhook`, `getWebhookInfo`, `sendMessage`, `getUserProfilePhotos`, `getFile` (+ the file download).
- **Off** while `TELEGRAM_BOT_TOKEN` is empty: no route, no calls; `/connections` shows Telegram `available: false`.
- **On start** (in the background, the API never waits on it): `getMe` → log `telegram: on` with `@bot` (the username is cached for t.me links); `setWebhook(TELEGRAM_WEBHOOK_URL, secret, allowed_updates=["message"])`; `getWebhookInfo` → log the URL and pending count. A bad token logs `telegram: getMe failed` and the API runs on. A secret that breaks Telegram's rule (1–256 chars of `A-Za-z0-9_-`) turns the bot off with an error log.
- **Route** `POST /api/v1/telegram/webhook`: public, outside JWT, the app build check and the sync middleware. The `X-Telegram-Bot-Api-Secret-Token` header is compared in constant time; missing / wrong → 401. Anything else → 200 with an empty body, also when the body isn't an update (Telegram retries non-200; a JSON body would be run as a Bot API method). The reply is sent before the 200 (8 s limit).

## 2. Linking (1b)
- **Linked = allowed.** `TELEGRAM_ALLOWED_CHAT_IDS` is retired; a chat is answered only when it is linked to a user (`user_connections`, provider telegram, `external_id` = the chat id).
- **Since 0.4.2-4 linking is Telegram OIDC** (the `/start <code>` links were removed 2026-11-02): the app runs Log In With Telegram and sends the `id_token` to `POST /connections/telegram`. The chat leaves any other user it was linked to, and the user's old Telegram is replaced (that is also "เปลี่ยนบัญชี"). The account shows as "@username", else the name. Permissions start as `{chat: true}`; the bot sends the welcome.
- Unlink: `DELETE /connections/telegram` from the app, or `/unlink` in the chat. The imported picture is kept.
- Permissions (`PATCH /connections/{provider}/permissions`): Telegram `chat` is live; `ask`, `slip`, `notify` are "เร็วๆ นี้" (`available: false`, 409 `PERMISSION_UNAVAILABLE`). LINE and Google rows exist but are `available: false`.

## 3. Replies
Only private chats; each reply is a Telegram reply to the user's message.

| Incoming | Reply | Kept in `telegram_messages` |
|---|---|---|
| unlinked chat (anything else, `/start` and `/unlink` too) | "เชื่อมบัญชีก่อนนะครับ: แอป → โปรไฟล์ → Telegram" | no |
| linked, `/unlink` | "ยกเลิกการเชื่อมแล้ว" (BE wording, not in the plan) | no |
| linked, `/start` (anything after it is ignored) | the welcome text (`TextWelcome`) | no |
| linked, `chat` permission off | "ปิดการจดรายการไว้ เปิดได้ในแอป" | no |
| linked, not text (photo, voice, sticker, document …) | "ตอนนี้รับแค่ข้อความตัวอักษรนะครับ" | no |
| linked, text | "ได้รับข้อความแล้ว ✓" | yes, with `user_id` |
| group / supergroup / channel / edited message / other update types | none | no |

- `/start@bot` and `/unlink@bot` work the same. A tap on an old login button (sent before 0.4.2-4) is answered silently, nothing else.
- **Dedupe** by `update_id`: the last 1000 ids in memory, plus the table's unique key for kept texts (a resend after a restart gets no second reply).
- A failed save still replies (the eval set misses one line, the error is logged). A failed reply is logged. A failed DB lookup sends no reply (outcome `error`).

## 4. Profile pictures + the avatar object (1b)
- **Sources:** the user picks one (`users.avatar_settings.source`): `icon` (default, the icon maker's `icon_code`) · `upload` (data model + `DELETE` ready; no upload endpoint yet, UI "เร็วๆ นี้") · one per linked app (`telegram` now).
- **Import is manual:** `POST /connections/telegram/photo` → getUserProfilePhotos → the smallest size ≥ 160 px (else the widest) → getFile → stored as JPEG in `user_avatars` (version +1 each time). Importing does not pick it. No photo, or the user's privacy hides it → 404 `NO_PHOTO`. The Bot API URL (it holds the token) never leaves the server; a Telegram error answers 502 `PROVIDER_ERROR` without its text.
- **Resolution (one builder, `shared.NewAvatar`, fed by SQL `avatar_src(user_id, own_icon)`):** the picked source when it can be shown (a stored picture of that source; for an app source the app is still linked) → the icon → initials. A typed name and an unlinked contact without an icon get initials. Every person payload carries `avatar {kind, photo_url, icon_code, initials, colors, border}` and no top-level `icon_code` (a spec ratchet guards the person schemas).
- **Colours (BE owns them):** icon → background colours, then icon colours, then border colours, duplicates removed; photo → `avatar_settings.colors` then the border colours (none → the icon's); nothing → the name-hash colour. The hash and the 12-colour palette are a port of the app's `AppAvatar.colorFor`; initials follow `AppAvatar._initialsOf` (reference values from the app's own code are in `shared/avatar_test.go`). `colors` is never empty.
- `photo_url` = `/api/v1/avatars/{id}?v={version}` (Bearer, any signed-in user, cached for a year by URL). Deleting (`DELETE /avatars/{source}`) the picked picture puts the pick back to the icon.
- A link, unlink or new picture touches `users.updated_at`, so the sync fingerprints of everyone holding that user as a linked contact refresh.
- **Brand logos:** `GET /brand-logos/{provider}.png?v=1`, public, 96 px PNGs embedded in the binary (rendered once from the Simple Icons paths of the mock: Telegram #26A5E4 on a white disc, LINE white on #06C755, Google #4285F4 on white).

## 5. Sign up / log in with Telegram (1b-2)
- **Passwordless accounts:** only an account created through an outside app (`users.created_via` telegram) may have no password (DB check). Password login refuses it with the same `401 INVALID_CREDENTIALS` as a wrong password. `Profile.has_password` false → the app shows "ตั้งรหัสผ่าน": `PUT /auth/password` with `new_password` only. Once a password exists the current one is required again.
- **Login is one answer:** `POST /auth/login` answers every failure (unknown user, wrong password, no password, a bad / empty body) with `401 INVALID_CREDENTIALS` (owner 2026-10-28; app text "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง").
- **Guard:** an account with no password can't lose its last linked app: `DELETE /connections/{provider}` → 409 `LAST_LOGIN_METHOD`; `/unlink` in the chat answers "ตั้งรหัสผ่านในแอปก่อน ไม่งั้นจะเข้าบัญชีไม่ได้"; an OIDC link that would move the chat to another account → 409 `LAST_LOGIN_METHOD`. Changing the account's own Telegram (a new link) is allowed.
- **Flow (0.4.2-4, OIDC):** the app gets an `id_token` from Telegram and calls `POST /auth/telegram/token {id_token}`: a linked Telegram → 200 `login`; an unknown one → the account is made at once (no form) → 201 `signup`. Details: `now/briefs/telegram-oidc-login.md`, the API spec. The 1b-2 `/start login_<code>` flow (`/auth/telegram/start`, `/exchange`, `/signup`) was removed on 2026-11-02 once the gate passed build 223.
- **Username:** the Telegram @username (lower case, a-z 0-9 _), else the name in those characters, else "user"; taken → the same + 2–5 random digits.
- **Limit:** `/auth/telegram/token`, per IP in memory: 20 per 10 minutes → 429 `RATE_LIMITED`.
- The request log never holds the bodies of `/auth/telegram/token` and `POST /connections/telegram` (id_tokens).

## 6. Privacy
- The token is never logged and never in an error: Bot API errors drop the request URL (it holds the token) and mask the token.
- One log line per update: `update_id`, `chat_id`, `chat_type`, `linked`, `kind`, `text_len`, `outcome`. Never the text or a token. The HTTP request log skips the webhook's body even with `LOG_BODIES=true`.
- Kept texts are the real sentences for the LLM eval set (owner OK 2026-10-28), now with the linked `user_id`.
