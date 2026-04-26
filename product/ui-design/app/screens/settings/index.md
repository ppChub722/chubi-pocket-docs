# Settings

**Phase:** P0
**Route:** `/settings`
**Type:** Full page

## Purpose

Central place for the user to manage their account, preferences, and sign out. Reached via avatar / settings icon on `/` (home).

## Layout

Vertical scroll. Grouped sections with section headers and dividers between groups.

- **App bar** — title "Settings"; back button (or navigation drawer toggle on mobile)
- **Profile card** (top) — avatar, display_name, username, email; tap → `/settings/profile` (edit profile sub-page)
- **Account section**
  - "Change password" → `/settings/password` (sub-page)
  - "Default currency: THB" — read-only label here; editable inside `/settings/profile`
- **Preferences section**
  - **Theme** — segmented control or dropdown: Light / Dark / System (Phase 0 stubbed — UI present but selection has no visible effect until Phase 2)
  - **Language** — dropdown: ไทย / English (Phase 0 stubbed similarly; default `th`)
  - **Timezone** — read-only display (e.g., "Asia/Bangkok"); edit deferred to Phase 2+
- **About section**
  - App version + build number
  - Link to terms of service (Phase 3+; placeholder in Phase 0)
  - Link to privacy policy (Phase 3+; placeholder)
- **Logout** — destructive button at bottom; confirmation dialog before signing out

Generous vertical spacing between sections (24 dp).

## States

- **Loading** — skeleton card placeholders while `GET /v1/users/me` is in flight (only on initial cold load)
- **Loaded** — populated layout above
- **Error fetching profile** — top banner "Couldn't load profile. Pull to refresh." (mobile pull-to-refresh; web has Retry button)
- **Switching theme / language** — instantly applied (or stubbed in Phase 0); no loading state needed
- **Logout confirmation** — modal: "Log out of ChubiPocket?" + Cancel / Log out

## Interactions

- **Tap profile card** → navigate to `/settings/profile`
- **Tap "Change password"** → navigate to `/settings/password`
- **Tap theme option** → save to user preferences (Phase 2+); Phase 0 stub stores selection in `user_preferences.theme` via `PUT /v1/users/me`
- **Tap language option** → same, saves to `user_preferences.language`
- **Tap "Log out"** → confirmation → on confirm: clear auth token from secure storage, route to `/auth/login`
- **Pull to refresh** (mobile) → re-fetches `GET /v1/users/me`

## Mobile vs Web

| | Mobile | Flutter web |
|---|---|---|
| Layout | Full screen, single column | Centered max-600 dp column |
| Navigation back | App bar back button or system back gesture | App bar back button or browser back |
| Pull to refresh | Yes | Refresh button in app bar instead |

## Open visual decisions

- **Profile card style** — large avatar + name only, or avatar + name + email + "tap to edit" affordance? Designer to decide.
- **Section grouping visual** — colored backgrounds, headers only, or cards? Material 3 default vs custom.
- **Theme switcher control** — segmented control, list with checkmark, or dropdown? Tradeoff between visibility and screen real-estate.
- **Logout placement** — inline at bottom, or in a separate "danger zone" section with a divider/red treatment?
- **Empty avatar fallback** — initials of display_name in a colored circle, or generic icon? Designer to spec.

## Related

- Backend: [`../../../../../design/spec/02-users.md`](../../../../../design/spec/02-users.md) (`GET /v1/users/me`, `PUT /v1/users/me`)
- Sub-pages:
  - [`profile.md`](edit-profile.md) — edit display_name, avatar, currency
  - [`change-password.md`](change-password.md) — current + new password
