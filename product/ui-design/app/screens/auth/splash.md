# Splash

**Phase:** P0
**Route:** `/` (pre-auth resolution)
**Type:** Full page

## Purpose

Wait for auth state to resolve, then route the user to the right place. First thing the user sees on cold launch.

## Layout

Centered, vertically:

- **Brand mark / logo** (designer to provide) — large, ~96 dp tall
- **App name "ChubiPocket"** — wordmark or text wordmark beneath the mark
- Small **progress indicator** below the wordmark (32 dp circular indeterminate)

No app bar. No bottom nav. Full-bleed `surface` background. Safe-area aware.

## States

- **Loading** — always shown briefly; this is the only state

There is no error state on this screen — failures route to `/auth/login` with an optional snackbar.

## Interactions

None. The screen routes itself:

1. Reads token from secure storage
2. If token present → calls `GET /users/me` to validate
   - 200 → routed to `/` (home)
   - 401 / network → cleared and routed to `/auth/login`
3. If no token → routed to `/auth/login`

## Mobile vs Web

Same layout on both. On web the centered content stays in a max-360 dp column for visual consistency with mobile.

## Open visual decisions

- **Min display duration** — if token check resolves in 200 ms, the splash feels flashy. Suggested ≥ 600 ms minimum display. Designer to decide.
- **Logo treatment** — animated entrance (fade / scale)? Static? Designer choice.
- **Background** — flat `surface` color, brand-color tint, or full brand illustration? Currently flat.

## Related

- Backend: [`../../../../../design/spec/01-auth.md`](../../../../../design/spec/01-auth.md), [`../../../../../design/spec/02-users.md`](../../../../../design/spec/02-users.md) (`GET /v1/users/me`)
