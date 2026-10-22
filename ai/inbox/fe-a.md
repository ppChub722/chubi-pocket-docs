## 2026-10-11 — fe-a ui round (tx form / detail / quick create / splits)
DONE · analyze/test: full suite 318 pass; analyze clean for my files (2 issues in categories_page.dart:376, not mine; the transaction_tile unused import seen earlier is gone)
files: transactions/presentation/{widgets/tx_compact_hero, quick_create_sheet, draft_form, splits_section, tx_hero_card (doc only), pages/transaction_detail_page, save_failure (new)}; contacts/presentation/{widgets/contact_picker_sheet, pages/contact_detail_page}; arb (+3 keys, th+en); tests: splits_section_test (updated + 2 new), tx_compact_hero_test (new)
- #1 compact bar: no type chip; title = description ?? category ?? type label; category chip after a "·" (max 120 wide), only when there is a description (never repeats the title); none for a transfer. Amount unchanged.
- #2 quick create: NEW tx only. Once the hero amount scrolls out of view the title cross-fades to amount · category (TxSummaryTitle, tap = scroll to top). Scheduled / event / draft keep text titles. Per Lead: exception to "titles never change" for this sheet.
- #3 splits: avatar 36 (was 20); ⟳ "อัตโนมัติ" is an icon-only toggle in the ฉัน row's ✕ slot (tooltip, primary highlight when on); avatar tap → contact picker; name = text input for typed names (≤100, hint "ชื่อ"), plain same-size text for contacts (tap → picker), app-linked locked (🔒 + tap hint); "+ เพิ่มคน" adds an empty typed row, name focused; ฿ hugs the number, whole 44px underlined box focuses the field.
  Picker: new `allowCreate` → "สร้างผู้ติดต่อใหม่" footer pushes ContactDetailPage(popOnCreate) over the picker (root Navigator); saving pops with the contact → picked. Splits call allowFreeText:false + allowCreate:true; debt / member callers untouched (ContactNameTyped kept).
- #8 detail view: category · wallet cards moved out of the hero (footer no longer used there) to a row below it, same as the edit page; long-press enters edit.
- #12 note: label "โน้ต" left, input right (DraftFieldRow) in the quick create + detail view + edit; long notes wrap in the right column; always-shown + long-press hint kept.
- Kit adopted: SavingOverlay around quick create sheet (all save/draft/discard calls), tx detail page (save + delete; delete now goes through setSaving) and contact detail/create page (save + delete). Failures stay on the page via `showSaveFailure` (new, transactions/presentation/save_failure.dart): transport / 5xx → showErrorSnackBar with retry; a 4xx keeps the specific message (wallet / split / event text), no retry.
deviations/notes:
- Contact picker with allowFreeText:false now shows "ยังไม่มีผู้ติดต่อ" (the old empty text said "type a name above").
- A split row picked as a contact can't go back to a typed name (remove + add) — the picker no longer offers typed names.
- lib/dev/compact_hero_demo.dart doc comment still says "[type chip] description …" (gallery = FE-B); the gallery tx demo itself follows txCompactHeroBar so it updates automatically.
- Not changed: "แก้ร่าง" draft layout; load-failure AsyncStateView (detail pages load from the cubit already; no new load path added).

## 2026-10-11 — Chip survey (read-only, no edits) for the AppChip migration
Counts = call sites in lib/ outside lib/dev (the gallery adds ~250 more references, see §5). "Height" = what ships today.
**Totals: ~99 usages · 77 → AppChip (+3 already AppChip) · 19 NOT AppChip.**

### 1+2. Inventory and verdict per widget / usage

| Widget (def) | Where (file ×n) | Shows | Interactive? | Height today | → Verdict |
|---|---|---|---|---|---|
| **RowChip** (chips/chip_row.dart) ×8 | tx_filter_sheet ×4 (ทั้งหมด + 3 type chips), pick_chip_rows WalletChipRow ×1 (wallet, avatar leading), identifier_widgets ×1 (kind picker, ▾), chip_row.dart ×1 ("เพิ่มเติม" ⋯), TxTypeChip ×1 | `[icon\|avatar] label [🔒\|▾]`, selected = tint + border | yes (pick) | 32 | **AppChip control 32**. Type chips: tone income/expense/transfer; wallet: `leading:`; ▾ → `trailing: dropdown`; 🔒 → `lock` |
| **TxTypeChip** (tx_hero_card.dart) ×1 | tx_hero_card (hero top row; 8 more in gallery) | − รายจ่าย / + รายรับ / ⇄ โอน, 🔒 when saved | yes (create) / display (saved) | 32 (HeroSpacing.controlHeight) | **AppChip control 32**, tone by type, `trailing: lock` + tooltip. **FE-B overlap** (hero top row) |
| **_DatePill** (tx_hero_card.dart) ×1 | tx_hero_card hero top row | 📅 วันนี้ (read-only in view) | yes (edit) | 32 | **AppChip control 32** (icon, neutral, selected false). **FE-B overlap**. Own stadium, surface fill today |
| **LabelPill** (pill.dart) ×9 | account_detail ×2 (wallet type outlined + "แชร์กับ n"), wallet_members_view ×1 (role), categories_page ×1 + category_detail ×1 ("ซ่อนจากรายงาน"), contact_detail ×1 ("เก็บถาวร"), ContactLinkedPill ×1, tx_compact_hero ×1 (category chip), TypeIndicator(pill) ×1 (category hero), +n in PillOverflowRow | what kind of thing; tinted fill, no border (unless `outlined`) | display | 32 | **AppChip display**: `selected: true`, tone/color. Size = **control 32 in a hero top row** (account, category, contact), **chip 28 elsewhere** (rows, members, compact bar) |
| **StatusPill** (status_pill.dart) ×8 | debt_widgets ×4 (open/settled/cancelled/overpaid), project_common ProjectStatusPill (×1 def; used projects_page, project_detail ×2), scheduled detail ×1 (tappable ▾), wallet_members_view ×1 (pending), project_members_page ×1 (role) | `● label` in a tone; tappable = status picker ▾ | display; 2 tappable (project, scheduled) | 32 | **AppChip**: `dot: true`, tone, `selected: true`, tappable → `trailing: dropdown`. Hero ones = control 32 (FE-B moves them to the top row); debt row / member rows = chip 28 |
| **ActionPill** (filter_chips.dart) ×8 | account_detail ×2 (ปรับยอด raised, + identifier), archived_accounts ×1 (restore), pending_page ×1 (import slip), tags_page ×2 (bulk colour / icon), splits_section ×2 (+ เพิ่มคน, หารเท่ากัน) | icon + label button | yes (action) | 32 | **AppChip control 32**: tone primary/danger, `selected: true` (tinted look). `raised` style = gap (§4) |
| **ChoicePill** (pill.dart) ×5 | category_detail ×1 helper (×2 calls, expense/income), transactions_list_page `_FiltersButton` ×1 (+ Material `Badge`), day_of_month_picker ×2, period_sheet via **ChoicePillRow** ×1 | one option of a pick-one row | yes | 32 | **AppChip control 32**; `_FiltersButton`'s corner Badge → `trailing: count` |
| **FilterDropdownChip** (filter_chips.dart) ×18 | accounts_page, account_detail ×2 (incl. `_dayChip`), auth_widgets, categories_page ×2, contacts_page ×3, pending_page, personal_debts_page, projects_page, project_tx_list_tab, tags_page ×3, transactions_list_page, period_summary_card | "สี ▾", "สถานะ: ค้างอยู่ ▾", "ทั้งหมด (3) ▾"; active = primary tint | yes (opens menu/sheet) | 32 (right pad 4, ▾ 20) | **AppChip control 32**: `trailing: dropdown`, `selected: active`, label composed by caller ("label: value"); "(n)" → `trailing: count` is a visual change (§4). Always inside `FilterBar` |
| **SortChip** (filter_chips.dart) ×1 | project_tx_list_tab (FilterBar trailing) | ⇅ name ▾, borderless | yes | 32 | **AppChip control 32** (icon sort, neutral, dropdown). Gets a border it doesn't have now (decide: OK?) |
| **TagChip** (tag_chip.dart) ×7 | tags_page ×3 (list/edit preview), tag_picker_sheet ×1, draft_form TxTagStrip ×1 (detail view tags), draft_form_event `_EventTags` ×1, pick_chip_rows TagChipRow ×1 | `[icon] name` in the tag colour; tri-state `selected` null/true/false | display or toggle | 32 | **AppChip**, `color:` = tagColor. null → `selected: true, onTap: null`. Display in detail view = chip 28; picker/toggle rows = control 32 |
| **CategoryChip** (category_chip.dart) ×1 | pick_chip_rows CategoryChipRow (form + filter sheet) | `[icon] name` in the L1 colour | yes (pick) | 32 | **AppChip control 32**, `color:` from CategoryTree.resolveIconCode |
| **_ActiveFilterChip** (transactions_list_page) ×1 | tx list, under the search | active filter + ✕ | yes (✕ removes) | 32 | **AppChip control 32**: `trailing: remove`, `selected: true` |
| **_VariantPill** ×2 (copies) | scheduled_card ×1, scheduled detail ×1 | "ผ่อน / เกิดซ้ำ / กู้" quiet grey label, radius 999, labelSmall, ~20 high | display | ≈20 (padding 2) | **AppChip display**: `tone: neutral`, card = **mini 20**, detail hero subtitle = **chip 28** (control 32 if FE-B puts it in the top row). Delete both copies |
| **Material ActionChip** ×4 | debt_widgets ×2 (ชำระทั้งหมด / ครึ่งหนึ่ง), draft_form_event ×1 (+ แท็กใหม่, avatar icon), amount_field ×1 (quick-fill loop) | one-tap actions | yes | 32 (M3 default) | **AppChip control 32** (icon, neutral/primary, not selected) |
| **Material FilterChip** ×1 | project_tx_list_tab ("เฉพาะฉัน") | toggle | yes | 32 | **AppChip control 32**, `selected` |
| **Material ChoiceChip** ×2 (loop) | icon_maker_sheet pack filter | pick-one | yes | 32 | **AppChip control 32** |
| **AppChip** (already) ×3 | tx_row wallet (mini), pending_page source (mini, tone info/primary), theme_mode_chips (loop ×3) | | | 20 / 32 | stays; just re-check sizes against the rule |
| **ChipRow** / **FilterBar** / pick_chip_rows (CategoryChipRow, TagChipRow, WalletChipRow) | ChipRow ×4 (3 rows + filter sheet), FilterBar ×8 | layout: scrolling or `maxLines`-wrapping rows; `_LimitedWrap`, `ChipOrder`, skeleton chips | — | uses `PillSize.normal.height` for skeletons | **NOT chips, stay.** Children become AppChip; the skeleton height must follow the chosen size |
| **TagPill**, **PillOverflowRow**, **TagShortList** | 0 prod usages (gallery / tests only) | | | mini | **delete** (tx-row tags use mini AppChip, FE-B) |
| **AppBadge** ×7 | auth_widgets "เร็วๆ นี้", notification_settings ×1, notification_tile ×1 ("ยอมรับแล้ว"), saving_goal_card ×2 (% , "สำเร็จ"), saving_goal_detail ×1 ("สำเร็จ") | small rectangular label (radius 4), ~16 high | display | ~16 | **NOT AppChip** (counter / tiny status; AppChip's own doc says so). **Question Q1**: the 3 status ones ("เร็วๆ นี้", ยอมรับแล้ว, สำเร็จ ×2) could be mini AppChip (tone success/info) so there is ONE look; the % stays a badge |
| **MonthPill** ×1 (home), **PeriodPill/TxPeriodPill** ×1 (tx list) | `‹ label ▾ ›` stepper, surface + shadow | steppers | 36 + 8 pad | **NOT AppChip** (segmented stepper, not a chip). Flag: 36 high vs control 32 |
| Badges on avatars/icons: **CornerBadge** ×3, **TintedIconBadge** ×2, **SharedWalletIconBadge** ×2, PersonLinkBadge/PersonMark | notification tile, project tx tiles, money_list_tile, more_page, home, wallet cards | avatar decorations | — | — | **NOT AppChip** (avatar marks) |
| Material **Badge** ×2 (app_icon_button, app_tab_bar) | counters on icons/tabs | | | | **NOT AppChip** |
| Top bar `_UniversalChips` (⏳🔔👤) ×1 | app_top_bar | icon circles | yes | — | **NOT AppChip** (icon buttons despite the name) |
| ✏️ in HeroTopRow (AppIconButton) | every hero | | | 32 | **NOT AppChip** (button; sits beside the chips at control height) |

### 3. Size rule (proposal, one line each)
- **mini 20** — chips that ride on a dense list row next to text (tx / pending row: wallet, source, tags; scheduled card label) — display only, never the only tap target.
- **chip 28** — display chips (status, type, label, tag) inside cards, detail-page sections, member / debt rows and the compact hero bar, and any small tappable chip that is not a control.
- **control 32** — anything the user operates (filter / pick / choice / action chips, form chip rows, theme chips, ✕-removable filters) AND every chip in a hero top row, so it lines up with the 32 date pill and ✏️ (HeroSpacing.controlHeight).
- Default stays 32 (today's behaviour); 28 and 20 are always passed on purpose. Suggest renaming `PillSize.normal` → `control` when the old widgets are gone.

### 4. Gaps in AppChip today (what callers need that it cannot do)
1. **Tap target:** the InkWell is the visible shape, so a tappable 28 (or 20) chip has a ~28 hit area. Needs `materialTapTargetSize`-style padding or a min 44 hit box for interactive chips (invisible).
2. **`raised` look** (ActionPill `ActionPillStyle.raised`: surface fill + shadow, the wallet hero's "ปรับยอด") — no equivalent; either an `elevated` flag or drop the shadow (owner call, 1 site).
3. **Filled/quiet label look:** LabelPill/StatusPill/TagPill/_VariantPill are tint-filled with NO border (grey `surfaceContainerHighest` when neutral); AppChip is outlined (unselected = outline only, neutral selected = border + faint fill). Approved as one look, but it is a visible change in lists (categories "ซ่อน", member roles, scheduled label) — needs an owner OK on a screen, not a code gap.
4. **FilterDropdownChip text forms:** "label: value" and "label (n)" are caller-composed strings today; AppChip offers a count *badge* (`trailing: count`) instead of "(2)". Decide: badge everywhere, or allow `(n)` text. `active` ≠ `selected`-by-tap semantics are fine (map active → selected).
5. **Arbitrary trailing icon:** RowChip.trailingIcon takes any icon; AppChip's trailing is the 5-value enum (none / dropdown / remove / lock / count). Today only ▾ and 🔒 are used, so no real gap.
6. **Tone mapping:** `Tone` (status tones, used by `projectStatusTone`, debts, scheduled, member pills) ≠ `AppChipTone` (adds transfer / walletAsset / walletLiability, lacks nothing else). Need a `Tone → AppChipTone` helper (or callers switch type) — tiny.
7. **Max width:** callers wrap in ConstrainedBox (120) for ellipsis; a `maxWidth` param would remove 4 such wrappers (tx_row, tx_compact_hero, …).
8. **Skeleton / measurement:** `_skeletonChips()` and `_LimitedWrap` assume `PillSize.normal.height`; they need the row's size (a `size` arg), not a hard-coded 32.
9. **Disabled look:** ActionPill/FilterDropdown fade to 0.4, AppChip 0.38 — fine, cosmetic.
10. **Icon-only chip** (no label): none needed today.

### 5. What gets deleted once everything is migrated
- `pill.dart`: LabelPill, ChoicePill, ChoicePillRow (inline a Wrap in period_sheet), TagPill, PillOverflowRow, PillShell, PillContent (keep `PillSize`, maybe renamed).
- `status_pill.dart`: StatusPill (keep **AppBadge**).
- `filter_chips.dart`: FilterDropdownChip, SortChip, ActionPill + ActionPillStyle (keep **FilterBar**).
- `chip_row.dart`: RowChip (keep ChipRow, ChipOrder, `_LimitedWrap`).
- tag_chip.dart: TagChip, TagShortList (keep `tagColor`); category_chip.dart: CategoryChip; tx_hero_card.dart: TxTypeChip, `_DatePill`; transactions_list_page `_ActiveFilterChip`; both `_VariantPill`s.
- Thin wrappers → one-line builders or inline: ProjectStatusPill, debtStatusPill, ContactLinkedPill, TypeIndicator(pill variant; `sign` stays).
- Tests: test/shared/pill_test.dart (rewrite onto AppChip), chip_row_test / pick_chip_rows_load_test / tx_hero_card_test (type names), tx_compact_hero_test (LabelPill finder).
- Gallery: lib/dev/app_chip_tab.dart is a 979-line old-vs-new comparison with copies of private chips (`_OldActiveFilterChip`, `_DatePill`, `_VariantPill`) → shrink to the AppChip playground; widget_gallery_screen.dart + detail_patterns_tab.dart have ~100 references to the old widgets (RowChip 10, LabelPill 16, StatusPill 26, ActionPill 21, TagPill 7, ChoicePill 5, FilterDropdownChip 30 …) — FE-B owns them, so they must be re-pointed in the same step or the tree stops compiling.

### 6. Migration plan
**Rule of thumb:** keep the tree compiling after every batch; analyze + the touched tests per batch, full suite at the end; one batch = one review for the owner.

- **Batch 0 — AppChip gaps (kit, FE-B / grant): ~3 files** (app_chip.dart, pill.dart sizes, gallery). Tap-target padding, `maxWidth`, `Tone→AppChipTone`, decide raised + count-vs-"(n)". Nothing else starts before this.
- **Batch 1 — wrap, don't rewrite (kit, ~7 files):** make RowChip, LabelPill, StatusPill, ActionPill, ChoicePill, FilterDropdownChip, SortChip, TagChip, CategoryChip, TxTypeChip *thin wrappers over AppChip* (same constructors). The whole app re-skins at once with ~0 call-site edits, so the owner can review the real screens early, and sizes are decided in the wrappers. Risk: this is the batch that changes every screen; do it behind one owner review.
- **Batch 2 — filters (~12 files):** FilterDropdownChip ×18 → AppChip + SortChip + FilterBar call sites (accounts, auth, categories, contacts, pending, debts, projects, project_tx_list_tab incl. Material FilterChip, tags, tx list, period_summary_card). Mechanical.
- **Batch 3 — transaction forms (~8 files):** tx_filter_sheet, pick_chip_rows (+ skeleton height), TagChip/CategoryChip/RowChip rows, `_ActiveFilterChip`, `_FiltersButton`, TxTagStrip, `_EventTags`, splits_section pills. **Risky:** ChipRow `_LimitedWrap` + chip_row_test + pick_chip_rows_load_test depend on chip height; ChipOrder untouched.
- **Batch 4 — actions & choices (~9 files):** ActionPill ×8, ChoicePill ×5 (+ ChoicePillRow in period_sheet), day_of_month_picker, Material ActionChip ×4 / ChoiceChip ×2.
- **Batch 5 — status / label pills on detail pages (~12 files): FE-B's area** — account_detail, category_detail (TypeIndicator), contact_detail, project_detail, project_common, scheduled_card + scheduled detail (`_VariantPill`), personal_debt_detail + debt_widgets, project_members_page, wallet_members_view, categories_page, saving goal AppBadge (Q1).
- **Batch 6 — delete + cleanup (~10 files):** remove the old widgets/wrappers, pill_test rewrite, shrink app_chip_tab, re-point the gallery, rename `PillSize.normal → control`, full analyze + full suite.

**Overlap with FE-B's detail-page migration (hero top-row chips):** FE-B moves the status / type / label chips of every HeaderCard hero (wallet, category, contact, project, scheduled, debt, plus tx_hero_card's type chips + date pill) into `HeroTopRow`. Those are exactly Batch 5 plus `TxTypeChip` / `_DatePill` in Batch 1/3. To avoid collisions:
1. **I do not edit** account_detail_page, category_detail_page, contact_detail_page, project_detail_page, scheduled_transaction_detail_page, personal_debt_detail_page, debt_widgets, saving_goal_detail_page, budget_detail_page, tx_hero_card, tx_compact_hero until FE-B reports done on them.
2. Order: Batch 0 → Batch 1 (wrappers, so FE-B's moved chips are already AppChip underneath, whichever widget name they use) → FE-B's hero migration and my Batches 2–4 in parallel (disjoint files) → Batch 5 leftovers (the non-hero chips in those same files: dropdown day chips, identifier ActionPill, member pills) after FE-B → Batch 6.
3. FE-B should build the hero chips directly with `AppChip(size: control)` rather than the old pill names, so Batch 5 only has to touch what FE-B didn't.

### Questions for Lead / owner
- **Q1** AppBadge: keep all 7 as badges, or turn the 3 status ones (เร็วๆ นี้, ยอมรับแล้ว, สำเร็จ ×2) into mini AppChips (the % stays a badge)? My lean: mini AppChip for the status ones.
- **Q2** FilterDropdownChip "(n)": count badge or keep "label (n)" text?
- **Q3** The wallet hero's raised "ปรับยอด" (shadow): keep an `elevated` flag or drop the shadow?
- **Q4** Quiet labels lose their fill (outlined only) — OK on a real screen, or keep a filled neutral variant?
- **Q5** Wrapper-first (Batch 1) vs rewriting call sites directly — my recommendation is wrapper-first.

## 2026-10-11 — Items 11/13: pending add page + แก้ร่าง sheet (one chip layout)
DONE · analyze/test: full analyze clean, full suite 330 pass
files: transactions/presentation/widgets/{draft_form (chipLayout, _chipBody, _DraftExtras, controller projectId/projectName/keepIncomplete), quick_create_sheet, event_pick (allowCreate), pick_chip_rows (pickLabel, excludeId)}; shared/widgets/chips/{app_chip (dashed, maxWidth, tap band, fromTone), chip_row (moreFirst)}; pending/{domain/pending_transaction (project_id), pages/pending_batch_add_page, pending_errors}; arb +15 keys (th+en); tests: draft_chip_layout_test (new, 6), app_chip_test (+5)
- One layout for both: `DraftForm(chipLayout: true)` = hero → wallet chip row ABOVE category chip row, each with a dashed first chip ("เลือกกระเป๋า" / "เลือกหมวด", AppChip dashed) that opens the full picker → tags row → inline note row (โน้ต left, input right) → collapsible "หารกับ / อีเวนต์" (closed by default; closed = one-line summary "หารกับ 2 คน · ทริป…" or muted "ไม่ได้ตั้ง"; open = the split editor + event row, same pieces as quick create). A transfer: two wallet rows (จาก / ไป dashed chips, the other side excluded), no category, no extras. Tapping the picked wallet chip again clears it (wallet optional).
- แก้ร่าง sheet: uses it (quick create keeps its cards); ลบ = red trash IconButton (tooltip "ลบ"), no label.
- Pending add page: each row uses it; the row ✕ is bigger (24 icon, 48 target) and only shows with several rows; SavingOverlay + showSaveFailure on save.
- Event = `draft.project_id` (existing events only → event sheet `allowCreate:false`, no "create new"); PendingDraft reads/writes it (omitted when none; PUT replaces so clearing = omit).
- Splits: a draft saves with half-filled rows (`toDraft(keepIncomplete: true)`: name-only / amount-only rows stay, empty rows go), no question, no balance check. Confirming needs them whole and balanced: sheet `_submitDraft` (existing _problem + incomplete dialog) and the add page's "ยืนยันเลยทั้งหมด" (new local check → txSplitUnbalanced; sends complete rows only).
- BE errors mapped (pendingErrorText): INVALID_SPLIT, SPLITS_EXCEED_AMOUNT, PROJECT_NOT_FOUND / NOT_ACTIVE / LOCKED / NOT_MEMBER / READ_ONLY, TX_NOT_BILLABLE.
- AppChip gained (Batch 0, pinged): dashed, maxWidth, invisible 44px tap band (outermost wrapper; needs room around the chip), AppChipTone.fromTone, skeleton size param.
deviations/notes: the batch add page still has no per-row event/duplicate affordances beyond the collapsible section; "draft with an event" shows the wallet-less case allowed (BE decides on confirm). Assumption to confirm with BE: half-filled split rows are stored in the draft JSON as-is (their note says save accepts any splits).

## 2026-10-11 — AppChip migration (one chip system-wide, old widgets deleted)
DONE · analyze: clean (whole app) · test: full suite 322 pass
Rule applied (approved): mini 20 / chip 28 / control 32; `PillSize.normal` renamed `control` (default), file `pill.dart` → `pill_size.dart`.
- **Deleted:** RowChip, LabelPill, StatusPill, ActionPill (+ActionPillStyle), ChoicePill, ChoicePillRow, TagPill, PillOverflowRow, PillShell, PillContent, FilterDropdownChip, SortChip (+SortOption), TagChip, CategoryChip, TagShortList, TxTypeChip, `_DatePill`, `_ActiveFilterChip`, both `_VariantPill`s, ContactLinkedPill, TypeIndicator (file), `_OldActive…` demo copies, test/shared/pill_test.dart. **Kept:** AppChip, AppChipTone/Trailing, ChipRow + ChipOrder + `_LimitedWrap`, FilterBar (file `filter_bar.dart`), AppBadge (file `app_badge.dart`, only the % counter + status-free labels), tone.dart.
- **Replaced by builders (no widget classes):** `tagAppChip(context, tag, {selected?, onTap, size})` (tag_chip.dart, keeps `tagColor`), `categoryAppChip(context, c, all:, selected, onTap, size)` (category_chip.dart), `txTypeChip(context, type:, selected:, onTap, locked)` (tx_hero_card.dart), `debtStatusChip(context, status, {size})` (debt_widgets.dart).
- **My call sites migrated:** tx hero (type chips + date → AppChip control), tx compact hero (category chip, chip 28, maxWidth 120), tx_filter_sheet, pick_chip_rows (wallet / category / tag), TxTagStrip (chip 28), event tags + "+ แท็กใหม่", splits "+ เพิ่มคน"/"หารเท่ากัน" (tinted, disabled via `enabled`), tx list (sort ▾, active filters with ✕, ตัวกรอง with count badge), period_summary_card, period_sheet unit row (Wrap of AppChip), pending (filter chips, import slip), debts (status chips: row = chip 28, hero = control; overpaid; settle-all/half), icon_maker pack filter, amount_field quick fills, projects_page + project_tx_list_tab sort (OptionMenuAnchor + AppChip ▾), gallery's last SortChip demo.
- **Q1 applied:** status AppBadges → mini/chip AppChip: auth "เร็วๆ นี้" (mini), notification "ยอมรับแล้ว" (mini), notification-settings "บังคับเปิด 🔒" (chip 28), saving-goal "สำเร็จ" (FE-B did). % badge stays AppBadge. **Q2:** counts are the AppChip count badge (ตัวกรอง). **Q3:** ปรับยอด = tinted AppChip (FE-B), no shadow.
- **app_chip_tab.dart** shrunk to the 3-size matrix + playground (979 → ~300 lines).
- Tests: tx_hero_card_test / tx_compact_hero_test / chip_row_test updated to AppChip (chip_row_test needs the AppColors theme now).
notes: dart format ran over lib + test (whole-app churn is in this round's files only). Open risks for the owner's eyes: quiet labels are outlined (Q4); filter chips in `pending_page` keep a ▾ although they switch directly (kept as before); the invisible 44 tap band only widens taps where the parent leaves room.

## 2026-10-12 — /dev tidy-up: PROPOSAL (read-only, nothing edited)
lib/dev today = 8,998 lines: gallery 3,733 · detail_patterns_tab 1,917 · detail_playground 544 · imports lab 1,130 (3 files) · theme_preview 380 · logs 344 · app_chip_tab 293 · reorder_demo 212 · compact_hero_demo 197 · state_widgets 152 · hub 96.
Why it feels like a mess: (1) the hub lists 6 things with no grouping — kit-review and debug tools side by side; (2) the gallery tab called "Chip" is really "pickers, sheets, filter bar, side sheet, update banner, period pills…" (810 lines) and the real chip tab is "AppChip"; (3) three places show the same thing (detail playground ↔ รายละเอียด tab ↔ state-widgets ↔ Feedback tab); (4) leftovers: old-vs-new / "as built today" catalogues whose decisions are made and migrated.

### 1. Today's map (verdict per screen / tab)
| Where | Shows | Verdict · why |
|---|---|---|
| Hub `/dev` (96) | 6 flat cards | **Rework** → 2 groups (below) |
| Widget gallery `/dev/widgets` (3,733) | 13 tabs | **Keep, reorganise** → 10 tabs |
| · รายละเอียด (detail_patterns_tab 1,917) | rules · sample page [ดู\|แก้ไข] · standard heroes (Part 1) + Part 2 catalogue "every variant the app has today" with "= standard / → migrates to X" labels | **Keep Part 1, trim Part 2.** Part 2's hero-as-built catalogue (~280 lines) + the migration labels (~75) are the old-vs-new that the standard + FE-B's migration made obsolete; its chip catalogue (~75) duplicates the Chip tab. Keep the row / list / text / manage / meta / state variants as a plain "building blocks" list |
| · ปุ่ม (~250) | AppButton, AppIconButton, BulkDelete, ChatDial, AddTile, SecretTap | **Keep** (all still used by real pages) |
| · ช่องกรอก (~410) | ThemeModeChips, search, SelectCheck, SelectCardGroup, AmountField, PickerTile, PickCard, MonthPill, AppTextField | **Keep**; flag PickerTile "(older)" (3 users left) |
| · Chip (_ChipsDemo + _PickRowsDemo + _PickerShellDemo, ~810) | filter bar + popovers, status chip menu, selection bar, badge, PeriodPill, side sheet, update banner, picker shell, option sheet, bank / day / event pickers, tx type chips, TxPeriodPill | **Split:** chip things → the Chip tab; everything else → new "Picker & Sheet" tab. Misnamed today |
| · AppChip (app_chip_tab 293) | size matrix + playground (comparisons already removed) | **Merge into "Chip"** (becomes the first half of the one chip tab) |
| · Layout (~470) | SectionCard, breadcrumb, TintedCard, BrandLogo, HeaderCard, SelectableFrame, ListRow, SectionHeader, WalletSummaryTitle, CompactHeroBar, DetailRow, PinnedBar, LockedInEdit, HeroSpacing | **Keep**; **delete the WalletSummaryTitle demo + widget** (0 real users — the compact hero bar replaced it) |
| · Feedback (~510) | pull-to-refresh, SavingOverlay, error snackbar, banner, dialogs, snackbars, ProgressRow, bottom sheet, option sheet (2nd copy), empty state, AsyncStateView | **Keep**; absorb State-widgets screen; drop the duplicate option-sheet demo (also in the Chip tab) |
| · ข้อมูล (~200 + charts 80) | TxRow, MoneyText, SummaryStats, MoneyListTile, MemberStrip, AvatarStack, CornerBadge, charts | **Merge with โดเมน** |
| · โดเมน (~215) | CurrencyTile, TxHeroCard, tag picker, TransactionTile, PeriodSummaryCard, contact picker | **Merge with ข้อมูล** → "ข้อมูล / โดเมน" |
| · ไอคอน (65) + Icon maker (~270) | AppIcons list · IconShape + the maker with presets | **Merge** → one "ไอคอน" tab, two sections |
| · โหมดแก้ไข (130) + จัดลำดับ (reorder_demo 212) | edit-mode demo · reorder kit | **Merge** → "โหมดแก้ไข" (two sections) |
| compact_hero_demo (197) | CompactHeroBar presets used by Layout + รายละเอียด | **Keep** (fix its stale "not wired into real pages" comment — it is) |
| Detail playground `/dev/detail-playground` (544) | mock wallet page with ⚙ switches for row dividers (#16) and section separators (#17) | **Delete.** The A/B was decided 2026-10-10 and is the real SectionCard now; the รายละเอียด tab is the live reference |
| State widgets `/dev/state-widgets` (152) | LoadingView / ErrorView (3) / EmptyView | **Merge into Feedback** (it already has AsyncStateView + the same states in รายละเอียด Part 2), then delete the screen + route |
| Theme preview `/dev/theme-preview` (380) | theme registry, mode, language, font pickers, swatches, typography, semantic + module colours | **Keep** — only place to switch theme / font / language (Settings has just light/dark/system); move it under "Kit / design review" |
| Logs `/dev/logs` (344) | live log tail, filters, copy | **Keep** (debug) |
| Imports lab `/dev/imports` (1,130 in 3 files) | real-slip QR + OCR, parse-text, slip flow | **Keep** (debug, the owner uses it) |

### 2. Proposed map
**Hub `/dev`** — two headed groups, 4 cards (was 6):
- **ออกแบบ / Kit** — "Widget gallery" (subtitle: tabs list), "Theme preview" (ธีม · ฟอนต์ · ภาษา · สี).
- **เครื่องมือ debug** — "Logs", "Imports lab (สลิป · แชต)".
**Widget gallery tabs (13 → 10), in this order** — design-review first, then building blocks, then data:
1. รายละเอียด — rules · sample page · standard heroes · building-block variants (trimmed)
2. ปุ่ม
3. ช่องกรอก
4. Chip — AppChip sizes + playground + filter bar / status / selection bar / badge
5. Picker & Sheet — picker shell, option sheet, bank / day / event / contact / tag pickers, side sheet, period pill
6. Layout
7. Feedback — + the state widgets
8. ข้อมูล / โดเมน — rows, money, avatars, charts, TxHeroCard, tx tiles, period summary
9. ไอคอน — AppIcons + Icon maker
10. โหมดแก้ไข — edit mode + reorder
Each tab gets a one-line intro under the tab bar ("what this tab is for"), and the hub cards say which tab to open for what.

### 3. For the owner to decide
- **D1** Delete the detail-playground screen outright? (my vote: yes — decided and live in the real kit.)
- **D2** In รายละเอียด, delete the "every page's hero as built today" catalogue and the "→ migrates to X" labels now that the pages migrated? (my vote: yes; FE-B owns that file and should confirm no label is still pending.)
- **D3** Tab count: 10 as above, or fewer (e.g. fold Layout into รายละเอียด)? (my vote: 10.)
- **D4** PickerTile ("older", 3 real users) — keep demoing it, or migrate its 3 users to PickCard first? (separate task.)
- **D5** Is the hub order OK (kit first, debug after), and should the debug group stay behind the secret-tap as today?

### 4. Size of the change
- Delete: detail_playground (544) + state_widgets (152) + WalletSummaryTitle (demo + widget ≈ 90) + Part 2 hero/chip catalogues & migration labels (≈ 430) + duplicate demos (option sheet ×1, PeriodPill/TxPeriodPill overlap ≈ 120) ≈ **−1,350 lines**; lib/dev 8,998 → ≈ 7,600.
- Move (no new code): Chip-tab residue → "Picker & Sheet" (~810 lines relocated), merges of 3 tab pairs (route enum + tab bar edit ≈ 60 lines), hub rewrite (~100), router: −2 routes.
- Files touched: widget_gallery_screen, detail_patterns_tab, app_chip_tab, dev_hub_screen, app_router (routes), plus deleting 2 screens and WalletSummaryTitle. Gallery files are FE-B's today, so either FE-B does it or hands them to me for the round. ~1 session, no behaviour change in the real app; analyze + tests unaffected except any test that imports a deleted demo (none found).

## 2026-10-12 — App hub, Phase 0: THE MAP (read-only, nothing edited)
Basis: 102 files / 148 public types in lib/shared (14,300 lines incl. icon_maker 2,700 + reorder 1,400), core tokens (8 constants + 6 theme files + fonts), 23 feature widget files used by more than one page (6 more used by 1 cross-feature page), 99 private one-off widget classes in 44 feature files. Numbers below come from scripts over lib/ (imports, class references), not guesses.

**Headlines**
- The kit is already ~85% generic-shaped: only ONE shared file imports a feature (`money_text.dart` → MoneyVisibilityCubit). The real blockers to "extractable" are: **l10n strings inside widgets (19 files)**, **core/network `ApiException` in 5 files**, **money colours inside Tone / AppChipTone / MoneyText (3 files)**, and **domain meaning baked into a few pieces** (IconType packs, TxRow, MemberStrip, CurrencyTile, BrandLogo, CoinDrop).
- Features still bypass the gate: 54 feature/app files import shared/ directly (icon_maker ×32+26+23, edit_mode_mixin ×12, skeletons ×8…). The gate (`ui.dart`) must absorb those or the "features import only the gate" rule can't hold.
- Leaks the hub must absorb: 295 hand-sized `SizedBox` gaps, 177 `textTheme.*` uses in 53 feature files (no typography tokens), 82 raw `Icon(` calls, 69 `Color(0x…)/Colors.*` literals in features, 22 raw `Card(`, 16 hand-made `BoxDecoration`s, 99 private widget classes (≈ 30 of them are pills / rows / tiles / banners = one-offs the hub rule forbids).

### 1. Inventory (level · G=generic / D=domain · where · users = files · what blocks "generic")
`users` counts non-dev files that reference any class of that file; "~N" for tokens used everywhere. One file can appear on several rows when it holds pieces of different levels (split on move).

| Level | G/D | Old path (lib/) | Pieces | Users | Blocks generic | New path (lib/ui/) |
|---|---|---|---|---|---|---|
| token | G | core/constants/app_spacing.dart | AppSpacing | ~300 | — | tokens/spacing.dart |
| token | G | core/constants/app_radius.dart | AppRadius | ~40 | — | tokens/radius.dart |
| token | G | core/constants/app_durations.dart | AppDurations | ~10 | — | tokens/durations.dart |
| token | G | shared/widgets/chips/pill_size.dart | PillSize (mini 20 / chip 28 / control 32) | 20 | rename file `chip_size.dart`; uses AppSpacing only | tokens/sizes.dart |
| token | G | shared/widgets/chips/tone.dart | Tone, ToneColor (neutral/primary/success/warning/danger/info + income/expense) | 42 | COLOR: income/expense are money colours → split: generic Tone (6) + app MoneyTone | tokens/tone.dart (+ tokens/app/money_tone.dart) |
| token | D | core/theme/app_colors.dart | AppColors (palette incl. income, expense, walletAsset, walletLiability) | ~400 | app values: money colours | tokens/app/colors.dart |
| token | D | core/theme/module_colors.dart | ModuleColors (คลัง / คน / วางแผน) | ~10 | app values | tokens/app/module_colors.dart |
| token | D | core/theme/{theme_builder,theme_registry,app_theme,app_page_transitions}.dart + themes/{mint,sweet}_theme.dart | themes, typography, transitions | ~15 | app values (Thai font, brand) | tokens/app/theme/* |
| token | D | core/fonts/* | font families (Thai) | — | app values | tokens/app/fonts/* |
| token | D | core/constants/app_icons.dart | AppIcons (250 lines, icon name → IconData map) | ~150 | app value set (not structure) | tokens/app/icons.dart |
| token | D | core/constants/{text_limits,currencies,app_modules}.dart | TextLimits, Currencies, AppModules | ~40 | app / domain rules | tokens/app/limits.dart, domain/currency/… |
| atom | G | shared/widgets/buttons/app_button.dart | AppButton(+Variant,Size) | 28 | none | atoms/app_button.dart |
| atom | G | shared/widgets/buttons/app_icon_button.dart | AppIconButton, IconChipActivity | 11 | none | atoms/app_icon_button.dart |
| atom | G | shared/widgets/chips/app_chip.dart | AppChip, AppChipTone, AppChipTrailing | 47 | COLOR: AppChipTone has income/expense/transfer/wallet* → split tone enum | atoms/app_chip.dart |
| atom | G | shared/widgets/chips/app_badge.dart | AppBadge | 2 | none | atoms/app_badge.dart |
| atom | G | shared/widgets/dashed_rect_border.dart | DashedRectBorder | 4 | none | atoms/dashed_border.dart |
| atom | G | shared/widgets/inputs/app_text_field.dart | AppTextField | 13 | none (to become AppInput, §2) | atoms/app_input.dart |
| atom | G | shared/widgets/inputs/inline_field.dart | InlineField, InlineTitleField | 12 | L10N: long-press hint string → pass in | atoms/app_input.dart (variants) |
| atom | G | shared/widgets/inputs/select_check.dart | SelectCheck, SelectAllCount | 6 | none | atoms/select_check.dart |
| atom | G | shared/widgets/layout/add_tile.dart | AddTile(+Variant) | 21 | none | atoms/add_tile.dart |
| atom | G | shared/widgets/layout/locked_in_edit.dart | LockedInEdit | 6 | none | atoms/locked_in_edit.dart |
| atom | G | shared/widgets/skeleton_box.dart | SkeletonBox | 7 | none | atoms/skeleton.dart |
| atom | G | shared/widgets/skeletons.dart | SkeletonLine, SkeletonCircle, SkeletonListTile | 17 | none | atoms/skeleton.dart (+ molecules/skeleton_list_tile) |
| atom | G | shared/widgets/user_avatar.dart | UserAvatar (initials / IconCode) | 14 | imports IconCode (icon_maker) — fine if IconCode is generic | atoms/avatar.dart |
| atom | G | shared/widgets/editable_circle.dart | EditableCircle | 10 | none | atoms/editable_circle.dart |
| atom | G | shared/widgets/layout/tinted_card.dart | TintedIconBadge (TintedCard → molecule) | 4 | none | atoms/tinted_icon_badge.dart |
| atom | G | shared/widgets/data/money_list_tile.dart | IconBubble, CornerBadge (MoneyListTile, DateGroupHeader → organism) | 8 | none for the two atoms | atoms/icon_bubble.dart, atoms/corner_badge.dart |
| atom | G | shared/widgets/layout/detail_rows.dart | RowDivider, SectionBand, DetailStackedValue | 32 | none | atoms/divider.dart |
| atom | G | shared/icon_maker/icon_display.dart + icon_code_widget.dart | IconDisplay, IconCodeWidget (render an IconCode) | 26 | COLOR (palette lookup); IconType is domain → keep IconCode generic, move IconType packs to domain | atoms/icon_display.dart |
| atom | D | shared/widgets/data/money_text.dart | MoneyText, MoneyTone, MoneyVisibilityToggle | 28 | FEAT: preferences/MoneyVisibilityCubit; L10N; COLOR income/expense; core CurrencyFormatter | domain/money/money_text.dart |
| atom | D | shared/widgets/data/person_mark.dart | PersonMark, PersonLevel, PersonLinkBadge | 5 | domain meaning (typed / contact / linked) | domain/people/person_mark.dart |
| atom | D | shared/widgets/brand_logo.dart | BrandLogo | 4 | app brand asset | domain/brand/brand_logo.dart |
| molecule | G | shared/widgets/layout/detail_rows.dart | DetailRow, DetailStacked, DetailAddRow | 32 | none | molecules/detail_row.dart |
| molecule | G | shared/widgets/layout/danger_row.dart | DangerRow | 5 | COLOR: warning/error theme tokens only | molecules/danger_row.dart |
| molecule | G | shared/widgets/layout/list_row.dart | ListRow | 3 | none | molecules/list_row.dart |
| molecule | G | shared/widgets/layout/section_header.dart | SectionHeader | 7 | none | molecules/section_header.dart |
| molecule | G | shared/widgets/layout/selectable_frame.dart | SelectableFrame | 5 | none | molecules/selectable_frame.dart |
| molecule | G | shared/widgets/layout/tinted_card.dart | TintedCard | 4 | none | molecules/tinted_card.dart |
| molecule | G | shared/widgets/layout/hero_shell.dart | HeroContent, HeroTopRow, HeroSpacing | 3 | none | molecules/hero_shell.dart |
| molecule | G | shared/widgets/layout/compact_hero_bar.dart | CompactHeroBar | 4 | none | molecules/compact_hero_bar.dart |
| molecule | G | shared/widgets/layout/pinned_bar.dart | PinnedBar | 3 | none | molecules/pinned_bar.dart |
| molecule | G | shared/widgets/mode_action_bar.dart | ModeActionBar | 6 | none (labels passed in) | molecules/mode_action_bar.dart |
| molecule | G | shared/widgets/layout/app_tab_bar.dart | AppTab, AppTabBar, AppTabPager | 7 | none | molecules/tab_bar.dart |
| molecule | G | shared/widgets/chips/chip_row.dart | ChipRow, ChipOrder | 3 | none | molecules/chip_row.dart |
| molecule | G | shared/widgets/chips/filter_bar.dart | FilterBar | 8 | none | molecules/filter_bar.dart |
| molecule | G | shared/widgets/inputs/app_search_bar.dart | AppSearchBar | 9 | L10N: clear tooltip | molecules/search_bar.dart |
| molecule | G | shared/widgets/inputs/pick_card.dart | PickCard, PickCardEmptyIcon | 5 | none | molecules/pick_card.dart |
| molecule | G | shared/widgets/inputs/picker_tile.dart | PickerTile | 3 | older pattern (3 users) → migrate to DetailRow ›, then delete | — (delete) |
| molecule | G | shared/widgets/inputs/select_card_group.dart | SelectCardGroup, SelectCardOption | 3 | COLOR: account-type colours via parameters | molecules/select_card_group.dart |
| molecule | G | shared/widgets/inputs/period_pill.dart | PeriodPill (‹ label ▾ ›) | 1 | none | molecules/stepper_pill.dart |
| molecule | G | shared/widgets/inputs/month_picker.dart | MonthPill, MonthPickerGrid | 3 | L10N: month names / labels | molecules/month_picker.dart |
| molecule | G | shared/widgets/sheets/day_of_month_picker.dart | DayOfMonthGrid, DayOfMonthPick | 1 | L10N: ไม่ระบุ / วันสุดท้าย | molecules/day_grid.dart |
| molecule | G | shared/widgets/inputs/theme_mode_chips.dart | ThemeModeChips | 1 | none (labels passed in); debug/settings | molecules/segmented_chips.dart (generic) — theme labels stay in app |
| molecule | G | shared/widgets/inputs/chat_dial.dart | ChatDial | 1 | none (feature stub) | molecules/chat_dial.dart |
| molecule | G | shared/widgets/inputs/amount_field.dart | AmountField, ThousandsInputFormatter, AmountQuickFill | 14 | COLOR: type colour via param; no l10n | molecules/amount_input.dart |
| molecule | G | shared/widgets/feedback/message_banner.dart | MessageBanner | 8 | none | molecules/message_banner.dart |
| molecule | G | shared/widgets/feedback/progress_row.dart | ProgressRow | 11 | none | molecules/progress_row.dart |
| molecule | G | shared/widgets/feedback/app_snackbar.dart | showAppSnackBar(On), Tone | 80 | none | molecules/snackbar.dart |
| molecule | G | shared/widgets/feedback/error_snackbar.dart | showErrorSnackBar | 8 | L10N + core ApiException → generic takes (title, onRetry); app wrapper stays | molecules/snackbar.dart + domain/feedback/error_snackbar.dart |
| molecule | G | shared/widgets/feedback/confirm_dialog.dart + choice_dialog.dart | showConfirmDialog, showChoiceDialog, DialogChoice | 22 | L10N: default button labels | molecules/dialogs.dart |
| molecule | G | shared/widgets/empty_view.dart | EmptyView | 24 | none | molecules/empty_view.dart |
| molecule | G | shared/widgets/error_view.dart | ErrorView | 13 | L10N + core ApiException; STATE: copies request id | molecules/error_view.dart (generic) + app mapper |
| molecule | G | shared/widgets/loading_view.dart | LoadingView | 16 | none | molecules/loading_view.dart |
| molecule | G | shared/widgets/menus/option_menu.dart | OptionMenuAnchor, MultiOptionMenuAnchor, PopoverAnchor, ColorSwatchGrid, IconSwatchGrid | 13 | L10N: clear label | molecules/popover.dart |
| molecule | G | shared/widgets/data/summary_stats.dart | SummaryStats, SummaryStat | 4 | COLOR: tone via param | molecules/stat_row.dart |
| molecule | G | shared/widgets/secret_tap.dart | SecretTapDetector, TapUnlockCounter | 2 | debug util | debug/secret_tap.dart |
| molecule | G | shared/widgets/offline_banner.dart | OfflineBanner | 1 | FEAT-ish: core ConnectivityCubit; L10N | domain/feedback/offline_banner.dart |
| molecule | G | shared/widgets/layout/detail_meta.dart | DetailMeta | 7 | L10N + core DateFormatter (labels "สร้างเมื่อ…") | molecules/detail_meta.dart (labels passed in) |
| molecule | D | shared/widgets/inputs/currency_tile.dart | CurrencyTile | 3 | L10N, core Currencies | domain/money/currency_tile.dart |
| molecule | D | shared/widgets/data/people.dart | PersonRef, AvatarStack, MemberStrip | 1 | L10N; owner / pending semantics | domain/people/people.dart (AvatarStack → atoms) |
| molecule | D | shared/widgets/user_profile_preview.dart | UserProfilePreview | 1 | domain user model | domain/people/user_profile_preview.dart |
| organism | G | shared/widgets/layout/detail_rows.dart | SectionCard (+ SectionBand) | 32 | none | organisms/section_card.dart |
| organism | G | shared/widgets/layout/header_card.dart | HeaderCard | 13 | L10N (edit tooltip) | organisms/hero_card.dart |
| organism | G | shared/widgets/layout/compact_hero_bar.dart | CompactHeroScope | 4 | none | organisms/compact_hero_scope.dart |
| organism | G | shared/widgets/layout/manage_section.dart | ManageSection | 7 | L10N (archive / delete labels) | organisms/manage_section.dart |
| organism | G | shared/widgets/sheets/app_sheet.dart | AppSheetScaffold, showAppSheet(Custom) | 4 | none | organisms/sheet.dart |
| organism | G | shared/widgets/sheets/picker_sheet.dart | PickerSheet, PickerRow, PickerCreateRow, CompactSearchField | 10 | L10N + core ApiException (error/retry) | organisms/picker_sheet.dart |
| organism | G | shared/widgets/sheets/option_sheet.dart | showOptionSheet, SheetOption | 19 | none | organisms/option_sheet.dart |
| organism | G | shared/widgets/sheets/action_sheet.dart | SheetAction, ActionSheetHeader, showActionSheet | 2 | none | organisms/action_sheet.dart |
| organism | G | shared/widgets/sheets/side_sheet.dart | SideSheetScaffold, SideSheetSection | 1 | L10N (clear / close) | organisms/side_sheet.dart |
| organism | G | shared/widgets/async_state_view.dart | AsyncStateView | 21 | L10N + core ApiException | organisms/async_state_view.dart |
| organism | G | shared/widgets/pull_to_refresh.dart | PullToRefresh, CoinDropIndicator | 28 | COLOR brand coin → coin is app brand; generic core = pull gesture | organisms/pull_to_refresh.dart (coin → domain/brand) |
| organism | G | shared/widgets/feedback/saving_overlay.dart | SavingOverlay | 8 | none | organisms/saving_overlay.dart |
| organism | G | shared/widgets/reorder/* | ReorderListScope, ReorderRow, ReorderController, ReorderMoveBar, OutlineItem | 4 | L10N in move bar (a11y labels) | organisms/reorder/* |
| organism | G | shared/widgets/charts/* | DonutChart, PairedBarChart, ChartPalette | 1 | COLOR (palette) via ChartPalette param | organisms/charts/* |
| organism | G | shared/widgets/data/money_list_tile.dart | MoneyListTile, DateGroupHeader | 8 | COLOR money tones; uses MoneyText | domain/money/money_list_tile.dart |
| organism | D | shared/widgets/data/tx_row.dart | TxRow (tx + pending list row) | 2 | domain: wallet chip, source, tags, splits icon | domain/transactions/tx_row.dart |
| organism | D | shared/icon_maker/icon_maker_sheet.dart (+ packs, brand_palette, color_token, icon_*) | IconMakerSheet, IconCode, IconType, IconRegistry, packs | 42 | L10N, COLOR, domain packs per entity (account / category / contact / project / tag) | domain/icons/* (IconCode, IconCodeWidget → atoms) |
| organism | D | shared/edit_mode/edit_mode_mixin.dart | EditModeMixin (+ editActionBar, discard dialogs) | 13 | L10N; behaviour mixin, not a widget | templates/edit_mode_mixin.dart (generic after labels are passed in) |
| organism | D | features/transactions/presentation/widgets/quick_create_sheet.dart | showQuickCreateSheet | 7 | whole feature | domain/transactions/ (template: FormSheet user) |
| organism | D | features/transactions/presentation/widgets/draft_form.dart | DraftForm, DraftFormController, TxTagStrip | 6 | tx domain | domain/transactions/draft_form.dart |
| organism | D | features/transactions/presentation/widgets/tx_hero_card.dart | TxHeroCard, txTypeChip | 4 | tx domain | domain/transactions/tx_hero_card.dart |
| organism | D | features/transactions/presentation/widgets/{account_picker_sheet,pick_chip_rows,event_pick}.dart | showAccountPickerSheet, Wallet/Category/TagChipRow, EventRow, showEventTargetSheet | 6 | domain pickers | domain/pickers/* |
| organism | D | features/transactions/presentation/widgets/transaction_tile.dart | TransactionTile | 2 | tx domain (FE-B) | domain/transactions/transaction_tile.dart |
| organism | D | features/categories/presentation/widgets/category_picker_sheet.dart + category_pick_card.dart + category_chip.dart | showCategoryPickerSheet, CategoryPickCard, categoryAppChip | 5 | domain | domain/pickers/category_* |
| organism | D | features/contacts/presentation/widgets/contact_picker_sheet.dart + contact_linked_mark.dart | showContactPickerSheet, ContactAvatar, ContactLinkedIcon | 5 | domain | domain/pickers/contact_*, domain/people/* |
| organism | D | features/accounts/presentation/widgets/{account_card,wallet_pick_card,member_avatar_stack}.dart | AccountCard, AccountIconCircle, WalletPickCard, MemberAvatarStack | 6 | domain | domain/accounts/* |
| organism | D | features/tags/presentation/widgets/tag_chip.dart | tagAppChip, tagColor | 4 | domain | domain/tags/tag_chip.dart |
| organism | D | features/projects/presentation/widgets/{project_common,add_member_sheet,project_tx_tiles}.dart | ProjectView, ProjectMemberAvatar, showAddMemberSheet, ProjectTxTreeTile | 8 | domain | domain/projects/* |
| organism | D | features/personal_debts/presentation/widgets/debt_widgets.dart | DebtTile, DebtAvatar, debtStatusChip, showSettleDebtSheet | 4 | domain (debts rebuilt next round) | domain/debts/* (after the debts round) |
| organism | D | features/notifications/presentation/widgets/notification_tile.dart | NotificationTile | 3 | domain | domain/notifications/notification_tile.dart |
| organism | D | features/auth/presentation/widgets/auth_widgets.dart | AuthBrandHeader, GoogleSignInButton, AuthPrefsBar… | 2 | domain/brand | stays in feature (2 pages, auth only) |
| template | G | — (new; replaces dev/detail_playground + the รายละเอียด sample) | DetailPage: top bar + CompactHeroScope + HeaderCard(topRow) + SectionCards + ManageSection + DetailMeta, view⇄edit via EditModeMixin | 13 detail pages | extract from detail_patterns_tab `_SampleDetail` + each page | templates/detail_page.dart |
| template | G | — (new) | ListPage: search + FilterBar + list/AsyncStateView + AddTile / FAB + selection bar + PullToRefresh | ~10 list pages | extract from tx list / contacts / tags / accounts pages | templates/list_page.dart |
| template | G | — (new) | FormSheet: AppSheetScaffold + fields + PinnedBar(save) + discard guard + SavingOverlay | ~8 sheets (quick create, settle, add member, kind, resolve, …) | extract from quick_create_sheet / settle sheet | templates/form_sheet.dart |
| template | D | — (new) | TransactionDetail: tx hero + DraftForm sections (exempt from the detail standard) | 1 | tx domain | domain/transactions/transaction_detail.dart |

COUNTS (rows): token: 5 generic + 6 domain · atom: 18 generic + 3 domain · molecule: 36 generic + 3 domain · organism: 15 generic + 16 domain · template: 3 generic + 1 domain · total 106

**Generic-ness blockers, summarised (what each costs to fix)**
| Blocker | Where | Fix |
|---|---|---|
| l10n inside widgets | edit_mode_mixin, async_state_view, error_view, confirm_dialog, error_snackbar, app_search_bar, inline_field, month_picker, day_of_month_picker, picker_sheet, side_sheet, option_menu, detail_meta, header_card, manage_section, offline_banner, reorder_move_bar, icon_maker_sheet, icon_shape (19 files) | generic widgets take strings as parameters (`label`, `hint`, `tooltip`) — the app layer (gate wrappers / domain) supplies the Thai text. No widget calls `AppLocalizations` below the gate |
| Money colours | Tone (income/expense), AppChipTone (income/expense/transfer/walletAsset/walletLiability), MoneyText | split enums: generic `Tone` / `AppChipTone` (primary, neutral, success, warning, danger, info) + app `MoneyTone` mapped to a colour by the app; chips accept `color:` already |
| core/network ApiException | async_state_view, error_view, error_snackbar, picker_sheet | generic takes `Object? error` + a `titleFor` callback, or a tiny `ErrorInfo` (kind: network/server/unknown, message, requestId) defined in ui |
| FEAT import | money_text → MoneyVisibilityCubit | MoneyText takes `hidden:` (bool) from the app; the cubit read moves to a domain `AppMoneyText` |
| Domain meaning | IconType packs (account/category/contact/project/tag), TxRow, MemberStrip/PersonRef, CurrencyTile, PersonMark, BrandLogo, CoinDrop, MoneyListTile | these are the Domain layer (see map); generic part (IconCode rendering, AvatarStack, pull gesture) is split out |
| Hard-coded colours | 39 `Color(0x…)/Colors.*` in shared (excl. icon_maker palettes), 69 in features | route through tokens (app colours) |

### 2. Missing atoms
| Atom | Replaces | Call sites | Notes |
|---|---|---|---|
| **AppInput** (one text input; variants `field` / `inline` (view⇄edit, long-press) / `title` / `amount` / `search` / `underlined`) | AppTextField 34 calls/14 files · InlineField 17/11 · InlineTitleField 9/8 · AmountField 10/9 · AppSearchBar 10/10 · raw `TextField`/`TextFormField` 15 calls in 12 files (tx_hero_card ×2, splits_section ×2, draft_form_event, tags_page, identifier_widgets, picker_sheet compact search, chat_dial, icon_maker_sheet) | **≈ 95 in ~45 files** | One decoration / focus / error / counter / readOnly behaviour; `amount` keeps ThousandsInputFormatter + quick fills as a molecule on top |
| **AppSwitch** | `Switch` / `SwitchListTile` | 6 in 3 files (notification_settings ×3, category_detail ×2, project_tx_tiles) | with a DetailRow trailing variant |
| **AppDivider** | `Divider(` (auth ×2, draft_form, identifier_widgets, kit ×5) + RowDivider | ~14 | hairline / indented / section band as variants |
| **AppCard** (surface: plain / bordered / tinted / raised) | `Card(` + hand-made `BoxDecoration` containers | 22 `Card` in 15 files (home ×7) + 16 `BoxDecoration` in 15 files ≈ **38** | replaces budget/saving-goal/scheduled/period-summary one-off cards; HeaderCard / TintedCard / PickCard build on it |
| **AppTextButton** (variant of AppButton) | `TextButton(` | 11 in 11 files | `AppButton(variant: text)` |
| **AppIconButton** adoption | `IconButton(` | 24 in 21 files | already an atom; migrate |
| **AppAvatar** | `CircleAvatar(` (6 in 5 files) + UserAvatar + IconDisplay circles | ~12 | one avatar atom with `initials / icon / image / count` modes |
| **AppSpinner / AppProgress** | `CircularProgressIndicator` 5, `LinearProgressIndicator` 3 | 8 in 8 files | ProgressRow bar + one spinner |
| **AppIcon** + icon-size tokens | `Icon(AppIcons.x, size: 16/18/20/22…)` | 82 raw `Icon(` in features | size tokens `IconSize.s/m/l`; colour via tone |
| **AppText** / typography tokens | `Theme.of(context).textTheme.*` | 177 uses in 53 files | roles: `display, title, section, label, body, caption, money` — decide in Tokens first (owner) |
| **AppDatePicker** (`pickDate`, `pickDateRange`) | `showDatePicker` ×4 + `showDateRangePicker` ×1 | 5 | consistent locale / bounds / theme |
| (not an atom) `showAlertDialog` | `AlertDialog(` ×3 | 3 | route through showConfirmDialog / showChoiceDialog |
Gap in the atoms we have: AppChip count/dashed/maxWidth done; **AppButton** has no `text` variant yet; **AppIconButton** lacks a `tone`.

### 3. Target folders and move list
```
lib/ui/
  ui.dart                         ← THE GATE (replaces shared/widgets/ui.dart); features import only this
  tokens/
    spacing.dart radius.dart durations.dart sizes.dart (ChipSize/IconSize/ControlHeight) tone.dart typography.dart   ← STRUCTURE (generic, no app values)
    app/                          ← APP VALUES: colors.dart module_colors.dart theme/ fonts/ icons.dart limits.dart money_tone.dart
  atoms/        app_button app_icon_button app_chip app_badge app_input app_switch app_divider app_card app_avatar spinner
                select_check add_tile locked_in_edit skeleton dashed_border editable_circle icon_bubble corner_badge tinted_icon_badge icon_display
  molecules/    detail_row danger_row list_row section_header selectable_frame tinted_card hero_shell compact_hero_bar pinned_bar
                mode_action_bar tab_bar chip_row filter_bar search_bar pick_card select_card_group stepper_pill month_picker day_grid
                segmented_chips amount_input message_banner progress_row snackbar dialogs empty_view error_view loading_view popover
                stat_row detail_meta
  organisms/    section_card hero_card compact_hero_scope manage_section sheet picker_sheet option_sheet action_sheet side_sheet
                async_state_view pull_to_refresh saving_overlay reorder/ charts/
  templates/    detail_page list_page form_sheet edit_mode_mixin
  domain/       money/ (money_text money_list_tile currency_tile) · people/ (person_mark people avatar-stack contact_*) · icons/ (IconCode registry packs IconMakerSheet)
                transactions/ (tx_row draft_form tx_hero_card quick_create_sheet pickers transaction_detail) · accounts/ categories/ contacts/ tags/ projects/ debts/ notifications/ brand/
  debug/        secret_tap  (+ hub pages live in lib/hub/)
lib/hub/        the app hub screens (replaces lib/dev): router entries /#/dev/…
```
**Move list (old → new)** — see the table's last column for every file. Mechanics: ONE scripted bulk move (git mv + import rewrite, ~300 import lines in the kit itself, 54 feature files that bypass the gate, `ui.dart` re-exports unchanged names so the other ~85 feature files don't change). Names don't change in the move; renames (AppTextField→AppInput, PillSize→ChipSize, HeaderCard→HeroCard, PeriodPill→StepperPill, ThemeModeChips→SegmentedChips) are separate small steps after the hub review. To end the 54 gate bypasses: export icon_maker (IconCode / IconType / IconDisplay / IconRegistry), EditModeMixin, skeletons, avatar, tinted_card etc. from the gate, then lint (a `custom_lint` / a test that greps imports) that features import only `ui/ui.dart`.

### 4. Hub map (every page: URL · variants it must show · used by)
URLs are `/#/dev/<slug>` (hash routing). Order = the hub index: Tokens → Atoms → Molecules → Organisms → Templates → Domain → Debug. Each page: a one-line "what / when to use", a variant grid (one cell per state), a "used by" list (file count from the map), and a ✓/✗ checklist row for the owner's review.
| URL | Variants it must show | Used by |
|---|---|---|
| **Tokens** | | |
| `/dev/tokens/spacing` | AppSpacing steps with a bar each; gap-in-context examples | ~300 |
| `/dev/tokens/radius-duration` | radius chips; duration/curve demos (respects disableAnimations) | ~50 |
| `/dev/tokens/sizes` | chip 20/28/32, control heights, icon sizes, tap target 44 | chips, heroes |
| `/dev/tokens/colors` | semantic palette per theme (light/dark, sweet/mint), money colours, module colours, contrast | all |
| `/dev/tokens/typography` | the 7 roles in Thai + Latin, numerals tabular, scale 1.0–1.5 | 53 files |
| `/dev/tokens/icons` | AppIcons grid with names | ~150 |
| **Atoms** | | |
| `/dev/atoms/button` | variants × sizes × states (loading, disabled, full-width) · icon button (activity none/progress/done, tone) · bulk delete | 28 |
| `/dev/atoms/chip` | 3 sizes × (display, selected, outline, dashed, dot, avatar, icons, dropdown, remove, lock, count, tones, disabled, maxWidth) + playground | 47 |
| `/dev/atoms/badge-avatar` | AppBadge, avatar modes, IconDisplay, corner badge, icon bubble | 40 |
| `/dev/atoms/input` | AppInput × field/inline/title/amount/search/underlined × (empty, filled, error, counter, read-only, focused, long-press hint) | ~95 |
| `/dev/atoms/switch-check-divider` | switch, select check, divider variants, add tile (card/row/circle), skeletons, spinner | 45 |
| `/dev/atoms/card` | plain / bordered / tinted / raised surfaces | ~38 |
| **Molecules** | | |
| `/dev/molecules/rows` | DetailRow (text, ›, switch, empty "ไม่ได้เลือก", locked 🔒), DetailStacked, DangerRow (amber/red), ListRow, SectionHeader | 32+ |
| `/dev/molecules/pickers-inputs` | PickCard, select cards, stepper pill / month / day grid, amount input + quick fills, search bar, chip row + filter bar | ~30 |
| `/dev/molecules/feedback` | banner, snackbars (tones, retry), dialogs, progress row, empty / error / loading views | ~80 |
| `/dev/molecules/bars` | tab bar + pager, mode action bar, pinned bar, compact hero bar, popovers | ~25 |
| **Organisms** | | |
| `/dev/organisms/section-hero` | SectionCard (+ band, title, trailing, locked), HeroCard (top row, chips, ✏️, footer), compact hero scope, manage section, detail meta | 32 |
| `/dev/organisms/sheets` | AppSheet, PickerSheet (search, highlight), OptionSheet, ActionSheet, SideSheet | ~40 |
| `/dev/organisms/states` | AsyncStateView (loading / error / empty / data), pull-to-refresh, saving overlay | ~50 |
| `/dev/organisms/reorder-charts` | reorder list (edit ✏️ → ⠿), donut, paired bars | 6 |
| **Templates** | | |
| `/dev/templates/detail-page` | DetailPage [ดู ⇄ แก้ไข] with every slot (replaces detail playground + รายละเอียด tab): hero w/ and w/o top-row chips, sections, manage, meta, long-press edit, loading / error / not-found, rules checklist | 13 detail pages |
| `/dev/templates/list-page` | ListPage: search, filter bar, grouped list, select mode + bulk delete, reorder mode, empty / error / loading / pull-to-refresh | ~10 |
| `/dev/templates/form-sheet` | FormSheet: fields, save bar, dirty-close guard, saving overlay, save failure + retry | ~8 |
| `/dev/templates/transaction-detail` | TransactionDetail (exempt from the standard): view, edit, splits, event, system row, repayment | 1 |
| **Domain** | | |
| `/dev/domain/money` | MoneyText (hidden / signed / tones), money list tile, currency tile, summary stats | 28 |
| `/dev/domain/transactions` | TxRow (tx / pending / splits / warning), TxHeroCard, DraftForm (+ chip layout), pickers (wallet / category / tag / event / contact), quick create | ~20 |
| `/dev/domain/people-accounts` | person mark 3 looks, member strip, account card, wallet pick card, contact / project avatars | ~15 |
| `/dev/domain/others` | debt tile, notification tile, project tiles, brand logo, auth header | ~10 |
| **Debug** | | |
| `/dev/debug/logs` | live tail, level filter, search, copy | — |
| `/dev/debug/imports` | real slip QR+OCR, parse-text, slip flow | — |
| `/dev/debug/theme` | theme / mode / font / language switcher + swatches (today's Theme preview) | — |
| `/dev/debug/secret-tap` | the entry mechanism (info only) | — |
Hub index `/dev`: one card per level, count of pieces, "last reviewed" tick the owner sets; a search box over piece names. Rule enforced by a test: **every public piece exported by `ui.dart` has a hub page entry** (parsing the exports) — that is how "hub = single source of truth" stays true.

### 5. Phases, split and size (disjoint files)
**Phase 0.5 (once, before parallel work, tree frozen ~half a day):** scripted bulk move into `lib/ui/*` + `lib/hub/` skeleton + gate absorbs the 54 bypasses + import-lint test. Single owner (me), FE-B idle or on pages only. Output: analyze clean, 322+ tests green, nothing visual changes.
**Phase 1 — Tokens + Atoms (≈ 3–4 days).**
- FE-A: tokens (structure/app split, typography roles, icon sizes), atoms: AppInput (+ migrate ~95 sites), AppSwitch, AppDivider, AppButton text variant, hub pages `tokens/*`, `atoms/input`, `atoms/button`, `atoms/chip`. Files: ui/tokens/*, ui/atoms/{app_input,app_button,app_chip,app_icon_button,app_switch,app_divider}, features' text-field sites in transactions / pending / debts / accounts / tags.
- FE-B: atoms AppCard, AppAvatar, AppSpinner, badge, skeletons; hub pages `atoms/card`, `atoms/badge-avatar`, `atoms/switch-check-divider`; migrate Card/BoxDecoration/CircleAvatar sites in budgets, home, saving_goals, scheduled, projects, notifications, settings.
**Phase 2 — Molecules + Organisms (≈ 4–5 days).** Pass l10n/ApiException/money-colour out of the 19 + 5 + 3 files.
- FE-A: molecules inputs/pickers/feedback (amount input, search bar, stepper/month/day, snackbars/dialogs/empty/error/loading), organisms sheets + states (picker/option/action/side sheet, AsyncStateView, pull-to-refresh, saving overlay), hub pages `molecules/pickers-inputs`, `molecules/feedback`, `organisms/sheets`, `organisms/states`.
- FE-B: molecules rows/bars (detail rows, danger row, list row, tab bar, mode bar, compact bar, popovers), organisms section/hero/manage/meta/reorder/charts, hub pages `molecules/rows`, `molecules/bars`, `organisms/section-hero`, `organisms/reorder-charts`.
**Phase 3 — Templates + Domain + Debug + enforcement (≈ 4–5 days).**
- FE-A: FormSheet + TransactionDetail templates, Domain money / transactions / debts (debts after their rebuild), `/dev/domain/*` pages for those, delete old widgets in tx / pending, hub index + coverage test.
- FE-B: DetailPage + ListPage templates (migrating the 13 detail pages and ~10 list pages onto them), Domain people-accounts / others, Debug pages (logs, imports, theme moved under lib/hub), delete lib/dev.
Rough total: **≈ 12–14 working days for two sessions** (≈ 7 000 lines moved without edits, ≈ 3 500 lines new/changed: AppInput + migration 800, templates 1,200, hub pages ~1,500). Risk: Phase 0.5 import rewrite touches ~140 files at once (freeze), AppInput migration touches ~45 files (visual regression on every form), DetailPage template refactors 13 pages (FE-B already migrated them to the standard, so mostly extraction).

### 6. Questions for the owner
1. **Typography roles** — agree the 7 roles (display / title / section / label / body / caption / money) before AppText, or keep `textTheme` and only add the tokens file?
2. **AppInput variants** — OK to unify (some inputs will change height / border slightly: tx hero title, split name/amount, identifier number)?
3. **AppCard** — OK that home dashboard cards and budget / goal cards share one surface atom (their borders / radii will unify)?
4. **Names** — rename now (AppInput, ChipSize, HeroCard, StepperPill) or keep old names until the hub review is done?
5. **Where the Thai strings live** — OK that generic widgets take strings and a thin `ui/domain/l10n` layer supplies Thai (so the future ppForge core has zero l10n)?
6. **Phase 0.5 freeze** — OK to freeze the tree for the bulk move (half a day, no commits/edits by others), and do it right after the 0.3.1-8 APK is cut?
7. **Debug in release builds** — keep the hub reachable (secret tap) in prod as today, or gate Debug pages behind a flag?
8. PickerTile (3 users, older pattern) and WalletSummaryTitle (0 real users) — delete during the move (my vote yes).

## 2026-10-12 — App hub PHASE 1 (bulk move + gate + lint + hub skeleton)
DONE · analyze: clean · test: full suite 325 pass (+3 new)
- **Bulk move (scripted, no renames, no logic edits):** lib/shared/** + token files from lib/core/{constants,theme,fonts} → `lib/ui/{tokens(+app/),atoms,molecules,organisms(+reorder,charts),templates,domain(money,people,icons,brand,feedback,transactions),debug}`; 120 files moved, 841 import lines rewritten; features keep importing `ui/ui.dart` (= the old shared/widgets/ui.dart, same exports). Script + copy-dry-run kept in the session scratchpad (ui_move.js, gate_absorb.js).
- **Gate absorbed the bypasses:** 126 files (features/app/dev) no longer import any lib/ui file except the gate; `ui.dart` now also exports tokens (spacing, radius, durations, icons, colours, module colours, text limits, currencies, theme/font registries, AppTheme), the icon stack (IconCode / IconType / IconDisplay / IconRegistry / IconMakerSheet / color token), EditModeMixin, skeleton_box, reorder_outline, UserProfilePreview. Bootstrap-only tokens (theme_builder, font_preloader, app_modules) stay direct for lib/app + main.
- **Lint (test/ui/layering_test.dart):** (1) features import ONLY ui/ui.dart from lib/ui; (2) generic layers (tokens/atoms/molecules/organisms/templates) may not import features / l10n / core/network — ratchet with `test/ui/generic_baseline.txt` (21 known violations: l10n in 19 files, ApiException in 4; can only shrink; `UPDATE_BASELINE=1` regenerates).
- **Hub skeleton (lib/hub, replaces dev_hub_screen):** `hub_registry.dart` (HubLevel + 32 planned pages with URL, generic|domain, summary, covers, usedBy, phase), `hub_index_screen.dart` (`/dev`: sections per level, search, legacy links, review ticks), `hub_page_frame.dart` (`/dev/<level>/<slug>`: level + generic|domain chips, covers, used-by, "Reviewed by the owner" tick stored on device, then the demo or "planned · phase N"). Router: one dynamic route `:level/:slug`; old /dev/* screens still reachable (Legacy list) until phase 4.
- **Coverage ratchet (test/ui/hub_coverage_test.dart):** every public piece exported by the gate must be on a hub page's `covers`; 148 not yet (baseline `hub_uncovered_baseline.txt`), the list shrinks as pages are built; a typo in `covers` fails.
- cross_tab_links_test: lib/hub exempt (outside the shell, like lib/dev).
notes: dart fix removed 13 redundant imports; tests stay under test/shared etc. (moving them is cosmetic, later). Hub URLs final shape: `/#/dev` + `/#/dev/<tokens|atoms|molecules|organisms|templates|domain|debug>/<slug>` — slugs in hub_registry.dart (e.g. /#/dev/atoms/chip, /#/dev/templates/detail-page, /#/dev/debug/logs).

## 2026-10-12 — App hub PHASE 2 (my half: tokens + AppInput + button/divider/switch/typography)
DONE · analyze clean · full suite 333 pass (+8 app_input_test)
- **AppInput (lib/ui/atoms/app_input.dart)** — THE text input. Kinds: `AppInput(...)` field, `.inline` (view ⇄ edit, long-press, `viewHint` param instead of l10n), `.title`, `.search` (owns controller, ✕ clear, tooltip param). Looks: filled / outlined / underline / pill / bare; tuning params: style, textAlign, contentPadding, borderColor, focusColor, cursorColor, hintStyle, minWidth, prefix widget, onTapOutside, show/enable-selection flags. Replaced AppTextField (34 calls), InlineField (17), InlineTitleField (9), AppSearchBar (10) and every raw TextField / TextFormField in features + kit (tx hero title + amount, splits name + amount, event member amount, identifier number, tag rename, hex colour, chat dial, picker search (CompactSearchField deleted), AmountField's inner field). The three old classes + files are gone. `DetailStackedValue` moved to atoms/detail_stacked_value.dart so atoms never import molecules.
- **AppDivider** (`AppDivider()`, `AppDivider.row()` inset like detail rows) replaced RowDivider (class deleted) + 8 raw `Divider(`; **AppSwitch** replaced `Switch` / `SwitchListTile` (6 sites → DetailRow + AppSwitch, whole row toggles); AppButton's spinner = AppSpinner(small).
- **Typography tokens:** `tokens/typography.dart` (AppTextRole display/title/section/label/body/caption/money → AppTypography.of) + atom `AppText`. Tokens first, as decided: the 177 `textTheme.*` sites migrate gradually (not in this phase).
- **Hub pages built (English):** tokens/spacing, radius-duration, sizes, colors, typography, icons; atoms/input, button, chip (old AppChip tab moved here; Thai headings → English); switch-check-divider extended with AppSwitch + AppDivider. 24-ish pieces now `covers`; coverage ratchet baseline shrank to 113 uncovered.
- tests: test/ui/app_input_test.dart (field/error/counter, obscure toggle, inline view/edit/long-press, title same box, search ✕, switch+divider, AppText); hub_coverage regex fixed for `abstract final class` + `extension`; layering baseline trimmed (inline_field + app_search_bar gone: 19 violations left).
notes: some files have CRLF line endings (app_button, others) — scripted multi-line edits must normalise; pre-existing, untouched.

## 2026-10-12 — App hub PHASE 3 (my half: l10n/ApiException decoupling, renames, molecules + organisms hub pages)
DONE · analyze clean · full suite 333 pass
- **UiConfig mechanism (generic ↔ Thai):** `lib/ui/atoms/ui_config.dart` = `UiStrings` (English defaults), `UiErrors`/`UiErrorInfo`, `UiConfig` inherited widget; the app fills it once with `AppUiConfig` (`ui/domain/l10n/app_ui_config.dart`, installed in app.dart's `MaterialApp.builder`; maps ApiException → network / server / unexpected). Generic pieces read `UiConfig.stringsOf(context)`; they no longer import l10n or core/network: ErrorView (`Object error`, `ErrorView.titleFor(context, e)`), AsyncStateView, showErrorSnackBar, showConfirmDialog, PickerSheet, SideSheet, month + day pickers (`dayOfMonthLabel(context, day)`), AppInput defaults (view hint, search hint, clear tooltip). FE-B added their own strings (manage / record / reorder) to UiStrings. Layering baseline: 21 → 6 violations (5 FE-B files + edit_mode_mixin, mine in P4); `tokens/app/*` is exempt (app values).
- **Money colours out of the generic tones:** `Tone` and `AppChipTone` are now neutral / primary / success / warning / danger / info only; money colours (income, expense, wallet groups) are passed as `color:` from AppColors (category hero chips, dev demos).
- **Renames (all call sites + tests):** PillSize→ChipSize (tokens/chip_size.dart), PeriodPill→StepperPill, AmountField→AmountInput (amount_input.dart; test renamed).
- **Hub pages (4, built by sub-agents, reviewed by me; all English, interactive):** molecules/pickers-inputs (PickCard, SelectCardGroup, StepperPill, MonthPill + grid + picker, DayOfMonthGrid + picker, AmountInput + quick fills, ChipRow / ChipOrder / FilterBar, ThemeModeChips, ChatDial), molecules/feedback (banner, progress row, snackbars, error snackbar, dialogs, empty / error / loading views, UiConfig demo), organisms/sheets (app / picker / option / action / side sheets + states), organisms/states (AsyncStateView + fallback, pull-to-refresh + coin phases, saving overlay). Coverage ratchet follows barrel exports now (reorder) and typedefs / generic functions; uncovered baseline 45 (FE-B's P3 pages + domain/templates still to come).
- test fixes: main_shell_test + async_state_view_test wrap in AppUiConfig (Thai words); cross-tab test exempts lib/hub.
notes: not run on a device — the hub pages are analyzed + the full suite is green; the owner should open /#/dev and click through. Sub-agent notes: snackbars inside a sheet become top toasts (by design); StepperPill can't have both arrows disabled (arrows hide when both null).

## 2026-10-12 — Phase 4 done + unified "แบ่งรายการ" section + SplitRow
DONE · analyze clean · full `flutter test` green (359).

**Hub (final URLs):** `/#/dev` index; `/#/dev/<tokens|atoms|molecules|organisms|templates|domain|debug>/<slug>` (e.g. `/dev/atoms/chip`, `/dev/molecules/pickers-inputs`, `/dev/templates/detail-page`, `/dev/templates/transaction-detail`, `/dev/debug/logs|imports|theme`). `lib/dev` + `test/dev` + the /dev/widgets|detail-playground|state-widgets routes + index "Legacy" list are gone (FE-B confirmed nothing needed).

**แบ่งรายการ section** — one `SplitEventSection` (features/transactions/.../split_event_section.dart): green heading + one-line hint, then the "แบ่งยอด" row (SplitsSection embedded: เพิ่มคน always, หารเท่ากัน only with ≥1 person, people rows) and the "อีเวนต์" row; no separators. Used by quick create (collapsible, open), pending add + แก้ร่าง (collapsible, closed, one-line summary), tx detail (always open, view + edit). Transfers: none. Tests: split_event_section_test.

**SplitRow molecule** (`ui/molecules/split_row.dart`, demo on `/dev/molecules/pickers-inputs`): avatar | name | amount | FIXED 40px trailing slot. `SplitRowAction` (same icon size; auto ON = tinted circle inside the slot; ✕ plain). `SplitRowName.muted` ("ส่วนของฉัน", w400 + muted, no italic) / `.input` (L1, outlined AppInput) / `.picked` (L2/L3, faint highlight in the avatar colour via new `AppAvatar.colorFor`, tap = picker). Picker gets `unlinkAs` → "ไม่ผูกผู้ติดต่อ" at the top: row becomes L1 keeping the name. Lock removed end to end: `SplitDraft.identityLocked/savedContactLinked`, SPLIT_IDENTITY_LOCKED mapping and the two lock strings are gone; linked swap sends the same `contact_id`+`person_name` and the saved Transaction from the PUT response refreshes the rows (new debt_id).
Not verified on device/BE live (owner runs the app).

## 2026-10-12 — dev hub API + Labs (0.3.1-9)
DONE · analyze clean · full `flutter test` green (373) · files: `lib/hub/api/{openapi_model,openapi_source}.dart`, `lib/hub/pages/api_pages.dart`, `lib/hub/debug/env_page.dart`, `lib/hub/hub_registry.dart` (levels `api`, `labs`), `test/hub/{openapi_fixture,openapi_model_test,api_pages_test,api_spec_ratchet_test}.dart` + `api_unused_baseline.txt`, `pubspec.yaml` (dev dep `yaml`), `engineering/app-hub.md`.
- `/#/dev` is now "Developer portal": UI levels + **API** (`/dev/api/endpoints|schemas|pages`) + **Labs** (`/dev/labs/imports`, moved from debug) + **Debug** (`logs`, `theme`, new `env`).
- API reads `GET /openapi.json` via the app's ApiClient (base URL ends in /api/v1), view-only. Endpoints: coverage counter "Spec covers X of Y registered routes" (BE's `x-spec-routes` / `x-registered-routes`), module filter chips, search, per-endpoint params / request / responses with examples, "breaking" badge + note, used-by pages with call counts. Schemas: fields, types, required, enums, examples. Pages: page → endpoints + calls, plus "not called by any page".
- Parser follows `$ref` into components (parameters / responses) and tolerates missing `x-` fields. Verified against the BE's real openapi.yaml: 32 endpoints, 59 schemas, 22 pages, 0 unused, 30 breaking.
- Ratchet (test/hub/api_spec_ratchet_test.dart) parses the BE yaml next to the app: must parse, every `$ref` resolves, every endpoint has a summary; endpoints without `x-used-by` = baseline (empty now, can only shrink). Skipped when the BE checkout is absent.
- Not verified live: the real `/openapi.json` route (BE said it serves it; the yaml draft exists). Pages not adopting new API shapes yet (waits for the owner's spec review).

## 2026-10-12 — dev hub redo: API Pages + registry (with FE-B's nav/toolbar/Debug)
DONE · analyze clean · full `flutter test` green (381).
- API: Endpoints page removed; **Pages** is the one API view (coverage counter on top → per-page cards → triggers → expandable endpoint rows → "Not used by any page"); **Schemas** kept (response types link to it). `lib/hub/api/page_flows.dart` = FE registry of TARGET flows (spec draft 2: getDashboard on Home, getTransactionFormOptions on quick create, getAccount?include for wallet detail, …); over-target pages get a red badge. `x-used-by` no longer read. `today:` notes only on quick create (3 calls on first open) and pending (4) — read from code; the Network page measures the rest.
- Tests: page_flows_test (ids exist, unspecified really absent, every app-called endpoint in a flow or baseline of 51) + api_spec_ratchet (spec endpoints in a flow; baseline: GET /transactions/summary).
- Reached pages have no grey rows. Open question for owner: wallet-detail and category-detail show 2 calls on open (the page + its tx list) = red; BE merges only the page, not the list.
- FE-B did nav cards at every level, UI toolbar, Network + Cache, theme removal.
- Not verified live: `/openapi.json` on a rebuilt BE.

## 2026-10-12 — hub Button page: icon buttons (+ one slip)
DONE · analyze clean · full test green (381).
- Kit: `AppIconButton` variants — `.edit` (hero 32 / list 36 ✏️), flat `.close` ✕ / `.clear` ✕ / `.more` ⋯ / `.back` ← / `.flat(icon)`; new atom `AppAvatarButton` (the profile chip; AppTopBar now uses it). Callers pointed at them: header_card, tx hero, wallet hero, accounts / categories / tags list ✏️; close / clear / more in picker_sheet, side_sheet, chat_dial, message_banner, update banner, identifier rows, wallet members, pending batch rows, draft event / event pick, quick-create header.
- Hub `/dev/ui/atoms/button`: Edit ✏️ (sizes, disabled), Edit-mode bar (Cancel · Save), Shell top-right (inbox ⏳ / bell with badges, profile; normal + current), Flat icon buttons — each with "used by".
- Slip: a scripted edit of app_top_bar.dart briefly broke the tree (and the same step left AppIconButton imports missing for ~10 min); restored from the earlier read, compiles. Rule noted: keep the tree compiling between steps.

## 2026-10-12 — AppInput redesign PROPOSAL (hub only; nothing adopted)
DONE · analyze clean · hub/ui tests green · `/dev/ui/atoms/input` top section (`lib/hub/pages/atoms_input_proposal.dart`, prototype `_P` is hub-only).
- Inventory (79 call sites): field·filled 36 (forms) · field·outlined 4 (dense in-place boxes) · field·underline 1 (identifier) · field·bare 3 (hero/split amount, chat) · inline 17 (detail values) · title 8 (hero names) · search default 9 · search pill 1.
- Proposed: 4 looks + 2 flags — **Field** (outlined, floating label; `dense` = in-row; absorbs filled + outlined + underline = 41) · **Inline** (view ⇄ edit on detail pages; `hero` = big title, absorbs inline + title = 25) · **Search** (one grey capsule, absorbs 10) · **Value** (frameless numbers/chat with optional underline + error text, absorbs bare = 3).
- The page shows: inventory table, proposal, current→new mapping, then per look a state matrix Current vs Proposed (live): empty/placeholder, focused, filled, error + message, disabled, read-only/locked 🔒, counter, prefix ฿ / suffix, multiline (+ dense / hero / view-empty hint). Themes via the toolbar.
- New vs today: a locked 🔒 look, inline/value error messages, search disabled.
- Questions: (1) one outlined Field for all forms (changes the 36 filled forms' look) or keep the theme-filled? (2) hero edit = underline (as today) or the same outlined box? (3) fold Value's underline into Field·dense (3 looks)? 

## 2026-10-12 — kit orders: PickCard height · SelectCard gradient (proposal) · SplitRow polish · StepperPill merge
DONE · analyze clean · hub/ui/shared/transactions tests green.
- **PickCard**: one height per variant. `reserveSubtitle` = 3-line variant (wallet + category pick cards set it); error is now INSIDE the card (subtitle line in red; in the 2-line plain variant it replaces the label), dashed outline red, nothing added below. Value line has a fixed strut so empty = picked. test/ui/pick_card_height_test.dart. Demo: molecules/pickers-inputs "PickCard — one height per variant".
- **SelectCardGroup**: `style: SelectCardStyle.gradient` (PROPOSED; default stays `tinted` until the owner OKs): selected = accent gradient (lighter→deeper), on-colour text/icon, translucent icon disc, no glow, 1-px clear border so no size jump; disabled+picked = same gradient washed toward the surface. Demo: Current vs Proposed for expense / income / transfer(neutral) / primary, row + columns, enabled + read-only; toolbar for dark/themes.
- **SplitRow**: all names start at the same x (`SplitRowName.textInset` = the outlined input's measured inset; test/ui/split_row_align_test.dart), normal weight, "My share" italic + muted, demo adds a LINKED (🔗) row beside typed / contact / me.
- **StepperPill**: MonthPill merged in. `StepperPill.month(value, onChanged, first, last)` and `StepperPill.period(unit: week|month|year, …)` (budgets' navigator — FE-E told); one look; home pill switched; MonthPill removed; new UiStrings periodPrev/periodNext. test/ui/stepper_pill_test.dart.

## 2026-10-12 (night) — hub-only items, self-audit (my pages), HubPlayground scaffold
DONE · analyze clean · my tests green (the red ones — hub_coverage HeroStyle/HeroSurface, smoke molecules/bars — are FE-B's in-flight).
- **Hub-only check**: AppInput proposal, SelectCard gradient, AppMessage are hub-only (not adopted anywhere). PickCard fixed height is now OPT-IN (`fixedHeight` / `reserveSubtitle`, default off = today's card; the wallet/category pick cards are back to today's behaviour). CAVEAT for Lead: **SplitRow is a live app piece** (the split editor uses it since the 2026-10-12 order), so its tweaks — one name x, normal weight, italic "ส่วนของฉัน" — already show in the app; say if the owner wants them behind a flag until he OKs. Same for `AppIconButton` variants (callers migrated earlier) and StepperPill merge (home pill) — pixel-identical look.
- **Self-audit (my pages)**: duplicates removed (ChipRow/ChipOrder/FilterBar from pickers-inputs → molecules/bars; IconTile + SummaryStats from domain/money → their homes); SplitRow moved off pickers-inputs to its own page molecules/split-row; "today (interactive)" demos renamed so Current/Proposed read clearly; stale registry summaries fixed (pickers-inputs, money, feedback); new ratchet test/ui/hub_duplicates_test.dart (a piece on two hub pages fails; baseline = FE-B's remaining 6: AppIconSize, SectionBand/Style/StyleScope/DetailGroupScope, ProgressRow).
- **HubPlayground scaffold**: lib/hub/hub_playground.dart (HubPlayground + PlayChoice/PlayBool/PlayText/PlayNum + HubInApp/HubUse); reference = atoms/card. Split with FE-B (mine: tokens, atoms input/button/chip, molecules pickers-inputs/split-row/feedback, organisms sheets/states, domain money/transactions, templates form-sheet/transaction-detail). Applying it to my pages next.

## 2026-10-12 (night) — HubPlayground applied to my component pages
DONE · analyze clean · hub + ui tests green.
Playgrounds (controls = the widget's real options) on: atoms/button (AppButton, AppIconButton), atoms/input (AppInput today), atoms/chip (rewritten on HubPlayground, labels now English), molecules/pickers-inputs (PickCard, SelectCardGroup, StepperPill, AmountInput), molecules/split-row (SplitRow), molecules/feedback (MessageBanner, AppMessage), organisms/sheets (showAppSheet), organisms/states (AsyncStateView). Each page: playground, then an "In the app" subheading over the existing real presets. Also fixed: StepperPill label now flexible/ellipsised (the week label overflowed), `restoreAccount` added to the API flows (BE added it). FE-B applies it to theirs.

## HUB FINAL (2026-10-12)
- Deleted: MessageBanner, DetailStackedValue, AppInputLook, PickCard.fixedHeight, all shims. Hub pages have no "today / current / proposal" wording (page-flow "today" notes in api/ kept: they describe app code, not the kit).
- Final kit: AppInput (framed; .card underline; .inline; .title; .search), AppMessage = the one banner + snackbar, SelectCard one selected look, PickCard always fixed height.
- Edit outside my folders: lib/ui/templates/dashboard_page_body.dart MessageBanner -> AppMessage (FE-B informed).
- `dart analyze lib test`: no issues. `flutter test`: 442 passed.

## Last batch for 0.3.1-9 (2026-10-12)
- Control height 40 everywhere (ChipSize.control, AppIconButton sizeHero/sizeList, HeroSpacing.controlHeight); search capsule now PAINTS 40 (expands: true) — test/ui/list_toolbar_height_test.dart pixel-checks it.
- CollapsibleSection = SectionCard grouped look, `children:` API. SideSheetSection via SectionCard.
- AppInput.card / .title: `label` + `labelPlacement` (left|above) + `labelWidth`; amount symbol follows style.color.
- ActionBar (molecules/action_bar.dart): 2-4 equal 40-high buttons. DetailRow.pick(valueChip:) + ChipPath for entity values.
- showAppDateRangePicker (organisms); icon-maker PopupMenuButton -> OptionMenuAnchor; raw ratchet bans PopupMenuButton/showMenu/Dropdown*/MenuAnchor in lib/features.
- Sheets-as-organisms: pattern + reference = PeriodPickerSheet (ui/organisms/period_picker_sheet.dart) + wrapper features/transactions/.../period_sheet.dart. Assignments sent to FE-C/D/E (their moves + hub pages). Option sheets -> popover 5 (settings language, project status, budget period, wallet report scope, scheduled status) / stay sheet 5.
- Inventory (18 bespoke feature sheets; 19 anchored menus already on kit) from the Explore agent report; currency_tile popover (long-ish list) flagged, left as is.

## Non-shared widgets audit (2026-10-12) — "does anyone still use their own widgets?"
Report only; nothing edited. Scan of lib/features/** + lib/app by 3 sub-agents. Classes: **A** duplicates a kit piece → switch · **B** generic/domain look → move into kit · **C** page-specific composition of kit pieces → fine. Size S<60 · M<200 · L>200 lines.

**Headline:** features are clean — no raw BoxDecoration / TextStyle( / hard-coded colours in accounts, categories, contacts, tags, budgets, scheduled, saving_goals, projects, settings, auth. Real styling debt = `lib/app` (BootErrorApp, shell) and `home_page.dart`; real work = duplicates/aliases (A) and cross-feature widgets that still live in a feature (B). ~ **A 18 · B 46 · C ~90** (approximate ±3).

### A — duplicates / aliases of a kit piece (switch + delete)
| file:line | widget | used by | action | size | owner |
|---|---|---|---|---|---|
| pending/pages/pending_page.dart:345 | _PendingCard | pending | shares TransactionTile's TxRow mapping → extract one mapper (domain/transactions/tx_row_mapper.dart) | M | FE-D |
| accounts/pages/account_detail_page.dart:1346 | _PinnedTabBar | account detail | exact copy of kit PinnedTabBarDelegate → use it | S | FE-E |
| accounts/widgets/bank_picker_sheet.dart:81 | BankMark | picker, identifiers | alias of BankBrandMark → use kit | S | FE-E |
| accounts/widgets/member_avatar_stack.dart:9 | MemberAvatarStack | card, detail | mapper over AvatarStack → toPersonRef() ext | S | FE-E |
| contacts/widgets/contact_linked_mark.dart:9 | ContactLinkedIcon | unused | alias of PersonLinkBadge → delete | S | FE-E |
| contacts/widgets/contact_linked_mark.dart:20 | ContactAvatar | contacts | wrapper of PersonMark → ext | S | FE-E |
| contacts/widgets/contacts_list_skeleton.dart:6 + tags/widgets/tags_list_skeleton.dart:6 | Contacts/TagsListSkeleton | lists | identical → kit ListSkeleton(lines) (FE-B skeleton work) | S | FE-B/E |
| tags/pages/tags_page.dart:822,864 | _RowList, _rowsWithFooter | tags (+ categories _ListBody same loop) | use kit divided_rows.dart (export it) | S | FE-E |
| scheduled/pages/..detail_page.dart:477,495 | _StatRow, _TextRow | scheduled detail | use DetailRow / DetailStacked(+placeholder) | S | FE-E |
| projects/widgets/member_pick_card.dart:10 | MemberPickCard | draft_form_event | pass-through to kit ProjectMemberPickCard → delete (+ move showMemberPicker) | S | FE-D |
| projects/widgets/project_common.dart:40 | memberAvatar() | project tiles | one-line adapter of ProjectMemberAvatar → inline/ext | S | FE-D |
| projects/widgets/project_tx_tiles.dart:27 | ProjectTxIcon | tx tree tile | = tx type bubble → add TxTypeIcon in ui/domain/transactions | S | FE-D |
| settings/pages/settings_page.dart:207 | _ThemeModeRow | settings | already kit ThemeModeChips | S | FE-D |
| app_version/widgets/update_banner.dart:35 | UpdateBannerStrip | app overlay | AppMessage strip next to OfflineBanner → ui/domain/feedback, share top-strip wrapper | S | FE-D |
| categories/widgets/category_preview_card.dart:9 | CategoryPreviewCard | category detail | near-dup of AccountCard horizontal / ListRow in AppCard(accent) — verify | M | FE-E |

### B — generic/domain looks that belong in the kit
| file:line | widget | used by | proposed kit home | size | owner |
|---|---|---|---|---|---|
| accounts/pages/accounts_page.dart:416 | _WalletsSummary | accounts | domain/money/net_summary_card.dart `NetSummaryCard` (+ budgets overview, debts _Summary, home _NetWorthCard same shape) | L | FE-E |
| budgets/widgets/budget_overview_card.dart:15 | BudgetOverviewCard | budgets | same family as NetSummaryCard / OverviewCard | M | FE-E |
| budgets/budget_card.dart:39 · saving_goals/saving_goal_card.dart:10 · scheduled/scheduled_card.dart:13 (+AccountCard layouts) | BudgetCard, SavingGoalCard, ScheduledCard | lists | ONE `EntityCard` molecule (leading, title, subtitles, trailing, ProgressRow) | M each | FE-E |
| accounts/widgets/wallet_pick_card.dart:11 | WalletPickCard | 4 pages outside accounts | domain/money/wallet_pick_card.dart | M | FE-E |
| accounts/widgets/wallet_value_chip.dart:7 | walletValueChip | goals, scheduled | domain/money/wallet_value_chip.dart | S | FE-E |
| categories/widgets/category_pick_card.dart:15 | CategoryPickCard | draft forms | domain/categories/category_pick_card.dart (shared EntityPickCard base with WalletPickCard) | M | FE-E |
| categories/widgets/category_chip_path.dart:13 | categoryChipPath | budget, category detail, scheduled (hand-builds one too) | domain/categories/ | S | FE-E |
| accounts/widgets/wallet_members_view.dart:265 | _MemberRow | wallet members (+ project/event members) | domain/people/member_row.dart | M | FE-E/D |
| tags_page.dart:661,700 + categories_page.dart:383 | _colorFilter/_iconFilter | tags, categories | molecules/swatch_filter_chips.dart | M | FE-E |
| accounts/pages/accounts_page.dart:589, account_detail_page.dart:1526 | _AccountsSkeleton, _DetailSkeleton | accounts | page_skeletons.dart GridPageSkeleton / DetailPageSkeleton | M/S | FE-B |
| account_detail_page.dart:1682 | _EditLabel | account detail | molecules/edit_label.dart (animated field label in edit mode; ties to the new card labels) | S | FE-A |
| scheduled/..detail_page.dart:359,604 | _ToneIcon, _HistorySection | scheduled | ToneIcon atom / `AsyncSection<T>` | S/M | FE-E/A |
| home/pages/home_page.dart:1114 | _DraftsCard | home | domain/transactions/ (shares title logic with _PendingCard) | M | FE-C |
| home_page.dart:489 | _UpcomingCard | home | domain/money/upcoming_card.dart | M | FE-C |
| home_page.dart:342 | _NetWorthCard | home | NetSummaryCard | M | FE-C |
| home_page.dart:401 | _MonthCard (trend row) | home | molecules/trend_delta.dart | M | FE-C |
| home_page.dart:832 | _Tile | home | molecules/stat_tile.dart | M | FE-C |
| home_page.dart:1233 | _colorKey | home charts | atoms/color_key.dart | S | FE-C |
| home_page.dart:281 | _MonthSlide | home | molecules/directional_slide_switcher.dart | M | FE-C |
| personal_debts/pages/personal_debts_page.dart:154 | _Summary | debts | molecules/selectable_stat_box.dart + NetSummaryCard | L | FE-C |
| personal_debts/widgets/debt_widgets.dart:43 | DebtTile | debt person | ListRow / MoneyListTile or domain/money/debt_row.dart (hand-built InkWell row) | L | FE-C |
| transactions/widgets/period_summary_card.dart:41 | PeriodSummaryCard | accounts detail, tx list | domain/transactions/ (+ ErrorView for its retry row) | L | FE-C |
| transactions/widgets/tx_summary_title.dart:13 | TxSummaryTitle | quick create, detail | domain/transactions/ | M | FE-C |
| transactions/widgets/account_picker_sheet.dart:169 | _NoneTile | account picker | molecules/none_tile.dart | S | FE-C |
| transactions/widgets/draft_form.dart:1344,1412,1454 | TxTagStrip, DraftFieldRow, _ShareLine | forms | icon_chip_strip / field_row / domain share_line (+ splits_section _LeftLine same family) | S/S/M | FE-C |
| transactions/widgets/splits_section.dart:490 | _AmountBox | split rows | SplitRow.amountField | M | FE-A |
| transactions/widgets/pick_chip_rows.dart:34,186,289 | Category/Tag/WalletChipRow | quick create, batch | one `PickChipRow<T>` (unverified) | M | FE-C |
| projects/widgets/project_dashboard_tab.dart:233 | _barRow | project dashboard | molecules/ranking_row.dart `RankRow` (also budgets/home) | S | FE-D |
| settings/settings_page.dart:144,227 + auth_widgets.dart:119 | _ThemeCards, _LanguageRow, AuthPrefsBar | settings, login | domain/l10n LanguageMenu (+ move kLanguageNames out of auth_widgets) | S-M | FE-D |
| auth/widgets/auth_widgets.dart:15,54,81 | AuthBrandHeader, AuthOrDivider, GoogleSignInButton | login, register | domain/brand BrandHeader / AppDivider.labeled / google_sign_in_button | S | FE-D |
| app_version/pages/update_required_page.dart:42 + app/boot_error_app.dart:14 | UpdateRequiredView, BootErrorApp | boot, update | one kit BlockingNoticeView; BootErrorApp is the ONLY file with raw Colors/TextStyle (pre-theme, maybe intentional) | M | FE-D |
| app/shell/app_top_bar.dart:545, main_bottom_nav.dart:335,390,444 | _LeftGroup, _SlidingHighlight, _AddButton, _NavItem | shell only | tokenise (radius 22, ring 4, fontSize 10); move to kit only if a 2nd use appears | M | FE-A/shell |

### C — page-specific compositions (fine)
~90 widgets: all page shells/bodies, DraftForm sections, SplitsSection rows, heroes (HeaderCard configs), IdentifierRow/EditRow, WalletMembersView, thin sheet wrappers (NotificationTile, TxFilterSheet, PeriodSheet, QuickCreateSheetShell, add-member/resolve), shell infra (FadeBranchContainer, KeyboardInsetsGuard, MainShell, ShellChromeHider …).

### Counts
- Per class: A ≈ 18 · B ≈ 46 · C ≈ 90.
- B/A per owner: **FE-C** ≈ 18 (home 7, debts 2, transactions 9) · **FE-E** ≈ 24 (accounts, categories, contacts, tags, budgets, scheduled, goals) · **FE-D** ≈ 12 (projects, settings, auth, app_version, pending) · **FE-B** ≈ 3 (skeletons) · **me (FE-A / shell)** ≈ 4 (_EditLabel, _AmountBox, shell tokens).
- Cross-cutting findings: (1) two hero systems — accounts uses HeroSurface/HeroContent, the other five detail pages HeaderCard; (2) `EntityCard` + `NetSummaryCard` + `EntityPickCard` would absorb ~12 widgets; (3) `divided_rows.dart` exists but is not exported from ui.dart.
- Not touched: sheet moves (C/D/E) and skeletons (FE-B) are in flight.

### RE-CLASSIFIED under the new owner rule — "every visual widget lives in the kit, even used once"
- **C shrinks to pure wiring** (a feature wrapper that only feeds a kit piece: sheet wrappers, NotificationTile, TxFilterSheet/PeriodSheet wrappers, UpdateBanner cubit wrapper; shell infra with no visuals: FadeBranchContainer, KeyboardInsetsGuard, QuickCreate*Scope, ShellChromeHider, TabRootScaffold; cubit/loader helpers). ≈ 25 widgets stay.
- **Everything the table above called C but that lays things out** (Column/Row/Padding/SizedBox/Text/Icon, EdgeInsets, colours) becomes **B**: ≈ 65 more widgets — page bodies (HomeView, DraftForm and its sections, SplitsSection rows, detail `_header/_fields/_footer` builders, AccountDetail `_HeroHeader`, ProjectDashboardTab, _MoreView, ContactRow / _PersonRow, category tree rows, chip rows …).
- New totals: **A ≈ 18 · B ≈ 111 · C ≈ 25** (±5).
- Where B goes: page bodies → `lib/ui/templates` (DashboardPageBody / ListPageBody / DetailPageBody already exist: most pages become "template + parameters"); rows/cards → `lib/ui/molecules` (generic) or `lib/ui/domain/<area>` (knows app models: Tx, Account, Category, Contact, Budget, Goal, Project); forms → `lib/ui/domain/<area>/<x>_form.dart` taking a state object + callbacks. Feature code keeps: cubit/repo wiring, navigation, mapping model → kit params.
- **Effort (rough, one dev):** A ≈ 18 × 0.5 h = 9 h · explicit B ≈ 46 × 2 h = 92 h · reclassified B ≈ 65 × 2 h = 130 h (many collapse once EntityCard / NetSummaryCard / EntityPickCard / templates exist) → **≈ 230 h ≈ 29 dev-days**; with FE-B/C/D/E + me in parallel ≈ **6–7 working days** wall-clock, plus a hub entry per new piece (+≈ 10%) and widget tests for the pieces with behaviour. Biggest single items: DraftForm (+ sections, ≈ 750 lines), home_page (1,240 lines, 15 widgets), account_detail_page (hero + tabs), personal_debts _Summary / DebtTile, categories / tags page bodies, splits_section.
- **Proposed ratchet test** `test/ui/feature_visuals_test.dart` (modelled on raw_widgets_test.dart): scan `lib/features/**.dart` + `lib/app/**.dart`; for every `class X extends StatelessWidget | StatefulWidget | ConsumerWidget | State<…>` take the class body; it has *visual code* when it contains a layout / paint widget (`Column(`, `Row(`, `Stack(`, `Padding(`, `Container(`, `SizedBox(`, `Align(`, `Center(`, `Expanded(`, `Wrap(`, `ListView(`, `Text(`, `Icon(`) or a style token (`EdgeInsets`, `BorderRadius`, `Colors.`, `TextStyle(`, `BoxDecoration`) — a build that returns exactly ONE kit widget call counts as wiring. Baseline `test/ui/feature_visuals_baseline.txt` = `path|Class` per offender (≈ 135 lines today). The test FAILS on any offender not in the baseline (a new visual widget in a feature) and fails with "baseline can shrink" when an entry is gone (update downward with `UPDATE_BASELINE=1`, like the other ratchets). `part of` / generated files skipped; an allow-file with a reason for real exceptions (BootErrorApp pre-theme). Target: baseline → 0 at the end of the migration.
- Order I would propose: (1) A duplicates (quick wins, ~1 day) → (2) shared pieces EntityCard / NetSummaryCard / EntityPickCard / BlockingNoticeView / LanguageMenu / ListSkeleton (~2 days, mostly me) → (3) per-owner B moves in parallel (3–4 days) → (4) page bodies → templates last.

## Handoff 2026-10-13 (FE-A, kit + shell owner)

**In flight:** nothing of mine is half-done. Last state: `dart analyze lib test` clean; full suite green except others' in-flight reds (hub_coverage `ConnectionBanner*` needs a hub page; page_flows ratchet; contact_detail_page_test = FE-B). Open follow-ups, not started:
- **Widget audit migration** (this file, "Non-shared widgets audit" + "RE-CLASSIFIED"): ~18 A (switch to kit) · ~111 B (move into the kit) · ~25 C; proposed ratchet `test/ui/feature_visuals_test.dart` (baseline ≈135, may only shrink) NOT built yet. Next step: the A duplicates, then EntityCard / NetSummaryCard / EntityPickCard / BlockingNoticeView / LanguageMenu / ListSkeleton.
- **Sheets as organisms:** pattern + reference = `PeriodPickerSheet` (ui/organisms) + wrapper `features/transactions/.../period_sheet.dart`; FE-C/D/E moved theirs (check FE-D's `sheets-projects` hub page + the Change-password ChangePasswordSheet landed).
- Popover conversions (5 option sheets → `OptionMenuAnchor`) assigned to C/D/E; `currency_tile` popover for a long list was flagged, left as is.
- Scrim: `TopScrim` is in AppTopBar's flexibleSpace; no per-page opt-out yet.

**Gotchas for the kit/shell owner:**
1. **AppInput sizes:** `AppInput.card/.title` take `size: AppInputSize.regular|title|hero` (label row 24, value row min height, baseline, underline y — whole px, text-scaled). Same size for fields side by side; the value font must fit the size (hero ≤ 28px). No size = legacy font-driven geometry. Never wrap a sized field in `IntrinsicHeight` (Baseline's intrinsic height is wrong). Pixel tests: `test/ui/app_input_size_test.dart`, `test/features/transactions/hero_alignment_test.dart`.
2. **Framed AppInput:** trailing affixes must NOT be `Flexible` next to the `Expanded` field (they split the row — the eye lands mid-field); text affixes are width-capped instead. The notched label overhangs its box by half a line: never `ClipRRect`-clip a parent (SectionCard cell uses clipBehavior none + rounded Material). The eye is a 40×24 overflow box so fields keep one height.
3. **Chips:** `ChipSize` mini 20 / chip 28 / control 40 (= THE control height: icon buttons, search capsule 40, hero controls, dense input). `AppChip.size` null → `ChipSizeScope` → control; `ListToolbar` scopes its chips to 28. Search capsule only paints 40 with `expands: true` (see `list_toolbar_height_test`).
4. **Shell chrome:** `ShellChromeController.hide/show(owner:)` is COUNTED by owner; every hider passes `this` and releases in `dispose` (always, unconditionally). Don't reintroduce a "was I hidden?" guard — it caused the stuck-hidden bottom bar. Tests: `shell_chrome_test`, `edit_mode_mixin_test`.
5. **Ratchets/baselines:** `UPDATE_BASELINE=1 flutter test` regenerates `api_unused_baseline.txt`, `api_flows_baseline.txt`, the duplicates + raw-widget baselines. `raw_widgets_test` now also bans `PopupMenuButton/showMenu/Dropdown*/MenuAnchor` in lib/features. Lint-style tests fail on stale entries too — update downward only.
6. **Hub coverage:** every gate-exported piece (`lib/ui/ui.dart`) must be in some hub page's `covers` (`hub_registry.dart`) and demoed; stale covers fail. A new kit piece with no hub page turns the suite red for everyone — add the page in the same change.
7. **Tests/theme:** pump with `ThemeData(extensions:[sweetTheme.lightColors])`; avoid `ThemeBuilder` in tests (google_fonts can't load offline). Use a pixel scan on a `RepaintBoundary` (not widget rects) for alignment bugs; fractional heights blur 1px lines — keep tokens whole-pixel.
8. **Shell edits by script:** big edits via Write'd node scripts + Read-before-Edit; the shell here chokes on heredocs with apostrophes; never `cat >> file` with no stdin (it hangs).

## 2026-10-20 — 0.4.0-2 polish round (นายA-fe = FE-A, kit / hero / hub owner)
DONE · analyze: `flutter analyze lib` clean on my files (others' work in progress excluded) · tests: NONE run (owner's go needed) · nothing committed
files (main): lib/ui/tokens/hero_colors.dart (new) · lib/ui/organisms/hero/{hero_ring, hero_facts, hero_info_box, hero_filter_chips (new), app_hero_card, hero_number, hero_bar, hero_identity, hero_note, hero_alert, hero_amount_field, status_amount_line, summary_tile} · lib/ui/molecules/{hero_style, progress_row, day_of_month_picker, month_picker, hero_description} · lib/ui/atoms/{app_icon_button, list_break} · lib/ui/organisms/divided_rows.dart · lib/ui/templates/list_page_body.dart · lib/ui/domain/{progress/progress_card, saving/saving_goal_row, money/money_list_tile, recurring/recurrence_sheet} · features: budget_detail_page (hero / scope), budget_draft, budget_labels, accounts_page (summary), several pages' hero `color:` sweep · hub pages + hub_registry · l10n th/en + gen.

What landed, in short:
- **HeroColors:** `HeroSurface` puts a `HeroColorScope` around every hero.
  - The roles are accent / soft / line / track / text / muted / warning / danger / success, made from the card color (theme primary on a plain card).
  - HeroNumber, ProgressRow / HeroBar, SummaryTileView, captions, HeroAlert, HeroAmountField, StatusAmountLine, the fold button and AppIconButton read it when inside a hero.
  - Pages no longer pass a color that only repeats the card's own.
- **Ring kit:**
  - `HeroRing`: used + expected, a pace tick and a warn tick. The base ring has a shade from a round head at 12 o'clock that fades out by half way.
  - `HeroRingRow`: the facts get half the row, at least 176; the ring gets the rest, at most 160.
  - `HeroFactList` / `HeroFact`: dashed rows, with `dot` and an `onTap` that adds ›.
  - `HeroInfoBox`: the small box beside ✏️.
  - `HeroFilterChips` / `HeroFilter`: count chips with `tone` (dot) or `icon`.
- **Bars and rows:**
  - `ProgressRow.markerBubble`: an always-on bubble in the bar's color, clamped inside the row with its arrow on the tick. `ProgressCard.paceBubble` passes it through.
  - `SavingGoalRow`: caption, trailingCaption, color, marker and bubble; the badge sits by the name.
  - `ListPageBody(rowCards: true)` + `cardedRows()`: one SectionCard per run of rows between ListBreaks. `CardedListBreak` makes DateGroupHeader start its label md in from the card edge.
- **Repeat sheet:** a picker for each frequency.
  - weekly: weekday chips (single on a budget)
  - monthly: DayOfMonthGrid, plus nth + weekday for recurring items
  - yearly: `MonthOfYearGrid` + DayOfMonthGrid(days:)
  - A budget's start moves to the next matching day, and a caption says so. `BudgetDraft.withKitRule` copies the start.
- **Budget detail:**
  - The ring hero (`_viewHero`): info box, ring, facts, a plan StatusChip last.
  - The scope card has no header; "นับรายจ่ายไหนบ้าง" is the first row's label.
  - The period rows were later rebuilt by นายB.
- **Wallets list hero (accounts_page `_summary`):**
  - no fold; big net + `HeroBar.split` (available / saved / card debt) + dotted facts (ออมไว้ › goals)
  - icon filter chips only when there are cards
  - new keys `fpWalletsFilterAll` / `Cash` / `Card`
- **Split the list / detail redesign:**
  - นายE: budgets list, budget items tab, transactions list
  - นายD: saving goals list / detail / entries
  - I reviewed both and fixed the kit header inset.
deviations / notes:
- Unused keys and dead code are listed in `ai/backlog.md` → "0.4.0-2 leftovers".
- The budget detail `_tiles` and `_ruleText` (นายB's) were removed because nothing used them after the hero rewrite.
- Stale tests: see backlog. Nothing is committed; all sessions share one tree.

## 2026-10-20 นายA-fe: A-plan for 0.4.0-2 (scan only, NO code yet)
Plan page: https://claude.ai/artifact/FVDEMEHAML6xc7YaLZV5tP. I read code only: no edits, no tests. Every new piece gets a hub demo + `covers` first.

Order after "จัด" (unblock D / E first, then B, then my pages):
1. A1, A2, A3, A7, A9, A10
2. A5, A6, A11, A12, A16
3. A4, A8
4. A13, A14

**A1 `HeroFact` icon (S).**
- `hero_facts.dart`: add `IconData? icon` + `Color? iconColor`. It is drawn as `AppIcon` sm where the dot is today. The colour falls back to `dot`, then the hero accent.
- `dot` stays for old calls; the wallets hero moves to icon + iconColor.
- New `AppIcons`: `receipt`, `trendingUp`, `pie`, `layers`, `coin`, `hourglass`, `target`, `savings` (piggy).
- Reused: `scheduled` (clock), `date` (calendar), `recurring` (repeat), `creditCard`, `wallet`, `savingGoal` (flag).
- Call sites: accounts_page, budgets_list_page, budget_detail_page, saving_goals_list_page, saving_goal_detail_page, the hub app-hero-card page.

**A2 module tile + budget icon (S/M).**
- No new tile widget: `IconTile(size: 40, shape: rounded, style: solid)` already exists.
- I add a thin `HeroModuleTile(icon)` that takes `HeroColors.accent`, so pages pass no colour.
- I also add `HeroSummaryHead(icon, label, amount, actions)` = [tile | label over big number | actions]. นายD asked for it (goals list), and my A14 (wallets list) uses it.
- `AppIcons.budget` → `Icons.donut_large` (or `pie_chart_outline`). Uses:
  - more_page L93, home_page L678, archived_page L57
  - budgets_list_page L150 / L287, budget_detail_page L671 / L738 / L1347
  - hub atoms_card, badge_avatar, blocks, bars, section_hero
- Hard-coded `Icons.savings_outlined` in progress_card L142 and saving_goal_row L86: check what each one means, budget → AppIcons.budget, saving → stays.
- icon_registry 'savings' is a user icon and stays.

**A3 summary chip (S).**
- `HeroHeader` already wraps its row in `ChipSizeScope(control)`, so a `StatusChip` there is 36 with a dot.
- Missing: bold. I add `StatusChip(emphasis: true)` (→ AppChip label weight w700).
- นายE uses StatusKind active / warning / over.

**A4 `OccurrenceChain` (L).**
- New, in `ui/domain/recurring`.
- Params: `total?`, `current`, per-index state (paid / wait / skipped), labels for first / current / last, `open` (no end: month labels + a fading tail), colour from HeroColors.
- The tier comes from LayoutBuilder width: numbers on all → numbers on 3 → dots + popovers → bar + popovers.
- Popovers: ProgressRow's private `_MarkerBubble` + `_ArrowPainter` become a public `PointerBubble`, so the pace bubble and the chain share one bubble.
- The current bubble wins when bubbles collide.

**A5 date tiles (S/M).** Nothing exists today. New `CalendarTile(date)`: month band / day / weekday, for the hero. New `DateTile(date, showYear)`: day + month, plus "ม.ค. 27" in another year, for rows.

**A6 occurrence row (M).**
- `TxRow` gets `titleMaxLines` (default 1).
- New `OccurrenceRow` in ui/domain/recurring = TxRow + DateTile leading + 2-line title + tag + sub + amount.
- นายE's "อีก N วัน": pass `DueText` into the existing `statusChip` slot, no new param.

**A7 `HeroInsetBox` (S).** The soft-fill + line box shared by HeroInfoBox / HeroFlowBox, pulled out as a public piece. The recurring next-occurrence box uses it.

**A8 `AmountLineChart` (M).**
- A CustomPainter like SavingHistoryChart (no chart package).
- Points with amount labels, a dashed average, the next one a hollow "?" in warning.

**A9 `HeroFlowRow` (M).**
- นายE's API is accepted: (monthLabel, income, expense, onPrev, onNext (null on this month), onTapIncome, onTapExpense, selected).
- The keys stay heroFlow*.
- `HeroFlowBox` is deleted once E3 stops using it (only account_detail_page uses it).

**A10 `MemberChip` (S).** A chip-height pill around `MemberAvatarStack` + "+N", with onTap. It cannot go in `AppChip.leading`, because that slot's FittedBox shrinks the stack.

**A11 tabs / calendar (S).**
- Big tabs: full-width `SegmentedChoice` (exists) rather than a new AppTabBar style. The owner's mock is a pill pair.
- `MonthCalendar(showStepper: false)` (today it always draws its own stepper, L137).
- New `TodayDivider`, built like `OrDivider` with the accent.

**A12 quick create shell (S/M).**
- `QuickCreateSheetShell`: add `subtitle` (the "แก้เฉพาะงวดนี้" caption) and `extraActions` (ข้าม / ยกเลิกการข้าม).
- `showEntrySheet`: relax the 1–2 actions assert.
- Tests: entry_sheet_test.
- quick_create_sheet.dart order: นายD's D3 deletions first, then A12, then นายB's B2 / B3.

**A16 (new) `NeedsActionCard` (M).**
- The ต้องจัดการ card in both the recurring list (B1) and detail (A13).
- The pending row moves into the kit. Today it is private `_PendingCard` in pending_page.
- B1 and A13 filter PendingCubit by recurring source / id (BE C3 adds `?recurring_id=`).

**A13 recurring DETAIL page (L).**
- `_viewHero` is rebuilt top to bottom:
  - HeroIdentity + HeroInfoBox (rule | start / end) + ✏️
  - HeroInsetBox with CalendarTile + "ครั้งถัดไป | อีก N วัน" + the amount + แก้ยอด / ใส่ยอด | เลื่อนวัน | ข้าม
  - OccurrenceChain, or AmountLineChart for variable amounts
  - HeroTiles (3 stats)
  - a chip row: StatusChip ▾ (pause / resume) | kind | category | wallet (| tags)
- `_infoBox` and the settings strip go. NoteSection stays.
- Tabs ประวัติ | ล่วงหน้า become one flat SectionCard each:
  - no month groups
  - OccurrenceRow, auto paging (no "เพิ่มเติม ›" / OccurrenceDates)
  - a tap opens นายB's B2 (past) or B3 (upcoming) sheet
- `NextOccurrenceCard` / `OccurrenceDates` become unused → cleanup list.
- Needs C2 (names), C3 (stats, pending filter, horizon).
- Questions: Q3, Q4, Q5 (batch select: today `_batch` / selection mode in `_pastTab`).

**A14 wallets list hero (S).** `HeroSummaryHead` (wallet tile + "ยอดสุทธิของฉัน | N กระเป๋า" + net) + facts with icon + iconColor in place of dots.

**A15:** review B / D / E + docs/ai.

Kit guard tests likely touched (paths only, not run):
- test/ui/hub_coverage_test.dart, feature_visuals_test.dart (+ baseline: more_page, account_detail_page, home_page), raw_widgets_test.dart, layering_test.dart, hub_duplicates_test.dart
- test/ui/tx_row_marker_test.dart, saving_kit_test.dart, page_dots_test.dart
- test/shared/app_tab_bar_test.dart
- test/features/recurring/recurring_pages_test.dart, test/features/transactions/entry_sheet_test.dart

## 2026-10-20 — 0.4.0-2 plan round: A13 recurring detail + A15 review (นายA-fe) — CODED, analyze clean (lib + test), NO tests run
**A13 recurring detail page** (recurring_detail_page.dart):
- Hero, top to bottom:
  - HeroIdentity with HeroInfoBox (the round + "ตั้งแต่ {month}" or the end) and ✏️.
  - HeroInsetBox: CalendarTile + "ครั้งถัดไป | อีก N วัน" (installment: "งวดถัดไป (n/N)") + the amount or รอใส่ยอด, then แก้ยอด / ใส่ยอด | เลื่อนวัน | ข้าม.
  - OccurrenceChain: the BE `chain`, else from progress; a no-end rule gets an open chain from history + the next 3. A no-amount rule with ≥ 2 recorded amounts gets AmountLineChart instead.
  - HeroTiles, by kind:
    - installment: จ่ายแล้ว / เหลือ / งวดสุดท้าย
    - no amount: เฉลี่ย / ครั้งก่อน / สูงสุด
    - otherwise: ต่อเดือน / ปีละ / บันทึกแล้ว
  - Chips: status ▾ | kind | category | wallet(s) | tags | บันทึกอัตโนมัติ.
- Gone: HeroHeader, the pending tile, HeroAlert, the view info box, the tag row, batch select, and the one-off "add item" tile (C1 removes that API).
- Tabs: one card of OccurrenceRow each (DateTile, the occurrence name, tags รอยืนยัน / ครั้งถัดไป / เลื่อนแล้ว / แก้แล้ว / ข้าม / สุดท้าย / จ่ายแล้ว, amountWaiting). Upcoming for a no-end rule = `window` mode with ดูปีถัดไป + ไปที่เดือน buttons under the card; rules with an end page to the end.
- Occurrence writes go by rule + slot when the item has one (updateOccurrence / skipOccurrence / restoreOccurrence), else the old item-id calls.
- Edit mode:
  - "บันทึกอัตโนมัติเมื่อถึงวัน" switch: enabled only with a fixed amount and a wallet, with a hint line.
  - R20 = one EditScopeChoice. It only appears when name / note / wallet / category / tags change and `recorded_tx_count > 0`, and it sends `also_update_tx`. The old 2-question scope + linked prompt is gone.
- Model:
  - Recurring gains avgAmount, chain (ChainSlot), recordedTxCount, autoCreate / Since.
  - CurrentOccurrence gains slot and a synthetic id (for นายB).
  - RecurringStats comes from top-level `stats` (contract confirmed by นายC).
  - ItemPage gains windowed / nextFrom.
  - RecurringWrite gains auto_create. repo.update gains also_update_tx, and items gains `from` (`months=12`).
- 29 new l10n keys (fpRecurringSince … fpRecurringTxScopeAll), in th + en + the 3 gen files.
- recurring_pages_test detail group rewritten for the new layout (not run).
- Waiting: the ต้องจัดการ card on the detail page + row taps → นายB's occurrence_actions.dart (B3).

**A15 review** (read-only agent, then each owner fixed their own): B 6/6, D 4/5, E 9/10. The unfixed ones are `HeroStyle.tinted(color:)`, which can't drop the color (it is required), so it is kept. Mine: HeroFlowRow ‹ › tooltips, MemberChip semantics label, and `HeroFlowSelection` moved into hero_flow_row.dart.
Owner calls still open: `fpGoalsFilterFree` "ไม่มีกำหนด" as a filter chip; the ended / archived budgets hero still uses HeroCaption; Σused counts spend in overlapping budgets twice; old recurring drafts in pending show as "อื่นๆ" (owner said leave them, so it's accepted).

**A18 cleanup list additions** (now unused):
- l10n: fpRecurringNextTitle, fpRecurringNextCaption, fpRecurringThenTitle, fpRecurringMoreDates, fpRecurringChipSkipped, fpRecurringChipEdited, fpRecurringTilePending, fpRecurringTileInstallment, fpRecurringAlertAwaiting, fpRecurringNextInline, fpRecurringInfoSpan, fpM5bRecurringAmountPerTime, recurringSelectAll, fpRecurringSelectDone.
- code: groupItemsByDate, addRecurringItem, RecurringDraft.valuesDiffer, TxPeriod.canStepForward. NextOccurrenceCard / OccurrenceDates go if no page uses them after B1.

### 2026-10-20 — A13 follow-up: ต้องจัดการ card on the recurring detail (นายA-fe) — CODED, analyze clean (lib + test), NO tests run
- The card sits under the hero. It lists this rule's due occurrences plus this month's coming rows that need an amount (R1), up to 3 rows.
  - Each row: a DateTile, a warning tag (รอยืนยัน, or "อีก N วัน"), amount | wallet, and นายB's `occurrenceActionsFor`.
  - With ≥ 2 due: a DueGroupHeader "ค้างตั้งแต่ {month}" with `settleAllActions` (ยืนยัน / จ่ายแล้ว / ข้ามทั้งหมด).
  - More than 3: a DueMoreRow "ดูทั้ง N งวด" that switches to the ประวัติ tab.
- Row taps in both tabs → `openOccurrenceSheet` (แก้เฉพาะงวดนี้). An old-BE row with no slot and no tx keeps the old menu until the BE rebuild.
- New keys: occurrenceDueTitle, occurrenceDueSince, occurrenceDueMore (B1 reuses them).
- Test: "a due occurrence: ต้องจัดการ card above the tabs" (not run).
- A18 additions, now unused: RecurringItemActions, askCreateTarget, addRecurringItem, createFromRecurringItem (+ its page_flows entry), askItemScope, askDeleteLinked.
- After the BE rebuild, the old-BE fallbacks can go as well: `_occurrenceMenu`, repo.editOccurrence / setItemArchived on the detail page, and editRecurringItem.
- Owner answers (2026-10-20, in chat):
  - The budgets list Σused stays the sum of every budget.
  - The ended / archived budgets hero loses its HeroCaption (done by นายE).
  - นายA OK'd the future_tx chip "ล่วงหน้า".
- Later the same day:
  - `Recurring.tryParse` / `ItemPage` use tryParse, so a BE `saving`-type row no longer breaks a list (นายB's ask; the directory cubit switches on B's side).
  - The detail chain reuses B's `endChainDots` for rules with an end.
- A18 also: drop the duplicate `fpRecurringDuplicateConsequence` line in app_th.arb / app_en.arb. นายB's list in fe-b.md "B1 recurring list page" is merged into the pass.

### 2026-10-20 — BE split progress (นายA-fe)
- Done (build / vet clean, NO tests run):
  - item 1 `Spec.Between` (นายD, see fe-d.md)
  - item 2 occname.go + 27 cases (นายB)
  - item 4 notifications (นายB): due link `/recurring?focus=due`; new `recurring_auto_created`, grouped per user per day; the 068 CHECK lines were sent to นายC
- App follow-up assigned to นายB: the `recurring_auto_created` tile + notification-type lists.
- My C6 list so far:
  - openapi NotificationType gets `recurring_auto_created`
  - tests for per-day grouping and the due deep link
  - tests for items 1–5
  - api-document
- Owner (2026-10-20): "เอาเลย", so budget detail recurring_item rows open their occurrence (นายE: BudgetItem rule_id / slot, then `openOccurrence`, then reload the budget).
- The app tile for `recurring_auto_created` is done, and recurring_due moved off pending to "ไปจัดการ ›" → /recurring?focus=due (นายB).
- A18 additions:
  - `notifActionOpenPending`
  - make `openOccurrence(itemId:)` nullable and drop นายE's `''`
- Stale test to check: notifications_inbox_page_test:460 "Open pending ›".

### 2026-10-20 — C3 + C8 landed; C6 split (นายA-fe)
- นายC landed C3 + C8 + the C2 integration: build / vet clean, tests NOT run. 068 is final and was tried up / down / up on a COPY of the dev DB; the dev DB is still at 067.
- App-side updates for the final contract (analyze clean):
  - `autoCreateSince` dropped (the BE dropped `auto_create_since`).
  - `RecurringDetail.txUpdateFailed` (from `tx_update.failed`), so an R20 save warns "อัปเดตรายการที่บันทึกแล้วไม่ได้ N รายการ" (new key fpRecurringTxUpdateFailed).
  - นายB: findOccurrence now reads the month list, since there is no GET of one slot.
- C6 split by นายA (coordinator):
  - นายB: openapi.yaml (the whole C3 / C8 list + NotificationType + tx delete skip_occurrence; operationIds into นายC's recurring_test.go) and the notifications tests.
  - นายE: readers Go tests.
  - นายD: api-document.md.
  - นายA: review, including a read-only review of the C3 / C8 code.
- Then ask the owner: BE tests + dev DB migrate to 068 + local rebuild, and the app tests.

### 2026-10-20 — C3 / C8 review + C6 progress (นายA-fe)
- Read-only review of นายC's rewrite (no runs). Sent to นายC to fix:
  - Bugs:
    1. DueCheck UPDATEs bump updated_at on every read, so the sync fingerprint never matches.
    2. Resume turned the earlier due occurrences into paid.
    3. Manual items can't be addressed by slot.
  - Risks:
    - "same period" replacement isn't by calendar month
    - the tx delete hook misses the other transfer leg / a shared-wallet member
    - confirm / skip on a legacy pending row keeps the draft
    - due lists include paused rules
    - ConfirmReady is all-or-nothing
    - 068: the tracked_from backfill runs before the deletes, the down comment is wrong, the DB TZ is used
  - Nits: pushToRecorded's old wallet balance, partial PUT null, HeaderTZ, perf.
  - Tests: TestBulkOccurrences / TestRecurringKinds depend on the date.
- Owner decision (2026-10-20): on resume, due occurrences from before the pause stay due, and the paused gap = skipped.
- C6:
  - openapi done (นายB: 12 new occurrence ops, removed batch / create, NotificationType, 78 op ids in recurring_test.go, notifications tests).
  - readers tests done (นายE; plus TestBudgetRecurringCategory to fix for 068).
  - api-document done (นายD; an alignment pass against openapi is running).

## 2026-10-20 — A18 cleanup pass DONE (นายA-fe) — analyze clean (lib + test), NO tests run
A read-only agent built and verified the list (every candidate was grepped for uses in lib + test, gen files left out).
- **l10n:**
  - 188 unused keys removed from app_th.arb, app_en.arb and the 3 gen files (scripted, announced: scratchpad a18_l10n.py; both arb files re-parse as JSON).
  - The keys come from the backlog lists, the fe-a / b / d / e reports, plus "extra dead" keys found by a prefix sweep (old bg* tiles / sections, recurringSummary*, recurringTab*, recurringKindSaving / Tx, accountsSummary* …).
  - The duplicate `fpRecurringDuplicateConsequence` line is gone too.
- **Code removed:**
  - recurring_item_actions.dart: RecurringItemActions + ItemMenuAction, createFromRecurringItem, addRecurringItem, askCreateTarget, askDeleteLinked (kept: editRecurringItem / askItemScope = the old-BE fallback).
  - repo: addItem, deleteItem, createFromItem, batch, ItemBatchAction, RecurringList.
  - domain: ItemTarget, RecurringFilter.
  - recurring_rows.dart: RecurringItemRow, ItemDateGroup / groupItemsByDate.
  - RecurringDraft.valuesDiffer.
  - budgetReasonText (+ the 6 fpBudgetsReason* keys).
  - the view branch of budget_detail `_scopeSection` / `_scopeRow` (edit-only now).
- **Kit:**
  - next_occurrence_card.dart (NextOccurrenceCard / Action, OccurrenceDates / Date / Kind) and hero_flow_box.dart (HeroFlowBox) deleted, with their ui.dart exports, hub covers and hub demos.
  - HeroBar.split lost its big-legend params (leftAmount / rightAmount / *Color, `_BigLegend`).
- **Hub page flows:**
  - recurring-detail now matches the new page.
  - The old duplicate `recurring-occurrence` flow is gone.
  - นายB's `FlowCall.unspecified` occurrence calls now use the new operationIds (updateRecurringOccurrence, confirmRecurringOccurrence, … listRecurringOccurrences).
- **API tidy:** `openOccurrence(itemId:)` is nullable now, and budgets passes `recurringItemId` with no `''`.
- **Kept on purpose:**
  - TEST-ONLY (go when their stale tests are fixed after the run): `TxPeriod.canStepForward`, `RecurringRepository.calendar`.
  - The old-BE fallback (`_occurrenceMenu`, repo.editOccurrence / setItemArchived / updateItem, editRecurringItem): it goes after the BE rebuild.
  - `HeroIdentity.below` (a general slot, no user now) and `OccurrenceStateChip` (hub-only kit chip).
  - The claude.ai mock artifacts: not deleted (owner's call).

## 2026-10-20 — tests: test/ui + test/hub GREEN (นายA-fe, owner: "สั่งให้แก้เทสได้เลย แบ่งๆ กัน")
- Run 1: 347 pass, 7 fail. Fixed in 2 loops; re-run of the 6 failing files: 79 / 79 pass.
- Stale tests fixed:
  - recurrence_sheet_test monthly ×2: the by-day / by-weekday chips + DayOfMonthGrid; the summary is matched by textContaining.
  - progress_kit_test RecurrenceEditor simple: it now picks the period-start weekday, with no by-weekday choice.
- feature_visuals baseline shrunk (draft_form 3 → 2).
- Hub flows:
  - recurring-detail lists the old-BE fallback archive / restore.
  - goals-detail lists setSpareAutoSaves.
  - api_unused_baseline gains DELETE /recurring-items/{id} and POST /recurring-items (no longer called by the app).
- REAL BUG fixed (kit): SavingGoalRow's badge chip didn't shrink, so a long badge overflowed the title row (63 / 204 px in the hub demo; it would overflow on a phone too). The badge is now Flexible (AppChip ellipsizes). Found by the hub_pages_smoke_test hang (an overflow error under the overridden FlutterError.onError); a temporary probe test was used and then deleted.
- Team status:
  - Go: all ok (นายC). He also fixed future event bills, which now count as expected rather than used; that needs a BE restart (owner's word).
  - นายE: green.
  - นายD: 233 pass / 13 fail, waiting for the owner's fix go in his session.
  - นายB: not reported yet.

## 0.4.0-2 close (2026-10-21, FE session on Lead's brief) — reds fixed, gate green; bump / tag / push BLOCKED
**Gate (fvm 3.47.3, whole app, run on the final tree):** `flutter analyze`: no issues (148 s); the 3 changed files were re-analyzed after the last edit, no issues. `flutter test`: **1,137 pass / 0 fail**.

**Fixed:**
1. `test/features/saving_goals/saving_goals_pages_test.dart`: 12 stale cases rewritten to the D1–D3 + many-auto-saves UI. A temporary probe test (deleted) captured what each screen shows now. The file is 44/44 with the parse test.
   - List: HeroSummaryHead "Total saved", ring (month saved of plan) + facts (still short / not allocated / goals); no group sections, one SectionCard; "needs saving first" order checked by row y; row texts (Short ฿x, month line, saved / target | %, ETA caption).
   - New list cases: the HeroFilterChips count and filter on the device (no call); the month stepper is one call with `month=` and the head switches to "Saving plan".
   - Ongoing row: caption "Ongoing", saved on the right, "This month +฿x".
   - Search toggle: ToolbarToggleButton inside the AppHeroCard (was AppCard + 🔍).
   - Sort: the default is needFirst (the BE gets `created`); pick "Nearest deadline" → `deadline`.
   - Detail: HeroInfoBox due + days left, HeroRing saved of target | %, facts (saved this month x / plan, short this month, left to go), chips "Short ฿x this month" + "2 months behind schedule", 2 tabs (no Settings tab).
   - The goal auto-save toggle no longer exists on the view (auto-saves are edited in the edit form, several per goal). The case was replaced by: a goal lists its auto-saves read-only (no switch), and the spare page turns auto-save off with ONE DELETE and no re-read. The fake gained `spareJson` and `months`.
   - Edit / create: the "Saving plan" section (deadline, auto-save, plus starting amount on create) replaces the old InfoBox / "Save ฿x/month" line. Create now has the auto-save switch (off). The ongoing hero has no "Ongoing" status chip any more (active goals have no header). These are the redesign, not bugs.
2. **lib change (real bug exposed by the tests):** `saving_goals_cubit.dart` `load()` now returns when the cubit is closed after the await. Leaving the list page after stepping the month calls `resetMonth()` → `load()`. If the cubit closed before the answer came back, it emitted after close and threw "Cannot emit new states after calling close". In the app the cubit is app-wide, so this only bites when its provider closes (logout / re-scope); the tests hit it.
3. `test/core/data/sync_coordinator_test.dart`: **flaky, not a code bug.** It passes 11/11 alone. It used fixed 60 ms sleeps against a real 10 ms debounce timer and fire-and-forget device writes (real file I/O), so a busy machine (full suite) can miss the window, and a write still in flight can block the temp-dir delete on Windows. Fix: `until(condition)` waits (10 s cap) for the call / second round / device write; `settle()` is kept only for "did NOT happen" checks; tearDown retries the delete. The sync code is unchanged.

**Commits (app main, local, NOT pushed):**
- `fix(saving-goals): drop a list answer that lands after the cubit closed`
- `test: saving goals pages to the D1-D3 redesign; de-flake sync coordinator`
- Both are on top of `c25af30` (count 132). I couldn't read the hashes back: git reads were blocked right after (see below). Get them with `git log --oneline -3`.

**BLOCKED (permission, not a code problem):** the next step (bump pubspec to `0.4.0-2+133`, commit "chore: version 0.4.0-2+133", annotated tag `v0.4.0-2`, push main + tag) was denied by this session's permission check ("unrequested commit"). The owner's go reached me only as a relay, which this session doesn't accept for push / tag. Nothing from that step ran: pubspec is still `0.4.0-1+126`, there is no tag, and nothing is pushed. N stays **133** as long as no other app commit lands first (count + 1). Remaining: bump + commit + tag + push, by the owner or in a session where the owner approves it.

## 0.4.0-3 (2026-10-21, FE session on Lead's briefs) — uncommitted on app main
### ITEM 1 — list hero head in ONE row: DONE
- **Kit (root fix):** `HeroHeader` gains `fill:` (`lib/ui/organisms/hero/hero_header.dart`). With `fill` the header is the list-hero head: ONE row `[leading] [fill = Expanded] [actions]`. A local `ControlSizes.control = HeroModuleTile.size` (40) makes the stepper and 🔍 exactly as tall as the tile; the row is 40 high, so everything shares one centre line. The fold ⌃ stays in the corner (owner correction), with the same reserve as before. Without `fill`, HeroHeader is unchanged (Wrap row, control 36).
- `StepperPill` needed no change: its label box already grows to any bounded width, which is why it used to drop to a full-width second row inside the Wrap. In an `Expanded` it fills, with ‹ › at its ends.
- **Pages:** the transactions list hero (`leading: [tile]`, `fill: TxPeriodPill`, `actions: [🔍]`) and the recurring list hero (`fill: StepperPill.month`, no actions: the stepper runs to the edge). `MoneyVisibilityToggle` was dropped from both heads: privacy is off and it rendered nothing, but it still took a gap (decisions: leave it out of new designs). The budgets head (tile + summary chip) and the goals head (HeroSummaryHead) have no stepper, so they are unchanged. The embedded tx list (wallet tab) has its own row, not the hero: unchanged.
- **Hub:** `/dev/organisms/app-hero-card` "List summary — folds (the transactions list)" uses the new head; there is a new demo "List head without actions (the recurring list)".
- **Test:** `test/ui/hero_list_head_test.dart` (4): tile / stepper / 🔍 are 40 high on one centre line; stepper width = row − tile − 🔍 − 2 gaps, ‹ › at its ends, the label between; a foldable card keeps ⌃ in the corner (above the row centre, right of 🔍); a header without `fill` keeps control 36.

### ITEM 2 — inline settings in VIEW mode: DONE
- **Kit:** `LiveSetting<T>` in `lib/ui/organisms/settings_section.dart` wraps any settings row (`builder(context, value, onChanged)`).
  - A change shows at once (optimistic) and makes ONE `save` call.
  - `save` returning false (the person closed a sheet it opened) puts the old value back quietly.
  - A throw puts the old value back, with a danger snackbar (`failedMessage(error)`) and a Retry that repeats the same change.
  - Taps during a save are ignored. The row stays enabled, so there's no grey flash.
  - `save: null` = read-only.
  - Hub: `/dev/templates/detail-sections` "LiveSetting", with a fake 600 ms call and a "the next saves fail" switch. `LiveSetting` is registered in hub_registry.
- **Pages covered:**
  - **Wallet detail** (owner): "ติดตามยอดเงิน" flips in view. Off = `PUT /accounts/{id} {track_balance:false}`. On asks the current balance in the existing set-balance sheet first (closing it puts the switch back), then sends `{track_balance:true, current_balance}`: still one call. New `AccountsRepository/AccountsCubit.setTrackBalance`. Members still see the read-only `SettingSwitchViewRow` (no long-press any more).
  - **Wallet detail** "ในรายงานของฉัน": now LiveSetting (optimistic + retry), in view and edit (it is the viewer's own setting); `_scopeBusy` is gone.
  - **Category detail:** "นับในรายงาน" in view now sends ONLY `{include_in_report}` (new `CategoriesRepository/CategoriesCubit.setIncludeInReport`; it used to PUT the whole category); edit / create keep it in the form. "หมวดค่าธรรมเนียม" also goes through LiveSetting (the users fee-category call).
  - **Spare savings page:** the auto-save switch (off = one DELETE; on = one PUT with the plan, or the sheet first) is now LiveSetting (it used to wait under the saving overlay).
- **BE:** none needed. The account and category PUT DTOs are presence-tracked (only the fields sent change), so a one-field body is already a single-field update.
- **Not changed, and why:**
  - **Contact detail:** its settings section ("แสดงชื่อเล่น") exists only in EDIT mode, and `contact_detail_page_test` asserts the view has NO show-nickname setting (an earlier decision). I tried adding it to view, the test caught it, and I reverted it (the file has no diff). If the owner wants it in view, it's a few lines (`ContactsRepository.update` already sends only the fields given).
  - **Event detail:** its settings section is one SettingSummaryRow that opens a page (no value to save).
  - **Goal detail:** auto-saves are a read-only list in view; they are edited in the form (several per goal).
  - The app Settings page is not a detail page.
- **Tests:**
  - new `test/ui/live_setting_test.dart` (4): optimistic + one call + taps ignored while saving; failure → revert + message + Retry → one more call; false → quiet revert; null save = read-only.
  - `wallet_track_balance_test`: +3 view cases (on→off one call, no edit mode; off→on asks the balance then one call with it; failure → revert + Retry).
  - `category_detail_page_test`: the 2 view-toggle cases now expect `setIncludeInReport('cat1', false)` once and never `update` (optimistic, revert + Retry).

### Runs (own tests only)
- `flutter analyze` on lib + test/ui + the touched test folders: no issues.
- `test/ui/hero_list_head_test` 4/4 · `live_setting_test` 4/4 · `test/features/{accounts,categories,contacts,saving_goals}` + `test/hub` + hub_coverage / layering / feature_visuals: green · `transactions_list_summary_test` + `recurring_pages_test`: green.
- Slip, fixed: one `dart format` run reformatted `accounts_page.dart` (not mine); I put the original text back (no diff).

### ITEM 3 — transactions list hero in the page colour: DONE
- **Page:** `transactions_list_page.dart` hero `HeroStyle.plain()` → `HeroStyle.tinted(color: primary)`, the same teal as its ▤ tile and the same call the other list heroes use (budgets / goals / wallets / recurring). The soft tint fading to white comes from HeroStyle.tinted.
- **Kit (root fix: pieces read `HeroColors` inside a hero, keep their look outside one):**
  - `StepperPill`: soft fill, the card line as border, accent ‹ ›, muted ▾, flat (no shadow, like other in-hero chips). This also applies to the recurring hero, the goals list (no stepper any more, see item 4), and anything else that puts a stepper in a hero. Outside a hero (dashboard, the wallet-tab tx list row): unchanged.
  - `DailyBars`: past = accent 35 %, today = accent, future = track, captions muted. Outside a hero it keeps the expense red (only the tx hero uses it).
  - The 🔍 (`AppIconButton`) already read HeroColors.
  - Status colours still win: the signed net (red / green) and the income / expense SummaryTiles are untouched.
- **Hub:** the "List summary — folds" note says what takes the card colours.
- **Test:** `hero_list_head_test` +1: in a tinted hero the pill = soft fill, elevation 0; today bar = accent, future = track. Outside a hero: the raised pill and the expense-red bar.

### ITEM 4 — saving goals list: no month stepper: DONE
- No one else held the saving-goals files (the uncommitted tree had only my 0.4.0-3 files).
- **Cubit / repo:**
  - `SavingGoalsState.month`, `copyWith(month / clearMonth)`, `setMonth`, `resetMonth` are gone.
  - `SavingGoalsRepository.list` no longer has `month` (no `month=` query).
  - `load()` keeps the closed-cubit guard (comment updated: there is no month reset on leave any more).
- **Page:**
  - The hero plan head is plain text via `HeroStepperHead(title:)`: "แผนการออมเดือนนี้ | ตุลาคม 2026" (new arb key `fpGoalsPlanHeadMonth`, th + en, gen-l10n run). It isn't tappable, and the "เลือกเดือน" tooltip went with the stepper.
  - Rows: always "เดือนนี้ …", and the pace tick + bubble show for every active goal (the other-month variants are gone).
  - The ring is untouched (the owner may change what it shows).
- **Kit:** `HeroStepperHead.stepper` is now optional (no stepper = the plain title); the hub demo has the text-only variant first.
- **Tests:** saving_goals_pages_test: the stepper case → "always this month — a plain head, no stepper, not tappable, one call"; the ring-hero case checks the new head. The `month` param / log is dropped from the fakes (also `quick_create_saving_mode_test`'s fake).
- **Leftovers for the cleanup pass (arb is append-only, so not deleted):** `fpGoalsPlanTitleNow`, `fpGoalsPlanTitle` are unused now. The BE still accepts `?month=` on `GET /saving-goals`; the app no longer sends it, so it's dead on the BE side (BE / docs call).

### ITEM 5 — contact "แสดงชื่อเล่น" in VIEW mode: DONE
- The owner overrides the earlier "no show-nickname in view" rule. `contact_detail_page.dart` view mode now has the settings section with "แสดงชื่อเล่น" as a `LiveSetting`: one `ContactsCubit.update(id, showNickname: v)` = `PUT /contacts/{id} {show_nickname}` (only that field), optimistic, revert + Retry on a failure, the page patched from the answer. Edit mode keeps the form switch.
- `contact_detail_page_test`: the view case now expects the setting; +2 cases (one update with only that field, no edit mode; failure → flips back + "boom" + Retry). Contacts 13/13; analyze clean.
- The item 2 list of LiveSetting pages now includes the contact detail.

### ITEM 6 — saving goals list hero = LONG-TERM progress: DONE (on the PROPOSED BE names)
- Built to the mock (board "เป้าออม · hero ระยะยาว (B)"). All pieces already exist (HeroSummaryHead, HeroRing, HeroFactList, HeroFilterChips), so there's no new kit piece.
- **Model:** `SavingSummary` gains `targetTotal / targetSavedTotal / targetShortTotal / targetPercent / countShort / countDone / countNoTarget`, parsed from `target_total`, `target_saved_total`, `target_short_total`, `target_percent` (0–100), `count_short`, `count_done`, `count_no_target`. **These are the PROPOSED names**, all read in one place (`SavingSummary.fromJson`), so the final names are a one-line change each. They default to 0 when missing, so an older BE shows an empty ring and zero chips rather than crashing.
- **Hero:**
  - head unchanged (tile + เงินออมทั้งหมด ฿saved_total + 🔍)
  - **the month row and its "แผนการออมเดือนนี้ | <month>" text are gone** (item 4's text dropped)
  - ring: arc = `target_percent / 100`; centre "ออมแล้ว N%" (rounded) / ฿target_saved_total / "จาก ฿target_total" (no "จาก" line when the total is 0)
  - facts in this order:
    - ยังขาดถึงเป้า ฿target_short_total (flag icon, warning colour when > 0)
    - เดือนนี้ต้องออม ฿month_short_total (calendar)
    - ยังไม่จัดสรร ฿unallocated › (wallet, opens the spare page)
    - เป้าหมาย <count> (target icon)
- **Chips:** same labels, but the counts are now the BE's (`count_short / count_done / count_no_target`); "ทั้งหมด" stays the list length. The on-device filter is long-term too: new `SavingGoalProgress.of(goal)` in `domain/saving_goal_plan.dart`, picked from fields only: no target → ไม่มีกำหนด; BE status `reached` or closed → ครบแล้ว; otherwise ยังขาด. The rows and the "ต้องออมก่อน" sort are unchanged (still this month's plan, `SavingGoalPlan`).
- **New arb keys** (th + en, gen-l10n run): `fpGoalsRingSavedPct` "ออมแล้ว {pct}%", `fpGoalsFactTargetShort` "ยังขาดถึงเป้า", `fpGoalsFactMonthToSave` "เดือนนี้ต้องออม".
- **Tests:**
  - parse test: the fixture `prodList` gains the 7 fields plus a `summary:` override; the parse case asserts them.
  - pages test, ring-hero case: ring value 0.65, "Saved 65%" / $52,000 / "of $80,000"; facts in mock order (by y) with their amounts; no stepper and no month text.
  - New chips case: BE counts 7/5/4 shown as-is (not counted on the device); ครบแล้ว / ยังขาด / ไม่มีกำหนด each filter to the right goal; no extra call.
  - New edge case: no targets → empty ring, "Saved 0%", no "of" line.
  - saving_goals + quick_create_saving_mode: 49/49; analyze clean.
- **BE reported (2026-10-21):** the final names are exactly the proposed ones, so there's nothing to rename. The `target_*` sums cover ACTIVE goals only, so with the status filter on "Reached" / "Archived" the ring reads "ออมแล้ว 0%" with no "จาก" line. The counts cover the whole status list. Owner question, if it matters: hide the ring outside the active filter? Not changed.
- **Cleanup list (arb append-only, not deleted):** `fpGoalsPlanHeadMonth` (item 4's text, now unused), `fpGoalsRingShortLabel`, `fpGoalsPlanTitleNow`, `fpGoalsPlanTitle`. `HeroStepperHead` is now used only by its hub demo (no page uses it); it could go, or stay for future steppable plans.

### ITEM 7 — section / group head trailing flush with the row cards: DONE
- **Root cause (kit, `lib/ui/molecules/section_header.dart`), two parts:**
  1. The row was `[Flexible(title)] [count] [Spacer] [trailing]`. A loose Flexible and the Spacer each get half the free space; the title uses only part of its half and the rest stays EMPTY at the END of the row, after the trailing. So the gap varied with the title / trailing widths: a probe at 412 wide put the + of the recurring head 97.5 px short and the long totals text 8 px short (the owner saw ~46 px).
  2. The default padding had an 8 px end inset (`sm`), while the template already gives the gutter.
- **Fix:** title + count sit in ONE `Expanded`, so the trailing always sits at the end, and the default end inset is 0, so the trailing ends at the same gutter as the cards. Also hardened for narrow screens (the new test caught a 21 px overflow at 360 with the long totals): the end is capped at `width − 120` via a LayoutBuilder, so the title keeps 120 px (it ellipsizes first, then a long trailing text wraps). It never overflows.
- **Pages with the same misalignment, all fixed by the kit change:**
  - recurring list: the "รายการประจำทั้งหมด" head (🔍 +), the kind group heads (totals), the paused group
  - wallets list: the type group heads (subtotal)
  - home: the recent-items head ("ดูทั้งหมด ›" + trailing)
  - debt person page and the item picker group labels have no trailing (only the end inset changed; no visible change)
  - the More page, home "ต้องจัดการ" and the dashboard hub demos pass their own padding (unchanged)
- **Test:** new `test/ui/section_header_alignment_test.dart`. At 412 and 360 wide, plus a very long title: the 🔍/+ head's right edge == the SectionCard's right edge, the totals' right edge == the card's right edge, the head starts at the card's left, no overflow. (A temporary probe test was used, then deleted.)
- **Runs:** test/ui + test/hub + recurring + accounts + home + personal_debts + test/app: 550 pass; analyze of the file clean.

### ITEM 8 — ONE tab style app-wide (pill): DONE
- **Kit (restyled in place; pages changed only for icons):** `lib/ui/molecules/app_tab_bar.dart`
  - Track: 40 high, radius 20, 1 px `outlineVariant` border, `surfaceContainerHigh` fill, 3 px padding; equal segments.
  - Selected pill: radius 17, a 1 px primary-wash border (60 %), a soft primary fill (24 %; 32 % in dark), a tiny shadow (0/1/2, 12 %). Selected label w700 in a dark primary (primary lerped 50 % to black; to white in dark); others w500 `onSurfaceVariant`, 14 px.
  - **Theme primary only:** `AppTab.color` is removed; quick create no longer colours its tabs per mode (`QuickCreateModeColors` stays for the + button and the saving form).
  - **Icons:** `AppTab.icon` shows on every tab with 2–3 tabs, only on the selected tab with 4+. The badge (`badgeCount`) is kept, now floating at (-10, -8).
  - **Motion:** a tap slides the pill AND the pager content, 300 ms, `Cubic(.2,.8,.2,1)` (`AppTabBar.duration / curve`, which `AppTabPager` now uses).
  - **Swipe on BOTH (owner correction):**
    - A drag on the bar moves the pill with the finger, and with a pager the content follows too (`jumpTo`); on release both snap to the nearest tab.
    - A content swipe still changes tabs, and the pill rides `pager.page`.
    - `AppTabPager.enabled` / `TabbedListPageBody.swipeEnabled` keep turning off only the CONTENT swipe (edit mode, category reorder); the bar still works.
    - The underline and `AppTabBar.underlineKey` are gone; there is a new `AppTabBar.pillKey`.
  - `PinnedTabBarDelegate.height` = 8 + 40 + 8 (padding now top AND bottom). `TabbedListPageBody` pads the bar `lg / sm` (it used to be full-width).
  - PageDots unchanged.
- **Spots:**
  - account detail: its private `_PinnedTabBar` copy is DELETED and folded into the kit `PinnedTabBarDelegate`
  - categories, budget detail, saving goal detail, recurring detail (badge kept), quick-create mode tabs, event resolve sheet, icon maker sheet
  - **recurring home** "ภาพรวม | ปฏิทิน": `SegmentedChoice(expand)` → `AppTabBar` (no pager there: the pill animates, but the content switches without a slide because that page is one scroll list with the tab in the middle; a slide would need a content-switcher piece, so say if wanted)
  - SegmentedChoice value pickers and the icon-maker layer switcher are untouched
- **Icon picks (AppIcons):**
  - wallet: ภาพรวม `pie` · รายการ `transactions`
  - categories: รายจ่าย `expense` · รายรับ `income`
  - budget: รายการ `receipt` · รอบงบ `history`
  - goal: ภาพรวม `pie` · รายการออม `receipt`
  - recurring detail: งวดที่ผ่านมา `history` · งวดถัดไป `date`
  - recurring home: ภาพรวม `pie` · ปฏิทิน `date`
  - event resolve: เป็นรายการ `transactions` · เป็นหนี้ `debt`
  - icon maker: สไตล์ `iconPicker` · สี `colorPicker`
  - quick create: its own (`transactions` / `debt` / `quickSaving`)
- **Hub:**
  - `molecules_bars_page`: the playground has an icons toggle (4 tabs shows the selected-only rule) and a new note; In-the-app uses have icons and fixed page names; the pager demo says "tap, drag the bar or swipe here".
  - `molecules_blocks_page` (pinned), `templates_detail_page`, `templates_tabbed_detail_page`: icons on the tabs.
  - `domain_bottom_bar_page`: the quick-create note (no per-mode colour).
  - No new public classes, so the registry covers are unchanged.
- **Tests:** `test/shared/app_tab_bar_test.dart` rewritten (8):
  - geometry: 40 high, equal segments, pill = segment width at the selected segment, labels centred in their own segments
  - the icon rule for 3 vs 4 tabs
  - a drag on the bar → next tab, with the pill moving mid-drag and page 1 shown; a short bar drag snaps back
  - a content swipe → next tab, with the pill on it (stays at the end, swipes back)
  - content swipe disabled → the bar still works
  - a tap slides the pill mid-way (not a jump) together with the page
  - without a pager, a bar drag still changes the tab
  - `recurring_pages_test` finds `AppTabBar<RecurringHomeTab>` instead of the SegmentedChoice
- **Runs:** whole-app analyze no issues; test/ui + hub + shared + app + accounts / categories / budgets / saving_goals / recurring / transactions / projects / personal_debts: **991 pass / 0 fail**.

### ITEM 9 — ONE hero bottom chip row, all CHIP size (28): DONE
- **Kit:**
  - new `HeroChipRow` (`lib/ui/organisms/hero/hero_chip_row.dart`, exported): a Wrap, 6 px gaps both ways, inside the new `ChipSizeScope.force(size: chip)`.
  - **Root:** `ChipSizeScope.force` wins over a chip's own `size:`. `AppChip` (so StatusChip, ChipPath, wallet / tag chips) and `MemberChip` now resolve their size through `ChipSizeScope.resolve(context, own, fallback:)`. Outside a forced scope nothing changes.
  - Every chip in the row therefore has one height, padding, radius, font and icon size (the ChipSize.chip metrics) and keeps its own colour.
  - The StatusChip with `onTap` keeps its ▾. Labels ellipsize, so the row never overflows.
- **Heroes with a bottom chip row (a read-only scan of every detail hero), all on HeroChipRow now:**
  1. **recurring detail:** status dropdown · kind · category path · wallet(s) · tags (were mini) · auto-create
  2. **budget detail:** "overridden" + the plan status. **The plan status moved LAST** (it was first).
  3. **saving goal detail:** status chips (completed / short / on track / behind)
  4. **wallet detail** (newly found): type · report scope · members. It was a sideways-scrolling `ChipRow`; it now wraps like the others.
- **No bottom chip row (checked):** event detail (status / date chips are in the HEADER; footer = tiles), debt person / debts list (no chips; footer = tiles), tx detail and debt entry detail (pick cards; tags are below the hero), contact, category, pending, quick create (EntryCard pick cards). Header chip rows were not part of this item and are unchanged.
- **Hub:** `/dev/organisms/app-hero-card` "HeroChipRow" demo (status ▾, kind pill, a control-size chip, a wallet, a red mini tag, the plan status last; all render at 28); registry cover added.
- **Test:** new `test/ui/hero_chip_row_test.dart` (3). At 412 and 320 wide, with the recurring mix (status dropdown, kind, control, mini red tag, a 2-segment category path, a very long label): every AppChip in the row is 28 high; the ▾ is kept; no overflow; the long chip stays inside the card. Outside the row a mini chip is still 20.
- **Runs:** whole-app analyze no issues; test/ui + hub + accounts / budgets / recurring / saving_goals / projects: 540 pass.

### ITEM 10 — quick create debt mode: จดหนี้ vs จ่ายคืน (+ the BE adaptations): DONE
**The form** (`debt_entry_form.dart`, controller + view; saved in `quick_create_sheet.dart`):
- Top: a compact `SegmentedChoice` value picker [จดหนี้ | จ่ายคืน] (a choice, not tabs). `DebtEntrySub {record, repay}` + `DebtRepaymentKind {pay, receive}` live in `personal_debts/domain/debt_direction.dart`.
- **จดหนี้** (`POST …/entries`, debts only now):
  - Direction chips say **เขาติดฉัน / ฉันติดเขา** (kit: `txTypeChip(debt:)` now uses `debtDirectionOwedToMe / IOwe`, also on debt-entry detail heroes; EN They owe me / I owe them).
  - Hints per direction: "ค่าอะไร? เช่น จ่ายแทนค่าข้าว, ให้ยืม" / "ค่าอะไร? เช่น เขาจ่ายแทนค่าข้าว, ยืมเงิน" ("รับคืนค่าอะไร?" is gone).
  - The switch is renamed **"มีเงินเข้า/ออกกระเป๋า"** and defaults OFF; ON shows wallet + tags as before.
  - The "ปิดหนี้" multi-pick is removed from this side (`mark_paid_ids` no longer sent here).
- **จ่ายคืน** (`POST …/repayments`, createDebtRepayment, final contract):
  - **Kit:** new `repay:` flag on `EntryCard / TransactionHeroCard / txTypeChip` → จ่ายคืน / รับคืน words; no transfer chip.
  - **Person:** the picker (kit `ItemPickerSheet`) lists only people with a non-zero balance (from the debts directory, each with รอรับ / รอจ่าย ฿x; empty = "ไม่มีใครค้างกันอยู่"). The person card's label is "จ่ายคืนให้" / "รับคืนจาก".
  - **Kind** comes from the balance (they owe me → รับคืน) and can be switched (chip or the ⇄ on the flow cards).
  - **Amount** is prefilled with the full open balance (|net|), editable. A typed amount, or a preset amount, is kept.
  - **Defaults:** description "จ่ายคืน ‹name›" / "รับคืนจาก ‹name›", replaced when the person or kind changes, kept once typed over.
  - **Wallet:** always shown (flow wallet ↔ person) and REQUIRED ("เลือกกระเป๋า" toast; no "none" in its picker). The BE takes it as optional; the form follows the owner's model.
  - **Also:** tags, note, date, and "ติดป้ายจ่ายแล้ว" (the existing open-entries multi-pick → `mark_paid_ids`).
  - **Result line:** "หลังบันทึก เหลือ ฿x" / "เคลียร์ครบ"; past zero it falls back to the who-owes-whom line.
  - Save = ONE call → patches wallets, the tx list (the returned tx) and the debts directory (`person_balance`). Typed names send `person_name`.
- **Presets:**
  - `QuickCreatePreset.debt(person, debtSub: DebtEntrySub.repay, amount: 82)` works now; `showQuickCreateSheet(debtSub:)` too.
  - A sheet `account:` preset now also seeds debt mode's wallet.
  - The person page's "รับคืนแล้ว ฿82" button itself isn't built (later).
- **Hub:** `/dev/domain/transactions` EntryCard demo has debt / repay words (tap the result line to switch) and a new note; `page_flows`: debt mode has separate save steps for จดหนี้ (createDebtEntry) and จ่ายคืน (createDebtRepayment); the mark-paid step moved to the repay side.

**BE adaptations (Lead's list):**
1. **Person statement:** `DebtEntry.isRepayment` (`kind: "repayment"`; `paid` null → false; `id` = the tx id). EVERY line now opens (B1):
   - a repayment → `/transactions/{id}`
   - a debt → the new route **`/personal-debts/entries/:id`** → `DebtEntryDetailPage` (a ledger-only debt opens too; it used to be dead)
2. **`repayment_person` on transactions:**
   - `RepaymentPerson` model (`debt_link.dart`), `Transaction.repaymentPerson / isRepayment` (kept by copyWith).
   - **Tx detail:**
     - such a row is EDITABLE (it used to be a read-only system row with the "can't be edited" banner)
     - its category is locked (`categoryLockedHint` "รายการจ่ายคืนใช้หมวดของระบบ เปลี่ยนไม่ได้"; the card has no tap)
     - a view-mode row "จ่ายคืนให้ / รับคืนจาก ‹name› ›" opens the person page
     - Old repayment rows without a person keep the old read-only path.
   - **PUT / DELETE:** `TransactionWriteResult.personBalance` / `DeleteTransactionResult.personBalance` are parsed and applied to the debts directory (`saveTransactionEdit`, tx detail delete; new `DebtDirectoryCubit.maybeOf`).
3. **Pending `settle_debt`:** nothing in the FE expected a new debt row (only the source tag). No change.

**Tests:**
- `quick_create_debt_mode_test` rewritten + extended (9):
  - debt words, switch OFF by default, no close row, per-direction hints
  - record = one createEntry with `create_transaction: false`; switch ON sends it with tags
  - repay preset: kind from the balance, full amount, default description, "All cleared", "50 left", wallet required (nothing sent without one)
  - repay save = ONE createRepayment (kind receive, w1, preset amount 82, description), no debt row
  - switching to repay + swapping the kind updates the words and the description
- New `repayment_model_test` (4): statement kind, `repayment_person` (+ copyWith), the repayment result, person_balance on PUT / DELETE.
- `debt_pages_test` +1: all 3 lines (repayment, debt with tx, ledger-only debt) are tappable; the repayment has no paid label.
- `tx_detail_link_rows_test` +1: a repayment shows "Got back from Mom ›", has no banner, is editable, and its category card is locked.

**Runs:** whole-app analyze no issues; transactions + personal_debts + pending + app + hub + ui + shared: **842 pass / 0 fail**.

**HOTFIX (2026-10-21): the app wouldn't start (duplicate route): FIXED**
- **Cause:** for adaptation #1 I added `GoRoute('/personal-debts/entries/:id', name: 'personal-debt-entry')`, but that route ALREADY existed in `app_router.dart`. My check searched `lib/app` + `lib/features`, not `lib/core`. GoRouter asserts on a duplicate name at start-up (configuration.dart:595), so the app showed nothing. No test built the real router, so 842 green tests missed it.
- **Fix:** my copy is removed; the original route stays (same path, name and page; now only a comment line differs from HEAD). Callers: statement debt lines push `/personal-debts/entries/{id}`; tx detail opens `DebtEntryDetailPage` directly for a tx with a debt link (unchanged).
- **Guard:** new `test/app/app_router_config_test.dart` builds the REAL router (`buildAppRouter`, every shell tab) and walks it, asserting route names and full paths are unique and that `personal-debt-entry` has exactly one path. **Proven:** with the duplicate put back for one run it fails with the same assertion the owner saw; it passes without it.
- **Runs:** analyze lib/core + test/app clean; test/app + personal_debts + tx_detail_link_rows + quick_create_debt_mode: 140 pass.

**Follow-up (owner): direction colours SWAPPED to the debt-state colours: DONE**
- **Kit:** new `debtStateColor(context, owedToMe:)` (`ui/domain/money/net_balance.dart`) = THE source for รอรับ (green) / รอจ่าย (red); `NetBalance` and `DebtAmountLine` now take their colour from it too.
- New `txWordsColor(context, type, debt:, repay:)` (transaction_hero_card.dart): with debt words, เขาติดฉัน = รอรับ green and ฉันติดเขา = รอจ่าย red; with repay words, รับคืน = green and จ่ายคืน = red (same source). Plain tx words keep the money colours.
- `txTypeChip` uses it, and so does the hero's tint, so the card matches its selected chip. This also applies to the debt-entry detail hero, which uses the same card.
- Hub: covers `debtStateColor` + `txWordsColor`; the EntryCard demo note is updated.
- Test: `quick_create_debt_mode_test` +1: They owe me = green, I owe them = red; on Repay, Got back = green, Pay back = red. Analyze clean; ui + hub + transactions + personal_debts: 638 pass.

**Notes / questions:**
- Unused now (arb append-only, cleanup list): `debtTitleHintPaid`, `debtTitleHintReceived`.
- Repaying needs the BE with migration 069 (the local docker isn't rebuilt yet).

### Runs (items 3–4)
- `flutter analyze` (whole app): no issues.
- test/ui + test/hub + test/features/{transactions, recurring, budgets, saving_goals}: 684 pass (after item 3).
- test/features/saving_goals + quick_create_saving_mode + hub_coverage + hub smoke: 97 pass (after item 4).

## 0.4.0-3 quick create ผูกกับ — analysis (READ-ONLY, no code changed; variant B as refined 2026-10-21, A dropped)
**(a) NEW pieces** (all in lib/ui, each with a hub demo + registry cover)

| Piece | Purpose | Path | Hub |
|---|---|---|---|
| `PersonInputField` | `( ) name ______`: a typeable name with avatar; tap → the person picker; typed = level 1 | ui/domain/people/person_input_field.dart | yes |
| `ShareCard` | the card shell: header + action chips (หารเท่ากัน / เพิ่มคน) + rows + status line (✓ ครบ / ยังขาด / เกินยอด) | ui/domain/transactions/share_card.dart | yes |
| `ShareRow` | a row: person (field or name) + amount input + × / the AUTO "A" toggle + an optional tag ("ใหม่ · เพิ่มเข้าอีเวนต์") | ui/domain/transactions/share_card.dart | yes |
| `AutoToggleChip` | the "A" toggle: auto = the remainder, typing turns it off (today: an icon-only toggle inside `_MeRow`; moves to the kit) | ui/atoms/auto_toggle_chip.dart | yes |
| `LinkModeBar` | ONE row: the "ผูกกับ" label + `AppTabBar` [ส่วนตัว / แบ่ง / จ่ายแทน / อีเวนต์] | ui/domain/transactions/link_mode_bar.dart | yes |

**(b) REUSED**

| Piece | file:class | Change |
|---|---|---|
| Tab pill | ui/molecules/app_tab_bar.dart:AppTabBar | small: show the selected icon only when it fits (see Width) |
| Entry card | ui/domain/transactions/entry_card.dart:EntryCard | small: amount label จำนวนเงิน / ยอดบิล per mode; `amountNote` = "ส่วนของคุณ …" (exists) |
| Wallet card | ui/domain/money WalletPickCard | small: a muted state + "ไม่ออกจากกระเป๋า" |
| Split rows | ui/molecules/split_row.dart:SplitRow / SplitRowName / SplitRowAction | as-is, under ShareRow |
| Person mark | ui/domain/people/person_mark.dart:PersonMark | as-is |
| Person picker | features/contacts/…/contact_picker.dart:ContactPicker | small: an optional pinned "ฉัน" first row (for ใครจ่าย) |
| Event pick | features/projects EventPicker.one + split_event_section.dart:SplitEventSlot | small: the event chip moves INSIDE the อีเวนต์ card's header |
| Recurring row | split_event_section.dart:SplitRecurringSlot | as-is, now ABOVE ผูกกับ |
| แบ่ง logic | features/transactions/…/splits_section.dart:SplitsSection (+ `_MeRow`, `_DraftRow`) | its look moves into ShareCard / ShareRow; the logic stays |

**Width:** label + 4 equal tabs in one row (sheet gutter 16):
- 390 wide: about 75px per tab; the selected "จ่ายแทน" + icon needs about 74px, so it just fits.
- 320 wide: about 57px per tab, so the selected tab with its icon would ellipsize.
- Plan: AppTabBar drops the selected icon when it doesn't fit (measured), plus a 320 / 390 geometry test. These are estimates; the test settles them.

**State (DraftFormController, draft_form.dart:38)**
- Today it holds personal `splits` (`SplitDraft`, :155; "me" is NOT a row: `meAuto` / `meAmount` :243) and a SEPARATE event-board model (`payerId` / `memberSplits` :50/:53). Quick create keeps `EventTarget _event` and the recurring handle outside it (quick_create_sheet.dart:302/:304).
- Add: `mode {personal, split, paid, event}`; `paidBy` (person | typed) + `myPaidAuto` / `myPaid` (ฉันจ่ายเอง = bill − what they paid); `eventPayer` (me | person); event shares (per person + `meAuto`).
- The people are ONE list shared by the three views. The event members are computed: me + split people + paidBy.
- The carry-over rules become controller methods. Save branches on `mode` only; the inactive views are kept, not sent.
- The event payer's amount stays synced with ยอดบิล (one payer pays the whole bill).

**BE (be-A builds it; not a DB design)**
- จ่ายแทน: POST /transactions (and PUT / pending submit) has no payer today. Need `paid_by {contact_id | person_name, amount}`: the expense with my share, the wallet only for "ฉันจ่ายเอง" (> 0), and the debt "I owe them" in the same call; the answer returns `person_balance` + wallet balances.
- อีเวนต์: today's /projects/quick and /projects/{id}/bills (`new_transaction`) make the bill with payer = ME. Need a `payer` (member | contact | name), `members [{member | contact | name, share}]`, and AUTO-ADD by anyone, not only the owner (today `ad_hoc` add is owner only). When the payer ≠ me: no wallet tx, only my share.
- Pending drafts and tx view need these fields back to show "the view it was saved with" (Q4).

**Step plan:**
- S1 kit (the 5 new pieces + the small changes + hub + geometry tests): M
- S2 the controller's mode / shared data + save branching, with unit tests: M
- S3 quick create UI (recurring above, LinkModeBar, 4 cards): M
- S4 จ่ายแทน on BE `paid_by`: S–M (waits BE)
- S5 event bill payer / members / auto-add: M (waits BE)
- S6 pending + tx detail read back / edit: M
- Tests each step.

**Risks / open:**
- DraftForm is shared with pending and tx detail, so a mode refactor can regress them (S2 behind tests).
- The mock's event line uses the EQUAL share even after a share is edited. It should use my real share; confirm.
- In "ส่วนตัว" every other view's data is ignored on save. Keep it until the sheet closes? (assumed yes)
- Other screens: pending confirm + batch add (same DraftForm); tx detail view / edit (shows the saved view); the event board bill sheet (payer / members overlap `_MemberSplits`).

## 0.4.0-3 ผูกกับ build (variant B; owner GO 2026-10-21)
### S1 — kit + hub: DONE (no feature code yet)
- **New pieces** (exported through ui.dart, hub demos, registry covers):
  - `AutoToggleChip` (ui/atoms/auto_toggle_chip.dart): the "A" toggle (on = takes the remainder; off = typed).
  - `ShareAmountField` (ui/molecules/split_row.dart): the split rows' amount box, moved to the kit (`auto` greys the number).
  - `ShareCard` + `ShareRow` + `ShareStatus` (ui/domain/transactions/share_card.dart): header (+ `headerLeading` for the event chip) + chips, rows (SplitRow + optional tag), status line (✓ green / ยังขาด·เกินยอด red).
  - `LinkModeBar<T>` (ui/domain/transactions/link_mode_bar.dart): "ผูกกับ" + AppTabBar on ONE row.
- **Small changes:**
  - `AppTabBar` shows an icon only when icon + word fit the segment (measured with TextPainter at the current text scale), so a 320 phone drops the selected icon rather than cutting the word.
  - `WalletPickCard` gets `muted` (dimmed, still tappable) + `note` (replaces the balance line: "ไม่ออกจากกระเป๋า" / "−฿110 จาก ฿172").
- **No person-input piece needed:** `SplitRow` + `SplitRowName.input` (typeable) / `.picked` + a tappable `PersonMark` already make the `( ) name ______` row; the picker opens from the avatar / the picked name as today. The pinned "ฉัน" in ContactPicker comes with S3 (feature picker).
- **Hub:** split-row page: ShareAmountField + AutoToggleChip demo; transactions page: LinkModeBar + the three ShareCards (tap the tabs).
- **Tests:** new `test/ui/link_mode_share_card_test.dart` (5).
  - At 320 and 390, for each selected tab: label and bar on one row, no overflow, only the selected tab has an icon, and when it shows, its word is never cut (RenderParagraph). At 900 the icon shows.
  - ShareCard at 320 with a long name: amounts in one column, inside the card, status + tag shown.
  - The A toggle / typing flow.
  - Tests draw text in the square test font (the Thai font comes from google_fonts at run time), so they check the rules, not exact Thai widths.
- **Runs:** analyze lib/ui + lib/hub clean; new test + app_tab_bar_test + hub_coverage + hub smoke: 61 pass.

### S2 — controller + save on the active tab: DONE (the tabs aren't in the UI yet → today's behaviour unchanged)
- **Model:** new `lib/features/transactions/domain/link_draft.dart`.
  - `LinkMode` personal / split / paid / event; the wire names `personal` / `split` / `paid_by` / `event`.
  - `LinkPerson`: a contact id or a typed name. `key` = `c:<id>` | `n:<name>`.
  - `LinkDraft`:
    - จ่ายแทน: payer + amount (null = the whole bill); "ฉันจ่ายเอง" on A = bill − what they paid; `payDiff` (< 0 ยังขาด, > 0 เกินยอด)
    - อีเวนต์: payer (null = me); typed shares per person, the rest equal; ฉัน on A takes the rest; `eventDiff`
    - carry-over `switchTo`; `walletOut`
- **One data set:** the แบ่ง people stay in `DraftFormController.splits`. Members of the event are the แบ่ง people + whoever paid for me + the event payer, each once.
- **Controller** (draft_form.dart):
  - `linkMode(hasEvent:)` infers the tab until one is picked (event → แบ่ง → ส่วนตัว)
  - setters for every card action; `myShareFor` / `walletOutFor` / `linkBalanced`
  - `removeEventMember` drops that person from every view
  - `linkSave(m)` = what the save sends
- **Save** (quick_create_sheet.dart): only the active tab is sent.
  - ส่วนตัว: no splits.
  - แบ่ง: the complete rows.
  - จ่ายแทน: no splits; the wallet only if I paid part; `paid_by {contact_id | person_name, amount}`.
  - อีเวนต์: the bills endpoint; the wallet + member splits only while I'm the payer; plus `event {payer: {me:true} | person, members: [{person, share}], my_share}`.
  - Every picked tab adds `link_mode`.
  - The repo / cubit `create` takes `link` (spread into the body).
- **Checks before save:**
  - จ่ายแทน: needs a payer, and the amounts must add up
  - อีเวนต์: needs an event, and the amounts must add up
  - a wallet is needed for an event only when I pay
  - half-typed แบ่ง rows are asked about only when แบ่ง is what's saved
- **Before a tab is picked** (the form today): no link fields; the body is exactly as before.
- **Wire names are PROPOSED** (`link_mode`, `paid_by`, `event`). The BE ignores unknown fields (no DisallowUnknownFields), so this is safe before B1. S4 / S5 rename them to be-A's contract.
- **arb:** +3 (`txLinkModeNeedsPayer`, `txLinkModeNeedsEvent`, `txLinkModeUnbalanced`).
- **Tests:**
  - new `test/features/transactions/link_draft_test.dart` (25): LinkPerson, จ่ายแทน maths, อีเวนต์ maths + wire, carry-over, controller inference / my share / A freeze / member removal, and `linkSave` per tab
  - the 2 repo fakes gained `link`
- **Runs:**
  - analyze lib/features/transactions + the new test: clean
  - link_draft + cubit_placement + tx_list_redesign: 55 pass
  - every quick create test (mode, pending gate, entry sheet, debt, draft skeleton, saving, offline): 46 pass

### S2 follow-up — B1 / B2 contracts applied
- **Wire per be-A:**
  - `link_mode` is read-only (values `personal` / `split` / `paid` / `event`); `LinkMode.parse` reads it.
  - Writes send no `link_mode`. จ่ายแทน sends `paid_by {contact_id | person_name, amount}` (amount = what they paid; the tx amount = the bill).
  - อีเวนต์ sends `payer` + `members` BESIDE `new_transaction` on POST /projects/quick and /projects/{id}/bills (new `people:` param on both repo calls), with no splits:
    - payer = `{me:true}` or a person
    - members = everyone in the bill, me first `{me:true, share}`, then `{contact_id|person_name, share}`
- **Quick create pins the tab on screen at save**, so an inferred tab (an event preset, people already typed) saves exactly what the card shows.

### S3 — UI in quick create: DONE (+ S4 / S5 write side wired)
- **Layout (new expense only):** DraftForm `linkTabs` → new `LinkSection` (feature wiring, kit pieces only):
  - the รายการประจำ row on top, then `LinkModeBar` [ส่วนตัว | แบ่ง | จ่ายแทน | อีเวนต์] (wallet / split / contact / project icons), then the active card
  - income and transfer keep today's section
- **Hero:**
  - the amount label reads "ยอดบิล" in every tab but ส่วนตัว (`EntryCard.amountLabel` → the inline hero label)
  - the line under it shows my REAL share per tab: แบ่ง = today's line; จ่ายแทน "ส่วนของคุณ ฿123 | ค้าง ลี ฿13"; อีเวนต์ = my share + "รอรับจากคนอื่น" when I pay, else "ค้าง <payer> <my share>"
- **Wallet card:** `muted` + "ไม่ออกจากกระเป๋า" when nothing leaves it (จ่ายแทน all / an event someone else paid); "จ่ายจากกระเป๋า ฿x" when part does.
- **แบ่ง card** = `SplitsSection(card: true)`:
  - ShareCard "แบ่งให้ใคร" with [หารเท่ากัน] [+ เพิ่มคน]
  - ส่วนของฉัน with the A chip, the people rows, and the status line (✓ แบ่งครบแล้ว / ยังขาด / เกินยอด)
- **จ่ายแทน card:**
  - "ใครจ่าย และจ่ายเท่าไหร่" + [หารเท่ากัน]
  - "ฉันจ่ายเอง (จากกระเป๋า)" with A (auto = bill − theirs)
  - one payer row ("+ เลือกคนที่จ่าย" until picked; ContactPicker with free text + create), × to remove
  - status ✓ จ่ายครบแล้ว / ยังขาด / เกินยอด
- **อีเวนต์ card:**
  - `EventPickChip` fills the header
  - "ใครจ่าย": me or a person, chosen in the new `ContactPicker.payer` with "ฉัน" pinned on top; the amount is the bill, read-only
  - "ใครอยู่ในบิล" + [หารเท่ากัน] [+ เพิ่มคน]; ฉัน with A (no ×); the others with amount + ×
  - the "ใหม่ · เพิ่มเข้าอีเวนต์" tag (see open points)
  - status line
  - carry-over as agreed: from จ่ายแทน the payer = that person, from แบ่ง = me
- **Checks:** จ่ายแทน needs a payer and must add up; อีเวนต์ needs an event and must add up. "เก็บเป็นร่าง" is off in จ่ายแทน / อีเวนต์ (a draft can't hold them yet).
- **Kit / root fixes:**
  - `ShareCard` title is optional (the header chip takes the row)
  - new `ShareSubhead`, `EventPickChip` (EventRow uses it)
  - the card / subhead header wraps its chips under the title when they don't fit (it overflowed at 320 in the test font)
  - `ShareAmountField` no longer snaps a cleared, focused box back to its computed value (it syncs on blur)
  - `SplitMeRow` / `SplitDraftRow` / `MyAvatar` / `applyContactPick` / `linkCardStatus` are public in splits_section.dart
  - Hub: the อีเวนต์ card demo uses the real layout; registry covers ShareSubhead + EventPickChip
- **arb:** +22 `txLink*` keys.
- **Tests:**
  - new `link_section_test.dart` (8): at 320 and 390 every tab lays out on one row inside the screen with no overflow; ส่วนตัว plain; แบ่ง card + status; จ่ายแทน ✓ / part / ยังขาด + wallet muted / note; จ่ายแทน → อีเวนต์ carry-over; the new-event tag; income without tabs
  - new `quick_create_link_save_test.dart` (3, the real sheet): จ่ายแทน all → no wallet, `paid_by` = the bill; no payer → message, nothing sent; ส่วนตัว plain
  - link_draft_test updated to the B1 / B2 wire (27)
- **Runs:**
  - analyze lib/features/transactions + contacts + projects/data + lib/ui + lib/hub + the new tests: clean
  - 31 related test files (quick create suite, splits, hero, event pick, pickers, hub smoke / coverage / duplicates): 297 pass, 0 fail
- **Open / for Lead:**
  1. The "ใหม่ · เพิ่มเข้าอีเวนต์" tag shows only for a NEW event. For an existing event the FE can't tell who is already a member: event members carry no contact_id. Either be-A adds contact_id to the members in tx-form options, or we drop the tag for existing events.
  2. Income keeps the old section. จ่ายแทน is expense-only on the BE. Should income get [ส่วนตัว | แบ่ง | อีเวนต์]?
  3. The new BE error codes (LINK_MODE_CONFLICT, PAID_BY_*, MEMBER_NOT_IN_PROJECT) show the BE message; the FE checks block them first.
  4. The local BE needs migrations 069 + 070 + a rebuild (owner's word) before the owner can try จ่ายแทน.
- **Next — S6** (tx detail: read `link_mode` / `paid_by` / `wallet_amount` / `event_bill.payer|members`, summary rows, the edit form on the saved tab): the read side is ready; edit-switching waits for B3.
- **My slip:** I ran `dart format` on all of lib/features once. It rewrote 3 untouched files (accounts_page, budget_detail, recurring), each a pure format diff vs HEAD. I restored those 3 with git checkout; nothing else changed.

### S6 (part 1) — read side + tx VIEW rows: DONE (edit part waits for B3)
- **Model (`refs.dart` / `transaction.dart`):**
  - `Transaction.linkMode` (`LinkMode.parse`), `paidBy` (`TxPaidBy`: debtId, key, person, amount, myPaid, fromPartner, paid), `walletAmount`
  - `EventBillLink.payer` (`BillMemberRef`), `billAmount`, `members` (`BillShare`); these are null / 0 on list rows
- **Tx detail VIEW** (`LinkViewRows`, under the form; nothing shown for a plain tx):
  - "จ่ายโดย | ลี ฿13 | ฉันจ่ายเอง ฿110 ›" → the จ่ายแทน card read-only; the payer's name opens their person page
  - "บิลอีเวนต์ | ลีจ่าย | 3 คน ›" → the อีเวนต์ card read-only (the event chip opens the event; payer + bill; everyone's share)
  - Deviation: the event row doesn't repeat the event name, because the event chip row above already shows it.
  - แบ่ง keeps today's split list. Folding it into one summary row + sheet would move the per-row "open debt" taps into the sheet; I'll do it with the edit part if Lead wants it.
- **arb:** +6 `txLinkView*`.
- **Tests:**
  - new `link_view_test.dart` (6): prod-shaped B1 / B2 JSON incl. list rows with nulls; both rows + their read-only sheets; a plain tx shows nothing
  - all 19 test files that read Transaction / the detail page: 120 pass
  - analyze lib/features/transactions: clean
- **Waiting on B3:**
  - edit on the saved tab with tab switching + the ONE confirm of balance deltas (preview)
  - the linked-pair ask "แก้ในอีเวนต์ด้วยไหม?" (apply_to_event / apply_to_my_tx)
  - locks: a partner mirror is locked; repayment / borrow have no tabs
  - pending drafts with paid_by / payer (B1 / B2 accept them; the draft form has no tabs yet)

### Open point 1 closed — "ใหม่ · เพิ่มเข้าอีเวนต์" for an existing event
- **Data:** be-A's event members now carry `contact_id`; `ProjectMember.contactId` reads it.
- **When an existing event is picked,** quick create loads its members once (GET /projects/{id}/members). A failure only leaves the tags off; the save still adds whoever is missing.
- **Matching** (`LinkPerson.isMember`, pure):
  - a contact matches by the member's contact_id, or by the member's user_id = the contact's linked user (the contact look now carries `linkedUserId`)
  - a typed name matches the member's name, any case (as the BE does)
- **Tags:** only the people not in the event get the tag. A new event still tags everyone.
- **Tests:**
  - link_draft +2 (the matching)
  - link_section +1 (existing event: only the non-member is tagged)
  - quick create suite + splits + every ProjectMember test: 100 pass
- **Runs:** analyze of the touched files: clean.

### Wording sweep: no "ติด" (owner via Lead): DONE
- **Debt mode chips:**
  - "เขาติดฉัน" / "ฉันติดเขา" → [รอรับ | รอจ่าย] (`debtDirectionOwedToMe` / `debtDirectionIOwe`, value changed in place)
  - a small line under each chip: "เขาต้องคืนฉัน" / "ฉันต้องคืนเขา" (new `debtDirection*Sub`). It's in the kit hero (`TransactionHeroCard`), only when recording a debt, not in repay mode.
- **ผูกกับ share line:** `txLinkShareIOwe` "ค้าง ลี ฿13" → "รอจ่ายให้ลี ฿13".
- Doc comments + the hub note use the new words; the debt mode test is updated (it checks the subtitles too).
- **Runs:**
  - analyze of the touched files: clean
  - debt mode, hero, alignment, skeleton, link section / save, quick create mode, debt entry detail, hub smoke: 127 pass
- **NOT mine; Lead to assign** (all still use ติด for owing):
  - arb: `projectTxOwes` "ติด {name}", `projectTxSplitsHint` "แต่ละคนติดคนจ่ายเท่าไร…", `txSplitOwes` "ติด", `moreDebtsDesc` "ใครติดใครเท่าไร", `transactionSplitShareTitle` "แบ่งให้... (เราติดเงินเขา)", `txShareOthersOwe` "คนอื่นติด {amount}"
  - hub: domain_debts_page `_owedToMe` 'ติดคุณ' / `_iOwe` 'คุณติด' (+ a sample line); page_flows note "ติดคุณ / คุณติด"

### S6 part 2 — edit on the saved tab (B3): DONE on tx detail
- **Data:**
  - repo `update(link:)`; `previewUpdate` (same PUT body, `?preview=true`) → `TxEditPreview` (people / wallets before → after)
  - `applyEvent(id)` (POST /transactions/{id}/apply-event)
  - `TransactionWriteResult.personBalances`
  - `EventBillLink.isOrigin` (kind), `inSync`, `differences`
  - `LinkPerson.memberId` → `{member_id}`; `LinkDraft.eventExtra` (a saved bill's people)
- **Controller:**
  - `prefillLink(tx)` opens on the saved tab: จ่ายแทน payer + amount; อีเวนต์ payer / members / shares by member_id
  - `linkSnapshot` (change detection); `linkEditJson(m, projectId:)` = `{link_mode, splits | paid_by | event{project_id, payer, members}}`
- **Tx detail edit mode** shows LinkSection (same cards as quick create) when `txLinkTabsEditable`: my own expense, not a repayment / debt entry, not a partner mirror, not my copy of someone else's bill.
- **On save:**
  - When another tab is picked, or จ่ายแทน / อีเวนต์ data changed: the preview → ONE confirm "ยอดที่จะเปลี่ยน" with "ลี: ฿0 → −฿419" / "KBank: …" lines → then the PUT with link_mode + the tab data.
  - Into อีเวนต์ uses the picked event (a new one is made first with POST /projects).
  - A แบ่ง edit on a แบ่ง tx keeps today's splits call (no confirm). Text-only edits: no link_mode, no confirm.
  - The แบ่ง checks / the incomplete-rows ask run only when แบ่ง is what's saved.
  - The linked-pair ask stays the existing "แก้ทั้งคู่ / แค่ของฉัน" prompt: also_update_link, which B3 treats like apply_to_event.
- **View:** when `in_sync` is false, the row "บิลในอีเวนต์ถูกแก้ | อัปเดตตามอีเวนต์ ›" → apply-event → "อัปเดตตามอีเวนต์แล้ว".
- **Sheet edit:** `txEditsInSheet` now also excludes จ่ายแทน rows (they edit on the detail page).
- **Hub:** page_flows adds the preview / tab-switch save + apply-event (both ratchets pass).
- **arb:** +6 (`txLinkPreview*`, `txLinkOutOfSyncLabel`, `txLinkApplyEvent`, `txLinkApplied`).
- **Tests:**
  - new `tx_detail_link_edit_test.dart` (6): opens on the saved tab; ส่วนตัว → จ่ายแทน = preview body + the confirm lines + the PUT carrying the same link; cancel saves nothing; text edit = no link / no preview; a partner mirror has no tabs; out of sync → apply-event
  - link_draft +4 (prefill จ่ายแทน / อีเวนต์ by member_id, snapshot, แบ่ง edit json)
  - link_view +1 (B3 parse)
  - tx_detail_link_rows: the long-press test now expects the tabs (edit opens on ส่วนตัว; แบ่ง shows "Add person")
- **Runs:**
  - every test in test/features/transactions + test/hub + the hub ratchets + quick create / pending / offline / share card / debt pieces / every projects-repo test: 428 pass, 0 fail
  - analyze lib/features/transactions, projects, lib/hub, lib/ui, test/features/transactions: clean
- **The older "ติด" strings (Lead's follow-up):**
  - `projectTxOwes` "รอจ่ายให้{name}"
  - `projectTxSplitsHint` "แต่ละคนรอจ่ายให้คนจ่ายเท่าไร | คนจ่ายรับส่วนที่เหลือ"
  - `txSplitOwes` "รอจ่าย"
  - `moreDebtsDesc` "รอรับ / รอจ่ายกับใครเท่าไร"
  - `transactionSplitShareTitle` "แบ่งให้... (เรารอจ่ายเขา)"
  - `txShareOthersOwe` "รอรับจากคนอื่น {amount}"
  - en to match; hub debts demo + page_flows note → รอรับ / รอจ่าย
  - none left app-wide (grep); 69 related tests pass
- **Open / for Lead:**
  1. A plain tx edited from a list's ✏️ still opens the quick create sheet without tabs. The tabs are on the detail page. Should the sheet edit get them too, or should expenses edit on the detail page?
  2. Not done (outside tx detail): the event board's bill edit asking "แก้ในสมุดของฉันด้วยไหม?" (apply_to_my_tx, EventPatch.my_transaction); the resolve sheet's "as debt" with bill_id; pending drafts with paid_by / payer / members. They're for whoever owns those screens, or tell me to take them.
  3. For be-A: switching INTO อีเวนต์ with someone else paying, I still send `amount` = the bill (the form's number) next to `event`. I assume the BE sets my tx to my share; please confirm.
  4. My copy of someone else's bill has no tabs (it follows the board; "อัปเดตตามอีเวนต์" covers it).
- Open point 3 closed (be-A): when switching into อีเวนต์ with someone else as payer, the BE reads `amount` as the BILL total (the field edits apply first, then the board bill, then my tx becomes my share with no wallet). The FE already sends it, in the preview too. No change.

## 0.4.0-3 round 2 (branch wip/0.4.0-3, uncommitted) — Lead's order "ต่อเลย ให้จบทุกงาน"
### Block 0: DONE
- **1. Sheet edit = the SAME form:**
  - The edit logic moved into a shared `LinkEditSession` (transaction_edit.dart): start / changed / prepare = checks → event id → preview → ONE confirm. Both tx detail and the quick create sheet's edit mode use it.
  - The sheet edit shows the tabs, opens on the saved tab, and a switch previews + confirms before the PUT.
  - `txEditsInSheet` lets จ่ายแทน rows edit in the sheet again.
  - The sheet's form keeps a picked event on itself (`projectId`); prepare reads it.
- **2a. Linked pair asks, the owner's words:**
  - My tx tied to an event bill (origin or my copy): "แก้ในอีเวนต์ด้วยไหม?" [แก้แค่ของฉัน] [แก้ทั้งคู่]. A shared `askLinkedTxSave` serves detail + sheet; a recurring link keeps the generic ask.
  - The bill edit on the board: a bill made from my tx asks "แก้ในสมุดของฉันด้วยไหม?" [แก้แค่ในอีเวนต์] [แก้ทั้งคู่] up front.
  - My copy is asked after the save, from `EventPatch.myTransaction` (new) when in_sync is false; yes → apply-event. My tx row is patched from the answer.
  - Both send also_update_link (= apply_to_event / apply_to_my_tx on the BE).
- **2b. Resolve "as debt":** `createEntry(billId:)` → `bill_id` = the bill (the parent of a split row).
- **2c. Drafts carry the tab:**
  - `PendingDraft.paidBy / payer / members`
  - `DraftResolved.linkMode / paidBy / billPayer / billMembers` (+ `ResolvedBillPerson`)
  - `toDraft` follows the active tab: แบ่ง = splits, จ่ายแทน = paid_by, อีเวนต์ = project_id + payer + members. With no tab picked, it's as before.
  - A draft reopens on its tab (`prefillLinkFromDraft`, members by member_id). The draft form shows the tabs; its event chip is the draft's own.
  - "เก็บเป็นร่าง" now works from every tab. A NEW event is refused with "ร่างผูกได้กับอีเวนต์ที่มีอยู่แล้วเท่านั้น".
- **arb:** +6 (`linkedEventAskTitle`, `linkedBookAskTitle`, `linkedMineOnly`, `linkedEventOnly`, `linkedBoth`, `txLinkDraftNeedsExistingEvent`).
- **Tests:**
  - quick_create_link_save +5 (sheet edit: saved tab / preview + confirm + PUT, cancel, text edit; draft from จ่ายแทน / ส่วนตัว)
  - new linked_ask_test (3)
  - event_model +1 (my_transaction)
  - debt_repository +1 (bill_id)
  - link_draft +4 (toDraft per tab, legacy draft, event + จ่ายแทน drafts reopen)
- **Runs:**
  - every test in test/features/{transactions, pending, projects, personal_debts} + test/hub + hub ratchets + quick create / offline / share card / debt pieces: 503 pass, 0 fail
  - analyze lib + test/features: clean

### Block A — debt quick create = "หนี้: 2 chip + ลูกศรสลับทิศ": DONE
- **No sub-tabs.** `DebtModeChips` (new kit, ui/domain/money) sits in the hero's chip slot (`EntryCard.typeBadge`): record | settle, worded + coloured by the direction:
  - them → me = [รอรับ | รับคืน], green
  - me → them = [รอจ่าย | จ่ายคืน], red
  - a small caption: "เขาต้องคืนฉัน" / "ฉันต้องคืนเขา"
- **The arrow:** กับใคร and กระเป๋า always show as FlowCards; the arrow swaps the direction (`DebtEntryController.towardMe` / `swapDirection`; record and settle keep the same direction).
- **Record:** the switch is now "ทำรายการเงิน (tx) ด้วย" (off = ledger only). While off, the wallet card dims with "ไม่ผ่านกระเป๋า"; picking a wallet turns the switch on. → POST …/entries.
- **Settle:** always a tx (a wallet is required) → POST …/repayments. "ติดป้ายจ่ายแล้ว" stays on this side.
- **Result box** (`DebtResultBox`, new kit) under the hero:
  - "ตอนนี้" → "หลังบันทึก" (รอรับ ฿x / รอจ่าย ฿x / ✓ เคลียร์ครบ, coloured), plus the wallet ("Cash −฿200" / "ไม่ผ่านกระเป๋า")
  - Fed by BE-39's `?preview=true` (repo `preview()`, debounced 350 ms, stale answers dropped); until it answers or if it fails, the app's own sum shows (dimmed while loading).
  - A settle that flips the side shows a warning line.
- **Overpay:** the save warns ONCE ("จ่ายเกินยอดค้าง" [บันทึกเลย] [แก้ยอด]); the next save goes through.
- **Model:** `DebtPreview` (before / after / flipped / walletDelta).
- **Hub:** debts page demo (swap, both chips, two boxes); registry covers both. page_flows adds the preview step.
- **arb:** +9 (`debtQuickCreateTxLabel`, `debtResult*`, `debtWalletNotUsed`, `debtOverpay*`).
  - **My slip, fixed:** I first appended `debtCreateTxLabel`, which already existed: the duplicate silently changed the debt detail page's switch. It's renamed now; a scan of both arbs shows no duplicate keys.
- **Tests:**
  - quick_create_debt_mode rewritten for the new layout (13): chips + caption + no sub-tabs; swap renames / recolours; the box from the app's sum; the BE preview wins; record save ledger-only; switch on; settle preset; settle save; the settle chip then the arrow; overpay warns once; no person; tx ⇄ debt
  - new test/ui/debt_mode_pieces_test (3): 320 / 390 geometry, arrow between the sides, colours
  - debt_repository +1 (the preview request + parse)
- **Runs:**
  - test/features/{transactions, personal_debts, pending} + test/hub + hub ratchets + quick create mode + debt pieces + offline: 472 pass, 0 fail
  - analyze lib + test/features: clean
- **Decisions taken** (mock file `project/QuickCreateDebt.dc.html` isn't in any checkout I can read, so I built from ai/decisions.md + the brief):
  - The chips reuse the hero's chip slot (kit `typeBadge`), not a new hero.
  - The caption sits under the chips (Lead's earlier subtitle rule).
  - The wallet card stays visible while ledger-only, dimmed (kit `muted`), so the arrow always has two ends.
  - Picking a wallet while recording turns the switch on.
- **Now unused arb keys** (for the cleanup list): `debtSubRecord`, `debtSubRepay`, `debtMoneyMovedLabel`, `debtRepayLeft`.
- **Block A re-checked against QuickCreateDebt.dc.html — fixes:**
  1. The cards follow the MONEY: record รอรับ / settle จ่ายคืน = wallet → person; record รอจ่าย / settle รับคืน = person → wallet. I had person → wallet for every "them → me".
  2. A sentence under the cards (new kit `FlowCards.caption`), with the person's name:
     - "จดว่าลีต้องคืนฉัน" (+ " (ฉันให้ลียืมเงินออกจากกระเป๋า)" when the switch is on)
     - "จดว่าฉันต้องคืนลี" (+ " (ฉันยืมเงินลีเข้ากระเป๋า)")
     - "ลีคืนเงินฉัน เข้ากระเป๋า" / "ฉันคืนเงินลี ออกจากกระเป๋า"
     - The chips' own caption is gone.
  3. An unused wallet reads "กระเป๋า (ไม่ใช้)" (dimmed).
  4. The switch sits right under the hero, before the result box. Its hint changes: off "ปิด = จดในสมุดหนี้อย่างเดียว ไม่มีเงินเคลื่อน" / on "เงินออกจากกระเป๋า (ให้ยืม)" or "เงินเข้ากระเป๋า (ยืมมา)".
  5. `DebtResultBox` = three rows, the words left and the value right: "ลี ตอนนี้", "หลังบันทึก" (bold), "กระเป๋า test2" → "−฿230" or "ไม่เปลี่ยน". ✓ เคลียร์ครบ shows in the brand colour.
  - Kept (kit-consistent): the kit FlowCards arrow button (the mock draws its own "→ สลับ" circle); the richer existing description hints. Debt mode tests + kit tests: 15 pass.

### Block B — debt pages per mocks DebtsList / DebtPerson / DebtEntry / DebtEntryEdit (DONE)
- **List (`personal_debts_page.dart`):**
  - The hero: tile + "หนี้สุทธิ | N คน" + the big signed net; facts รอรับ / รอจ่าย / ค้างเกิน 30 วัน (with icons); HeroFilterChips ทั้งหมด / รอรับ / รอจ่าย / ค้างเกิน 30 วัน with counts.
  - ONE card of open people, oldest first. Each row: name + last activity ("ค่าตั๋ว | 1 ก.ย." / "คุณจ่ายคืน ฿400 | …") + the side word + amount + age ("ค้าง 45 วัน", amber past 30).
  - It all comes from the synced directory: open = no request. The counts and filters run on the device (`countPeople`, `filterPeople(overdue30:)`, `DebtListFilter`).
- **Person (`debt_person_page.dart`):**
  - The hero: avatar / name / age / 🪪 / 🔍; "รอจ่ายให้ลี" + the big amount (`DebtSentenceAmount`).
  - The buttons (`DebtPersonActions`, tinted to the side's colour):
    - [จ่ายคืน ฿x / ได้คืน ฿x] opens quick create preset to settle the full amount
    - [สรุปยอด / ทวง] opens `DebtShareSheet`: chips รอบนี้ / ยอดคงเหลืออย่างเดียว (BE `text` / `text_balance_only`), editable text, คัดลอก + share (share_plus)
  - Statement:
    - Day groups use `DateGroupHeader` with a note: "เพิ่ม ฿x" in the side colour, or "ลดลง ฿x" in the brand colour. The BE's `days[]` is used when present (merged across pages); otherwise the lines' own sum.
    - Rows are `DebtStatementRow`. Repayments get a cash icon on a soft background. Sub-lines come from the origin: "ลีจ่ายแทน" / "หารบิล ฿x" / "งาน X" / "จาก/เข้ากระเป๋า X". A paid debt gets the "✓ จ่ายแล้ว" pill.
    - Earlier cycles sit behind `CycleDivider` "เคลียร์ครบ <date> | ดูรอบก่อน ▾". They load once, toggle hide / show, and are dimmed.
- **Entry (`debt_entry_detail_page.dart`):**
  - The tx-detail hero, with the line `DebtEntryNote` "รอรับจาก chalee ฿82" + ✓จ่ายแล้ว under the amount.
  - Cards: กับใคร › and มาจาก › (from `entry.origin`; opens the tx or the event / bill; dimmed and locked in edit).
  - View box = only the จ่ายแล้ว LiveSetting (saves at once, ONE PUT).
  - Then note, meta. Delete is in edit mode only.
  - **Edit:** box = "เงินเข้า/ออกกระเป๋า" switch + wallet chip (hint by direction) + จ่ายแล้ว. Every row is tappable.
- **Kit (new, exported, on hub page domain/debts):**
  - In `ui/domain/money/debt_person_pieces.dart`: DebtSentenceAmount, DebtEntryNote, DebtPersonActions, DebtStatementRow, CycleDivider, DebtShareSheet.
  - PersonBalanceRow gains `age` / `ageWarn`; DateGroupHeader gains `note` / `noteColor`.
- **Root fixes found by the 320 / 390 tests + hub smoke:**
  - CycleDivider overflowed with a long label → the words wrap between two short lines.
  - DebtStatementRow: a big amount pushed the row → the amount is capped at 32% width and scales down; the ✓ pill drops under the sub-line when there's no room.
- **Tests:**
  - debt_pages_test rewritten: 18, + 2 for block C
  - debt_entry_detail_page_test updated: 10 (view note / no wallet card; origin card + locked in edit; paid saves at once; edit money switch; switch off PUT; amount PUT; delete; tx row → debt mode; event row)
  - new test/ui/debt_person_pieces_test: 5 (320 / 390 geometry + share sheet + lone summary button)
  - Plus: personal_debts folder, budgets pages, debt pieces / mode pieces, list clearance, hub coverage / duplicates / layering / page_flows / api_spec, hub smoke domain/debts. All pass; analyze lib clean.
- **Decisions taken:**
  - Delete stays edit-only (the kit edit pattern).
  - The search toolbar is kept (behind 🔍).
  - The person buttons are AppButtons tinted through Theme.
  - The edit page has no category row: `DebtEntryUpdate` has no category.
  - The hero debt subtitles were removed (the mock shows none).
  - The edit top bar keeps the kit edit bar.
  - The old source row shows only when the BE sends no `origin`.
- **Pre-existing kit limit (not mine; follow-up):** `PersonBalanceRow` / `NetBalance` overflows ~7 px at 320 with a 7-digit amount (with or without the new age). Only with the square test font; noted for the kit owner.
- **Unused arb keys** (cleanup list): `debtSubRecord`, `debtSubRepay`, `debtRepayLeft`, `debtDirection*Sub`, `debtsEmptyTitle`, `debtsEmptyMessage` (replaced by `debtsEmptyOpen*`).

### Block C — create button colour + word + in-page buttons (DONE)
- **Colours:**
  - `ModuleColors` gains `debt` (#7A5AE0) and `saving` (#3B7DD8) tokens, defaults in every theme.
  - `QuickCreateModeColors` uses them. `people` / `planning` are unchanged, so the module tints elsewhere don't move.
  - The saving form's accent follows the new colours (blue).
- **Centre button:**
  - `QuickCreateButton(label:)` is a 48-high capsule: the mode icon (`quickCreateModeIcon`: + / handshake / savings) + บันทึก / จดหนี้ / ออมเงิน, in the mode colour, cross-fading as before.
  - The bar's centre slot is now `MainBottomNav.addSlotFor(row)` = 32% of the tab row, clamped 96–120 px. The four tabs share the rest, and the drag highlight uses the same slot.
  - A long word scales down inside the slot.
- **In-page:**
  - kit `QuickCreateHeadButton` (round, level with 🔍, + and ring in the mode colour) is on the debts list hero head.
  - kit `QuickCreateCtaButton` (filled AppButton in the mode colour) is on the debts empty state, with the mock words "ยังไม่มีหนี้ค้าง / จดไว้ว่าใครยืม ใครจ่ายแทน จะได้ไม่ลืมทวง".
  - Both open quick create in debt mode.
- **Hub:** bottom-bar page: capsule + round per mode; head + per mode; EmptyView with the CTA. Registry covers the 3 new names.
- **arb +5:** `quickCreateBtnTx` / `Debt` / `Saving`, `debtsEmptyOpenTitle` / `Message`.
- **Tests:**
  - new test/app/shell/main_bottom_nav_capsule_test (7): 320 / 390 × 3 modes. Checks: capsule 48 high, centred, clear of รายการ and กระเป๋า, the mode colour, tap; plus the head + / CTA colours.
  - quick_create_mode_test: the colour test is updated (debt purple, saving blue) + a capsule test.
  - debt_pages_test: + 2 (the hero +, the empty CTA).
  - Shell tests (main_shell, shell_chrome, page_presets, more_page) 38 pass.
  - hub smoke bottom-bar / debts, hub coverage / duplicates / layering / page_flows / cross_tab_links pass. Analyze clean.
- **Decisions taken:**
  - The capsule sits centred IN the floating bar (no −14 px lift as in the mock's flat bar); the outer bar height is unchanged, so no page insets move.
  - The icons are the module icons (the mock's icon + small-plus glyphs aren't in the kit).
  - The "+ in list heads" is live on the debts list only. The piece is ready for the tx / saving lists when ordered.
- **For QA:** debts.mjs labels change: the empty title is now "ยังไม่มีหนี้ค้าง" and the CTA is "จดหนี้" (was "ยังไม่มีหนี้" / "บันทึกหนี้").

### feature_visuals ratchet fix (Lead's full run: 1 FAIL) — DONE, no baseline / exception change
- 3 feature classes laid out widgets; the layout moved into the kit:
  - `debt_person_page` hero trailing `Row` → new `HeroIdentity.actions` (kit spaces the round buttons like HeroSummaryHead, control chip size).
  - `LinkSection` `Column` (recurring / bar / card) → new kit `LinkSectionFrame` (ui/domain/transactions/link_mode_bar.dart); `_pickChip` `Align` → new kit `SplitPickChip` (ui/molecules/split_row.dart).
  - `LinkViewRows` `Padding`s → `InfoBox(first: false)` (the kit section gap; 16 px instead of 12) and new `showAppSheet(padded: true)` / `AppSheetScaffold.padded` for the card-in-a-sheet gutter.
- Hub: LinkSectionFrame + SplitPickChip demo on domain/transactions; registry covers both.
- Runs: feature_visuals + hub coverage / duplicates / layering 5 pass; link / split / hero / sheet / toolbar / debt pages / link save / linked ask 78 pass; tx_detail_* + full hub smoke 64 pass; analyze of touched files clean.
