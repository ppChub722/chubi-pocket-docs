# IconMaker

Canonical reference for the IconMaker module — data model, pack structure,
display rules, picker UI, and current implementation state.

> **Source of truth note.** When this conflicts with
> [icon_maker_spec.md](icon_maker_spec.md) the implementation follows
> *this* file. spec.md is the original UX design; this doc is the spec
> after the per-type-base divergence ([icon_maker_plan.md](icon_maker_plan.md)).

---

## What it is

A unified icon + color system for every customizable entity in the app.
Every entity that shows an icon stores an `IconCode` value object.
`IconDisplay` is the single entry point for rendering icons across all
screens. `IconMakerSheet` is the single entry point for picking icons.

**Entities that carry `icon_code`:**
users, accounts, categories, tags, contacts, projects, project_members,
project_transactions
*(schema.md also plans: saving_goals, budgets, scheduled_transactions —
not yet migrated.)*

---

## Types

Every icon interaction is scoped to an `IconType`. Type controls:

- **which base pack is loaded** (per-type icons),
- **which fallback icon** appears when no `IconCode` is set,
- **whether a picker is available** (`hasPicker`),
- **per-type display rules** (`applyDisplayRules`),
- **per-type default hide-toggles** in the picker preview
  (`defaultPreviewHides`).

| Type | Entity | Icon field | Picker | imageUrl | Display strips |
|---|---|---|---|---|---|
| `account` | Account | `iconCode` | ✅ | ✅ (`logoUrl`) | — |
| `userProfile` | User | `iconCode` | ✅ | ✅ (`avatarUrl`) | — |
| `category` | Category | `iconCode` | ✅ | — | — |
| `tag` | Tag | `iconCode` | ✅ | — | **bg + border** |
| `project` | Project | `iconCode` | ✅ | — | — |
| `contact` | Contact | `iconCode` | ✅ | — | — |
| `projectMember` | ProjectMember | `iconCode` | ✅ | — | — |
| `projectTransaction` | ProjectTransaction | `categoryIconCode` | ✅ | — | — |
| `transaction` | Transaction | — | ❌ display only | — | — |

`transaction` uses the category's `iconCode` passed at the call site. No
picker, no stored field.

---

## IconCode shape

The canonical value object — identical in DB (JSONB) and Dart
(`lib/shared/icon_maker/icon_code.dart`):

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
| `icon` | `string?` | Icon ID — resolved to `IconData` via `IconRegistry`. Never a file path. |
| `iconColors` | `string[]` | 1–3 hex colors for the icon glyph. 1 = solid. 2–3 = gradient (deferred). |
| `background` | `string?` | Asset id of the bg variant, or `null` for no bg. |
| `bgColors` | `string[]` | Hex colors for the bg layer; length depends on the variant. |
| `border` | `string?` | Asset id of the border variant, or `null` for no border. |
| `borderColors` | `string[]` | Hex colors for the border ring. |

`NULL` column = entity uses its module default (theme-derived fallback,
see below).

**Asset id is the contract.** The renderer maps each id to its visual
behaviour (texture, gradient direction, slot count). Adding a new variant
= ship a new id + matching renderer case; the data shape doesn't change.

---

## 3 layers

```
┌──────────────────────────────┐
│  border  (borderColors[])    │  ← outermost ring
│  ┌────────────────────────┐  │
│  │  background (bgColors) │  │  ← fill inside border
│  │    ┌──────────────┐    │  │
│  │    │  icon        │    │  │  ← glyph, tinted by iconColors
│  │    │  (iconColors)│    │  │
│  │    └──────────────┘    │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
```

---

## Pack system

### Two kinds of pack

| Kind | Scope | Storage | Loaded by |
|---|---|---|---|
| **Base** | Per-type — each `IconType` has its own curated pack | `packs/base/pack_<type>.dart` | `PackRegistry._basePacks[type]` |
| **Extra** (DLC, seasonal, paid) | Global — appears in every type's picker once owned | `packs/<pack_id>/pack.dart` | `PackRegistry._extraPacks[id]` |

Per-type base packs let each picker show only icons that are semantically
appropriate (account → wallet/bank/card; userProfile → person/man/woman).

Extras are **type-agnostic** and global: a `christmas2026` pack ships its
own icons + bg + borders, and once granted, all of it shows up in every
picker.

### Shared base bg + borders

Every base pack uses the same `commonBaseBackgrounds` and
`commonBaseBorders` from `packs/base/_shared.dart`. Per-type customisation
applies only to **icons**.

**`commonBaseBackgrounds`**

| id | Slots | Default colors | Render |
|---|---|---|---|
| `solid` | 1 | `#64B5F6` | flat fill |
| `superGradientA` | 2 | `#B45309` → `#DC2626` | linear top→bottom |
| `radialGlow` | 2 | `#F59E0B` → `#78350F` | radial from upper-left |
| `stripedPatternDi` | 3 | `#DC2626` `#F59E0B` `#2563EB` | 3 hard diagonal bands |
| `rainbow` | 0 (preset) | — | SweepGradient ROYGBIV |

**`commonBaseBorders`**

| id | Slots | Default | Render |
|---|---|---|---|
| `thin` | 1 | `#78350F` | 2 px solid |
| `thick` | 1 | `#78350F` | 4 px solid |
| `dashed` | 1 | `#78350F` | 2 px (dashed approximated as solid for now) |

### Per-type base icons

| Type | Count | Source |
|---|---|---|
| `account` | 12 | `packs/base/pack_account.dart` |
| `category` | 44 | `packs/base/pack_category.dart` |
| `tag` | 16 | `packs/base/pack_tag.dart` |
| `userProfile` | 8 | `packs/base/pack_user_profile.dart` |
| `project` | 16 | `packs/base/pack_project.dart` |
| `contact` | 10 | `packs/base/pack_contact.dart` |
| `projectMember` | 9 | `packs/base/pack_project_member.dart` |
| `projectTransaction` | 44 | `packs/base/pack_project_transaction.dart` (mirrors `category`) |

### Pack data structure

```dart
IconPack(
  id: 'base',
  icons:       [IconPackItem(id, colors)],   // per-type
  backgrounds: commonBaseBackgrounds,         // shared
  borders:     commonBaseBorders,             // shared
)
```

`colors` serves two purposes:
- **Length** → how many color slots this item needs in the picker
- **Values** → default/recommended hex colors pre-filled when the user
  selects this item

A 0-length `colors` array marks the item as a **preset** — no
user-controlled colors (e.g. `rainbow`).

### Pack folder structure

```
lib/shared/icon_maker/packs/
├── icon_pack.dart            ← IconPack, IconPackItem types
├── pack_registry.dart        ← PackRegistry: per-type base + global extras
├── base/
│   ├── _shared.dart              ← commonBaseBackgrounds + commonBaseBorders
│   ├── pack_account.dart
│   ├── pack_category.dart
│   ├── pack_tag.dart
│   ├── pack_user_profile.dart
│   ├── pack_project.dart
│   ├── pack_contact.dart
│   ├── pack_project_member.dart
│   └── pack_project_transaction.dart
└── (extra packs added here as new folders, e.g. `christmas2026/pack.dart`)
```

### PackRegistry

```dart
PackRegistry.packs({
  required IconType type,
  List<String> grantedPackIds = const [],
}) → List<IconPack>
```

Returns `[basePackForType(type), ...grantedExtras]`. Unknown extra ids
are skipped silently. Base is always first.

### Pack permissions

`user_pack_permissions` table (migration 033) tracks which extra packs a
user has access to. At picker open, granted pack IDs are read from
`UserBloc` cache and forwarded to `PackRegistry.packs(...)`. Refreshed
on login / app resume.

Locked-icon treatment (icons from packs the user doesn't own): **TBD by
designer** — not yet implemented.

---

## IconDisplay

Universal display widget. Used on every screen that shows an icon.

```dart
IconDisplay(
  type:     IconType,
  size:     double,
  imageUrl: String?,   // optional
  iconCode: IconCode?, // optional
)
```

**Resolution order:**
1. `imageUrl` non-empty → `Image.network` with the icon path as error fallback.
2. `iconCode` set → `IconCodeWidget(type.applyDisplayRules(iconCode), …)`.
3. Neither → theme-derived default (primaryContainer fill +
   `type.fallbackIcon` glyph).

**`type.applyDisplayRules(code)`** strips layers a type ignores at render
time. Currently: `tag` → returns `IconCode(icon, iconColors)` only;
all other types return the code unchanged.

### imageUrl

Only `account` and `userProfile` ever have one. The caller resolves any
server-relative path to a usable URL before passing.

### Default IconCode

Computed at build time, never stored:
- `icon` → `type.fallbackIcon`
- `bgColor` → `Theme.of(context).colorScheme.primaryContainer`

| Type | Fallback icon |
|---|---|
| `account` | `account_balance_wallet_outlined` |
| `userProfile` | `person_outline` |
| `category` | `category_outlined` |
| `tag` | `label_outline` |
| `project` | `folder_outlined` |
| `contact` | `contacts_outlined` |
| `projectMember` | `person_outline` |
| `projectTransaction` | `receipt_outlined` |
| `transaction` | `receipt_outlined` |

---

## IconCodeWidget

Self-inferring renderer. Type-unaware — renders whatever `IconCode` it's
given. `IconDisplay` is responsible for applying type rules first.

| IconCode state | Renders |
|---|---|
| `iconCode == null` | fallback circle + fallback icon |
| `bgColors` non-empty | filled circle + tinted icon |
| `bgColors` empty, `iconColors` non-empty | no background + tinted icon |
| `borderColors` non-empty | outer border ring |
| 2–3 colors in `iconColors` | gradient (deferred) |
| all empty | fallback color + fallback icon |

`IconDisplayMode.compact` suppresses the border layer (used in dense list
rows / small avatars).

---

## IconMakerSheet

Opened via `showIconMakerSheet(...)`. Returns `IconMakerResult` —
`selected(IconCode)`, `removed`, or `null` (dismissed).

```dart
showIconMakerSheet(
  context:         BuildContext,
  type:            IconType,
  initial:         IconCode?,
  previewBuilder:  Widget Function(IconCode)?,   // optional contextual preview
  previewSubtitle: Widget?,
  removeLabel:     String?,                       // shown only on edit forms
  useThisLabel:    String?,
  grantedPackIds:  List<String> = const [],
)
```

### Sections

**1. Live preview**
Renders `_previewCode` — the working `IconCode` with currently-hidden
layers stripped. Caller-supplied `previewBuilder` (e.g. `AccountCard`,
`CategoryPreviewCard`) shows the icon in its actual destination context.
No builder = an 80 px `IconCodeWidget`.

**2. Hide toggles** *(new in this revision)*
A compact row directly under the preview:
`[ ] Hide icon  [ ] Hide background  [ ] Hide border`

- Defaults from `IconType.defaultPreviewHides`. `tag` → bg + border ticked.
- Picker-only state — never saved to `IconCode`. Reset every open.
- Lets the user toggle layer visibility in the live preview without
  losing the underlying configuration. Editor rows + asset picker tiles
  still show full fidelity.

**3. Editor rows**
Three rows, always visible — Icon, Background, Border. Each shows:
- A 44 px mini-preview (tap → opens that role's asset picker).
- Role label + current asset id (or `∅ none` if null).
- One slot swatch per color in the current asset (tap → focuses that
  slot, opens the color picker).

The active row gets a subtle `primaryContainer @ 25%` fill + a 3 px left
accent bar.

**4. Picker section** (swappable, below the editor rows)

| State | Trigger | Content |
|---|---|---|
| Empty | sheet just opened, nothing tapped | "Tap an element above to edit" placeholder |
| Color | a slot swatch was tapped | Theme palette (12 swatches, 2×6) + Recent strip + Custom hex button |
| Asset | a row's mini-preview was tapped | Pack-grouped asset grid; null tile for bg/border in the base pack |

- **Theme palette** — 12 curated swatches (neutrals + 5 hue families ×
  mid + light tints). Selected = thicker outline.
- **Recent** — only **custom hex picks** land here. Theme/recent clicks
  apply to the focused slot but don't pollute the recent list. Capped at 6.
- **Custom hex** — TextField in an AlertDialog (native color wheel TBD).

**5. Action row**
- **Remove** (outlined, `removeLabel` only) — emits `IconMakerRemoved`.
- **Use this** (filled, `useThisLabel`) — emits `IconMakerSelected(code)`.

### Responsive
- Mobile: bottom sheet with drag handle, scrollable.
- Web ≥ 600 dp: centered `Dialog`, `maxWidth: 480`.

---

## BrandPalette

12 swatches in `lib/shared/icon_maker/brand_palette.dart`. (Reference
palette — *separate* from the picker's theme palette which is curated for
in-context contrast.)

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

Skipped: Teal (collides with brand `#00A389`), Green (collides with
income-amount semantic), Yellow (too close to Amber).

---

## IconRegistry

`lib/shared/icon_maker/icon_registry.dart` — maps every stable icon ID
→ `IconData`.

**Rule:** IDs are persisted server-side. Never rename them. When adding a
new icon, add both the ID to the relevant pack file and the mapping to
`_all`.

### System icons (not pickable — used by seed categories)

`system_transfer`, `system_adjustment`, `system_opening`,
`system_debt_received`, `system_debt_paid`

---

## File structure

```
lib/shared/icon_maker/
├── icon_code.dart              ← IconCode value object
├── icon_type.dart              ← IconType enum + fallback + applyDisplayRules + defaultPreviewHides
├── icon_display.dart           ← universal display widget
├── icon_code_widget.dart       ← self-inferring renderer (type-unaware)
├── icon_maker_sheet.dart       ← picker UI (tap-to-focus, hide toggles)
├── icon_registry.dart          ← id → IconData map
├── brand_palette.dart          ← 12 reference swatches
└── packs/
    ├── icon_pack.dart              ← IconPack, IconPackItem
    ├── pack_registry.dart          ← per-type base + global extras
    └── base/
        ├── _shared.dart                ← commonBaseBackgrounds + commonBaseBorders
        ├── pack_account.dart
        ├── pack_category.dart
        ├── pack_tag.dart
        ├── pack_user_profile.dart
        ├── pack_project.dart
        ├── pack_contact.dart
        ├── pack_project_member.dart
        └── pack_project_transaction.dart
```

---

## Current implementation state

### Done ✅

- `IconCode` value object (Dart + JSONB match)
- `IconType` enum with `fallbackIcon`, `hasPicker`, `applyDisplayRules`,
  `defaultPreviewHides`
- `IconDisplay` universal widget with `imageUrl` + theme fallback
- `IconCodeWidget` self-inferring renderer with `IconDisplayMode.full/compact`
  and full bg variant set (`solid`, `superGradientA`, `radialGlow`,
  `stripedPatternDi`, `rainbow`)
- `IconPack` / `IconPackItem` / `PackRegistry` with per-type base + global extras
- 8 per-type base packs sharing `commonBaseBackgrounds` + `commonBaseBorders`
- `IconMakerSheet` — tap-to-focus, swappable picker, hide toggles, all 3
  editor rows always visible
- All 6 domain models use `IconCode? iconCode`
- All form pages wired to `showIconMakerSheet` with the right `IconType`
- All list/detail renderers use `IconDisplay`
- Migration 033 applied (`user_pack_permissions`)

### Not yet implemented ❌

- Real `grantedPackIds` flow — read from `UserBloc` cache, forward into
  `showIconMakerSheet` calls (currently always `[]`)
- Sample seasonal pack file (e.g. `packs/christmas2026/pack.dart`) so the
  global-extras path can be exercised
- Locked-pack visual treatment in the asset picker (greyed grid + "Unlock
  pack →" CTA per the demo)
- PNG-texture background variants (e.g. `christmasTree`, `snowman`,
  `frozen`) and the matching `DecorationImage` renderer path
- Native color-wheel picker (currently a hex TextField in an AlertDialog)
- Multi-color icon gradient rendering (`iconColors.length > 1`)
- True dashed border (currently approximated as solid)
- Visual chrome from the demo: composed preview frame with entity card,
  picker breadcrumb, mode pill, square-tile theme palette, conic-gradient
  custom-hex button — see [icon_maker_demo.html](icon_maker_demo.html)

---

## Open design decisions

| Item | Status |
|---|---|
| Locked-pack icon treatment (hidden vs greyed vs lock badge + CTA) | ❌ pending designer |
| Number of columns in icon grid (currently 5 for icons, 4 for bg/border) | ⚠️ working default |
| Gradient direction for `iconColors` multi-color (deferred entirely) | ❌ deferred |
| Multi-color picker UX (slot stops, swap button) | ❌ pending designer |
| Preview card size + whether entity name shows below | ❌ pending designer |
| Demo-style two-panel chrome vs single-sheet (current) | ⚠️ accepted — Material 3 single sheet is fine; revisit if/when designer pushes back |

---

## Status

- **Created** — 2026-05-05
- **Last updated** — 2026-05-06 (per-type base + hide toggles + new bg variants implemented)
- **Migration** — 033 applied
- **Plan of record** — [icon_maker_plan.md](icon_maker_plan.md)
