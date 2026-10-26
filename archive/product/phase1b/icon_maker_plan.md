# IconMaker — Implementation Plan

Plan of record for the IconMaker refactor in `chubi-pocket-app`.
Source of truth for the runtime behaviour. When this conflicts with
[icon_maker_spec.md](icon_maker_spec.md) or [iconMaker.md](iconMaker.md),
this file wins until those are updated to match.

**Created:** 2026-05-06
**Status:** approved, implementing

---

## Goal

One unified IconMaker module used by every entity that displays a
customizable icon. Single picker UX; per-type curated icon sets; shared
backgrounds & borders; future-proof for global DLC/seasonal packs.

## Final data model

### Pack composition

| Layer | Source | Notes |
|---|---|---|
| **Icons** | Per-type base pack file | Each `IconType` has its own curated icon list (e.g. account → wallet/bank/card; userProfile → person/man/woman). |
| **Backgrounds** | Shared `commonBaseBackgrounds` const | All non-tag base packs share the same list. Tag base pack has none. |
| **Borders** | Shared `commonBaseBorders` const | Same as above. Tag base pack has none. |
| **DLC packs** | Global, gated by `grantedPackIds` | One pack file ships its own icons + bg + borders; all become available in every type's picker once owned. |

### `commonBaseBackgrounds`

| id | Slots | Default colors | Render |
|---|---|---|---|
| `solid` | 1 | `#64B5F6` | flat fill |
| `superGradientA` | 2 | `#B45309` → `#DC2626` | linear top→bottom |
| `radialGlow` | 2 | `#F59E0B` → `#78350F` | radial from upper-left |
| `stripedPatternDi` | 3 | `#DC2626` `#F59E0B` `#2563EB` | diagonal stripes (3 hard bands at 45°) |
| `rainbow` | 0 (preset) | — | SweepGradient through ROYGBIV (closed loop) |

### `commonBaseBorders`

| id | Slots | Default | Render |
|---|---|---|---|
| `thin` | 1 | `#78350F` | 2 px solid |
| `thick` | 1 | `#78350F` | 4 px solid |
| `dashed` | 1 | `#78350F` | 2 px (approximated as solid for now) |

### Per-type base icons

Curated from existing `pack_<type>.dart` files. Re-listed here as the
authoritative content:

| Type | Count | Icons |
|---|---|---|
| `account` | 12 | wallet, cash, bank, savings, card, contactless_card, e_wallet, gift_card, travel, shopping, business, loan |
| `category` | 44 | (see `pack_category.dart`) |
| `tag` | 16 | label, flag, star, favorite, bolt, swap_horiz, card_giftcard, subscriptions, flight, work_outline, schedule, local_offer, sell, emoji_events, redeem, savings |
| `userProfile` | 8 | person, man, woman, face_smile, bakery_dining, fitness_center, work, star |
| `project` | 16 | folder, folder_open, groups, work, business, handshake, campaign, flag, emoji_events, star, trending_up, schedule, palette, fitness_center, travel, redeem |
| `contact` | 10 | person, contact_page, apartment, badge, work, storefront, handshake, payments, groups, star |
| `projectMember` | 9 | person, man, woman, face_smile, badge, engineering, work, star, fitness_center |
| `projectTransaction` | 44 | mirrors `category` |

---

## Behaviour decisions

### Picker UX (all types identical)

- All 3 editor rows always show (icon, background, border) regardless of
  type. The `isIconColorStyle` branching is **removed**.
- Tap-to-focus model unchanged.
- Hide toggles row directly under live preview:
  `[ ] Hide icon   [ ] Hide background   [ ] Hide border`
- Defaults from `IconType.defaultPreviewHides`:
  - `tag` → `(icon: false, bg: true, border: true)`
  - all others → all `false`
- Toggles are picker-only UI state; never saved to `icon_code`; reset on
  each sheet open.

### Display rules (per-type strip)

- New extension method `IconType.applyDisplayRules(IconCode) → IconCode`.
- `tag` → returns a code with `background`, `bgColors`, `border`,
  `borderColors` cleared.
- All others → returns code unchanged.
- `IconDisplay` calls `applyDisplayRules` before passing to
  `IconCodeWidget`.
- `IconCodeWidget` itself stays type-unaware — renders whatever it gets.

### Pack registry

```dart
PackRegistry.packs({
  required IconType type,
  List<String> grantedPackIds = const [],
}) → List<IconPack>
```

Returns `[basePackForType(type), ...grantedExtras]`. Extras are
type-agnostic globals.

---

## File-by-file changes

### Create

- `packs/base/_shared.dart` — `commonBaseBackgrounds` + `commonBaseBorders` const lists.

### Modify

- `packs/base/pack_account.dart` — add `backgrounds: commonBaseBackgrounds, borders: commonBaseBorders`.
- `packs/base/pack_category.dart` — same.
- `packs/base/pack_user_profile.dart` — same.
- `packs/base/pack_project.dart` — same.
- `packs/base/pack_contact.dart` — same.
- `packs/base/pack_project_member.dart` — same.
- `packs/base/pack_project_transaction.dart` — same.
- `packs/base/pack_tag.dart` — no change (stays icons-only).
- `packs/pack_registry.dart` — type-keyed `_basePacks` map; `packs({type, grantedPackIds})` signature.
- `icon_type.dart` — add `applyDisplayRules` + `defaultPreviewHides`; remove `usesIconColorStyle`.
- `icon_display.dart` — call `type.applyDisplayRules(iconCode)` before `IconCodeWidget`.
- `icon_code_widget.dart` — add `stripedPatternDi` + `rainbow` decoration cases.
- `icon_maker_sheet.dart` — (see below).

### `icon_maker_sheet.dart` specific changes

- Forward `type` to `PackRegistry.packs(type: type, grantedPackIds: ...)`.
- Drop `isIconColorStyle` field; always render all 3 editor rows.
- Add `_hideIcon` / `_hideBg` / `_hideBorder` fields, initialised from `type.defaultPreviewHides`.
- Add hide-toggles row (3 compact `Checkbox` + label) directly below live preview.
- New `_previewCode` getter — returns current `IconCode` with hidden layers stripped; passed to `previewBuilder` and the fallback `IconCodeWidget`.
- Editor-row mini-preview, slot swatches, asset picker tiles all keep using full-fidelity code (NOT `_previewCode`).
- Add `stripedPatternDi` + `rainbow` cases in `_BgPreview._decoration`.

### Delete

- `packs/base/pack.dart` — the obsolete unified `basePack`.

### Doc updates (separate commit)

- `chubi-pocket-docs/product/phase1b/iconMaker.md` — rewrite to match this plan.
- `chubi-pocket-docs/product/phase1b/icon_maker_spec.md` — note the per-type-base divergence.

---

## Implementation order

1. Create `packs/base/_shared.dart`.
2. Update each per-domain pack file to spread shared bg + border (skip tag).
3. Refactor `packs/pack_registry.dart` to type-keyed lookup.
4. Update `icon_type.dart` — add `applyDisplayRules` + `defaultPreviewHides`. **Keep `usesIconColorStyle` temporarily** to avoid breaking the sheet build.
5. Update `icon_display.dart` to call `applyDisplayRules`.
6. Update `icon_code_widget.dart` — new bg cases.
7. Update `icon_maker_sheet.dart` — forward type, hide toggles, drop `isIconColorStyle` branches, new bg cases in `_BgPreview`.
8. Delete `packs/base/pack.dart`.
9. Remove `usesIconColorStyle` from `icon_type.dart`.
10. `flutter analyze` — fix any dangling refs.
11. Doc sync (separate commit).

## Verification

- Open each entity's icon-maker (account, category, tag, user profile, project, projectTransaction, contact, projectMember).
  - Verify the icon list is type-specific.
  - Verify all 3 editor rows show.
  - Verify hide toggles default ticked correctly for tag and unticked elsewhere.
  - Verify `stripedPatternDi` shows 3 color slots; `rainbow` shows zero slots & a "preset" label on its tile.
- Save a tag with a background + border configured → render the tag elsewhere → confirm bg + border are visually absent.
- Save the same tag, reopen the picker → confirm the saved bg + border come back into the editor rows (data preserved).
- `flutter analyze` clean.

## Out of scope (deferred)

- Locked-pack visual treatment + "Unlock pack →" CTA.
- Wiring real `grantedPackIds` from `UserBloc` (currently hard-coded `[]` everywhere).
- Sample seasonal pack file (e.g. `christmas2026/pack.dart`) with PNG-texture backgrounds.
- Native color-wheel picker (current TextField hex dialog stays).
- Spec-side visual chrome (composed preview frame, breadcrumb, mode pill, square-tile theme palette, etc.) — covered in a separate visual-parity ticket.
