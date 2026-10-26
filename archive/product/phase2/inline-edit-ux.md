# Phase 2 — Inline-edit UX model (cross-cutting)

A cross-cutting UX rework for how users **view and edit a single record**
across every module. It replaces the current `list → detail → separate
edit page` flow with a unified **editable-detail + reorder-style action
bar** model, reusing the interaction language categories' reorder mode
already established.

This is a Phase 2 (UX polish) workstream per [`../phases.md` §Phase 2](../phases.md).
It is **overall / app-wide** — the pilot is `categories` + `tags`, then it
rolls out to every CRUD module.

---

## Why

Today every module is three screens: a **list**, a read-only **detail**,
and a separate **edit form** at `/:id/edit`. Editing means navigating away
to a dedicated page. Two problems:

1. Editing feels heavy — a full context switch for changing one field.
2. Form pages are pushed *inside* the shell, so the shell's bottom nav
   stacks under the form's own save bar (the "double bottom bar" bug).

The fix collapses **detail and edit into one screen**: the detail page is
directly editable in place, committed via a contextual bottom action bar —
the same Cancel · Undo · Save bar categories' reorder mode uses.

---

## The model (all modules)

### 1. List page — unchanged, inside the shell

- Lives inside `MainShell` → bottom nav visible.
- Shows the records; **long-press → reorder mode** where ordering matters
  (categories already has this).
- `+` → opens an empty detail page in create mode.

### 2. Detail page = editable in place — above the shell, no bottom nav

- Tap a record → its detail page. **View mode by default**: clean,
  read-only display. No action bar.
- The page is a **full-screen surface above the shell** (pushed on the
  root navigator) → **no bottom nav** on this screen. It is an editing
  surface, not a nav destination.
- Enter **edit mode** two ways (mirrors reorder's button + long-press):
  1. **Edit button** (visible, discoverable — the primary path).
  2. **Long-press any editable element** → enters edit mode **and** jumps
     straight into editing that element (e.g. long-press the icon → enter
     edit mode + open the icon maker in one gesture).
- Once in edit mode (entered either way), **all fields become editable**,
  not just the long-pressed one — exactly like reorder makes every row
  draggable on entry.
- The **action bar appears on entering edit mode** (not on first change),
  matching reorder: Save disabled until dirty, Undo hidden until there's
  history.

### 3. Reorder mode — unchanged

Categories keeps its in-place reorder mode + `ReorderActionBar`. Other
lists adopt it if/when they grow a reorder need.

---

## Action bar — reuse `ReorderActionBar`

The edit-mode bar **is** the existing
[`shared/widgets/reorder_action_bar.dart`](../../../chubi-pocket-app/lib/shared/widgets/reorder_action_bar.dart):
**Cancel · Undo · Save**, same styling (outlined Cancel + filled Save,
filled-tonal Undo that scales in/out). This gives one visual language for
*every* mutation in the app — reorder or field edit.

| Control | State |
|---|---|
| **Cancel** | always enabled in edit mode |
| **Undo** | shown only when there is history to undo |
| **Save** | enabled only when dirty |

### Exit paths

- **Save** → commit, leave edit mode, back to view mode (create: see below).
- **Cancel** → revert all changes, leave edit mode, **stay on the detail
  page** in view mode.
- **Undo until empty** → equivalent to Cancel automatically: bar hides,
  exit edit mode.
- **Back arrow** (top-left) is *not* Cancel — it **leaves the page** to the
  list. If dirty, confirm-discard first.

### Create mode (`+`)

- Opens the detail page empty, already in edit mode.
- **Cancel** (nothing to revert to) → discard the draft and pop back to the
  list.
- **Save** → create, pop back to the list.

---

## Undo rules

Snapshot-based, mirroring reorder (`_inModeUndoStack` = list of full-state
snapshots), with form-specific granularity:

- **One undo step = one completed field action.**
  - Switch / toggle / dropdown / chip / icon pick → **1 step, immediately**
    (one discrete action).
  - **Text / number fields** → coalesced per typing session: a session
    closes into **1 step** when the user **pauses for 0.5 s** (debounce)
    **or** performs any other action before 0.5 s (switch field, toggle,
    save, etc.) — the pending text is cut into a step immediately.
- **Undo while mid-typing** (session not yet committed) → reverts the
  **current session** back to the field's value at the start of that
  session. It does **not** touch previously committed steps.
- **Undo with no live session** → pops the last committed step as normal.
- **Unlimited history** — undo until the record is back to its original
  state (no 5-step cap; reorder keeps its cap, forms do not).
- Reaching the original state (stack empty) → **auto-cancel + exit mode**.

Implementation note: a pending (uncommitted) text session must be flushed
or reverted deterministically before any Undo so state can't desync.

---

## Inline vs modal fields

> Whatever can be edited in place, edit it in place. Only genuinely rich
> pickers open a modal.

| Edit **inline** (in place) | Open a **modal** |
|---|---|
| text, number, multiline (note / description) | icon maker (icon + color picker sheet) |
| switch / toggle | heavy pickers if introduced later (e.g. date, large-tree selectors) |
| chips (e.g. type: expense / income) | |
| simple dropdowns (e.g. parent category) | |

### Pilot modules — field map

| Field | categories | tags |
|---|---|---|
| icon | **modal** (icon maker) | **modal** |
| name | inline | inline |
| type (chips) | inline (immutable on edit) | — |
| parent (dropdown) | inline | — |
| description | inline | — |
| note | inline | — |
| include in report (switch) | inline | — |

→ For cat/tag, **only the icon opens a modal**; everything else is inline.

---

## Routing / shell implications

- **Detail (editable) pages move onto the root navigator** (above the
  shell) so they carry no bottom nav. Use `parentNavigatorKey:
  rootNavigatorKey` + a full-screen-dialog transition (slide up).
- **`/:id/edit` routes are removed** — detail *is* the editor. `/:id` opens
  the editable detail; `/new` opens it empty in create mode.
- **List + reorder stay inside the shell** (bottom nav visible).
- This removes the double-bottom-bar bug app-wide as a side effect, since
  edit surfaces no longer inherit the shell's nav.

---

## Rollout

1. **Pilot: `categories` + `tags`** — smallest surface (only the icon is
   modal), and they're where the double-bar bug surfaced. Build here, tune
   the feel (debounce, long-press targets, bar timing).
2. **Group B — rich-detail modules:** `accounts`, `transactions`,
   `projects`, `budgets`, `scheduled_transactions`, `saving_goals`,
   `contacts`, `personal_debts`. These currently have read-only dashboard
   detail pages (balances, charts, sub-lists, actions). Per module, decide
   **which fields become inline-editable vs stay read-only display + their
   own actions**. This is real per-page design work, not mechanical.

---

## Known risks

- **Long-press is a hidden gesture.** Discoverability is carried by the
  visible **Edit button**; long-press is only a power-user shortcut (same
  rationale as reorder's long-press). Acceptable because the button exists.
- **Group B detail pages mix editable fields with computed/read-only
  content.** The editable-detail model must cleanly separate "editable
  record fields" (Save acts on these) from "display + action" sections
  (balances, history, members). Design per module.
- **Debounced text sessions + undo** have subtle timing (flush-before-undo).
  Nail this in the pilot before rolling out.

---

## Relationship to the "double bottom bar" bug

The original trigger for this work: `categories` and `tags` list pages show
two stacked bottom bars. That has two parts, tracked separately from this
UX model:

1. **List pages add a redundant `MainBottomNav`** (only cat/tag do this; all
   other deep lists rely on the shell). → remove the duplicate.
2. **Categories reorder mode** needs the shell to hide its nav while the
   `ReorderActionBar` is shown. → a `ShellChromeController` lets a page tell
   the shell to drop its chrome temporarily.

The **form** side of the bug is fixed for free by this model (edit surfaces
move above the shell). The two list items above are still pending fixes.

---

## Status

- **Created** — 2026-10-02
- **Status** — **UX locked, not yet built.** Model agreed; pilot is
  `categories` + `tags`. Implementation not started.
- **Canonical scope** — Phase 2 scope lives in [`../phases.md`](../phases.md);
  this doc is the kickoff spec for the inline-edit workstream.
