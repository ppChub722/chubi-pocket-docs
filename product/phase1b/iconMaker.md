# IconMaker

Everything known about the IconMaker system — data model, current implementation, intended design, and open decisions. Designer fills in the UI spec when ready; this doc is the reference so nothing gets lost.

---

## What it is

A unified icon + color system for all customizable entities in the app. Replaces the old per-domain typed enums (`CategoryIconPreset`, `AccountColor`, `TagColor`, `AvatarPreset`, etc.) with a single `IconCode` JSONB blob stored on every entity.

**Entities that carry `icon_code`:**
users, accounts, categories, tags, contacts, projects, project_members
*(schema.md also plans: saving_goals, budgets, scheduled_transactions — not yet migrated)*

---

## IconCode shape

The canonical value object — identical in DB (JSONB) and Dart (`lib/shared/icon_maker/icon_code.dart`):

```json
{
  "icon":         "restaurant",
  "iconColors":   ["#FFFFFF"],
  "background":   "solid",
  "bgColors":     ["#E53935"],
  "border":       null,
  "borderColors": []
}
```

| Field | Type | Meaning |
|---|---|---|
| `icon` | `string` | Icon ID — resolved to `IconData` via `IconRegistry`. Persisted as a stable string, never a file path. |
| `iconColors` | `string[]` | 1–3 hex colors for the icon itself. 1 = solid tint. 2–3 = gradient (left→right or top→bottom). |
| `background` | `string?` | `"solid"` / `"gradient"` / `null` (no background). |
| `bgColors` | `string[]` | 1–3 hex colors for the background layer. |
| `border` | `string?` | `"solid"` / `"gradient"` / `null` (no border). |
| `borderColors` | `string[]` | 1–3 hex colors for the border layer. |

`NULL` column = entity uses its module default (initials for users, first base-pack icon for accounts, etc.).

---

## 3 layers

Every rendered icon has three independent layers, each configurable:

```
┌──────────────────────────────┐
│  border  (borderColors[])    │  ← outermost ring
│  ┌────────────────────────┐  │
│  │  background (bgColors) │  │  ← fill inside border
│  │    ┌──────────────┐    │  │
│  │    │  icon        │    │  │  ← the icon glyph, tinted by iconColors
│  │    │  (iconColors)│    │  │
│  │    └──────────────┘    │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
```

Each layer supports 1–3 colors:
- 1 color → solid
- 2–3 colors → gradient (direction TBD by designer)

---

## Two render styles

Set at the call site per domain; controls how the picker behaves and what it stores:

| Style | Background | Icon color | Used by |
|---|---|---|---|
| `background` | Solid colored circle | White (`#FFFFFF`) | Accounts, Categories, Projects, User avatar |
| `iconColor` | Transparent / none | Tinted by `iconColors` | Tags |

In `background` style, `iconColors` is always `["#FFFFFF"]` — the user only picks the background color.
In `iconColor` style, `bgColors` stays empty — the user only picks the icon tint color.

*(Future: full 3-layer mode lets the user pick all three independently.)*

---

## BrandPalette

12 swatches. Defined in `lib/shared/icon_maker/brand_palette.dart`. Replaces `AccountColor`, `CategoryColor`, `TagColor`.

| # | Name | Hex |
|---|---|---|
| 1 | Red | `#E57373` |
| 2 | Pink | `#F06292` |
| 3 | Purple | `#BA68C8` |
| 4 | Deep Purple | `#9575CD` |
| 5 | Indigo | `#7986CB` |
| 6 | Blue | `#64B5F6` |
| 7 | Light Blue | `#4FC3F7` |
| 8 | Cyan | `#4DD0E1` |
| 9 | Light Green | `#AED581` |
| 10 | Amber | `#FFD54F` |
| 11 | Orange | `#FFB74D` |
| 12 | Brown | `#A1887F` |

Skipped: Teal (collides with brand `#00A389`), Green (collides with income-amount semantic), Yellow (too close to Amber).

---

## IconRegistry

`lib/shared/icon_maker/icon_registry.dart` — maps every stable icon ID → `IconData`.

**Rule:** IDs are persisted server-side. Never rename them. When adding a new icon, add both the ID to the relevant domain list and the mapping to `_all`.

### Per-domain icon lists (pickable by users)

| List | Used by |
|---|---|
| `accountIconIds` (12) | Account form |
| `categoryIconIds` (46) | Category form |
| `tagIconIds` (16) | Tag form |
| `userIconIds` (8) | Edit profile / avatar |

### System icons (not pickable — used by seed categories)

`system_transfer`, `system_adjustment`, `system_opening`, `system_debt_received`, `system_debt_paid`

---

## Pack system

`user_pack_permissions` table (migration 033). Tracks which icon packs a user has access to beyond the base pack.

| Concept | Meaning |
|---|---|
| **Base pack** | Always available to every user. No DB row needed. Contains the current `accountIconIds` / `categoryIconIds` / `tagIconIds` / `userIconIds` lists. |
| **Extra packs** | Each row in `user_pack_permissions` grants access to a named pack (`pack_id`). Can have an `expires_at` for seasonal packs. |
| `pack[]` empty | User has base pack only. |

**FE behavior (not yet implemented):**
- At picker open, load the user's granted packs from cache.
- Merge base pack icons + granted-pack icons for the relevant domain.
- Icons from packs the user doesn't own are either hidden or shown as locked (designer to decide).

---

## IconMaker UI — intended shape

*(Designer to fill in exact layout, spacing, and visual treatment. The sections below are known requirements, not a finished spec.)*

### Sections (4–5 total)

1. **Preview** — live rendering of the current `IconCode` as it's being built. Updates on every change. Domain-specific: each form passes its own `previewBuilder` (e.g., `AccountCard`, `CategoryPreviewCard`).

2. **Icon grid** — filtered by module (domain icon list) + granted packs. Selected icon highlighted. Cell size and column count TBD by designer (currently 4 columns, 4×4 dp border-radius cells).

3. **Icon color picker** — pick `iconColors` (1–3 colors). In `background` style this may be locked to `#FFFFFF`. In `iconColor` style this is the primary user choice.

4. **Background picker** — pick `background` type (none / solid / gradient) + `bgColors` (1–3 colors).

5. **Border picker** — pick `border` type (none / solid / gradient) + `borderColors` (1–3 colors). *(Optional section — may be hidden for simpler domains.)*

### Bottom of sheet

- **Remove** button (outlined) — only shown on edit forms where removing the icon is allowed. Returns `IconMakerRemoved`.
- **Use this** button (filled) — confirms and returns `IconMakerSelected(iconCode)`.

### Responsive behavior

- Mobile: bottom sheet with drag handle, scrollable.
- Web (≥ 600 dp): centered dialog.

---

## Current implementation state

### Done ✅

- `IconCode` value object (Dart + JSONB match)
- `IconCodeWidget` — renders any `IconCode` as a circle (background or iconColor style)
- `showIconMakerSheet` — bottom sheet / dialog; preview + icon grid + single swatch row + action buttons
- `BrandPalette` — 12 swatches
- `IconRegistry` — full map + per-domain lists
- All 6 domain models use `IconCode? iconCode`
- All form pages wired to `showIconMakerSheet`
- All list/detail renderers use `IconCodeWidget` or `IconRegistry.get()`
- Migration 033 applied: old columns dropped, data migrated

### Not yet implemented ❌

- **Border layer not rendered** — `IconCode` stores `border` / `borderColors` but `IconCodeWidget` ignores them. No visual border is shown.
- **Multi-color (gradient) not rendered** — only `bgColors[0]` / `iconColors[0]` is used; extra colors are stored but ignored.
- **Pack system not in FE** — the picker always shows the full base pack list regardless of `user_pack_permissions`. No locked-icon UI.
- **`logo_url` fallback for accounts** — schema says "show `logo_url` instead of `icon_code` when set" but `AccountCard` / `IconCodeWidget` don't implement this.
- **`gift_card` missing from `_all` map** — `accountIconIds` includes `'gift_card'` but the registry only has `'card_giftcard'`; the picker falls back to the default icon for that slot.
- **`userIconIds` only 8 icons** — thin for an avatar picker.
- **3-layer full picker not built** — current sheet only shows one swatch row (bg color OR icon color depending on style); no border section, no multi-color gradient pickers.

---

## Key Dart files

| File | Purpose |
|---|---|
| `lib/shared/icon_maker/icon_code.dart` | `IconCode` value object; `resolvedBgColor`, `resolvedIconColor`, `accentColor` getters |
| `lib/shared/icon_maker/icon_code_widget.dart` | `IconCodeWidget` — stateless renderer |
| `lib/shared/icon_maker/icon_maker_sheet.dart` | `showIconMakerSheet` + `_Sheet` widget |
| `lib/shared/icon_maker/icon_registry.dart` | ID → `IconData` map; per-domain ID lists |
| `lib/shared/icon_maker/brand_palette.dart` | `BrandPalette` — 12 swatches; `BrandSwatch` type |

---

## Open design decisions (for designer)

| Item | Status |
|---|---|
| Gradient direction (left→right vs top→bottom vs radial) | ❌ not decided |
| Whether `background` style locks icon color to white or lets user pick | ❌ not decided |
| Border thickness / inset | ❌ not decided |
| Locked-pack icon treatment (hidden vs shown greyed vs shown with lock badge) | ❌ not decided |
| Number of columns in icon grid | ❌ not decided |
| Whether all 5 sections show for every domain, or domain-specific subset | ❌ not decided |
| Multi-color picker UX (e.g., color stop handles, swap button) | ❌ not decided |
| Preview card size + whether entity name shows below it | ❌ not decided |

---

## Status

- **Created** — 2026-05-05
- **Migration** — 033 applied, BE + FE migration complete
- **UI spec** — pending designer; this doc is the reference
