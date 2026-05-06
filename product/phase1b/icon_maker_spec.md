# IconMaker — Design Spec

A shared Flutter component for finna-bbear that handles icon **creation** (returns an `icon_code`) and icon **display** (renders from an `icon_code`). One module replaces every ad-hoc icon picker in the app and gives every screen a consistent, themeable visual identity.

---

## ⚠️ Divergences from this spec (as built)

This document captures the **original UX design**. The implementation diverges in two material ways — see [iconMaker.md](iconMaker.md) and [icon_maker_plan.md](icon_maker_plan.md) for the canonical post-implementation spec.

1. **Type drives base-pack selection, not just the preview frame.**
   The spec says type is "an input to the IconMaker component, not part of the saved data" and that "the resulting `icon_code` works in any context — the same code string could be displayed as an account row icon or a category chip." In the build, **each `IconType` has its own curated base pack** (`packs/base/pack_<type>.dart`) — accounts see wallet/bank/card icons, userProfile sees person/man/woman, tag sees label/flag/star, etc. The saved `icon_code` is still portable, but the picker shows a type-specific pool. The reason: scrolling past 70 unrelated icons to find `label` is a bad tag-picker UX.

2. **Extra packs are global, not per-type.**
   The spec doesn't distinguish base from extra packs. The build splits them: **base = per-type, extra = global**. A future `christmas2026` pack ships its own icons + bg + borders and appears in every type's picker once the user owns it.

Other parts of this spec (the `icon_code` JSON shape, the asset-id-as-contract philosophy, 0-color presets, two-section UI, tap-to-focus, theme palette, recent-only-from-custom, color carry-over rules) are honoured as written.

The picker also adds a **hide-toggles row** under the live preview (`Hide icon` / `Hide background` / `Hide border`) with per-type defaults — for tags, bg + border default to hidden so the preview matches the final on-screen render.

For tags specifically: the picker offers full bg + border customization like every other type, but `IconDisplay` strips bg + border at render time via `IconType.applyDisplayRules` — saved data is preserved, just never drawn.

---

## Why this exists

Every screen in finna-bbear that has an "icon for this thing" — accounts, categories, profiles, projects, members, transactions, contacts — currently has its own ad-hoc approach. We unify them under a single contract: `icon_code` is a string that any of these screens can store, and the same Flutter component knows how to render it. New visual content (seasonal packs, DLC) ships as a Flutter asset bundle and is gated by a server-side ownership check, with no schema changes needed downstream.

---

## Core concepts

### Type

`type` is an input to the IconMaker component, not part of the saved data. It tells the create UI which preview frame to render so the user sees the icon in the actual context it will appear (an account row looks different from a contact card). The current type list is `account`, `userProfile`, `category`, `project`, `projectMember`, `projectTransaction`, `contact`. The `contact` vs `projectMember` distinction is still under review since the `people` table with nullable `app_user_id` may unify them.

Type lives only in the calling screen's code: `IconMaker(type: 'account', ...)`. The resulting `icon_code` works in any context — the same code string could be displayed as an account row icon or a category chip; it's the caller that decides the frame.

### Pack

A pack is a named bundle of assets — icons, backgrounds, borders — shipped inside the Flutter app. The base pack is always available. Additional packs (`christmas2026`, `songkran2026`, etc.) are gated. The database stores only **which pack ids a user owns**, not the pack contents. Pack ownership is checked via API (e.g. `GET /me/packs` → `["base", "christmas2026"]`), cached on app start, and re-validated when icons are saved.

If a user loses access to a pack (subscription expired, seasonal pack ended), assets from that pack are hidden in the picker. For an `icon_code` that already references a lost pack's asset, the renderer hides it and falls back gracefully (exact fallback policy TBD).

### Asset

Every selectable thing — an icon, a background, a border — is an asset with this minimal shape:

```json
{ "id": "superGradientA", "color": ["#B45309", "#DC2626"] }
```

The `id` is the contract. Flutter has a corresponding function (e.g. `superGradientA(colorA, colorB)`) that knows the asset's full behavior — its texture, gradient direction, slot count, anything else. None of that lives in the data. The `color` array carries the **default colors** for the asset, and crucially **`color.length` tells the UI how many color slots the user must fill**. A 0-length color array means the asset is a preset (a finished illustration like a Santa or a snowflake pattern) with no user-pickable color.

This means the data is dumb and the function is smart. Adding a new gradient style (`gradientB`, `radialPulse`, whatever) requires shipping a new Flutter function plus the pack JSON entry — nothing else changes.

---

## icon_code

The output of IconMaker and the input to the display function. Stored as a string column on every domain table that needs a custom icon (`accounts.icon_code`, `categories.icon_code`, etc.).

```json
{
  "icon": "restaurant",
  "iconColors": ["#FFFFFF"],
  "background": "solid",
  "bgColors": ["#E53935"],
  "border": null,
  "borderColors": []
}
```

Three asset slots: icon, background, border. Each has an id and a colors array. The colors array length always matches `pack[type][id].color.length`. `null` for `background` or `border` means that component does not render at all (icon floats with no surround, or no outline). The `icon` slot is always required.

A 2-color gradient background looks like this:

```json
{
  "icon": "restaurant",
  "iconColors": ["#FFFFFF"],
  "background": "superGradientA",
  "bgColors": ["#B45309", "#DC2626"],
  "border": null,
  "borderColors": []
}
```

There is no `type` field, no `version` field, no namespacing on ids. Type is implicit from the column the code lives in. Versioning isn't needed because changes happen by introducing new asset ids alongside old ones — old `icon_code` values keep rendering correctly because the old function still exists.

---

## Pack data structure

A pack ships with three lists — one per asset role — and each entry follows the asset shape:

```js
{
  icon: [
    { id: "restaurant", color: ["#FFFFFF"] },
    { id: "duoUser",    color: ["#B45309", "#F4F1EA"] },
    { id: "santa",      color: [] }
  ],
  background: [
    { id: "solid",          color: ["#E53935"] },
    { id: "superGradientA", color: ["#B45309", "#DC2626"] },
    { id: "snowflake",      color: [] }
  ],
  border: [
    { id: "thin",      color: ["#78350F"] },
    { id: "candycane", color: [] }
  ]
}
```

Background is always circle-shaped — that constraint is fixed at the component level. Variation among backgrounds is purely textural: solid fill, linear gradient, radial gradient, patterned, illustrated. Each variant is a separate asset id. The shape is never user-configurable; the only knob the UI exposes is texture (which id) and color (how many slots that id needs).

---

## Component API

In create mode, the caller provides the type and the user's owned pack ids; the component runs the picker UI and returns an `icon_code` on save.

```dart
final code = await IconMaker.create(
  type: 'account',
  ownedPacks: ['base', 'christmas2026'],
);
```

In display mode, the caller passes the saved `icon_code` and a size; the component looks up each asset id, calls its Flutter function with the stored colors, and composites the result.

```dart
IconMaker.display(code: account.iconCode, size: 56)
```

The display function quietly handles missing-pack cases by hiding affected components (e.g. background gone → render only the icon glyph at the same size). The exact fallback rendering is still being decided.

---

## UI structure

The IconMaker screen is two stacked sections: **Preview** on top, **Picker** below. The Picker is contextual — its content swaps based on what the user just tapped in the Preview section. This keeps the screen short, prevents long scrolling through three separate pickers, and makes "what am I editing right now?" unambiguous.

### Preview section

The top of the Preview section shows the **composed live preview** — the icon rendered in its actual destination context (account list row, profile header, category chip, etc.), driven by the `type` input.

Below it sit three **editor rows**, one per asset role: Icon, Background, Border. Each row contains a small mini-preview of just that role (the icon glyph alone, the bg circle alone, the border ring alone), the role label, the asset id (or `null` tag), and the **slot swatches** — one swatch per color in the asset's `color` array, showing the currently chosen color.

The mini-preview and the slot swatches are interactive. Tapping the mini-preview opens that role's asset picker. Tapping a slot swatch opens the color picker focused on that slot. The composed preview at the top is read-only.

### Picker section

The Picker has four states:

**Empty (default).** When the screen first opens, the picker shows a placeholder: "Tap an element above to edit." Nothing is selected for editing.

**Color mode.** Triggered when the user taps a slot swatch. The breadcrumb at the top of the picker reads "Editing › Icon › color 1 of 1" or similar. The body shows two parts. First, the **theme palette** — a curated set of 10–12 swatches in 2 rows × 6 cols. Neutrals occupy the leftmost column (black on row 1, white on row 2), and the remaining five columns each represent one hue family with a mid-tone in row 1 and a light tint in row 2. Same hue stays in the same column so the structure is readable at a glance. Second, the **recent** strip — up to 6 of the user's previous custom hex picks, single line, no wrap. A **Custom hex** button on the right opens the native color picker; whatever the user picks applies to the focused slot AND gets pushed to recent (deduped, capped at 6). Theme and recent clicks apply to the focused slot but do **not** pollute recent — only custom hex picks land there.

**Asset mode.** Triggered when the user taps an editor row's mini-preview (or anywhere on the row). The body lists assets grouped by pack — each pack has a header (pack name + status tag: `included` / `seasonal · owned` / `locked`) followed by a grid of tiles. Each tile shows the asset's visual plus **color-count dots** below it: one dot per slot, dots colored with the asset's default colors from the pack. Zero-slot assets show a small `preset` label instead of dots. Locked packs render greyscale with reduced opacity and an "Unlock pack →" CTA.

Background and Border asset pickers include a **null option** as the first tile in the base pack section — a dashed circle marked `∅`. Selecting null sets that role to `null` and clears its slots.

### Tap-to-focus model

The focused slot is marked with a thicker dark ring around the swatch and a small pointer above it. Only one slot is focused at a time. Tapping another slot moves focus there and updates the picker breadcrumb. The active editor row gets a subtle tinted background and a left accent bar to signal which role currently owns the focus.

Tapping a mini-preview opens asset mode and does **not** auto-focus a slot — the user is browsing assets at that moment, not editing colors. They tap a slot themselves when ready to refine colors.

---

## Behavior rules

When the user switches to a different asset within the same role, slots that already had user-chosen colors carry forward into matching slots of the new asset (slot 0 → slot 0, slot 1 → slot 1). Slots that newly appear (1-color → 2-color asset) take their values from the new asset's pack defaults. Slots that disappear (2-color → 1-color asset) are dropped, and the focused slot clears if it pointed past the new length.

Switching to a 0-color asset (preset like `santa` or `snowflake`) clears that role's slots entirely. Switching to `null` for bg or border drops the asset and all its slots. In both cases, if the focused slot was on that role, focus clears and the picker stays in whatever mode the user is in.

The Save button is always enabled — every slot always has a value because of the default-loading rule. Save serializes the current state as `icon_code` JSON and returns it to the caller.

The display function never renders empty. Every saved `icon_code` resolves to a visible icon, even if some referenced assets are no longer available (lost pack, deprecated id). The exact fallback chain is still being decided, but the contract is fixed: display is never blank.

---

## What's settled vs what's open

**Settled.** The `icon_code` JSON shape. The pack data shape (`{id, color[]}`). Asset id is the contract — Flutter functions know all behavior including texture, gradient direction, and slot count. `color.length` drives the UI's color-slot count. Backgrounds are always circular; texture varies by id. Null is supported for bg and border. Type is a component input, not stored in `icon_code`. No version field. Packs are gated by an ownership API; pack data itself ships with the Flutter app bundle. The two-section UI (Preview + swappable Picker). The tap-to-focus interaction model. Theme palette is curated at 10–12 colors in 2 rows × 6 cols (neutrals + 5 hue families with mid + light variants). Recent is custom-pick-only, max 6, single line. Display function never renders empty.

**Open.** Final type list — whether `contact` and `projectMember` merge given the unified `people` table. The exact base-pack fallback assets used when an `icon_code` references something missing (which "unknown" icon, what neutral bg if any). Recent-colors persistence scope (per-device only vs synced across devices).
