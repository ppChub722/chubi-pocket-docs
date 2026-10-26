# DEBTS report (0.4.0 debts pages)

Branch: `worktree-agent-ac3df60d209ecfecf` (reset onto `feat/0.4.0-fe-pages` first: the worktree had started from main). Commits: `82a1738` (kit), `626ccf8` (feature + tests + arb), plus this report.

## What changed per file

### Kit (`lib/ui`, `lib/hub`)
- `lib/ui/domain/money/debt_amount_line.dart` (new): `DebtAmountLine` (hero row C: pill chip รอรับ/รอจ่าย + amount; settled = muted word, no pill), `DebtAgeText` ("ค้าง N วัน", amber when `warn`), `DebtNetLine` (list card net line).
- `lib/ui/domain/money/debt_summary_message_box.dart` (new): `DebtSummaryMessageBox` (label, multiline `AppInput` prefilled from the BE text, two equal buttons copy/share; `onCopy(text)` / `onShare(text)` get the current field text; a new `text` from the page replaces the local edits).
- `lib/ui/domain/money/debt_summary_card.dart`: DELETED (no other users; hub demo + test updated).
- `ledger_row.dart`: `signed` (+ for debt added, normal colour; − for repayment, income colour).
- `net_balance.dart` / `person_balance_row.dart`: `showCaption` (amount only); `PersonBalanceRow.subtitleWarn`; `list_row.dart`: `subtitleWarn` (amber, semibold).
- `list_page_body.dart`: new `scrollHeader` (widgets at the top of the scrolling list, undivided, `AppSpacing.md` apart). Needed because `header` is pinned (a hero with a text field cannot be pinned) and `children` get row hairlines.
- `lib/ui/ui.dart`: replaced the `debt_summary_card.dart` export line with `debt_amount_line.dart` + `debt_summary_message_box.dart`.
- `lib/hub/hub_registry.dart` (debts page `covers`): removed `DebtSummaryCard`; added `DebtAmountLine`, `DebtAgeText`, `DebtNetLine`, `DebtSummaryMessageBox`. Demos in `lib/hub/pages/domain_debts_page.dart` (also demos for the list-row variant and the signed ledger row).
- `pubspec.yaml` / `pubspec.lock`: `share_plus: ^12.0.2` added (resolves on fvm 3.47.3).

### Feature (`lib/features/personal_debts`)
- `domain/debt_ledger.dart`: `PersonBalance.clearedAt/daysOutstanding`; `DebtTotals.owedToMePeople/iOwePeople/over30DaysPeople`; `DebtEntry.inCurrentCycle`; new `DebtCounts`, `DebtSummaryMessage`, enums `DebtPeopleSort` (oldest/amount/recent), `DebtCycle`; `DebtPersonDetail` now `{balance, entries, counts, message}` (entryCount/moneyCount gone); `DebtEntryQuery.moneyOnly` removed.
- `data/personal_debts_repository.dart`: `listPeople(sort:)` always sends `sort=` (default oldest); `person(key, cycle:)` always sends `cycle=current` by default; `entries(..., cycle:)`.
- `cubit/debt_people_cubit.dart`: `sort` in state, `setSort`, sort rides along load/loadMore.
- `cubit/debt_person_cubit.dart`: rewritten. `DebtPersonTab` removed; state = balance, counts, message, query, `current` + `earlier` lists. `load()` = one page call (also reloads the earlier list only if its fold was opened); `openEarlier()` = one call; `loadMore()` goes current then earlier; `onEntrySaved` and `setPaid` patch the balance from the write response then re-run `load()` (the message is BE-built). The old client-side `addEntry` insertion/stale logic is gone.
- `pages/personal_debts_page.dart`: `ListSummaryCard` (caption, two filter tiles, net line only when both sides open, amber alert, 🔍 in actions with red dot for search / include-cleared / non-default sort), hidden `ListToolbar` (search, รวมคนที่เคลียร์แล้ว chip, `SortChip`), rows = `PersonBalanceRow` (age subtitle, warn > 30, amount only).
- `pages/debt_person_page.dart`: `ListPageBody` with `scrollHeader` = `HeroCard` (🪪 link if contact, 🔍, PersonMark 40, name, age fact, `DebtAmountLine`, `DebtSummaryMessageBox` only while net != 0), the link-to-contact row for typed names, hidden toolbar (search, type dropdown, sort chip); statement = `SectionHeader` "ที่มาของยอด · ตั้งแต่เคลียร์ครบ date" + signed `LedgerRow`s, then the "รอบก่อนหน้านี้" `DetailRow` fold, which becomes the "รอบก่อน · เคลียร์ครบแล้ว" header + rows after one call. Copy = `Clipboard` + snackbar; share = `SharePlus.instance.share(ShareParams(text:))`. Entry tap, shell + preset (`QuickCreatePreset.debt` + `debtDirectionFor`) and DebtBook wiring kept.
- ARB (appended, both files): `fpDebtsTotalCaption, fpDebtsOwedToMeTile, fpDebtsIOweTile, fpDebtsOver30, fpDebtsDaysOutstanding, fpDebtsIncludeCleared, fpDebtsSortOldest/Amount/Recent, fpDebtsMessageLabel, fpDebtsCopy, fpDebtsShare, fpDebtsCopied, fpDebtsCycleHeader, fpDebtsCycleHeaderSince, fpDebtsEarlierHeader, fpDebtsEarlierLink`. Old `debtsTab*` / `debtsOpenCount` / `debtsMoneyEmpty` keys are now unused (left in place).

### Tests
- `test/features/personal_debts/*`: updated (cubits, repository, pages). New: list tiles / alert / net line / rows with warn flag, tile filter, include-cleared, sort call, failed load, failed reload keeps rows; person page hero + message box + cycle header + earlier fold (one call), settled person (no pill, no box), 🪪 only with contact, DebtBook re-runs the page call, failed load, failed reload keeps statement, 404.
- `test/ui/debt_pieces_test.dart`: `DebtSummaryCard` group replaced by `DebtAmountLine` and `DebtSummaryMessageBox` tests.
- Fake repos signature-updated in `test/app/shell/page_presets_test.dart` and `test/features/transactions/quick_create_debt_mode_test.dart` (new optional params only).

## Decisions taken
- Reset the worktree branch onto `feat/0.4.0-fe-pages` · it started from main (no DebtBook / HeroCard) · re-point the branch.
- Person page is a `ListPageBody` (not `DetailLayout`) with the hero in the new `scrollHeader` slot · the statement pages (load more) and the hero holds a text field · swap for `DetailLayout` + own list if you prefer, but paging is lost.
- No compact hero bar on scroll · `ListPageBody` has no sticky slot and the old `TabbedDetailBody` is gone from this page · add `CompactHeroScope` later if wanted.
- Link-to-contact for a typed name stays a `SectionCard` + `DetailRow` right under the hero · kit rows, same place as before · move it to the toolbar if preferred.
- Hero tint follows the side (green รอรับ / red รอจ่าย / plain settled) using `AppColors.income/expense` · matches the reference · swap to the person tint (old behaviour) in `_hero`.
- `person()` sends `cycle=current` explicitly · the openapi in the BE repo says "omitted = all" while the brief says current by default · harmless either way.
- With a search / type filter on, the statement runs `/entries` with `cycle=current` (and `earlier` when opened) using the same query · keeps the cycle groups · a filter that should span cycles would drop the `cycle` param.
- Dropped the "status (paid)" chip from the person toolbar (spec lists search / type / sort only); the paid label chip stays on rows. `DebtEntryQuery.paid` stays (the entry form uses it).
- Share call lives in the page (`share_plus`), copy likewise; the kit box only has callbacks · keeps the kit free of plugins and testable.
- English strings made short on purpose ("Show cleared", "Longest owed", "Largest", "Latest") so the chips fit; Thai per the brief.
- Amber threshold 30 days is applied in the page (`days > 30`) as pure presentation of the BE's age.

## Requests to BE
- None blocking. Confirm `cycle` default of GET /personal-debts/people/:key (spec text says omitted = all; brief says current) and that `sort=oldest|amount|recent` has landed on `GET /personal-debts/people`.
- Nice to have: `DebtPerson.over_30` per person (the FE currently colours by `days_outstanding > 30` itself).

## Unfinished / notes
- Entry tap still opens only entries with a wallet transaction (existing TODO for `/personal-debts/entries/<id>`).
- The earlier-cycle fold has no way to collapse again (not in the reference).
- `gen-l10n` reports 2 untranslated Thai messages: not from this work (all new keys are in both ARBs).
- Not run: the app, a build, whole test folders.

## Results
- `flutter test test/features/personal_debts test/ui/debt_pieces_test.dart test/app/shell/page_presets_test.dart test/features/transactions/quick_create_debt_mode_test.dart`: 70 passed.
- `flutter test test/ui/hub_coverage_test.dart test/ui/layering_test.dart`: 3 passed (no baseline needed lowering).
- `flutter analyze lib test/features/personal_debts test/ui/debt_pieces_test.dart test/app/shell/page_presets_test.dart test/features/transactions/quick_create_debt_mode_test.dart`: no issues.
