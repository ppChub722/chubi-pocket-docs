# Home

**Phase:** P0 (placeholder) → expanded in P1a (real content)
**Route:** `/`
**Type:** Full page

## Purpose

The post-login landing screen. In Phase 0, it has no real content (no accounts or transactions exist yet — those ship in Phase 1a). Its job in Phase 0 is to:

1. Confirm the user is authenticated (anything visible = auth flow worked)
2. Provide entry to Settings
3. **Demonstrate the `EmptyView` state-pattern widget** per Phase 0 exit criteria
4. Be a known-good place to test the offline banner + global error envelope

In Phase 1a it becomes the real home (transaction list, account cards, FAB to add transaction, summary card).

## Layout — Phase 0

- **App bar** — title "ChubiPocket"; right-side avatar / settings icon → `/settings`
- **Body** — `EmptyView` filling the screen:
  - Illustration or large icon (designer to spec; placeholder: piggy-bank icon)
  - Heading: "No accounts yet"
  - Subhead: "Coming in the next version — add accounts, log transactions, and see your runway."
  - **No CTA button** in Phase 0 (Add Account ships in Phase 1a). Optional: a disabled "Coming soon" pill.
- **Bottom navigation** — placeholder (Phase 1a populates: Home / Projects / Debts / Profile)

## Layout — Phase 1a (preview, for designer awareness)

In Phase 1a, replaces EmptyView with: account cards row, summary card (this month's net), recent transactions list, FAB to add transaction. EmptyView still appears when user has zero accounts. See phase 1a screen spec (when written) for full Phase 1a layout.

## States — Phase 0

- **Loading** — on cold launch after auth, `GET /v1/users/me` may have already fired from Splash; if not, show `LoadingView` briefly
- **Loaded — no accounts** — show `EmptyView` (the default Phase 0 state)
- **Error fetching profile** — `ErrorView` with retry; covers the exit criterion "error envelope renders uniformly"
- **Offline** — top banner ("You're offline"); inline content stays cached

## Interactions — Phase 0

- **Tap avatar / settings icon** → navigate to `/settings`
- **Pull to refresh** (mobile) — re-fetch profile (mostly demo / test affordance in Phase 0)
- **Tap bottom nav item** — Phase 0: only "Home" tab is real; other tabs route to a "Coming in v1" placeholder or are visually disabled

## Mobile vs Web

| | Mobile | Flutter web |
|---|---|---|
| Layout | Full screen | Centered max-600 dp content column; app bar full-width |
| Bottom nav | Standard mobile bottom bar | Side rail or top tabs (designer to decide; mobile pattern OK in Phase 0) |
| Pull to refresh | Yes | Refresh button in app bar instead |
| Empty state illustration | Full-bleed | Same; centered |

## Open visual decisions

- **Empty state illustration** — line art? colored illustration? icon-only? Decide brand voice
- **App bar treatment** — flat, elevated, with brand color tint? Material 3 default vs branded
- **Bottom nav inclusion in Phase 0** — show all tabs (with disabled / "soon" treatment) so users see the future shape, OR show only the Home tab? Tradeoff between expectation-setting and avoiding empty teases
- **"Coming soon" copy tone** — exciting / matter-of-fact / playful? Affects voice across all empty states
- **Pull-to-refresh affordance on web** — hidden refresh button vs pull gesture (web supports it but feels off)

## Related

- Demonstrates: `EmptyView`, `ErrorView`, offline banner state-pattern widgets (per Phase 0 exit criteria in [`../../../phases.md`](../../../phases.md))
- Backend: [`../../../../../design/spec/02-users.md`](../../../../../design/spec/02-users.md) (`GET /v1/users/me`)
- Sub-pages — none in Phase 0 (Phase 1a adds account-detail, transaction-detail, etc.)
- Parent — none (this IS the root authenticated route)
