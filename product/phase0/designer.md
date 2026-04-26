# Phase 0 — Designer

**Reality:** every visual decision is **placeholdered** with concrete values. Phase 0 ships without a designer in the critical path. This file is a **refinement checklist** — work through whenever a designer is commissioned (could be after Phase 0 ships).

**Source of truth:** [`../ui-design/app/design-sheet.md`](../ui-design/app/design-sheet.md) §12 has the full status table of what's locked vs placeholdered.

---

## What's already placeholdered (no work needed unless you want to refine)

| Item | Placeholder value |
|---|---|
| Brand color | `#00A389` (locked — only flag if logo work strongly suggests a different shade) |
| Type scale | Material 3 Type Scale (15 standard sizes) |
| Spacing scale | 4 / 8 / 16 / 24 / 32 / 48 dp (8-pt grid) |
| Color tokens | Material 3 `ColorScheme.fromSeed` from `#00A389` (auto-generates light + dark) |
| Iconography | Material Symbols (outlined) |
| Component states | Material 3 defaults |
| Typography | System fonts (no custom font bundle) |
| Logo | Text wordmark "ChubiPocket" + "C" mark in `#00A389` |
| 12-color palette for accounts/categories | Material 3 tonal-60: Red / Pink / Purple / Deep Purple / Indigo / Blue / Light Blue / Cyan / Light Green / Amber / Orange / Brown |
| State-pattern widget visuals (Loading / Error / Empty / Offline) | Material icons + structural layouts speced |
| Per-row skeleton anatomy | TransactionRow / AccountCard / ContactRow / ProjectCard / BudgetCard / SavingGoalCard / DebtSummaryCard all speced |
| Splash screen | Centered logo + 24 dp progress; 600 ms min display |
| Preset user icons | Letter initials in colored circle (auto-generated from display_name) |
| Voice & personality | Working brand statement in `design-sheet.md §1.1` reads acceptably |

**Outcome:** Phase 0 build proceeds. None of this is a blocker.

---

## Refinement opportunities (not blocking)

Work through whenever you're ready. Each item lives in `design-sheet.md` and can be replaced selectively without re-architecting.

### Highest impact (most user-visible)

- [ ] **Real logo** — replace text-wordmark placeholder with a designed mark + wordmark + app icon. Current placeholder is functional but unbranded.
- [ ] **Splash screen visual treatment** — placeholder is functional but minimal. Add brand polish (illustration backdrop, animation, brand color tint).
- [ ] **Empty state illustrations** — replace Material icons with branded line-art or illustrated empty states (warmer, more inviting).
- [ ] **Onboarding hero illustration** — Phase 2 scope, but a designer could spec it in advance.

### Medium impact

- [ ] **12-color account/category palette refinement** — placeholder is Material 3 tonal-60. Designer can curate a more cohesive set if it improves brand voice.
- [ ] **State-pattern widget visual treatment** — replace Material icons with branded illustrations for ErrorView / EmptyView / OfflineBanner; refine skeleton motion (shimmer speed/easing).
- [ ] **Curated avatar presets** — add ~6 designer-curated geometric or illustrated avatars on top of the letter-initials default.
- [ ] **Skeleton shape refinement** — placeholder anatomy works; designer can optimize per-component shapes for better perceived performance.

### Lower impact

- [ ] **Voice & personality** — refine brand statement; document tone in product copy decisions
- [ ] **Component deviations from Material 3 defaults** — only document if the project deliberately deviates; otherwise stick with Material 3
- [ ] **Dark mode color tweaks** — placeholder relies on `ColorScheme.fromSeed` auto-derivation; designer can override specific tokens if needed
- [ ] **Custom icon set** — Material Symbols covers ~80% of needs; designer can spec custom SVG icons for brand-specific contexts

### Figma mockups (helpful but not blocking)

- [ ] Translate text screen specs in [`../ui-design/app/screens/`](../ui-design/app/screens/) into Figma mockups for the 7 Phase 0 screens:
  - `auth/splash`
  - `auth/register`
  - `auth/login`
  - `home/index`
  - `settings/index`
  - `settings/edit-profile`
  - `settings/change-password`

FE can build from text specs; Figma adds visual verification + faster iteration on visual choices.

---

## What you read

- [`../ui-design/app/design-sheet.md`](../ui-design/app/design-sheet.md) — every placeholder value, ready to refine
- [`../ui-design/app/overview.md`](../ui-design/app/overview.md) — workflow, expectations, conventions
- [`../ui-design/app/screens/`](../ui-design/app/screens/) — text screen specs to translate into Figma

## What you don't need to read

- Anything in `design/` — that's engineering, not designer-facing

---

## Done when

This file is a perpetual refinement checklist. There's no "Phase 0 designer done" milestone — each refinement lands when you want it to. Phase 0 itself ships when [`overview.md`](overview.md) exit criteria check.
