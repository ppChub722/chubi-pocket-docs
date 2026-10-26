# Design Sheet

The complete design system for the ChubiPocket mobile app: brand, logo, theme, typography, iconography, spacing, and the full component library with all states.

This is **the** reference both the designer and FE developer return to. Every value here drives one or more decisions in [`screens/`](screens/) and in the Flutter implementation under [`../../../design/frontend/app/`](../../../design/frontend/app/).

**Foundation: Material 3.** Type scale, spacing scale, color token system, component defaults, and motion follow Material 3 standards (locked — don't deviate without a reason). Brand-specific decisions (logo, exact color values, palette for accounts/categories, state-pattern visuals, avatar presets) are what the designer fills in.

Throughout this file:
- ✅ — value is settled, can be implemented
- 🟡 — placeholder; designer to confirm or replace
- ❌ — designer must decide before handoff

---

## 1. Brand identity

### 1.1 Voice & personality 🟡 (placeholdered)

**Working brand statement** (placeholder — refine when convenient, but works as-is):

> ChubiPocket is a calm, no-nonsense personal finance app for Thai users. It treats money tracking as a habit, not a chore — fast capture on the phone, deeper management on the web. The brand is friendly without being cute, trustworthy without being corporate, and clear about real money movement.

**Personality keywords:** clear · calm · trustworthy · efficient · friendly (not playful) · direct.

**Avoid:** finance-bro aggressive ("crush your goals"), overly cute (mascots, baby talk), corporate cold (gray suits, bar charts).

### 1.2 Target user

- **Primary:** Thai adults, 22–45, comfortable with smartphones, who want to track real money movements (not just budget categories)
- **Secondary:** small groups (couples, friend trips, freelancers) who need to share expenses and settle up
- **Tertiary:** users who outgrow simple apps and want a bit more rigor — credit card cycle tracking, project-based shared books, debt tracking

### 1.3 Visual references ❌

To be filled in by the designer with mood-board / inspiration apps. Suggested directions to evaluate:

- Splitwise (clarity of split UI; functional minimalism)
- YNAB (envelope budgeting tone — possibly too rigid for ChubiPocket)
- Money Lover (Thai-friendly localization; visual heaviness to avoid)
- Notion (calm typography, trust)

---

## 2. Logo 🟡 (placeholdered as text wordmark)

**Placeholder direction (use until a real logo is commissioned):**

- **Wordmark** — text "ChubiPocket" in system bold weight (~28sp), brand primary color `#00A389` on white background; reverse (white on `#00A389`) for dark mode and brand surfaces
- **App icon** — stylized "C" letter (system bold, white) centered on a `#00A389` square with rounded corners (Android adaptive icon foreground); white background layer for round/squircle masking
- **Mark only** — same "C" letter, used as avatar fallback when initials aren't appropriate
- **Monochrome** — wordmark in `on-surface` color; mark in `on-surface`

This placeholder ships the app while a designer (or you, later) creates a proper mark. Replace selectively — the placeholder is functional, not branded.

### Deliverables when a real logo lands

| Asset | Spec | Notes |
|---|---|---|
| App icon | Square; multiple resolutions (Android adaptive icon spec) | Should read at 48 dp |
| Wordmark | Horizontal lockup | App bar use, splash use |
| Mark only | Square; standalone | Avatar fallback, narrow contexts |
| Light variant | For light backgrounds | |
| Dark variant | For dark backgrounds | |
| Monochrome | Single-color version | For inverse contexts, watermarks |

### Constraints
- App icon must read clearly at 24 dp (notification icon), 48 dp (launcher), 192 dp (large display)
- Wordmark needs to render acceptably in Thai-script-adjacent contexts (no clashing with system Thai font)

---

## 3. Color theme ✅ (Material 3 standard locked)

Color is built on a **single brand seed** plus semantic tokens. Implementation uses Material 3's `ColorScheme.fromSeed`, which auto-generates a complete light + dark palette from the seed. The designer overrides only specific tokens (amount red/green/neutral, account/category palette).

### 3.1 Brand palette

| Token | Light value | Dark value | Usage |
|---|---|---|---|
| **Brand primary** ✅ | `#00A389` (locked) | (auto-derived by `ColorScheme.fromSeed`) | Primary actions, FAB, app accent |
| Brand on-primary | `#FFFFFF` | `#00271F` | Text/icons on primary surfaces |

**Status:** brand color locked at `#00A389`. If the designer's logo work strongly suggests a different shade, raise it; otherwise the entire `ColorScheme` derives from this seed.

### 3.2 Semantic tokens

These are the only color names that should appear in screen specs. Raw hex values live here, semantic names everywhere else.

| Semantic token | Maps to (light) | Maps to (dark) | Usage |
|---|---|---|---|
| `surface` | `#FCFCFC` | `#0F1411` | Page background |
| `surface-container` | `#F4F4F0` | `#1A1F1C` | Card backgrounds |
| `surface-container-high` | `#ECEEEA` | `#252A26` | Modals; **shared book / project surfaces** (slightly elevated to distinguish personal vs shared) |
| `on-surface` | `#1A1C1A` | `#E2E3DF` | Primary text |
| `on-surface-variant` | `#42484A` | `#C2C8C4` | Secondary text |
| `outline` | `#72797A` | `#8C9290` | Borders, dividers |
| `primary` | `#00A389` ✅ | (auto-derived) | Primary actions |
| `error` | `#BA1A1A` | `#FFB4AB` | Errors, destructive actions, **expense amounts** |
| `success` 🟡 | `#2E7D32` | `#81C784` | **Income amounts**, success states |
| `warning` 🟡 | `#A86200` | `#FFB870` | Budget over 80%, advisory warnings |
| `tertiary` | (M3-derived) | (M3-derived) | Reserved for category accents if needed |

### 3.3 Amount colors (app-specific semantics)

ChubiPocket displays money amounts with color to communicate type at a glance. These are user-facing semantics and need to be locked in:

- **Expense** — red (uses `error` token; sign: `-`)
- **Income** — green (uses `success` token; sign: `+`)
- **Transfer** — neutral (`on-surface`; no sign or paired arrows)
- **Adjustment** — neutral with subtle italic / muted treatment

🟡 Designer to confirm the green doesn't clash with `primary` (also green-ish). If it does, shift one.

### 3.4 Custom color slots 🟡 (placeholdered)

Two domain objects let users pick their own color:

- **Account color** — palette of 12 brand-friendly hex values; used as left-edge accent on `AccountCard`
- **Category color** — same 12-color palette; used in `CategoryChip` and category icons

**Placeholder palette** (Material 3 tonal palette, hue 60 — light mode values; dark mode auto-derived):

| # | Name | Hex | Notes |
|---|---|---|---|
| 1 | Red | `#E57373` | Avoids pure red (which is `error` semantic) |
| 2 | Pink | `#F06292` | |
| 3 | Purple | `#BA68C8` | |
| 4 | Deep Purple | `#9575CD` | |
| 5 | Indigo | `#7986CB` | |
| 6 | Blue | `#64B5F6` | |
| 7 | Light Blue | `#4FC3F7` | |
| 8 | Cyan | `#4DD0E1` | |
| 9 | Light Green | `#AED581` | Avoids pure green (which is `success` / income semantic) |
| 10 | Amber | `#FFD54F` | |
| 11 | Orange | `#FFB74D` | |
| 12 | Brown | `#A1887F` | |

Skipped: `Teal` (collides with brand `#00A389`), `Green` (collides with income amount), `Yellow` (too close to amber).

Designer can replace all 12 if a coherent custom palette is preferred. Constraints if changed:
- All 12 must pass WCAG AA contrast against `surface-container` in **both** light and dark modes
- Should look like a coherent set, not a random rainbow
- Avoid pure red / pure green (collide with amount semantics)

### 3.5 Dark mode 🟡 (placeholdered)

Both light and dark themes are first-class. The user can override or follow system (Phase 2+ — Phase 0/1 is light-only by default).

**Placeholder approach:** rely on Material 3's `ColorScheme.fromSeed` auto-derivation for both light and dark from `#00A389`. The 12 custom colors above use Material 3 tonal-60 (light) and tonal-80 (dark) so they remain identifiable in both themes.

To verify (Phase 2 task, when dark mode toggle ships):
- Account / category custom colors maintain identity but adjust brightness for contrast
- Amount red / green remain readable on dark surfaces
- Brand primary stays recognizable

---

## 4. Typography

### 4.1 Font selection 🟡

**Stack decision:** **`google_fonts` + per-language font registry**. Each supported locale picks its own font from a registry; the registry can grow over time, and the user can pick (Phase 2+) from a dropdown.

**Phase 0 registry — one font per language (the dropdown shows one option, but the picker UI is in place for Phase 2 expansion):**

| Locale | Font | Source |
|---|---|---|
| `en` (English) | TBD (designer picks; e.g., `Inter`) | `google_fonts` |
| `th` (Thai) | TBD (designer picks; e.g., `Noto Sans Thai` or `IBM Plex Sans Thai`) | `google_fonts` |

**Resolution order:** active locale → font registered for that locale → fallback chain to system Thai/Latin fonts.

**Numeric amounts:** same font as primary, with `FontFeature.tabularFigures()` so columns align in transaction lists.

**Designer action:** pick the Phase 0 default font for each locale. Adding more options later = one entry in the registry; no screen changes required.

### 4.2 Type scale ✅ (Material 3 standard locked)

Material 3 default Type Scale — 15 standard sizes. Don't reinvent.

| Role | Size ✅ | Weight | Use |
|---|---|---|---|
| Display large | 32 sp | 400 | Empty-state hero text only |
| Headline large | 28 sp | 400 | Page hero (rare) |
| Headline medium | 24 sp | 500 | Section heroes |
| Title large | 20 sp | 500 | Page titles, app bar |
| Title medium | 16 sp | 500 | Card titles, list section headers |
| Body large | 16 sp | 400 | Primary body text |
| Body medium | 14 sp | 400 | Secondary body, list rows |
| Label large | 14 sp | 500 | Buttons |
| Label medium | 12 sp | 500 | Chip labels, captions |
| Amount (large) | 28 sp | 500 | Detail page hero amount (app-specific) |
| Amount (row) | 16 sp | 500 | List row trailing amount (app-specific) |

The 9 Material 3 roles are locked at default values. Only the 2 app-specific Amount sizes are project additions.

### 4.3 Hierarchy rules

- One headline-or-larger per screen, max
- Section headers use `title medium` + `on-surface-variant`
- Numeric amounts always use the **amount** styles (tabular figures), never the body styles

---

## 5. Iconography ✅ (Material Symbols standard locked)

### 5.1 Icon system

**Base set:** Material Symbols (Material 3's icon system, ~3000 icons; outlined variant by default). Bundled with Flutter via `Icons.<name>`. Used for nav, app bar actions, category defaults, account type icons.

**Strategy:**
- Backend stores icons as **string identifiers** (`'restaurant'`, `'bank'`, `'shield'`)
- App maps string → `Icons.<name>` via a lookup table
- Same icons render in mobile and web

### 5.2 Sizes

| Context | Size |
|---|---|
| App bar action | 24 dp |
| List leading | 24 dp |
| Tab bar | 24 dp |
| FAB | 24 dp |
| Inline (within text) | 16 dp |
| Hero (empty state, splash) | 64 dp |

### 5.3 Custom icon needs ❌

The designer should review and identify which categories / accounts / states need custom illustration vs. Material Icons. Likely candidates:

- Empty-state illustrations (per page) — currently icon-only
- Onboarding hero (registration / first-account flow) — currently nothing
- Brand-specific category icons (food/Thai-context categories where Material's defaults feel generic)

---

## 6. Spacing & layout ✅

### 6.1 Spacing scale

Base unit = **4 dp**.

| Token | Value | Use |
|---|---|---|
| `xs` | 4 dp | Tight inline spacing, icon-to-text |
| `sm` | 8 dp | Compact gaps |
| `md` | 16 dp | Default page padding (mobile) |
| `lg` | 24 dp | Section separation |
| `xl` | 32 dp | Generous separation, web horizontal padding |
| `xxl` | 48 dp | Empty-state spacing |

### 6.2 Page margins

- **Mobile** — 16 dp horizontal; 16 dp top/bottom from safe area
- **Flutter web (≥ 800 dp)** — content centered in a max-720 dp column; 32 dp horizontal

### 6.3 Touch targets

- Minimum tap target: **48 × 48 dp** (Android accessibility guideline)
- List rows: 56 dp minimum height
- FAB: 56 dp standard (mini 40 dp not used)

---

## 7. Elevation & surfaces ✅

Material 3 tonal elevation, no manual shadows beyond the theme.

| Surface | Token | Used by |
|---|---|---|
| Page | `surface` | App background |
| Card | `surface-container` | Account cards, transaction rows |
| Modal / shared book | `surface-container-high` | Bottom sheets, dialogs, **project (shared) screens** |

The "shared book uses a slightly elevated surface" rule is a key visual identifier — when a user is inside a project/shared context, the page background subtly shifts. Designer should validate this distinction is perceivable but not jarring.

---

## 8. Components

Every reusable component, with all states. The screen specs in [`screens/`](screens/) reference these by name and don't redefine them.

### 8.1 Buttons

| Variant | Use | States |
|---|---|---|
| **Primary** | Main action per screen (max one) | idle · hover · focus · pressed · disabled · loading |
| **Secondary** | Alternative action | idle · hover · focus · pressed · disabled |
| **Tertiary / text** | Low-emphasis action (Cancel, secondary nav) | idle · hover · focus · pressed · disabled |
| **Destructive** | Delete, archive, leave project | idle · hover · focus · pressed · disabled · confirming |
| **Icon button** | App bar actions | idle · hover · focus · pressed · disabled |

Loading state: button keeps its width (no jump), shows centered indeterminate spinner, disables interaction.

### 8.2 Inputs

| Variant | Use | States |
|---|---|---|
| **Text input** | Generic text fields | empty · filled · focus · error · disabled · readonly |
| **Amount input** | Numeric with currency prefix; large display | empty · entering · valid · invalid · disabled |
| **Password input** | With show/hide toggle | empty · filled · focus · error · revealed |
| **Search input** | With clear (×) | empty · typing · with-results · no-results |
| **Date picker trigger** | Tap → opens platform date picker | empty · with-date · disabled |
| **Dropdown / picker** | Single-select from list | empty · selected · open · disabled |
| **Multi-select** | Multiple chips from list | empty · partial · all · disabled |

All inputs:
- Inline error message below field on validation failure
- Field-level errors take priority over form-level errors

### 8.3 Cards & rows

| Component | Used in | Anatomy |
|---|---|---|
| **`AccountCard`** | Accounts list, Home summary | Type icon · name · balance (right) · color accent (left edge) · type badge |
| **`TransactionRow`** | All transaction lists | Category icon · note + category + account · amount (right; colored) |
| **`ContactRow`** | Contacts list | Avatar · name + nickname · outstanding balance · linked-user indicator |
| **`ProjectCard`** | Projects list | Project name · type icon · date range · member avatars (max 4 + count) · my-balance |
| **`BudgetCard`** | Budgets list | Category · period · progress bar · spent / limit · over-limit warning |
| **`SavingGoalCard`** | Saving goals list | Icon · name · progress bar · current / target · % allocation badge |
| **`DebtSummaryCard`** | Home, Contact detail | "Owed to me" + total · "I owe" + total · net |

### 8.4 Chips

| Variant | Use |
|---|---|
| **`CategoryChip`** | Category display: icon + color + name |
| **`TagChip`** | Tag display: small pill, muted |
| **`FilterChip`** | Active filter on lists; tap to remove (×) |
| **`MemberChip`** | Project / split member: avatar + name |

States: idle · selected · disabled.

### 8.5 State-pattern widgets ✅ structure locked, 🟡 visuals placeholdered

**Structural layout:** locked per Material 3 conventions.

**Visual treatment:** placeholdered below; designer can refine.

| Widget | Purpose | Placeholder visual spec |
|---|---|---|
| **`LoadingView`** | Async data loading | Shimmer rectangles in `surface-container-high`, 4 dp border-radius, animated horizontal gradient sweep (1.2s loop). For lists, per-row skeleton (see §8.5.1 below). For non-list async, generic shimmer block. **No spinners on lists.** |
| **`ErrorView`** | Async data failed | Centered, vertical stack with 24 dp gaps: 64 dp Material `error_outline` icon (`error` color), `headline-medium` title, `body-medium` message in `on-surface-variant`, primary button "Retry" with `refresh` icon. Three message variants: network ("No connection. Check your internet."), server ("Something went wrong. Please try again."), unknown ("Unexpected error."). |
| **`EmptyView`** | Data returned zero rows | Centered, vertical stack with 24 dp gaps: 64 dp Material icon (page-specific — passed in as prop), `headline-medium` title, `body-medium` message in `on-surface-variant`, optional primary button (CTA passed in as prop). |
| **`OfflineBanner`** | Network down | Full-width banner, 48 dp tall, `surface-container` background, `on-surface` text "You're offline" with 16 dp `wifi_off` icon (left), right-aligned dismiss × button. Auto-dismisses on reconnect; pages with `onRetry` show a "Retry" text button instead of dismiss. Slides in from top, 200 ms. |

#### 8.5.1 Per-list-item skeleton shapes 🟡 (placeholdered)

Each list-row component has a matching skeleton variant:

| Component | Skeleton anatomy |
|---|---|
| **`TransactionRow`** | Leading 40 dp circle (category icon) · 2 stacked text rows (16 dp tall × 60% width, 14 dp tall × 40% width — note + category) · trailing 80 dp wide × 16 dp tall pill (amount) |
| **`AccountCard`** | Leading 40 dp circle (account-type icon) · 1 text row (18 dp tall × 50% width — name) · trailing 100 dp wide × 20 dp tall pill (balance) · 4 dp wide × full-height left-edge accent bar |
| **`ContactRow`** | Leading 40 dp circle (avatar) · 2 stacked text rows (name + nickname) · trailing 80 dp pill (outstanding balance) |
| **`ProjectCard`** | Header row: 18 dp tall × 50% width (project name) · 14 dp tall × 30% width (date range) · 4 stacked 32 dp circles (member avatars) · footer: 80 dp wide pill (my balance) |
| **`BudgetCard`** | Leading 32 dp circle (category icon) · 1 text row (16 dp tall × 40%) · linear progress bar placeholder (full-width, 8 dp tall) · trailing text (14 dp tall × 30% — "spent / limit") |
| **`SavingGoalCard`** | Same as BudgetCard with circular progress instead of linear |
| **`DebtSummaryCard`** | 2 columns each with: 14 dp tall × 30% (label) + 24 dp tall × 60% (amount) |

Designer can refine motion (shimmer speed / direction / easing) and exact dimensions; the principle stays "skeleton matches content shape."

### 8.6 Navigation

| Element | Mobile | Web (≥ 800 dp) |
|---|---|---|
| **App bar** | Top, 56 dp; back / title / actions | Same |
| **Bottom nav** | 4 tabs: Home · Transactions · Accounts · More | Replaced by sidebar |
| **Sidebar** | n/a | Left rail, 4 entries + inline sub-menu for "More" |
| **FAB** | Bottom-right above bottom nav, on Home / Transactions / Accounts / Project detail | Same, anchored to content column |
| **Tab bar** | Inside detail pages (Account detail, Project detail) | Same |

### 8.7 Modals & sheets

| Variant | Mobile | Web |
|---|---|---|
| **Bottom sheet** | Slides up; drag handle; partial / full snap | Centered dialog (no drag) |
| **Dialog** | Centered, dimmed backdrop | Same |
| **Confirm dialog** | Title · body · Cancel / Confirm | Same |
| **Snackbar** | Bottom, 4-second default; action allowed | Same; bottom-right on web |

### 8.8 Indicators

| Indicator | Use | States |
|---|---|---|
| **Linear progress** | Budget utilization, saving goal | Color shifts at 80% (warning) and 100% (over) |
| **Circular progress** | Saving goal hero | Animated to current value on enter |
| **Skeleton shimmer** | Loading | Per-component shapes |
| **Avatar** | Contact, project member, user | photo · initials · icon-fallback |
| **Badge** | New / count / status | dot · numeric · text |

### 8.9 Specialty widgets

| Widget | Purpose |
|---|---|
| **`AmountText`** | Formatted amount: currency symbol + tabular figures + sign + color (expense/income/transfer) |
| **`AmountInput`** | Numeric keypad-style entry with currency prefix |
| **`SplitEditor`** | Multi-row editor: contact + amount, fixed/percent toggle, sum validator |
| **`CategoryPicker`** | Hierarchical 3-level tree picker; system categories collapsible |
| **`AccountPicker`** | Bottom sheet / dropdown of user's accounts |
| **`ContactPicker`** | Autocomplete with "create new contact" inline + free-text ad-hoc option |

---

## 9. Motion & feedback ✅

- **Page transitions** — platform default (Material on Android; native browser on web)
- **Modal entry** — bottom sheet slides up 200 ms; dialog fades in 150 ms
- **List row tap** — instant feedback (ripple); navigation in next frame
- **Save success** — snackbar slides up; haptic medium impact on mobile
- **Save error** — snackbar slides up (longer duration, with Dismiss); no haptic
- **Pull-to-refresh** — standard platform indicator
- **Skeleton ↔ content** — fade swap, 100 ms; if loading resolves < 100 ms, skip skeleton entirely (avoid flash)

### 9.1 Splash screen 🟡 (placeholdered)

- **Layout:** centered logo wordmark (~96 dp tall) + small 24 dp circular indeterminate progress indicator below the wordmark; surface background; safe-area aware
- **Min display duration:** **600 ms** (prevents flashy < 200 ms resolves on warm starts)
- **Animation:** logo fades in from 80% opacity → 100% over 200 ms on first paint
- **Web:** centered in a max-360 dp column for visual consistency with mobile

---

## 10. Accessibility ✅

| Concern | Spec |
|---|---|
| **Color contrast** | All text passes WCAG AA against its surface |
| **Touch targets** | Minimum 48 × 48 dp |
| **Text scaling** | Layouts must hold up to `textScaleFactor` 1.5×; designer should test at 1.3× |
| **Screen reader** | Every interactive widget has a meaningful semantic label |
| **Focus order** | Forms tab through fields in document order; submit button is last |
| **Haptics** | Medium impact on save / delete / error (mobile only) |

---

## 11. Responsive — mobile vs Flutter web

The mobile app is the primary surface. Flutter web is a same-codebase shell that adapts:

| Aspect | Mobile | Flutter web |
|---|---|---|
| Width | Phone (~360–430 dp) | Up to 720 dp content column on wider viewports |
| Nav | Bottom tab bar | Sidebar (≥ 800 dp); bottom nav fallback below |
| Modals | Bottom sheets | Centered dialogs |
| Forms | Single-column | 2-column where sensible (still readable on narrow web) |
| FAB | Floating bottom-right | Anchored to content column right edge |
| Back | System gesture / back arrow | Browser back + app bar back arrow |

The **dedicated web product** for power-user management (Nuxt) is a separate codebase and is out of scope for this folder.

---

## 12. Open decisions for designer — **ALL placeholdered**

Standards locked AND brand-specific items placeholdered with concrete values. Designer (when commissioned, or you later) replaces selectively. **Nothing here is a blocker** — Phase 0 ships with these placeholders.

| Item | Status | Placeholder value |
|---|---|---|
| Brand color hex | ✅ locked | `#00A389` |
| Type scale | ✅ locked | Material 3 Type Scale |
| Spacing scale | ✅ locked | 4 / 8 / 16 / 24 / 32 / 48 dp (8-pt grid) |
| Color tokens | ✅ locked | Material 3 `ColorScheme.fromSeed` from `#00A389` |
| Iconography | ✅ locked | Material Symbols (outlined) |
| Component states | ✅ locked | Material 3 defaults; document only deviations |
| State-pattern widget structural layout | ✅ locked | Centered icon + text + CTA pattern |
| Voice & personality | 🟡 placeholdered | See §1.1 — working brand statement reads acceptably as-is |
| Logo | 🟡 placeholdered | Text wordmark "ChubiPocket" + "C" mark in `#00A389`; see §2 |
| Primary font | 🟡 placeholdered | System fonts (no bundled custom font) |
| 12-color palette for accounts/categories | 🟡 placeholdered | Material 3 tonal-60: red / pink / purple / deep purple / indigo / blue / light blue / cyan / light green / amber / orange / brown — see §3.4 |
| State-pattern widget visuals | 🟡 placeholdered | Material `error_outline` icon for errors; per-page Material icons for empty; see §8.5 |
| Skeleton shapes per list item | 🟡 placeholdered | Per-row anatomy speced for TransactionRow / AccountCard / etc. — see §8.5.1 |
| Splash screen design + duration | 🟡 placeholdered | Centered logo + progress indicator; 600 ms min display; see §9.1 |
| Empty-state illustration set | 🟡 placeholdered | Material icon (64 dp) — line art, no custom illustration; replace with branded illustrations Phase 2+ |
| Onboarding hero illustration | — | Phase 2 scope; skip in Phase 0 |
| Dark mode color tweaks | 🟡 placeholdered | Auto-derived from `ColorScheme.fromSeed`; tonal-80 for custom palette in dark mode; verify in Phase 2 |
| Preset user icon library | 🟡 placeholdered | Letter initials in colored circle (default); curated geometric presets optional — see [`screens/settings/edit-profile.md`](screens/settings/edit-profile.md) |

**Outcome:** Phase 0 build can proceed with no Designer-blocking items. When a real designer (or you with design skills) refines anything, they overwrite the corresponding placeholder. The rest stays.

---

## Status

- **Phase** — fully placeholdered; Phase 0 build proceeds without designer
- **Last updated** — 2026-04-26
- **Version** — 0.3 (all Designer items placeholdered with concrete values: 12-color palette, logo direction, splash design, state-pattern widget visuals, per-row skeleton anatomy, preset avatars; nothing blocks Phase 0 ship; Designer replaces selectively when commissioned)
- **Version 0.2** — Material 3 standards explicitly locked
- **Version 0.1** — initial scaffolding with all values as placeholders
