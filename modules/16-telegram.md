# 16 — Telegram bot

Telegram is a way to send Chubi free text (0.4.2). The app never forces or opens Telegram (owner 2026-10-28). The plan and later steps (1b LLM drafts, 1c linking) are in [`../now/briefs/0.4.2-plan.md`](../now/briefs/0.4.2-plan.md).

References: `telegram_messages` ([schema §16](../ref/schema.md#16--telegram)), `POST /v1/telegram/webhook` ([api-document, Conventions → public endpoints](../ref/api-document.md#authentication), `telegramWebhook` in `openapi.yaml`), env keys ([ops-runbook §3 "Telegram bot"](../ops/ops-runbook.md)). Code: `chubi-pocket-be/internal/modules/telegram/`.

Status: **1a "hello", built 2026-10-28** (BE only, no app change).

---

## 1. Shape (1a)
- **Webhook only** (owner 2026-10-28). No polling. The Bot API is called over plain `net/http` (no library): `getMe`, `setWebhook`, `getWebhookInfo`, `sendMessage`.
- **Off** while `TELEGRAM_BOT_TOKEN` is empty: no route, no calls. Local runs and tests need nothing.
- **On start** (in the background, the API never waits on it): `getMe` → log `telegram: on` with `@bot` and the allowed-chat count; `setWebhook(TELEGRAM_WEBHOOK_URL, secret, allowed_updates=["message"])`; `getWebhookInfo` → log the URL and pending count. A bad token logs `telegram: getMe failed` and the API runs on. A secret that breaks Telegram's rule (1–256 chars of `A-Za-z0-9_-`) turns the bot off with an error log.
- **Route** `POST /api/v1/telegram/webhook`: public, outside JWT, the app build check and the sync middleware. The `X-Telegram-Bot-Api-Secret-Token` header is compared in constant time; missing / wrong → 401. Anything else → 200 with an empty body, also when the body isn't an update (Telegram retries non-200; a JSON body would be run as a Bot API method). The reply is sent before the 200 (8 s limit).

## 2. Replies
Only private chats; each reply is a Telegram reply to the user's message.

| Incoming | Reply | Kept in `telegram_messages` |
|---|---|---|
| allowed chat, text | "ได้รับข้อความแล้ว ✓" | yes |
| allowed chat, not text (photo, voice, sticker, document …) | "ตอนนี้รับแค่ข้อความตัวอักษรนะครับ" | no |
| allowed chat, `/start` (also `/start <payload>`, `/start@bot`) | "สวัสดีครับ ส่งข้อความมาได้เลย" | no |
| chat not in `TELEGRAM_ALLOWED_CHAT_IDS` (any message) | "ยังไม่เปิดให้ใช้ (chat id: N)", so the owner can add N | no |
| group / supergroup / channel / edited message / other update types | none | no |

- **Dedupe** by `update_id`: the last 1000 ids in memory, plus the table's unique key for kept texts (a resend after a restart gets no second reply).
- A failed save still replies (the eval set misses one line, the error is logged). A failed reply is logged.

## 3. Privacy
- The token is never logged and never in an error: Bot API errors drop the request URL (it holds the token) and mask the token.
- One log line per update: `update_id`, `chat_id`, `chat_type`, `allowed`, `kind`, `text_len`, `outcome`. Never the text. The HTTP request log skips this route's body even with `LOG_BODIES=true`.
- Kept texts are the real sentences for the 1b eval set (owner OK 2026-10-28). Pre-release data, wipe-able.
