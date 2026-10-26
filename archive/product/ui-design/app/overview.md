# UI Design — App (Flutter)

Designer-facing source of truth for ChubiPocket's mobile app visual and UX design. This folder is owned **jointly by the designer and FE developer**: the designer creates Figma mockups and writes visual specs here; the FE developer reads this folder to implement.

For implementation details (state management, routing, providers, API wiring), see [`../../../design/frontend/app/`](../../../design/frontend/app/). For backend specs and data model, see [`../../../design/spec/`](../../../design/spec/).

---

## Scope

This folder covers the **ChubiPocket mobile app** (Flutter; Android + Flutter web shell, designed mobile-first).

**Within scope:**
- Phase 0 — auth, settings, base scaffolding
- Phase 1 — accounts, transactions, categories, tags, contacts, projects, shared expenses, budgets, saving goals, scheduled transactions

**Out of scope (later folders):**
- Web (Nuxt 3) — Phase 3, separate management-focused product
- Admin (Next.js) — Phase 3

---

## Structure

```
product/ui-design/app/
├── overview.md         ← you are here
├── design-sheet.md     ← brand + logo + theme + typography + iconography + components
├── flows.md            ← key user journeys
└── screens/                ← per-screen specs (one file per screen) — populated later
```

---

## Workflow

This is the agreed working pattern for designer ↔ FE dev collaboration:

1. **Designer** receives this folder + a product scope brief
2. **Designer** decides on brand (logo, palette, typography) and fills in `design-sheet.md` with concrete values, replacing placeholders
3. **Designer** creates Figma mockups for each screen
4. **Designer** writes per-screen specs into `screens/<area>/<screen>.md` using the screen template
5. **FE developer** reads `design-sheet.md` for tokens and `screens/<area>/<screen>.md` for layouts; implements in Flutter
6. **FE developer** flags ambiguity back to designer; designer updates the doc — Figma and the doc stay in sync

The dev folder ([`../../../design/frontend/app/`](../../../design/frontend/app/)) holds **implementation-only** detail (Cubit / Bloc classes, Repository pattern, dio config, route table, widget API). It cross-references this folder for visuals — there is no duplication of design tokens or screen layouts there.

---

## What the designer is expected to deliver

### Brand identity
- **Brand mark / logo** — light + dark variants, multiple sizes, app icon
- **Primary color** — current placeholder `#00A389` (teal/green); confirm or replace
- **Typography** — primary font + Thai font pairing (current placeholder: Material 3 default + Noto Sans Thai)
- **Voice + tone** — short brand statement designer can articulate to others

### Design system (`design-sheet.md`)
- Light + dark theme color tokens (semantic, not raw hex everywhere)
- Type scale and hierarchy
- Spacing scale (current proposal: 4 / 8 / 16 / 24 / 32 / 48 dp — confirm)
- Iconography choice — Material Icons base + identify any custom icons needed
- Component library — every reusable component with **all states** (idle, hover, focus, pressed, disabled, loading, error)
- State pattern widgets (Loading, Error, Empty, Offline banner)

### Screens (`screens/`)
- Figma mockups for ~45 screens (Phase 0 + Phase 1)
- Mobile (default) + Flutter web responsive variant where layout meaningfully differs
- All states for each screen (loading, error, empty, populated)
- Modal / bottom sheet specs (one file per designable unit)

### Flows (`flows.md`)
- Confirm or refine the documented user journeys
- Annotate Figma with prototyping links matching the flow steps

---

## Open visual decisions

Things the designer needs to decide. Current placeholders or assumptions are noted.

| Decision | Current placeholder | Notes |
|---|---|---|
| **Brand color** | `#00A389` (teal/green) | Finance + growth association; designer to validate or replace |
| **Logo** | None | Mark + wordmark + app icon to be created |
| **Primary font** | System default | Designer to choose; needs Thai support (Noto Sans Thai pairs well) |
| **Dark mode** | Material 3 auto-derived from seed | May need manual color tweaks for category / account custom colors |
| **Iconography** | Material Icons | Curated SVG set possible Phase 2 polish |
| **Empty state illustrations** | None | Optional but preferred over icon-only |
| **Splash duration** | TBD | Min display time on cold launch (avoid flashy < 200 ms resolves) |
| **Skeleton shapes** | Generic shimmer | Designer to spec per-list-item shape (TransactionRow skeleton, AccountCard skeleton) |
| **Account / category color palette** | 12 brand-friendly preset colors (TBD) | Designer to pick palette that survives in dark mode |
| **Amount color** | Red expense / Green income / Neutral transfer | Designer to confirm exact shades for light + dark |

---

## Conventions in this folder

- **Plain UX language only.** No Flutter / Bloc / Material 3 jargon. Designer doesn't need to know what `ThemeData` is. If implementation context is unavoidable, link to the dev folder rather than inline it.
- **Each screen entry follows one template:** Purpose · Layout · States · Interactions · Mobile vs Web notes.
- **Modals / bottom sheets are separate files** from their parent screens — each is a distinct designable unit.
- **Phase isn't visible in the file tree.** Inside each screen file, tag scope inline (Phase 0 / 1a / 1b / 1c) so the designer designs the whole thing while the dev ships it phased.
- **Cross-reference, don't duplicate.** When a backend constraint shapes a UI decision (e.g., "max 3-level category tree"), link to the spec file rather than copying it.

---

## Related

- [`../../../design/overview.md`](../../../design/overview.md) — design folder overview
- [`../../../design/frontend/app/`](../../../design/frontend/app/) — FE implementation (developer-facing; cross-references this folder for visuals)
- [`../../../design/spec/`](../../../design/spec/) — backend specs and business rules
- [`../../overview.md`](../../overview.md) — product context (what we're building and why)

---

## Status

- **Phase** — pre-handoff scaffolding; design system and screen specs to be filled in by designer
- **Last updated** — 2026-04-26
- **Version** — 0.1 (initial scaffolding; `screens/` folder pending designer work)
