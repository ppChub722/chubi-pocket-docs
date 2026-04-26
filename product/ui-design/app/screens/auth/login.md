# Login

**Phase:** P0
**Route:** `/auth/login`
**Type:** Full page

## Purpose

Authenticate a returning user. The most-traveled gate into the app.

## Layout

- **App bar** — minimal; title "Log in" only (no back button — this is the entry point if not authenticated)
- **Body** — vertical form, generously spaced:
  - **Identifier** — text input, label: "Username or email"
  - **Password** — password input with show/hide toggle
- **Primary button**: "Log in"
- **Secondary link** below: "Don't have an account? Register" → `/auth/register`

**Phase 2+:** "Forgot password?" link below the password field. Not shown in Phase 0/1.

## States

- **Idle** — primary button enabled when both fields are non-empty (full validation happens on submit)
- **Submitting** — button shows spinner; form disabled
- **Error**:
  - `401 INVALID_CREDENTIALS` → top banner with generic message (e.g. "Username or password incorrect"). **Does not reveal which field was wrong** — security pattern.
  - Network failure → top banner "No connection."
  - Other server error → top banner with backend message

## Interactions

- **Enter on identifier** → focus moves to password
- **Enter on password** → submits if both fields filled
- **Show/hide password** — eye icon toggle
- **On success** — token persisted to secure storage; auth state updated; router → `/`

## Mobile vs Web

| | Mobile | Flutter web |
|---|---|---|
| Width | Full screen | Form rendered in centered max-400 dp column |
| Keyboard | On-screen | Hardware; tab navigation works |
| Password reveal | Touch | Click + hover state |

## Open visual decisions

- **Login illustration / hero** — currently blank above the form; designer to decide
- **"Remember me" checkbox** — Phase 0 always remembers (token persists). Not exposed as a control; designer can propose if needed.
- **Splash → login transition** — when token check fails, currently routes silently. Should there be a snackbar "Please log in"? Designer + UX call.

## Related

- Backend: [`../../../../../design/spec/01-auth.md`](../../../../../design/spec/01-auth.md) (`POST /v1/auth/login`)
