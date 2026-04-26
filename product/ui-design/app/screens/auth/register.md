# Register

**Phase:** P0
**Route:** `/auth/register`
**Type:** Full page

## Purpose

Create a new ChubiPocket account. The first real interaction many users have with the app.

## Layout

- **App bar** — title "Create account"; back button (returns to `/auth/login`)
- **Body** — scrollable form, vertical stack:
  - **Username** — text input
    - Lowercase letters, digits, hyphen, underscore
    - 3–50 chars
    - Inline validator highlights rule violations as the user types
  - **Display name** — text input
    - Any Unicode (Thai supported)
    - 1–100 chars
  - **Email** — text input, optional in Phase 1
    - Label: "Email (optional)"
  - **Password** — password input with show/hide toggle
    - Min 8 chars
  - **Confirm password** — password input
    - Must match
  - **Currency** — dropdown
    - Default `THB`; options THB / USD / EUR / GBP / JPY (designer can extend)
- **Primary button** at bottom: "Create account"
- **Secondary link** below primary: "Already have an account? Log in" → `/auth/login`

Generous vertical spacing between fields (16 dp).

## States

- **Idle** — primary button **disabled** until form passes all validators
- **Submitting** — primary button shows centered spinner; entire form disabled (interactions blocked)
- **Field error** — inline error message below the offending field (red text, error icon)
- **Submission error**:
  - `VALIDATION_ERROR` from backend → field-level errors mapped per field
  - `USERNAME_EXISTS` / `EMAIL_EXISTS` → top banner above the form (sticky until dismissed or fixed)
  - Network failure → top banner "No connection. Check your internet."

## Interactions

- **Tab / Enter forward** — moves focus to next field
- **Enter on last field** (or final filled field) → submits form if valid
- **Show/hide password** — eye icon toggle inside the password input
- **On success** — auth state updated → router redirects to `/` (Home Phase 0 stub)

## Mobile vs Web

| | Mobile | Flutter web |
|---|---|---|
| Width | Full screen | Form rendered in centered max-400 dp column |
| Submit | Tap button or Enter on last field | Tap button or Enter on last field |
| Password reveal | Eye icon (touch) | Eye icon (click); hover state visible |

## Open visual decisions

- **Onboarding hero illustration** above the form — would warm up the registration page; currently icon-only / blank. Designer to consider.
- **Social sign-in** (Google / Apple) — Phase 2+; not in Phase 0
- **Inline username availability check** (debounced) — Phase 2 polish

## Related

- Backend: [`../../../../../design/spec/01-auth.md`](../../../../../design/spec/01-auth.md) (`POST /v1/auth/register`)
