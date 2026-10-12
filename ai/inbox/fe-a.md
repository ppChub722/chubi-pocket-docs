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
