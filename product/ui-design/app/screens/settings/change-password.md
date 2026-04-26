# Change password

**Phase:** P0
**Route:** `/settings/password`
**Type:** Full page

## Purpose

Let the authenticated user change their own password. Requires current-password confirmation as a basic security check.

## Layout

- **App bar** — title "Change password"; back button (returns to `/settings`)
- **Body** — vertical form, generously spaced:
  - **Current password** — password input with show/hide toggle
  - **New password** — password input with show/hide toggle
    - Helper text: "At least 8 characters"
    - Inline strength indicator (Phase 2 polish; not required Phase 0)
  - **Confirm new password** — password input
    - Inline validator: must match new password
- **Primary button** at bottom: "Update password"
- **Secondary link** below: "Forgot current password?" → password reset flow (Phase 2+; in Phase 0 the link can be a disabled placeholder or hidden)

## States

- **Idle** — primary button **disabled** until all 3 fields are filled and new + confirm match
- **Submitting** — primary button shows spinner; form disabled
- **Field error** — inline error below the offending field (e.g., "Must match new password")
- **Submission error**:
  - `WRONG_PASSWORD` (401) → inline error on Current password field: "Current password is incorrect"
  - `VALIDATION_ERROR` → inline error on New password (if too short / matches current)
  - Network failure → top banner "No connection. Try again."
- **Success** — snackbar "Password updated" + navigate back to `/settings`
  - **Phase 2+:** all other refresh tokens revoked; user is logged out on other devices but stays logged in here

## Interactions

- **Tab / Enter forward** — moves focus to next field
- **Show/hide password** — eye icon per field
- **Tap "Update password"** → submits `PUT /v1/users/me/password` with `{ current_password, new_password }`
- **Back when dirty** — confirmation "Discard changes?" (optional; can be omitted since data isn't valuable to preserve)
- **On success** — clear all fields, navigate back, show success snackbar

## Mobile vs Web

| | Mobile | Flutter web |
|---|---|---|
| Layout | Full screen, single column | Centered max-400 dp column |
| Submit | Tap button or Enter on confirm field | Tap button or Enter on confirm field |
| Password reveal | Eye icon (touch) | Eye icon (click); hover state visible |
| Browser autofill | n/a | Honor browser password manager (autocomplete=current-password / new-password) |

## Open visual decisions

- **Password strength indicator** — show in Phase 0 (encourages stronger passwords) or wait for Phase 2 polish? Designer + UX call.
- **Show/hide on confirm field** — useful or noise? Some apps omit it on the confirm field to encourage typing.
- **"Forgot current password" link** — render as disabled placeholder in Phase 0, or omit entirely until Phase 2 reset flow exists?
- **Success treatment** — snackbar (less intrusive) vs modal (more confirmation). Snackbar is the standard pattern.
- **Min password length communication** — inline helper text vs only-on-error. Inline is friendlier.

## Related

- Backend: [`../../../../../design/spec/01-auth.md`](../../../../../design/spec/01-auth.md) (`PUT /v1/auth/password`); [`../../../../../design/spec/02-users.md`](../../../../../design/spec/02-users.md) (`PUT /v1/users/me/password` is an alias)
- Parent: [`index.md`](index.md)
