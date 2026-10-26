
## 2026-10-12 — compact hero bar = small hero card (0.3.1-9)
DONE · files: lib/ui/molecules/compact_hero_bar.dart (CompactHeroScope), test/shared/compact_hero_bar_test.dart · analyze clean on touched files; compact-hero tests pass (9)
root cause: CompactHeroBar already takes the hero's HeroStyle and draws it with HeroSurface (tint, border, glyph, pill radius), and every page (wallet, tx, event) already passes `style:`, but CompactHeroScope re-built the bar WITHOUT `style` → every page got the flat plain pill. Fix = one line: the scope forwards `bar.style`. One place, all detail pages (wallet, transaction, event; the hub scope demo) pick it up; height (44) and pinned placement unchanged.
test: the scope keeps the HeroStyle and the surface is tinted.
not changed: hub page molecules_bars_page already shows the bar variants with styles (they now render tinted inside the scope too).
Note: pages whose compact bar still looks flat after this pass no `style:` — none found (wallet/tx/event all pass it).

## 2026-10-12 — sheets/tiles split into ui organisms + wrappers (0.3.1-9)
DONE · analyze lib+test: 1 info (test/ui/skeleton_geometry_test.dart, not mine) · tests app+features+layering+app_input: 255 pass · hub_coverage: my pieces covered; still red only for others' pieces (CategoryPicker*/ContactPicker*/Settle*/TxFilter*/DescriptionPicker*/QuickCreateSheetShell)
- NEW ui organisms: ui/domain/projects/{event_resolve_sheet,add_member_sheet,project_member_avatar,member_pick_card}.dart, ui/domain/notifications/notification_tile.dart (NotificationTileView + NotificationRejectConfirm); all exported in ui.dart.
- Thin wrappers in features keep the old public API: showResolveSheet, showAddMemberSheet, MemberPickCard, NotificationTile; feature ProjectMemberAvatar class → helper memberAvatar(ProjectMember).
- Hub: lib/hub/pages/sheets_projects_page.dart + HubPage 'sheets-projects'; domain_others_page demos the avatar/pick card/tile view.
- Popovers: settings language row and event status chip now OptionMenuAnchor (highlight, no ✓); font + member picker stay sheets. Entity chips on the resolve sheet's account/category rows (DetailRow.pick valueChip).
- Skeletons: dropped my own skeleton args (event detail), notification settings uses DetailPageSkeleton.
deltas: resolve-sheet category chip has no icon/colour (Category has no colour/icon getter); Account/Categories cubits now load in the wrapper before the sheet opens.

## 2026-10-12 — profile card tint + profile detail page (0.3.1-9 blocker)
DONE · analyze lib+test: no issues · full suite: 533 pass, 1 fail = test/ui/hub_coverage_test (AuthPageBody, BrandHeader, LanguageThemeBar, OrDivider, SocialSignInButton — new ui pieces from another session's auth work, no hub page yet; not mine)
1. Tint: Settings profile card + profile page hero use accent = user.iconCode.tintFor(palette, avatarName: displayName) = the avatar's own colour (icon colour, else the initials colour AppAvatar.colorFor). Test test/features/settings/profile_tint_test.dart (tint == AppAvatar.colorFor for no-icon users; HeaderCard surface carries it); hub demo "Profile card (settings)" on domain/others. The top-right avatar (UserAvatar) is the same source; the green ring (current page) untouched.
2. Profile page (edit_profile_page.dart, route /settings/profile) = contact-style detail: opens in VIEW mode (✏️ / long-press edits, leave-edit prompt, pull-to-refresh in view), hero avatar · name · @username; ONE headless box: display name (inline) · username 🔒 · email (inline, "ไม่ได้ตั้ง" when empty, cannot be cleared once set → validator, 409 EMAIL_EXISTS → field error) · currency 🔒; headed section "บัญชี": Change password ›; DetailMeta from /users/me created_at/updated_at (User model now parses them). Settings keeps app settings only (Account section removed). New arb: profileTitle, profileEmailCannotClear.
notes: page title is "โปรไฟล์" (new key; the old editProfileTitle is still used by the avatar icon-maker sheet).

## Handoff 2026-10-13
Role: FE-D (events pages + pending/notifications/settings/auth/more). Everything asked for 0.3.1-9 is done and green at my last run (analyze lib+test clean, full suite ~555 pass).
Unfinished / open:
- Events redesign (0.3.1-10): only the PROPOSAL exists (ai/inbox/fe-events.md: tabs สรุป·รายการ·สมาชิก, 10 BE asks A1–A10, 6 kit pieces, 8 owner questions) — no owner answers yet, nothing built. 0.3.1-9 events work was standards-only (templates/kit, no redesign).
- Resolve-sheet category chip has no icon/colour (no getter on Category); unread dot / minor kit gaps flagged earlier (SelectionToolbar etc. were since added by FE-A).
- Global status-bar scrim (content shows under the clock on all pages) is a kit task for FE-A/FE-B, not done.
- contact_detail_page: _load catches only ApiException (parse errors hang the skeleton) + 10–25 s skeleton before the error state; a contact page test was added by another session — check it's green.
- "แก้ร่าง" sheet still prefills from account/category caches, not pending.resolved/form-options (transactions feature, FE-C's files).
Gotchas:
1. Change password is a PAGE (/settings/password, EditModeMixin + DetailPageBody, AppInput.card obscurable fields); the owner flipped sheet → section → page three times — don't redesign without a new owner order. Its entry row sits in the profile box right under the username.
2. Profile page (edit_profile_page.dart) is a contact-style detail page in VIEW mode; display name/email use DetailTextField (ui/molecules/detail_text_field.dart) — the ONE editable-value piece shared with contact_detail_page; email can't be cleared once set (validator), 409 EMAIL_EXISTS is a field error; hero tint = icon.tintFor(palette, avatarName).
3. Compact hero bar: CompactHeroScope must forward `style` to the bar (it used to drop it → flat pill everywhere).
4. Sheets rule: presentational organism in lib/ui/domain/* (no features/cubit/l10n) + thin wrapper in features/ (event resolve, add member, ProjectMemberAvatar, notification tile view). Hub entries/covers go in hub_registry.dart (hub_coverage test ratchets every ui.dart export).
5. Shell shell tricks: ListPageBody/DetailPageBody own the top-bar clearance (don't wrap in MediaQuery.removePadding), hub pages must not contain a ListView (smoke test puts them in a scroll view), heredocs with quotes in bash tool break — write files with the Write tool; Python is not installed (use node).

## 2026-10-20 — saving goals redesign (D1–D3) + wallet-detail kit (Part 1)
DONE · analyze lib (+ test/features/saving_goals, test/ui): no issues · tests NOT run (owner has not said go; saving_goals_pages_test is likely stale)
Saving goals (chubi-pocket-app):
1. List page (saving_goals_list_page.dart): ring hero (HeroRingRow + HeroFilterChips [ทั้งหมด][ยังขาด][ครบแล้ว][ไม่มีกำหนด], these filter; ไม่มีกำหนด = no-plan + ongoing), ONE SectionCard, rows per the mock (ช้ากว่าแผน badge, ETA caption, trailing ขาด/ครบแล้ว ✓/เหลือ/saved total, "ควรมีตอนนี้" bubble on the marker). The ring amount is warning-colored through a MoneyText style inside HeroRing (arc stays accent), so HeroRing needed no change.
2. Sort: new SavingGoalsSort.needFirst "ต้องออมก่อน" is the default. It is NOT a BE sort (query = created); SavingGoalsState.goals orders it app-side (domain/saving_goal_plan.dart: SavingGoalPlan short → done → noPlan → ongoing, sortedNeedFirst is stable).
3. saving_goal_texts.dart: savingGoalEtaBadge → savingGoalEtaCaption (String?), new savingGoalPaceRatio(createdAt → deadline).
4. Detail view hero (saving_goal_detail_page.dart): _goalHero / _ongoingHero rebuilt like the budget ring hero (info box "ครบ {date}" + days left, ring + marker, facts, StatusChip row last; reached = เป้าหมาย / ถึงเป้าเมื่อ). Non-active goals keep a header status chip (ปิดแล้ว / เก็บถาวร). Ongoing has no ring: HeroNumber + HeroFactList (month saved; auto-save only when exactly one monthly one). _spareHero untouched. New _heroTrailing (info box + edit button). _entriesTab: rowCards + a DateGroupHeader per day with the day's net (save +, withdraw −, move by endpoint); the date is gone from SavingTxRow.
5. l10n: 25 new keys after fpGoalsPerMonth (th, en, 3 gen files).
Wallet detail kit (Part 1 of นายB-fe's plan; Part 2 = นายE):
6. NEW HeroFlowBox + HeroFlowSelection (ui/organisms/hero/hero_flow_box.dart): ‹ month ›, ↑ in (success), ↓ out (danger), no signs, onTapIncome / onTapExpense + selected state. 
7. HeroBar.split: optional leftAmount / rightAmount (big legend: dot + label, amount under it, left/right aligned) and leftAmountColor / rightAmountColor (warning). Without them the small legend is unchanged.
8. AvatarStack "+N" bubble now has the surface ring like the avatars (MemberAvatarStack size 28, maxVisible 3 used as is).
9. Hub: demo "HeroFlowBox + HeroBar.split big legend" (organisms_app_hero_card_page), 5-member stack in a hero header (domain_people_accounts_page), covers HeroFlowBox + HeroFlowSelection in hub_registry; ui.dart exports hero_flow_box.dart. Final APIs sent to นายE (chubi-pocket-ea).
notes: "ถึงเป้าเมื่อ" uses closedAt (the BE has no reached-at date), so a reached goal that is not closed shows only เป้าหมาย. Unused fpGoals* keys are in backlog "0.4.0-2 leftovers" (untouched).

## 2026-10-20 — PLAN (scan only, no code): D1 goals list hero, D2 goal detail fact icons, D3 cut one-off upcoming (app side)
PLAN · read-only scan · no edits, no tests

### D1 — Saving goals LIST hero  (size M; S if A ships the head piece below)
- Files: saving_goals_list_page.dart (_summary, _children, header actions), cubit/saving_goals_cubit.dart (+ month in state, setMonth, load(month)), data/saving_goals_repository.dart (list(month:)), domain/saving_goals_overview.dart (only if C4 adds keys), l10n th/en + 3 gen (new fpGoals* keys: header label "เงินออมทั้งหมด", plan title; drop fpGoalsFactTotal).
- Exists / reusable: StepperPill.month (ui/molecules/stepper_pill.dart: value + onChanged, optional first/last), HeroRingRow + HeroRing, HeroFactList, HeroFilterChips, HeroHeader(actions: ToolbarToggleButton), MoneyText. The caption "แผนเดือนนี้ (ต.ค. 2026)" and the เงินออมทั้งหมด fact simply go away.
- Missing: A2 module icon tile, A1 HeroFact(icon:), AppIcons for piggy (module + fact), hourglass, trending up, target (AppIcons has only wallet / savingGoal=flag / date / savingDeposit today).
- Kit API wanted from นายA: ONE shared head piece for the top row, e.g. HeroSummaryHead(icon: IconData, label: String, amount: Widget, trailing: Widget? (the 🔍)), because wallets (mock) and goals both use [tile 40 | small label over big number | 🔍]. Without it I would squeeze a Row + Column into HeroHeader.leading, which is a chip row. Also HeroFact(icon: IconData?, iconColor: Color?) as in A1.
- BE needed (C4): GET /saving-goals?month=YYYY-MM. Today the BE only returns the current month. I want summary.month_plan_total / month_saved_total / month_short_total AND every goal's month_plan / month_saved / month_short for the asked month (past = actual saved vs plan; future = plan with 0 saved; default = current). If only the summary follows the month, the rows, chips and the "ต้องออมก่อน" sort would keep saying current month. saved_total / unallocated stay "now".
- Risks / open questions:
  1. When the month is not the current one, do the ROWS follow the month? I propose yes (rows, chips, sort all follow; wording "เดือนนี้" becomes the month name, e.g. "ก.ย. ฿x / ฿plan").
  2. Plan title: "แผนการออมเดือนนี้" only for the current month, "แผนการออมเดือน ก.ย." for others? (the mock keeps one text).
  3. The "ควรมีตอนนี้" bubble / pace marker is today-based: hide it when the month is not the current one.
  4. Future months: the ring center says "ยังขาดอีก", which makes no sense with 0 saved. Proposal: label "ต้องออม" for future months, "ออมครบ" for a past month that was met.
  5. The month state lives in a global cubit: reset to the current month when the page is left? (proposal: yes).
  6. Allowed range: no upper limit? (mock says "เดือนหน้า = แผนที่ต้องออม"); first = month of the oldest goal.
- Tests likely affected: test/features/saving_goals/saving_goals_pages_test.dart; test/features/saving_goals/saving_goal_parse_test.dart (only if overview keys change); const SavingGoalsState users (no change expected): test/features/home/home_skeleton_geometry_test.dart, test/features/pending/pending_confirm_gate_test.dart, test/features/transactions/quick_create_saving_mode_test.dart.

### D2 — Goal detail: icons before fact labels  (size S)
- Files: saving_goal_detail_page.dart (_goalHero facts only), no l10n change.
- Exists: the HeroFact list is already built in _goalHero. Missing: A1 HeroFact(icon:) + the icons.
- Mapping (mock): เดือนนี้ออมแล้ว = piggy, เดือนนี้ยังขาด = hourglass, ควรมีตอนนี้ = trending up, เหลืออีก = target, เป้าหมาย = target, ถึงเป้าเมื่อ = calendar. (Your note says "ออมแล้ว = piggy": I read it as the "เดือนนี้ออมแล้ว" fact; the ring label stays plain.)
- Kit API: HeroFact(icon:) only. Please also add the 4 AppIcons names (piggy, hourglass, trendingUp, target) so I do not pick Material icons myself.
- BE: none. Ongoing hero facts (month saved, auto-save): propose piggy and repeat; confirm?
- Tests: saving_goals_pages_test.dart only if it looks at fact rows.

### D3 — Cut the one-off upcoming, app side  (size M; mostly deletions; needs BE C1)
- Files (all in chubi-pocket-app/lib):
  - transactions/domain/transaction.dart: TransactionWriteResult.upcoming + isUpcoming + the fromJson key.
  - transactions/presentation/cubit/transactions_cubit.dart:332 (updateTransaction: the isUpcoming branch that drops the row).
  - transactions/presentation/transaction_edit.dart:142-160 (isUpcoming branch, TransactionEditOutcome.movedToUpcoming).
  - transactions/presentation/pages/transaction_detail_page.dart: :493 movedToUpcoming handling + txMovedToUpcoming snackbar; :624 openRecurring fallback '/recurring?tab=upcoming' (a tx with no recurring link has nothing to open); :770-773 upcomingHint / onUpcomingHintTap.
  - transactions/presentation/widgets/draft_form.dart:508-546 (upcomingHint, onUpcomingHintTap), :647-662 _upcomingNote, :838 / :867 dateNote use. EntryCard / TransactionHeroCard keep their generic dateNote param (kit + hub).
  - transactions/presentation/widgets/quick_create_sheet.dart:1100-1157 (savedAsUpcoming, txSavedAsUpcoming), :1272 upcomingHint arg.
  - notifications/presentation/notification_actions.dart:260 (isUpcoming ? txMovedToUpcoming : notifCopyUpdated).
  - pending/domain/pending_transaction.dart:15,28 (PendingSource.upcoming; the wire value 'upcoming' would then parse to other) + pending_page.dart:482 (pendingSourceUpcoming).
  - budgets: BudgetSource.upcoming + budget_labels.dart:139 bgSourceUpcoming (budget items from upcoming): only if C1 removes that source (open question).
  - l10n (arb th/en + 3 gen): delete txSavedAsUpcoming, txMovedToUpcoming, pendingSourceUpcoming, quickUpcomingHintText. Keep quickUpcomingHintTitle for now (tx detail uses it as the recurring-link fallback name; B's RecurringItemPage uses it as its title) and replace it after B4.
  - hub text only: hub/api/page_flows.dart:139 and hub/pages/molecules_rows_page.dart:57 mention "becomes an upcoming item".
- NOT mine (B's area, I will not touch): recurring_item_page.dart:487 (upcomingHint: editing, goes with B4 removing RecurringItemPage), app_router.dart:458 ('upcoming' || 'calendar' tab alias), home_page.dart / dashboard.dart `upcoming` (the recurring list on Home), recurring_detail_page _Tab.upcoming, OccurrenceState.upcoming, EditScope.upcoming (these are recurring occurrences and stay).
- Depends on BE C1: C1 must stop returning `upcoming` in write results and stop the 'upcoming' pending source. The deletions are safe to do before C1 (unused JSON keys are ignored), so I can start whenever the owner says.
- Coordination with B: draft_form.dart is shared, and B2/B3 add quick create edit modes in quick_create_sheet.dart. I touch only the upcomingHint bits in draft_form and the savedAsUpcoming bits in quick_create_sheet._save (~1100-1160, 1272). B should tell me when quick_create_sheet.dart is free, or I do D3 first and B re-reads.
- Risks / questions:
  1. A future-dated tx from quick create lands in the tx list as a faded row (E4). Until E4 ships it just shows as a normal row: fine.
  2. Editing an existing tx to a future date used to move it to upcoming and pop the page; after C1 it just saves and the detail page stays open: confirm that is wanted.
  3. Should the date field warn anything after C1 ("will not count until that date")? Proposal: no text, per the quiet-UI / no-absence rules.
- Tests likely affected: test/features/transactions/tx_detail_linked_test.dart (repo.upcoming = true), tx_detail_link_rows_test.dart, recurring_link_test.dart, entry_sheet_test.dart; test/features/pending/pending_source_recurring_test.dart (expects PendingSource.upcoming); test/features/budgets/budgets_pages_test.dart (BudgetSource.upcoming, only if removed); test/features/recurring/recurring_pages_test.dart (?tab=upcoming, B's); test/ui/recurring_texts_test.dart.

### Order I would follow after the owner says "จัด"
D2 (when A1 lands) → D3 deletions (any time, once B says quick_create_sheet.dart is free) → D1 (needs A1 / A2 / the head piece; month stepping waits for C4, the rest of the hero can ship first with the stepper disabled).

## 2026-10-21 — 0.4.0-2: D3 cut the one-off upcoming + PendingSource recurring/upcoming, D2 fact icons, D1 goals list hero
DONE · analyze lib+test: no issues · tests NOT run (owner has not said go) · BE C4 not wired yet (stepper gated)
D3 (app side; safe before BE C1, unused JSON keys are ignored):
1. TransactionWriteResult: upcoming / isUpcoming gone. transactions_cubit.updateTransaction no longer drops the row; transaction_edit: no isUpcoming branch, TransactionEditOutcome.movedToUpcoming gone; notification_actions copy-update snackbar is always notifCopyUpdated.
2. transaction_detail_page: movedToUpcoming block + its snackbar gone, the unused router / navigator / messenger / back locals gone, DraftForm no longer gets upcomingHint; openRecurring has no '/recurring?tab=upcoming' fallback (it opens /recurring/{id} only when the tx has a link).
3. draft_form: upcomingHint, onUpcomingHintTap, _upcomingNote and both dateNote uses gone. quick_create_sheet: savedAsUpcoming, txSavedAsUpcoming and the upcomingHint arg gone (file handed to นายB). recurring_item_page.dart: ONE line removed (`upcomingHint: editing,`) so it compiles; B4 deletes that page.
4. PendingSource: recurring + upcoming removed, plus isRecurring and PendingTransaction.recurringRef (the wire values now parse to `other`). pending_page: the recurring chip icon, the recurring/upcoming labels and the saving row's recurring source chip are gone. BudgetSource.upcoming / bgSourceUpcoming kept (budgets still send "upcoming").
5. Tests touched so analyze passes: deleted test/features/pending/pending_source_recurring_test.dart (its subject is gone); removed the recurringRef expect in pending_saving_test.dart; removed the "date moved past today" test in tx_detail_linked_test.dart (fake `upcoming` fields left in tx_detail_linked_test / tx_detail_link_rows_test, harmless); added `String? month` to the two fake SavingGoalsRepository.list overrides (saving_goals_pages_test, quick_create_saving_mode_test).
D2: saving_goal_detail_page facts now carry icons: month saved = savings, still short = hourglass, should have = trendingUp, left / target = target, reached on = date; ongoing: month saved = savings, auto-save = recurring.
D1 (saving_goals_list_page.dart + cubit + repository):
6. Header = HeroSummaryHead(savings, "เงินออมทั้งหมด", MoneyText(savedTotal), actions: [ToolbarToggleButton]); the faint caption and the MoneyVisibilityToggle are gone from this page.
7. Content starts with [StepperPill.month | "แผนการออมเดือนนี้" (current) / "แผนการออม" (other months)], no divider, then the ring: centre "ออมแล้ว ฿x" + "จาก ฿plan"; facts: ยังขาดอีก (hourglass, warning only when > 0, shown only when there is a plan), ยังไม่จัดสรร › (wallet), เป้าหมาย (flag).
8. Month: SavingGoalsState.month (null = current), cubit.setMonth / resetMonth, repository list(month:) sends ?month=YYYY-MM only for another month. The page resets the month in dispose. Rows follow the month: "เดือนนี้" becomes the month name (new fpGoalsThisMonth; fpGoalsRowMonth / fpGoalsRowMonthOnly now take {month}); the "ควรมีตอนนี้" tick is hidden on other months.
9. GATE: `_monthStepping = false` in saving_goals_list_page.dart keeps the stepper locked to this month until นายC ships C4. When C4 lands: set it to true (delete the flag and the first/last args).
l10n added: fpGoalsThisMonth, fpGoalsPlanTitleNow, fpGoalsPlanTitle.
UNUSED now (for A18 cleanup): l10n txSavedAsUpcoming, txMovedToUpcoming, pendingSourceUpcoming, pendingSourceRecurring, quickUpcomingHintText, fpGoalsHeroCaption, fpM5GoalsMonthSaved (fpGoalsFactTotal is STILL used as the head label). The earlier backlog list still holds (fpGoalsListCaption, fpGoalsSpareLine, fpGoalsMonthShortLine, fpGoalsGroupShort/Done/NoPlan, fpGoalsOngoingRow, fpGoalsTargetSuffix, fpGoalsTileNeeded, fpGoalsTileShort). Classes: HeroFlowBox + HeroFlowSelection (replaced by A9), HeroCaption no longer used by this page; MoneyVisibilityToggle no longer used by this page.

## 2026-10-21 — D1 month stepper on (BE C4 landed)
DONE · files: saving_goals_list_page.dart · analyze lib/features/saving_goals + test/features/saving_goals: no issues · tests NOT run · BE not rebuilt (the owner orders it), so on the old BE `?month=` is ignored and a stepped month shows this month's numbers
- The `_monthStepping` gate and the first / last args are gone; StepperPill.month is unlimited. The cubit already sends ?month=YYYY-MM for another month and the page resets to this month on leave.
- Fields: nothing new to parse. month_plan / month_saved / month_short and summary.month_* already map to SavingGoal / SavingSummary; they now follow the stepped month. A closed goal has month_plan null: the row logic already treats null as "no plan" (SavingGoalPlan.of reads monthShort).
- Still app-side only: the pace tick and "ควรมีตอนนี้" bubble are hidden on other months; row wording uses the month name instead of "เดือนนี้".
- Not wired: GET /saving-goals/{id}?month= (the detail page keeps this month on purpose).

## 2026-10-21 — BE item 1: recurrence.Spec.Between (engine fast-forward)
DONE · files: chubi-pocket-be/internal/shared/recurrence/recurrence.go (+ Between, endCap, utcDay, dayDiff, ceilDiv), NEW recurrence_test.go · gofmt clean, `go build ./internal/shared/...` + `go vet ./internal/shared/recurrence/` clean · Go tests NOT run (owner rule) · `go build ./...` currently fails in modules/budgets (count.go: ItemRecurring undefined, countSQL type), which is another session's in-progress edit, not this change
`func (r *Spec) Between(from, to time.Time) []time.Time`: the occurrences d with from <= d <= to, inside the end, ascending, never nil.
- Equal to Within(to) filtered to [from, to]; arguments are cut to their UTC date (a time of day is ignored); d < StartDate is never returned.
- Fast-forward, no walk from the start and no 1000 cap: daily = ceil(days(start→from) / interval); weekly = the first week-block (interval weeks) whose Monday..Sunday reaches from; monthly = ceil(months(start→from) / interval) * interval; yearly = same on years. Cost is the window, not the age of the rule.
- End: `date` / `count` cut the window at GeneratedUntil (set by Limits / Build). A count end therefore still counts from the start after a jump. If a Spec skipped Limits (GeneratedUntil nil) it falls back to EndDate, or to the n-th occurrence computed from the start. `none` ignores GeneratedUntil (it is only a horizon). `dates` is filtered by the window.
- Interval < 1 is read as 1. A weekday listed twice in `weekdays` counts once (Occurrences would emit the date twice; Between does not).
Test (recurrence_test.go, NOT run): 26 schedules x their windows + a sweep of windows (offset -40..560 days, lengths 0 / 1 / 6 / 31 / 100 / 400, kept under 950 days so the reference stays under Occurrences' 1000 cap) comparing Between with Within filtered: daily 1 / 3, weekly default / weekdays / every 3 weeks / start long ago, monthly day 15 / 31 / start-day-31 every 3 / day before start day / 2nd Wed / last Fri every 2 / 5th Mon, yearly Feb 29 / every 3 / year boundary, dates (unsorted + duplicate), count end (weekly / monthly day 31 / daily / yearly Feb 29), date end (daily / monthly / weekly every 3), plus empty / edge cases, an interval 0 case, a 2015 daily start past the cap, and a count end without GeneratedUntil.

## 2026-10-21 — C6 part: design/api/api-document.md updated for the 0.4.0-2 BE changes (docs only)
DONE · file: chubi-pocket-docs/design/api/api-document.md (LF, as before) · docs only: no code, no openapi, no commits · sources: be.md (C4 + C5, C1, "C3 + C8 + C2 integration landed", plan v3 - v3.3 for the reasons), fe-e.md (C7 + readers), fe-b.md (occname + notifications)
Edited in place, same style (dated "Recent additions" paragraphs under the existing section order, pointing at openapi.yaml as the source of truth):
- TOC: row 11 renamed "Recurring" (it said "Scheduled Transactions (pending)").
- §03 Accounts: C7 (card `month_in` counts transfers IN, `total_income` of the account summary, effective balance).
- §04 Transactions: C1 future tx = plain tx (no `upcoming`, no FUTURE_DATE_NOT_ALLOWED, what stops counting at today, timezone note) + the tx delete hook (`skip_occurrence`); marks the 2026-10-13 note as superseded.
- §08 Budgets: C5 `tag_refs`; sources `future_tx` / `upcoming` (= unproduced occurrence only); `rule_id` / `slot` / `BudgetItemRecurring` with a nullable `item_id`; what counts as expected.
- §09 Saving Goals: C4 `?month=` on the list and the goal (fields, how `month_plan` is worked out, what is NOT month-aware).
- §11 Recurring: one new block with sub-sections: Model, Item states (table), Item JSON, Rule JSON and detail, Reads, Writes by slot (table) + bulk, Linking, Transaction delete hook, Rule edit (`also_update_tx`), Auto-create (C8), Occurrence names (C2 table, th + en), Readers (budgets / dashboard / me counts), Errors (table).
- §13 Notifications: `recurring_due` new link + `due_notified_until`, NEW `recurring_auto_created`.
- Status: version 0.8 + last updated 2026-10-20; the delete / archive matrix row for Recurring (an occurrence is skipped / restored by slot, never deleted).
Facts taken from the LANDED entry, not from the plans, where they differ: no `auto_create_since`, no `auto=true` filter, no `?sort=due` parameter, no `GET /recurring/{id}/occurrences/{slot}` (plans v3 - v3.3 mention them).
Checks I could not do: the openapi.yaml is นายB's and was not read, so field names are the ones written in the be.md entries; nothing was run against the BE.

## 2026-10-21 — api-document.md aligned with openapi.yaml (read-only on the yaml; docs only)
DONE · file: chubi-pocket-docs/design/api/api-document.md (§03 / §04 / §08 / §09 / §11 / §13 checked; §11 and one line of §13 edited) · no code, no yaml edits, no commits
Corrected against the yaml (the first pass had followed be.md):
- Rule delete param is `delete_linked_txs` (I had written `delete_linked`); result `{id, deleted_transaction_count, account_balances}`; the N is `delete_preview.linked_transactions` (`GET /recurring/{id}?include=delete_preview` = `{items, linked_transactions, pending_drafts}`).
- Stored-item delete param is `delete_linked_tx` → `{id, transaction_id, account_balances, setting}`; `PUT /recurring-items/{id}` answers `RecurringItemsWriteResult {items, account_balances, setting}`, `POST /recurring-items` 201 `RecurringItemWriteResult` (requires recurring_id, date, type, amount); archive / restore by id = skip / un-skip.
- `GET /recurring/{id}` is NOT flat: `RecurringDetail {recurring, items, upcoming, stats, tx_update, account_balances, delete_preview}`; `recorded_tx_count` sits on `recurring`; every rule write answers the same shape; `tx_update.failed[].reason` = not_found | account_archived | transfer | refused.
- `GET /recurring` params (`status` current|archived|all, `for_type`, `kind`, `category_id`, `amount`, `q`) and its `{data, counts {current, archived, all}, summary, pagination}` answer; rule rows also carry `saved_count`, `pending_count`.
- unlink answers `RecurringUnlinkResult {item, setting}` (400 when there is no transaction); link 400 on a type mismatch; `unmark-paid` / `restore` = "back to due / upcoming by its date"; confirm / edit 404 when the slot is not an occurrence; `extend` body `{end}`; `kind` filter of `/recurring-items` is `all | recurring`.
- Rule life cycle written down (pause / resume / archive / restore / duplicate, 409 `INVALID_TRANSITION`); error table gained INVALID_TRANSITION, NOT_FOUND, INVALID_RULE / END_TOO_FAR.
- `tracked_from` and `due_notified_until` are internal (not in the API): reworded.
Added the owner decision from นายA: on resume the due occurrences from before the pause stay due and the paused gap counts as skipped. The doc says so next to the current-build behaviour (yaml: `resumeRecurring` still says `tracked_from` = today); when นายC lands it, the yaml text and this paragraph change together.
Matched with no change: §04 `skip_occurrence` + `recurring_item_id`; §08 BudgetItem (`tag_refs`, `rule_id`, `slot`, `recurring` = BudgetItemRecurring, sources incl. `future_tx`) and the `source` filter; §09 `month` on the list and the goal; §13 NotificationType text (recurring_due deep link, recurring_auto_created quiet notice); `me/counts.recurring` {active_count, upcoming_count, due_count, needs_amount_count}.
Left alone in the yaml (not mine to edit): `getMeCounts` says due_count / needs_amount_count are 0 "until the occurrences are computed (recurring v3)", which is stale now that the readers are wired.
