# Edit profile

**Phase:** P0
**Route:** `/settings/profile`
**Type:** Full page

## Purpose

Let the user edit their public-facing identity (display_name, avatar) and default currency. Reached from the profile card on `/settings`.

Username and email are NOT editable in Phase 0 (deferred to Phase 3 with re-verification).

## Layout

- **App bar** — title "Edit profile"; back button (returns to `/settings`); right-side **Save** action (text button or icon, disabled when no changes)
- **Body** — vertical form, generously spaced:
  - **Avatar** — current avatar (large, ~96 dp circular); tap → opens **avatar picker** (see "Avatar picker" section below)
  - **Display name** — text input
    - 1–100 chars
    - Any Unicode (Thai supported)
    - Inline validator
  - **Currency** — dropdown
    - Default to current value
    - Options: THB / USD / EUR / GBP / JPY (designer can extend)
    - Helper text below: "Used as default for new transactions. Existing transactions keep their original currency."
  - **Read-only fields** (visible but disabled):
    - Username (with helper "Cannot be changed in this version")
    - Email (with helper "Cannot be changed in this version")

Generous spacing (16 dp between fields).

## Avatar picker

A modal / bottom sheet opened by tapping the avatar. Two source paths and an optional remove:

### Source 1 — Pick a preset

**Phase 0 default (committed):** **letter initials in a colored circle** (e.g., "AB" for "Alice Bunko" on a color derived from a hash of the name — palette pulled from the 12-color set in [`design-sheet.md §3.4`](../../design-sheet.md)). Zero asset library, scales infinitely, works for Thai initials, free localization. **No designer work required** — FE generates these client-side from `display_name`.

**Optional refinement (Phase 0.5+ when a designer is commissioned):** a small set of curated geometric shapes / illustrated avatars (~6 presets) added on top of the initials default. Until then, the picker has just the initials option as the only "preset."

- Layout: 4-column grid; first cell is "Use my initials" (auto-generated from `display_name`); remaining cells either empty (Phase 0) or show designer-curated presets (Phase 0.5+)
- Tap a preset → preview at the top of the modal updates → "Select" button confirms
- Selected preset stored as a known identifier (e.g., `preset:initials` for the auto-initials; `preset:hex-01` for a future designer asset); display layer renders accordingly

### Source 2 — Upload a photo (camera / gallery)

User picks an image from device.

- **Mobile:** bottom sheet offers "Take photo" (camera) + "Choose from gallery" + "Pick a preset" + "Remove"
- **Web:** modal offers "Upload from device" + "Pick a preset" + "Remove" (no camera path on web)
- After selection, transitions to **crop step** (see below)
- After crop confirmation, image is uploaded to object storage; resulting URL stored in `avatar_url`

### Crop step (after upload only)

- Full-screen (mobile) / modal (web) with the picked image displayed
- **Fixed 1:1 aspect ratio crop window** (circular preview overlay matching the avatar shape)
- User can: pan, pinch-zoom (mobile) / scroll-zoom (web), rotate 90° (optional)
- "Cancel" returns to the source picker; "Save" finalizes the crop and triggers upload
- Output: square image; backend may downsize further (e.g., 512×512) for storage efficiency

### Remove avatar

- Resets to default — either an empty / generic icon or the user's display_name initials in a colored circle (designer to spec)
- Stored as `avatar_url = null` (preset can be remembered separately if needed)

### Phase scope

| Source | Phase |
|---|---|
| Preset icons (initials default; optional curated set) | **Phase 0** — initials need no assets; curated presets bundled with app, no backend / storage required |
| URL input fallback | **Phase 0** — text input under the picker for advanced users to paste a URL directly |
| Camera / gallery upload + 1:1 crop | **Phase 2** — requires object storage provisioned (Phase 2 scope per [`../../../phases.md`](../../../phases.md)) |
| Phase 3 polish | Refined picker UX, server-side image optimization, multi-resolution variants for retina displays |

Designer specs the **complete picker** so the UI doesn't fundamentally change between phases — the upload+crop affordances appear in Phase 0 with disabled / "Coming in next version" labels until Phase 2 enables them.

## States

- **Loaded** — form populated with current values from `GET /v1/users/me`
- **Dirty** — any field changed; Save button becomes enabled; back gesture/button prompts "Discard changes?"
- **Submitting** — Save button shows spinner; form disabled
- **Success** — banner / snackbar "Profile updated"; auto-navigate back to `/settings`
- **Field error** — inline error below the offending field (display_name length, invalid avatar URL)
- **Submission error**:
  - `VALIDATION_ERROR` → field-level errors mapped per field
  - Network failure → top banner "No connection. Try again."

## Interactions

- **Tap avatar** → opens avatar picker (see "Avatar picker" section above)
- **Inside picker, tap a preset / select uploaded image** → preview updates, "Select" / "Save" confirms, returns to form (form becomes dirty)
- **Edit any field** → form becomes dirty; Save enables
- **Tap Save** → submits `PUT /v1/users/me` with only changed fields
- **Back gesture / button when dirty** → confirmation modal "Discard changes? — Discard / Keep editing"
- **Tap currency option** → updates the selection; Save still required to commit

## Mobile vs Web

| | Mobile | Flutter web |
|---|---|---|
| Layout | Full screen, single column | Centered max-500 dp column |
| Save action | Right-side app bar button | Same; also supports Cmd/Ctrl+S keyboard shortcut |
| Avatar picker | Bottom sheet (camera / gallery / URL / remove) | Modal (URL / remove only in Phase 0) |
| Discard prompt | Modal | Modal |

## Open visual decisions

- **Avatar tap affordance** — camera icon overlay on the avatar? Edit button below? Both? Designer to decide.
- **Preset icon library size + style** — how many presets? Realistic illustrations, flat icons, animal mascots, abstract patterns? Affects brand voice.
- **Preset icon picker layout** — grid (4-col), list, horizontal carousel? Tradeoff between scannability and screen space.
- **Crop UX on web** — full-screen modal or inline overlay? Touch-pinch is easy on mobile; web needs scroll-to-zoom or +/- buttons.
- **Default fallback when `avatar_url = null`** — generic person silhouette, user's initials in a colored circle (color derived from name hash), or a randomly-assigned preset? Initials are personal but require typography decisions.
- **Phase 0 vs Phase 2 affordance treatment** — upload buttons disabled with "Coming soon" pill in Phase 0, or hidden entirely until Phase 2? Designer + product call.
- **"Discard changes?" prompt** — modal vs snackbar with undo? Modal is safer; snackbar is faster.
- **Currency dropdown UX** — full-screen picker (mobile pattern) or inline dropdown? Material 3 has both.
- **Read-only field treatment** — grayed out + helper text, or hidden entirely with a "Contact support to change" link?

## Related

- Backend: [`../../../../../design/spec/02-users.md`](../../../../../design/spec/02-users.md) (`GET /v1/users/me`, `PUT /v1/users/me`)
- Parent: [`index.md`](index.md)
