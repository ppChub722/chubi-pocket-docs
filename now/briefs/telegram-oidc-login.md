# Telegram login + linking → OpenID Connect (release 0.4.2-4, owner 2026-10-31)

_Lead, 2026-10-31 / 11-01. Replaces the 0.4.2-2 code flows (`/start login_<code>`, `/start link_<code>`, polling `/auth/telegram/exchange`). Sources: https://core.telegram.org/bots/telegram-login, https://github.com/TelegramMessenger/telegram-login-android. Lead builds it (owner: "คุณนั้นแหละทำ"). Step 0 (spike) DONE 2026-11-01; step 1 (BE) and step 2 (app) coded 2026-11-01, uncommitted, tests not run, BE not deployed._

## Owner decisions (2026-10-31)
- **No `/start` codes any more.** The user never has to find the bot to log in or link. Login, sign-up and linking all go through Telegram OIDC: one "allow" in Telegram, back into the app.
- **Linking later (signed-in user):** the same OIDC flow; when done, the Telegram account is linked to this user and the bot DMs a welcome message with a short starter guide.
- **Sign-up with Telegram:** the same OIDC flow, then a passwordless account (`created_via = 'telegram'`, migration 123).
- **Every flow asks bot access** (`telegram:bot_access`). A link made by any of these flows gets `permissions {"chat": true}` ("เปิดเลย").
- **Password later (keeps migration 123 rule):** a Telegram-made account may set a password later. Once it has one, it may log in with the password and may unlink Telegram.
- **"Open the bot" row:** the connected-Telegram page always has a row that opens the bot chat (`https://t.me/<bot>`, no payload); it never hides. It is the way in for a user who refused bot access, and a shortcut for everyone.
- **Redirect = App Link** (owner 2026-11-01: "ใช้ App link นั้นแหละ"), not the custom scheme.
- **Sign-up has no form** (owner 2026-11-01: "สมัครให้เลย ใช้ username เดียวกันกับ telegram"): an unknown Telegram id gets an account at once. Username = the Telegram username (lower case); no username → made from the name (`usernameBase`: "Pond Poompich" → `pond_poompich`, Thai-only → `user`); taken → + 2–5 digits (`freeUsername`). Display name = `name`, currency THB, avatar = the Telegram photo. The user edits these later in the app. A landing page for new members comes later ("เดี๋ยวมีหน้า landing สำหรับสมาชิกใหม่ในอนาคต").

## BotFather setup (done 2026-10-31)
- Bot `@chubiPocket_bot`, Login Widget → OpenID Connect. **client_id `9059620815`** (= bot id). A client secret exists; we do not use it (public client + PKCE).
- Redirect URIs: `chubipocket://telegram-login` (registered; spike only).
- Native app: package `com.chubipocket.chubi_pocket`, SHA-256 `8F:81:D7:53:A0:BD:3E:D3:94:66:93:19:84:39:CD:5B:0F:8E:1D:71:63:CF:33:D0:07:23:03:D3:4D:75:F2:B4` = the dev PC's **debug** keystore, which release builds use today. A new signing key (or a new build PC) → register again, or Telegram login breaks.
- App Link host Telegram made for us: `app3978689569-login.tg.dev` (redirect `https://app3978689569-login.tg.dev/tglogin`); its `/.well-known/assetlinks.json` lists our package + SHA-256.

## Spike results (step 0, 2026-10-31 → 11-01, APK build 220 test builds)
Spike code (uncommitted): `lib/features/auth/data/telegram_oidc.dart`, `lib/hub/debug/telegram_oidc_page.dart` (`/dev/debug/telegram-oidc`), `TelegramLoginActivity.kt`, `MainActivity.kt` channel `chubi_pocket/telegram_login`, manifest intent filters + `tg` query.
- **No SDK needed.** Telegram's Android SDK is ~250 lines of plain HTTP; ported to Dart. No GitHub Packages token.
- **Flow that works:** `GET oauth.telegram.org/crossapp?…&android_sdk=1` → `{"url":"tg://resolve?domain=oauth&startapp=…"}` → open it → consent sheet inside the Telegram app (fast) → redirect → app `POST /token` (form: grant_type, client_id, code, redirect_uri, code_verifier; **no secret**) → `{"id_token"}` only.
- **Redirect catching:** a dedicated `TelegramLoginActivity` (translucent, noHistory) takes the redirect, hands it to Flutter, brings the app's task back. Filters on `MainActivity` opened a second app copy inside Telegram's task (landed on the login screen). The verifier is saved to SharedPreferences before leaving, so a killed app can finish later.
- **App Link works**, but right after installing / updating the APK it spun in Telegram for a while (Android verifies the domain in the background), then worked. Custom scheme worked at once.
- **id_token:** RS256, `kid` `oidc-1`, `iss` `https://oauth.telegram.org`, `aud` `9059620815`, **`exp − iat` = 30 s**. Claims: `sub` (not the Telegram id), **`id` (string, = Telegram user id = private chat id)**, `name`, `given_name`, `family_name`, `picture` (`https://t.me/i/userpic/320/…jpg`), `preferred_username` **only when the user has a username** (owner's account has none).
- **Token tells nothing about bot access** (no `scope` in the token response or the JWT).
- **Consent sheet shows an "Allow Messages" switch (on by default)** for a user who never talked to the bot: bot access can be refused alone. Not shown for a user who already chats with the bot.
- **Granting sends the bot an update:** the chat appears with "You allowed this bot to message you when you logged in on …" and our webhook gets it (Bot API `write_access_allowed`). Today the bot answers it with TextLinkFirst ("เชื่อมบัญชีก่อนนะครับ…") because the account is not linked yet → must change.
- Consent sheet says "Unverified App": app name / logo not set in BotFather yet.

## Flow (built from the spike)
```
app: verifier + challenge (saved) → GET /crossapp → open tg:// (fallback: /auth in a browser tab)
Telegram app: consent (+ Allow Messages) → https://app3978689569-login.tg.dev/tglogin?code
TelegramLoginActivity → Flutter → app POST oauth.telegram.org/token (code + verifier) → id_token
app → our BE right away (token lives 30 s)
BE core: verify id_token (JWKS https://oauth.telegram.org/.well-known/jwks.json, kid, RS256, iss,
         aud = 9059620815, exp with small leeway) → Telegram id + profile

A) login / sign-up — POST /auth/telegram/token {id_token}
   id linked     → tokens (status login)
   not linked    → passwordless account (username / name / THB / photo, see decisions) + link
                   + welcome DM → tokens (status signup, so the app can greet a new member)
B) link (signed in) — POST /connections/telegram {id_token}
   id free               → link to this user + welcome DM
   id on another account → moves to this user, as the old link codes did
                           (409 LAST_LOGIN_METHOD if that leaves the other account no way in)
   already this user's   → unchanged, no welcome
```
- 30 s token is fine: sign-up needs no form, so one call does it all.
- Registration closed (`RegistrationOpen` false) → an unknown id gets the existing "registration closed" error.
- Replay: keep used id_token hashes until `exp`.
- The link row: `account_label` = "@preferred_username" else `name`; `permissions {"chat": true}`.
- Existing linked users find their account by `external_id = id`: no data migration.
- Unlink guard stays (`shared.ErrLastLoginMethod`).

## Welcome DM and bot access
- After a link is created (sign-up or B) the BE sends the welcome. Telegram 403 (access refused) → log it, the link stays.
- `write_access_allowed` update → **no reply** (it often arrives before the app has called our BE, so the chat is not linked yet).
- Refused users reach the bot through the "open the bot" row; Telegram's START sends a plain `/start` → the bot answers a plain `/start` from a linked chat with the welcome text.
- Not on a plain login. Content: hello + what the bot does + 2–3 example messages (chatbot style "ข้าว 60"); written with the chatbot texts.

## Remove after it ships
- The bot `/start login_` and `/start link_` handlers and confirm buttons; `/auth/telegram/start`; `/auth/telegram/exchange` polling; the link-code endpoint; polling in `TelegramLoginCubit`; `telegram_waiting_page.dart`; `telegram_signup_page.dart` + `/auth/telegram/signup` (no form any more).
- Old APKs (≤ 220) still call these: keep them until the force-update gate passes the new build, then remove.
- `connection_link_button.dart` keeps its job (the big `เชื่อม Telegram` button). The "open the bot" row is a plain `AppDetailRow` (เปิดแชทบอท, `Connection.bot_url`) in the linked page's account section.
- `connection_link_codes` stops being used. Keep the table (prod is additive only); drop later on its own.
- The spike debug page + the `chubipocket://` redirect, once the real flow is in.

## Open
- Later: a landing page for new members (owner 2026-11-01), fed by status `signup`.
- Set the app name / logo in BotFather so the consent sheet stops saying "Unverified App" (owner, BotFather).
- Ships with the chatbot in 0.4.2-4 (owner: "ลง 0.4.2-4").
