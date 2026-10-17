# M5: delete previews + goals follow-ups

## Changed
- contacts: `domain/contact.dart` (ContactDeletePreview, ContactDetail.deletePreview), `data/contacts_repository.dart` (`get(id, deletePreview:)` sends include=unlinked_names,delete_preview), `contact_detail_page.dart` `_delete` (ONE GET on the button, then the confirm lists debt records / event members / linked as sent, joined with " · "; falls back to the old text if preview is null).
- budgets: `budget_detail.dart` (BudgetDeletePreview), `budgets_repository.dart` (`get(..., deletePreview:)`), `budget_detail_page.dart` `_delete` (ONE GET, confirm text prints periods / overridden / categories / wallets).
- goals: `saving_goals_overview.dart` (SavingHistoryPoint.plan, summary monthPlanTotal / monthSavedTotal, SavingDeletePreview), `saving_goals_repository.dart` (`list(sort:)`, `detail(id, deletePreview:)`), `saving_goals_cubit.dart` (SavingGoalsSort + setSort), `saving_goals_list_page.dart` (SortChip in the hidden toolbar, dot on the search button when sort != created, summary bar with right caption "ออมแล้ว ฿saved / ฿plan" only when month_plan_total > 0; fill = saved/plan, presentation), `saving_goal_detail_page.dart` (`_delete`: ONE GET with preview; can_delete false -> snackbar "ปิดเป้าหมายก่อน", no dialog; else confirm with entry count; chart gets `plan` + legend; `_splitsOf` always sends splits and the wallet-less part as `wallet_id: null`), `saving_entry.dart` (SavingSplit.walletId nullable, JSON always carries wallet_id).
- kit: `lib/ui/organisms/charts/saving_history_chart.dart` — optional `plan` (List<double?>) + `planLegend`; dashed muted line, runs of non-null points; legend only when some point has a plan. No new exported class, so no ui.dart / hub covers change (existing SavingHistoryChart entries already cover it). Not added to the /dev/widgets demo.
- ARB: `fpM5...` appended to app_th.arb / app_en.arb.
- `lib/hub/api/page_flows.dart`: `// fe-pages M5` steps: contact / budget / goal "ลบ" now list getContact / getBudget / getSavingGoal (include=delete_preview) + the delete; goals-list gets a "Sort chip" step (listSavingGoals). operationIds exist in openapi.yaml (getContact, getBudget, getSavingGoal, listSavingGoals); ratchet test not run here.
- Tests: contact_detail_page_test, budgets_pages_test, saving_goals_pages_test, saving_goal_parse_test (fixtures now prod-shaped with month_plan_total / month_saved_total / history plan / delete_preview). New: contact preview text, budget preview text (in the existing delete test), goals sort sends sort= and dot, month caption, delete blocked / confirm text, chart plan param + legend.

## Decisions (undo)
- Goal delete confirm says entries "stay, detached" (per openapi: "they stay, detached"), not "go with it" as the brief said. Change `fpM5GoalDeleteBody` if the BE semantics differ.
- Contact confirm joins the three lines with " · "; zero counts are skipped.
- Sort enum member `byName` sends `sort=name`.
- Preview fetch shows the page as saving (setSaving) for the call; a failure shows a snackbar / save-failure.
- 3b: the list card had no bar; one was added (ProgressRow, only when plan total > 0). Remove `bar:` in `_summary` to drop it.

## Not done
- No test for the move/withdraw sheets sending `wallet_id: null` (no existing sheet test; the change is in `_splitsOf`).
- Spare page delete is not applicable (no delete there).
- Ran only the changed test files + hub_coverage + layering once; analyze clean on touched folders.
