## 2026-10-12 — FE-C: Debts rework (0.3.1-10), Phase 0 PROPOSAL (rev 2, owner answers applied)
PROPOSAL ONLY · read-only, no code touched · analyze/test: n/a
Sources read: decisions.md (incl. "Debts model answers"), backlog.md, api-audit, hub code (lib/ui, lib/hub), openapi.yaml + Go modules (debts / transactions / notifications), lib/features/personal_debts, every debt touchpoint outside it.
Rev 2 changes vs rev 1: no cancel; lend + repay = ONE signed person entry; one people list; single currency; repayments editable. B1–B7 are superseded by the new model (Lead, no re-survey).

**ASSUMPTION TO CONFIRM — single currency.** The owner is leaning to one currency app-wide (not confirmed). This proposal assumes it: no per-currency net, no "+n สกุล" chip, no currency field in the debt form, one `net` number. If it stays multi-currency, §1 / §3 get a `balances[]` back (rev 1 has that shape).

---

## 0. The model, as the FE will implement it
- **Person ledger entry** = one record `{person, signed amount, date, description, note, wallet?, source?, paid label}`.
  - **Sign = my money flow:** `+` = I paid out to / for them (lend, repay what I owe, a split I paid); `−` = money came to me from them (borrow, they repay me, a split someone else paid).
  - Lending and repaying are the SAME function. The BE stores only +/−.
  - With a wallet chosen the BE also writes the wallet transaction (`+` = expense, `−` = income). Without a wallet it is a pure ledger entry (splits create those).
- **Net per person** = Σ entries (+ = they owe me, − = I owe them). It can flip sign freely (overpaid is just the other side). One number.
- **"Paid" label** = a label on an entry. It never changes any number. No cancel. Stop counting = delete (confirm dialog).
- **Person key** = `c:<contact_id>` or `n:<lower name>` (what the BE groups by today), URL-encoded in paths.
- The FE shows what the BE sends. No `listAll`, no `DebtPerson.group`, no `outstanding` / `settledAmount` / `isOverpaid` maths, no all-debts cache. `PersonalDebtsCubit` (holds every debt) goes away.

## 1. Pages

### 1.1 People list `/personal-debts` — ONE list (ติดคุณ and คุณติด together)
**Layout:** `ListPageBody` (template), header pinned:
- `SummaryStats` (net + ติดคุณ / คุณติด; a tap on a box filters the one list)
- `ListToolbar` (NEW): search + a "ทั้งหมด" toggle chip (default: only people with something open)
- body: `PersonBalanceRow` (NEW domain) per person, paged; then `AddTile` "ให้ยืม / บันทึกรายการ" at the end (opens the entry sheet, §1.4). Empty → `EmptyView`; filter with no match → no-match `EmptyView`.

**Row:** `PersonMark` (typed 👤 / contact icon / linked icon + 🔗, `reserveLinkSlot`), name = `person.name` (live; nickname rule from the BE), sub "ค้าง n รายการ", trailing = `NetBalance` (NEW small domain piece: the amount tinted + caption ติดคุณ / คุณติด / หายกัน).

**API flow:** open = **1 call** `GET /personal-debts/people?page=1&per_page=30`. Search / filter / next page = 1 call each (server side, debounced). Pull-to-refresh = the same call. No `/contacts` load (icons come from `person.icon_code`).

### 1.2 Person page `/personal-debts/people/:key` (path param, not query)
**Layout:** NEW template `TabbedDetailBody` (hero scrolls away, tab bar pinned, each tab its own lazy list) + `CompactHeroScope`.
- hero `HeaderCard`: leading `PersonMark` (52), title = name (never changes), `topRow` chip "ผูกผู้ติดต่อ" when linked, trailing `AppIconButton` → contact page (only with `contact_id`); footer = `NetBalance` (large). No ✏️ (nothing to edit on a person; that lives on the contact).
- **ONE primary button under the hero**, label follows the state: net = 0 → "ให้ยืม"; net > 0 → "รับคืน"; net < 0 → "จ่ายคืน". It opens the entry sheet with the sign preset to that action (net > 0 → `−`, net < 0 → `+`, net 0 → `+`). The user can flip it by typing a minus (§1.4).
- typed-name person only: `SectionCard` + `DetailRow` "ผูกกับผู้ติดต่อ" (absorb flow stays; afterwards `pushReplacement` to the new key from the response).
- `AppTabBar` + `AppTabPager` (already used by account_detail):
  - **"รายการหนี้"** (default): a timeline of all entries, day-grouped (`DateGroupHeader`), rows = `LedgerRow` (NEW domain). `ListToolbar`: search, filter chips (ทิศทาง: ฉันจ่าย / เขาจ่าย, สถานะ: ค้าง / จ่ายแล้ว), `SortChip` (ใหม่สุด / เก่าสุด / จำนวนมาก / น้อย). With a search / filter / sort active the list shows **entries only, no day interleave rules change** (it's the same list filtered; the backlog's "debts only" rule collapses because debts and repayments are the same record now, see Q1).
  - **"ประวัติการจ่าย"**: only entries that moved money (have a wallet transaction); `LedgerRow` with the wallet mini chip; `ListToolbar` (search, wallet filter, sort). Loaded on the tab's first open.
- row tap → `/personal-debts/:id` (the entry); the wallet chip / "ดูรายการ" row inside opens `/transactions/:id`.

**`LedgerRow`:** icon by sign, title = description ?? "ฉันจ่ายให้ {name}" (`+`) / "{name} จ่ายให้ฉัน" (`−`), sub = date · wallet mini chip (if any) · "จ่ายแล้ว" mini chip (if labelled), amount tinted by sign. Never shows a category (so no English system names).

**API flow:** open = **1 call** `GET /personal-debts/people/{key}` → `{person, net, counts, items[] (page 1, kind=all), pagination}`. Tab 2 first open = 1 call `GET …/entries?money=true`. Search / filter / sort / page = 1 call each. A cold deep link needs only the key.

### 1.3 Entry detail `/personal-debts/:id` (the old "debt detail")
`DetailPageBody` + `EditModeMixin` (detail standard).
- hero `HeaderCard`: leading `PersonMark`, title = description ?? "ฉันจ่ายให้ {name}" / "{name} จ่ายให้ฉัน" (never changes), `topRow`: "จ่ายแล้ว" chip when labelled (control 32), ✏️ `onEdit`; footer = the signed amount, tinted by sign. **No** outstanding / progress bar / overpaid / settle button / cancel.
- `SectionCard` "รายละเอียด": จำนวนเงิน (signed; typing a minus flips it) · วันที่ · บุคคล (`DetailRow ›` → person page; in edit mode a picker for manual entries) · กระเป๋า (`›` → the transaction, when there is one; a picker in edit mode) · แหล่งที่มา (`›` to the tx / event when split-sourced) · คำอธิบาย · โน้ต (always shown, long-press edits).
- `SectionCard` "สถานะ": `DetailRow` "จ่ายแล้ว" + `AppSwitch` (works in view mode, 1 call); helper "เป็นแค่ป้ายกำกับ ยอดสุทธิไม่เปลี่ยน ถ้าไม่ต้องการนับให้ลบรายการ".
- `DetailRow ›` "ดูรายการทั้งหมดกับ {name}" → person page. `DetailMeta` at the bottom.
- manage (edit mode only): `DangerRow` delete (red). No archive (delete-only entity), no cancel. Delete = confirm dialog; the body says whether the wallet transaction goes too (Q2).
- **split-sourced entries:** only description / note / paid label editable; amount / person / date / wallet show 🔒 with helper "แก้ได้ที่รายการต้นทาง".
- **Repayments are editable:** an entry with a transaction edits amount / date / wallet / description / note here AND from tx detail (same record).

**API flow:** open = **1 call** `GET /personal-debts/{id}` (`person`, `source{kind,id,title}`, `transaction{id,account}?`); a deleted id → clean `404 NOT_FOUND` → the not-found view. Save = `PUT` (returns entry + `person_balance`); label = `PUT {paid}`; delete = `DELETE` (returns `person_balance`).

### 1.4 Entry form → a `FormSheet` ("ให้ยืม / รับคืน / จ่ายคืน" in one)
`FormSheet` (pinned ยกเลิก / บันทึก, saving overlay, **dirty discard guard**) via `showAppSheetCustom`, from the list `AddTile` and the person page button. The SAME field set (`PersonEntryFields`, NEW domain piece) is embedded in quick-create debt mode (§1.5).
- **Amount:** `AmountInput` with `allowNegative` (already exists). A live one-line meaning under it, local (instant feedback while typing):
  - net 0: `+` → "ให้ยืม {name}" · `−` → "ยืมจาก {name}"
  - net > 0 (they owe me): `−` → "รับคืนจาก {name}" · `+` → "ให้ยืมเพิ่ม"
  - net < 0 (I owe them): `+` → "จ่ายคืน {name}" · `−` → "ยืมเพิ่ม"
  - a negative typed amount is accepted, never rejected
  - quick fill "ทั้งหมด" = the amount that brings the net to 0 (sign included); "ครึ่งหนึ่ง"
- person `PickCard` (the existing contact picker; typed names stay typed; preset from the person page), wallet card (optional, "ไม่ผูกกระเป๋า" allowed → a pure ledger entry), date, คำอธิบาย, โน้ต.
- optional collapsible "ทำเครื่องหมายรายการที่จ่ายครบ" (default closed): multi-select of the person's entries not yet labelled paid (`ListRow` `checked`, `SelectAllCount`).
- Save = **1 call** `POST /personal-debts/people/{key}/entries` → entry + `transaction?` + `person_balance` + wallet balances (patch accounts, no `accounts.load()`). Sheet pops; the list / person page patch from the result; snackbar "บันทึกแล้ว". For a brand-new typed name the key is `n:<name>` (no separate create endpoint).
- Currency: none (single currency).

### 1.5 Quick-create debt mode (the transactions feature owns the sheet; I give the spec)
- `SegmentedChips` (NEW molecule): [รายการ] [หนี้]. Debt mode swaps the body to `PersonEntryFields` (amount hero + wallet card as today); person `PickCard` → `PickerSheet` of `PersonBalanceRow` (people with something open + search, plus the typed / new-contact route); preset when opened from a debts page (net sign picks the preset sign).
- Save = the same single `POST …/entries`.
- Centre `+` colour follows the debts module token (`AppModules.debts`) on every debts page; the shell passes the person preset to the sheet. (Shell / router edits = kit owner; I'll ask Lead for the grant.)

### 1.6 Touchpoints that change (outside my pages)
- **Tx detail:** the repayment banner becomes `DetailRow ›` "ดูรายการกับ {name}" → person page; repayments are EDITABLE (drop the lock in `tx_rules`); splits show amount only (drop `remaining` / `settledAmount`); "ดูหนี้" links go to the person page by key; delete of a person-linked tx asks the same confirm as the entry.
- **Contact detail:** the "debts with this person" tile → `/personal-debts/people/c:<id>`.
- **Notifications:** the "อัปเดตตาม" bug fixed (§6). The `split_paid` "บันทึกรับเงิน" branch removed (no notification on pay / receive).
- **Home tile + More tile:** one net, from the same BE rule; one wording set (ติดคุณ / คุณติด).
- **Router:** `/personal-debts/people/:key` replaces `/personal-debts/person?contact&name`; `cross_tab_links_test` updated.

## 2. New shared pieces (FE-A builds; hub page first, owner reviews, then I migrate)
| # | Name | Level | Why |
|---|---|---|---|
| 1 | `ListPageBody.builder` (+ load-more footer, controller, `onLoadMore` / `hasMore` / `loadingMore`, error-retry) | template | the template is eager with no paging; every paged list needs it (FE-D / FE-E too) |
| 2 | `TabbedDetailBody` | template | hero + pinned tab bar + per-tab lazy lists; tabs are hand-wired in 3 pages today. Gallery "รายละเอียด" first |
| 3 | `ListToolbar` (+ `SortChip<T>`) | molecule | search + filter chips + sort in one piece |
| 4 | `SegmentedChips<T>` | molecule | the [รายการ] [หนี้] switch; no generic single-select chips exist |
| 5 | `PersonBalanceRow` | domain | people row (list + picker) |
| 6 | `LedgerRow` | domain | timeline / history row, signed |
| 7 | `NetBalance` | domain/money | tinted net amount + caption ติดคุณ / คุณติด / หายกัน (row, hero, tiles) |
| 8 | `PersonEntryFields` | domain | the signed-entry field set with the live meaning line; used by the debts sheet AND quick create |

Small extensions: `SummaryStats` gets `selected` / `onTap`; `AppInput.search` gets an optional `debounce`.
Overlap to check with FE-D / FE-E: pieces 1 and 3 (paged lists, search + filter + sort) probably help events / budgets too.

## 3. API asks for the BE (breaking changes OK, forced update)
1. **`GET /personal-debts/people`** — one list; `page`, `per_page`, `q`, `all=true`; row `{key, person: PersonRef, net, open_count, last_activity_at}`; header `{total_owed_to_me, total_i_owe, net}`. Default hides people with nothing open (open = net ≠ 0 or any entry not labelled paid, Q3).
2. **`GET /personal-debts/people/{key}`** — `{person, net, counts{entries, money}, items[], pagination}`; works for typed names; `items` = the first page of entries (`kind=all`), same item shape as #3.
3. **`GET /personal-debts/people/{key}/entries`** — paged; `q`, `sort` (date_desc|date_asc|amount_desc|amount_asc), `direction` (`out` = +, `in` = −), `paid` (true|false), `money=true` (only entries with a transaction), `account_id`, `from`, `to`. Item `{id, amount (signed), date, description, paid, source?, transaction{id, account{id,name,icon}}?}`. Also feeds the "mark paid" list (`paid=false`).
4. **`POST /personal-debts/people/{key}/entries`** — the ONE write: `{amount (signed, ≠ 0), account_id?, date?, description?, note?, mark_paid_ids?[]}`. A wallet → the BE writes the tx (`+` expense, `−` income); none → a ledger-only entry. Returns `{entry, transaction?, person_balance, account_balances}`. Retires `POST /personal-debts`, `POST /{id}/settle`, `settled_amount`, `source_personal_debt_id`.
5. **`GET / PUT / DELETE /personal-debts/{id}`** — `GET` page-ready (`person`, `source`, `transaction?`; no `settled_amount` / `outstanding` / `currency`); a missing id → `404 NOT_FOUND`. `PUT` = amount / date / account / description / note / person / `paid` for manual entries; split-sourced → description / note / `paid` only (`409 ENTRY_MANAGED_BY_SPLIT` otherwise); an entry with a tx edits that tx (one record). `DELETE` removes the entry (and its tx, Q2). Both return `person_balance`. `cancel` retired.
6. **Transactions:** `Transaction` gets `counterparty: {key, person}` (replaces `is_repayment` heuristics); `PUT` / `DELETE` of a person-linked tx act on the entry too and return `person_balance`; `SplitRef` gets `person.key`, drops `settled_amount`.
7. **Dashboard + More tile:** the debts tile uses the same net (one source, one rule).
8. **Notifications:** retire `split_paid`; `split_changed` apply returns `person_balance` (the apply path is right on the BE; the bug is FE-only).

`person_balance` = `{key, person, net, open_count}`: after any write the FE patches the open page / list row from it and never re-fetches.

## 4. New Thai strings (keys only; I do not touch the arb)
- Tabs / sort / filter: `debtsTabEntries` "รายการหนี้" · `debtsTabMoney` "ประวัติการจ่าย" · `debtsSortLabel` "เรียง" · `debtsSortNewest` "ใหม่สุด" · `debtsSortOldest` "เก่าสุด" · `debtsSortAmountDesc` "จำนวนมากสุด" · `debtsSortAmountAsc` "จำนวนน้อยสุด" · `debtsFilterDirection` "ทิศทาง" · `debtsFilterOut` "ฉันจ่าย" · `debtsFilterIn` "เขาจ่าย" · `debtsFilterPaid` "สถานะ" · `debtsFilterWallet` "กระเป๋า" · `debtsShowAll` "ทั้งหมด"
- Rows / empty: `debtsOpenCountSub` "ค้าง {n} รายการ" · `debtsTimelineEmpty` "ยังไม่มีรายการ" · `debtsMoneyEmpty` "ยังไม่มีประวัติการจ่าย" · `debtsPaidChip` "จ่ายแล้ว" · `debtEntryOut` "ฉันจ่ายให้ {name}" · `debtEntryIn` "{name} จ่ายให้ฉัน"
- Person page button (follows the state): `debtsActionLend` "ให้ยืม" · `debtsActionReceive` "รับคืน" · `debtsActionRepay` "จ่ายคืน" · `debtsSeeAllWith` "ดูรายการทั้งหมดกับ {name}"
- Entry sheet live meaning: `debtMeanLend` "ให้ยืม {name}" · `debtMeanBorrow` "ยืมจาก {name}" · `debtMeanReceive` "รับคืนจาก {name}" · `debtMeanRepay` "จ่ายคืน {name}" · `debtMeanLendMore` "ให้ยืมเพิ่ม" · `debtMeanBorrowMore` "ยืมเพิ่ม" · `debtEntrySheetTitle` "บันทึกรายการกับ {name}" · `debtEntryMarkPaidSection` "ทำเครื่องหมายรายการที่จ่ายครบ" · `debtEntryMarkPaidHint` "ไม่บังคับ" · `debtEntrySaved` "บันทึกแล้ว"
- Entry detail: `debtMarkPaid` "จ่ายแล้ว" · `debtMarkPaidHelper` "เป็นแค่ป้ายกำกับ ยอดสุทธิไม่เปลี่ยน ถ้าไม่ต้องการนับให้ลบรายการ" · `debtLockedBySource` "แก้ได้ที่รายการต้นทาง" · `debtDeleteBodyV2` "ลบแล้วจะไม่นับรายการนี้" · `debtDeleteBodyWithTx` "ลบแล้วจะไม่นับรายการนี้ และลบรายการในกระเป๋าด้วย" · `debtWalletRow` "กระเป๋า" · `debtDateRow` "วันที่"
- Quick create: `txModeTransaction` "รายการ" · `txModeDebt` "หนี้" · `txDebtPerson` "คนที่เกี่ยวข้อง" · `txDebtNoOpenPeople` "ตอนนี้ไม่มีใครค้างอยู่"
- Tx detail: `txDetailEntryWith` "ดูรายการกับ {name}"
- Kit: `commonLoadMore` "โหลดเพิ่ม" · `commonLoadMoreFailed` "โหลดเพิ่มไม่สำเร็จ แตะเพื่อลองใหม่"
- Left in place, unused: `debtSettled` / `debtOutstanding` / `debtProgress` / `debtReceive` / `debtPay` / `debtSettle*` / `debtCancel*` / `debtOverpaid*` / `debtAmountBelowSettled` / `debtDirection*` / `debtsOpenCount` / `debtsStatus*`.
- One wording set: ติดคุณ / คุณติด (net captions) on the More tile, home tile, list, hero (reuse `debtsOwedToMe` / `debtsIOwe`).

## 5. Calls per page (before → after)
| Page | Before | After |
|---|---|---|
| People list | 1+⌈N/100⌉ every visit + /contacts | 1 (+1 per scroll page) |
| Person page | 0 or ⌈N/100⌉ (cold) | 1 (+1 first open of tab 2) |
| Entry detail | 0 / 1 (+ contacts cache) | 1 |
| Lend / repay / borrow (save) | create or settle + list refetch + `bookChanged` + `accounts.load()` | 1 (patch wallets + net from the response) |
| Paid label | settle flow | 1 (`PUT paid`) |

## 6. What this closes
- **"อัปเดตตาม" URL bug** (`personal_debts_repository.dart:99`, `'…split-changes//apply'` never interpolates the id): a one-line FE fix; the BE route is fine. It is on prod now: I can ship it ahead of the rework if Lead says.
- **Overpaid edit blocked**, "ค้างอยู่" on a settled debt, cancelled showing คงค้าง: gone (`settled_amount` / `outstanding` / cancel retired; net can flip).
- **Mixed currencies summed:** gone with single currency (flagged assumption).
- **Stale caches:** no all-debts cache; each page fetches on open and patches from the write response; no `contacts.load()` on every visit.
- **QA 2026-10-11 (all 9):** save-as-contact no-op → control removed (typed names stay typed; linking = the person page row) · generic error on a deleted-debt URL → `404` + not-found view · cancelled showing คงค้าง → cancel retired · delete leaving repayments → entry and tx are one record, delete covers both (Q2) · English "Debt Received/Paid" → entry rows never show the category · ติด wording → one key set · URL not following pushed pages → path-key routes · no discard prompt → `FormSheet` dirty guard · "ลบหนี้นี้" below the fold → the standard manage section.
- **Audit items:** debts list 1+⌈N/100⌉ → 1; person page ⌈N/100⌉ → 1; snapshot names → live `PersonRef`; the unused `counterparty_contact_id` filter / `/people` replaced by the new endpoints.
- **B1–B7:** superseded by the new model.
- Not covered: scheduled-detail "not found" (the scheduled round).

## 7. Questions (left after the owner's answers)
1. **Reading of "one function":** debts and repayments become ONE record type (a signed entry), so the old "debts vs repayment txs" split becomes tab 1 = all entries, tab 2 = entries that moved wallet money. A wallet is optional (no wallet = a pure ledger entry, as a split creates). Is that the intent? *Recommend: yes.*
2. **Delete of an entry that has a wallet transaction:** delete both (one record, dialog says so; deleting the tx from tx detail also removes the entry), or keep the tx? *Recommend: delete both.*
3. **"Nothing open":** hide a person when net = 0 AND every entry is labelled paid; a "ทั้งหมด" chip still reveals them (the earlier decision). OK to keep that chip, and that a person with net ≠ 0 is never hidden by a paid label?
4. **Sign convention in the UI:** the field is signed by my money flow (`+` I paid out, `−` I received), with the live meaning line under it and the button presetting the sign. OK, or should there be an explicit direction toggle next to the amount?
5. **Single currency** (flagged above): confirm, or I keep `currency` / per-currency net in the BE contract.

## 8. Plan once approved (to size it)
1. Pieces 1–8 + the two extensions in the hub (FE-A), in parallel with the BE work in §3.
2. Me: new data layer (people / person / entry cubits, repository), then list, person page, entry detail, entry sheet; delete `PersonalDebtsCubit`, `DebtPerson`, `DebtTile`, `showSettleDebtSheet`, the settle / cancel code.
3. Quick-create debt mode + tx detail / contact / notification / home / More touchpoints need a grant for files I don't own (`quick_create_sheet.dart`, `transaction_detail_page.dart`, `tx_rules.dart`, router, shell, notifications).
4. Tests: replace the debt tests with people / person / entry flows; keep `cross_tab_links_test` green.
Files I would own: `lib/features/personal_debts/**` (rewrite), the debts routes in `app_router.dart` (grant), the l10n appends.

---

## 2026-10-12 — FE-C: API v2 adoption (tx / quick create / home + minimal debts), EDIT PLAN
PLAN ONLY · read-only until BE (chubi-pocket-bc) pings that the transactions + dashboard modules landed. Spec read: openapi `0.3.1-9-draft2`; flows: `lib/hub/api/page_flows.dart`.

### Target shapes (spec) that drive the edits
- One `Transaction` shape everywhere (list row, detail, write rows, dashboard `recent`): `account: AccountRef|null`, `category: CategoryRef|null` (icon_code, `is_system`, `system_kind`, `parent_id`), `project: EventRef|null`, `tags: TagRef[]`, `transfer_peer {id, direction, account}`, `is_repayment`, `source_personal_debt_id`, `my_share`, `splits` (null on list rows; `Split {debt_id, person: PersonRef, person_name, direction, amount, settled_amount, status}` on detail/write), flags `can_split / can_edit_splits / can_join_event / is_locked / can_edit_category`, `created_by`.
- Gone from the row: `category_render`, `is_recurring`, `is_resolve` (→ `is_repayment`), `account_balance_after`, bare `EmbeddedRef`.
- Writes: `POST/PUT /transactions` → `{rows[], account_balances[]}` (transfer = 2 rows, OUT first); `tag_ids` on create + update; `DELETE` → `{id, account_balances}`; `PUT /{id}/tags` replaces (returns the Transaction; POST/DELETE tag routes REMOVED); `PUT /{id}/splits` returns the Transaction.
- `GET /transactions/form-options` → `{accounts(+balance,is_default), default_account_id, categories(flat, depth, parent_name), tags, events, fee_category_id}`; contacts only when the split editor opens.
- `GET /dashboard`: `recent` full rows, `top_categories[] = {category: CategoryRef|null, expense, count}`, `pending {total, items}`, `attention {total, items}`, `badges {unread_notifications, pending_drafts}`; `net_worth / summary / trend / upcoming / budgets / debts / saving_goals` typed only as "unchanged" objects.

### Edit groups (disjoint file sets, so sub-agents can run in parallel after the BE ping)
1. **Models** — `transactions/domain/transaction.dart` (+ new `transactions/domain/refs.dart`: `AccountRef`, `CategoryRef`, `EventRef`, `TagRef`, `PersonRef`, `TransferPeer`, `WalletBalance`; `TransactionWriteResult`, `DeleteTransactionResult`; `TxSplit.person`), `home/domain/dashboard.dart` (`CategorySlice` → `CategoryRef`, `recent`, `pending`, `attention`, `badges`). Delete `CategoryRender`, `EmbeddedRef`, `is_recurring`, `account_balance_after`.
2. **Data layer** — `transactions_repository.dart`, `transactions_cubit.dart`: `create/update` return `TransactionWriteResult`; `tag_ids` in the create/update bodies (drop `attachTags` / `detachTag` / the follow-up GET); `setTags` = `PUT /tags`; `remove` returns balances; new `getFormOptions`; the cubit patches rows from `rows[]` (no `refreshOne` after our own write), and `bookChanged` stays only for cross-list cases. Wallet balances: `AccountsCubit.patchBalances(account_balances)` from every write response (never `accounts.load()`).
3. **List + tile** — `transaction_tile.dart` (icon = `tx.category.iconCode` with its own icon, name via `system_kind` → localized key, wallet icon = `tx.account.iconCode`; no `CategoriesCubit` / `AccountsCubit` / `CategoryTree.resolveIconCode`), `transactions_list_page.dart` (drop `CategoriesCubit.byId` for the drill-down filter and `TagsCubit.loadIfNeeded`; the filter sheet takes options from form-options, lazily), `tx_list_filters.dart`, `tx_filter_sheet.dart`.
4. **Detail + edit + splits** — `transaction_detail_page.dart`: one `GET /:id` on open (no list fetch to find the row, no twin lookup: `transfer_peer`; `isSystem` = `category.is_system`; repayment = `is_repayment` / `system_kind`; split people from `split.person` via `PersonMark`, no `ContactsCubit` on open; contacts only when the split editor opens), `transaction_edit.dart` (one update call carries `tag_ids`; splits via `PUT /splits`, the response replaces the row), `splits_section.dart` (looks from `PersonRef`; the contacts list only for the picker), `tx_rules.dart`, `tx_compact_hero.dart`.
5. **Quick create + draft form** — `quick_create_sheet.dart`, `draft_form.dart`, `draft_form_event.dart`, `draft_form_scheduled.dart`, `pick_chip_rows.dart`: pickers fed by ONE `getTransactionFormOptions` (a small `TxFormOptionsCubit`, loaded on sheet open; defaults from `default_account_id`, fee category from `fee_category_id`, events from `events`), save = `POST` with `tag_ids` + `splits` (1 call, patch balances from the response). Draft rehydration keeps working from refs. Note: `draft_form*` is shared with pending and scheduled (other owners): I only change how options are sourced and keep their public constructors; I will tell FE-E / the pending owner before editing.
6. **Home** — `home_page.dart`, `dashboard_cubit.dart`: open = 1 `getDashboard`; remove the `AccountsCubit` / `CategoriesCubit` `loadIfNeeded` (:85-86) and the pending-title cache join (:1248, use `pending.items[].resolved`); pull-to-refresh = that one call (drop the `NotificationsInboxCubit.load()` / `PendingCubit.load()` pair); badges from `badges` (I will seed the badge / pending cubits from it only if their owner agrees; otherwise leave them and flag).
7. **Debts, MINIMAL** — `personal_debt.dart` (read `person: PersonRef` on debts / people rows, `counterpartyPersonName` = `person.name`), `debt_widgets.dart` (`DebtAvatar` takes the `PersonRef` icon, no `ContactsCubit` join; settle writes use `account_balances` instead of `accounts.load()`), the debts pages (rename only), and the one-line "อัปเดตตาม" URL fix (`personal_debts_repository.dart:99`, interpolate the notification id). No redesign.
8. **Tests / hub** — update the `Transaction.fromJson` fixtures (`event_pick`, `transactions_cubit_placement`, `transactions_cubit_splits`, `tx_list_redesign`, `tx_rules` tests); add tests for tile resolution from refs, `TransactionWriteResult` parsing, dashboard parsing; keep `test/hub/page_flows_test.dart` green (every endpoint the app calls is in a flow; the removed tag routes leave the baseline).

### Open points (will ask BE / owners, not Lead)
- Dashboard blocks typed "unchanged" (`debts`, `budgets`, `upcoming`, `saving_goals`, `net_worth`): I keep the current parsers unless BE changes them; BE to confirm.
- `settle` / event bills return `account_balances` via `WriteBalancesTouch` (not read yet): confirm the key names match `WalletBalance`.
- Shared refs file is used by other FEs' pages (events, budgets, goals): I own `transactions/domain/refs.dart`, they import it.
- `AccountsCubit.patchBalances` + the pending / badge cubits are not mine: ask their owners if the signature needs to change.

---

## 2026-10-12 — FE-C: API v2 adoption (tx / quick create / home) + minimal debts
DONE · analyze: No issues · `flutter test`: 412 passed (full suite, once at the end) · not run in the app (owner runs it); needs the BE rebuilt (DevOps) to try it.

**Files (lib/features/…)**
- transactions/domain: NEW `refs.dart` (AccountRef, EmbeddedCategory, EventRef, EmbeddedPerson, TransferPeer, WalletBalance), NEW `form_options.dart` (TxFormOptions), `transaction.dart` (embedded refs; `TransactionWriteResult`, `DeleteTransactionResult`, `TxSplit.person`; removed category_render / is_recurring / is_resolve / account_balance_after).
- transactions/data + cubit: `transactions_repository.dart` (create / update carry `tag_ids`, `setTags` = PUT, delete returns balances, `formOptions()`; attach/detach tag routes gone), `transactions_cubit.dart` (one-call add / update / remove; new `patchRow`; `refreshOne` returns the row; `TagsAttachFailed` gone), NEW `tx_form_options_cubit.dart`.
- transactions/presentation: `transaction_tile.dart`, `transactions_list_page.dart`, `tx_filter_sheet.dart` (no cache joins; filter sheet loads form-options when it opens), `transaction_detail_page.dart` (open = 1 GET /:id; twin from `transfer_peer`; system / repayment from the category ref + `is_repayment`; split people from `split.person`), `transaction_edit.dart` (1 PUT with tag_ids; splits row patched, no GET), `splits_section.dart`, `tx_rules.dart`, `quick_create_sheet.dart`, `draft_form.dart`, `pick_chip_rows.dart`, `event_pick.dart`.
- home: `dashboard.dart` (`pending`, `attention`, `badges`, `CategorySlice` from `category` ref), `home_page.dart` (Home = 1 call, see below). Additive seeds: `PendingCubit.setKnownTotal`, `NotificationsInboxCubit.seed`.
- personal_debts (minimal): `personal_debt.dart` (`person: EmbeddedPerson` replaces `counterparty_person_name`, which the BE no longer returns; PersonRow likewise), `personal_debts_repository.dart` ("อัปเดตตาม" URL now interpolates the notification id; settle reads `account_balances`), cubit `settle` returns balances, `debt_widgets.dart` (DebtAvatar takes the person's icon, no ContactsCubit; settle patches wallets, no `accounts.load()`; unused import gone), pages renamed to the new fields, `personal_debt_form_page.dart` (CurrencyTile removed: the debt uses the profile currency).
- hub (compile fixes only): `templates_transaction_detail_page.dart`, `domain_others_page.dart`. The page_flows baseline already has the apply path; hub tests pass.
- tests: fixtures updated + new `transaction_v2_model_test.dart`, `transaction_tile_refs_test.dart`, `tx_form_options_cubit_test.dart`.

**Calls now**
- Transactions list open: 1 (GET /transactions). Filter sheet: +1 (form-options) only when opened.
- Transaction detail open: 1 (GET /:id). Save: 1 PUT (+1 PUT /splits only when splits changed). Delete: 1. Wallets patched from `account_balances`.
- Quick create open (new transaction AND draft edit): 1 (form-options; prefill from it + the draft's own `resolved` refs). Save: 1 POST (tags + splits inside).
- Home open: 1 (GET /dashboard). No accounts / categories / pending / inbox loads. Drafts block + "ต้องจัดการ" read the dashboard payload; the inbox cubit rows act on is seeded from `attention`; bell + drafts badge patched from `badges`; a badge change marks the dashboard stale instead of reloading the inbox.

**Deviations / still open**
- Name clash: spec `CategoryRef` / `PersonRef` already exist in the app (categories + ui), so mine are `EmbeddedCategory` / `EmbeddedPerson`.
- Still on the old caches (by design for now): scheduled form + scheduled prefill, event-mode rows, pending page, the detail page's edit mode (merges the options cubit with the row's own refs), the full tag picker ("more"), the event picker subtitle (EventRef has no members / dates).
- Reloads that remain because the response has no balances: event bill save (`projects.quickCreate / addBills`) and pending submit paths call `accounts.load()`; BE could add `account_balances` (`WriteBalancesTouch`) there.
- Detail page keeps `debtsCubit.load()` after deleting a repayment (debts list is its own cache).
- Dashboard drill-down: `app_router.dart` passes only `category=<id>`; the list page falls back to the first row's category name. TODO(router): pass `initialCategoryName` / `initialCategoryType` (kit owner).
- Transfer tags on an incoming row: the form takes tags from the row it opened; correct only if BE returns the same tags on both rows (please confirm with BE).
- `dart format` was run over `lib/features/transactions/presentation` (format-only changes in a few files I did not otherwise touch).

---

## 2026-10-12 — FE-DEBT: Debts rework (0.3.1-10), rev 3 (owner answers 2026-10-12 applied)
PROPOSAL DELTA · only what changed vs rev 2. Everything not listed here stands.

**Model**
- An entry has a FIXED direction, **Paid / Received** (th จ่าย / รับ), like expense / income. Amount is always positive. No signed typing, no state-driven labels ("ให้ยืม / รับคืน / จ่ายคืน" are gone).
- Paid = I paid them (net +amount, "they owe me" side); Received = they paid me (net −amount). Net > 0 = ติดคุณ, < 0 = คุณติด, 0 = หายกัน.
- A wallet is optional (ไม่ผูก = ledger only). Tags only when a wallet is picked; they belong to the wallet tx.

**Pages: what I own (lib/features/personal_debts/**)**
- People list `/personal-debts`: unchanged from rev 2 §1.1, except the AddTile goes away; the centre + already opens debt mode (fe-core preset).
- Person page `/personal-debts/people/:key`: hero (PersonMark, name, NetBalance) and ONE button **"+ บันทึกรายการ"** (fixed label), which opens quick create in debt mode preset to this person. The tabs "รายการหนี้" / "ประวัติการจ่าย" are as in rev 2; LedgerRow shows direction + amount, never a sign.
- Data layer: page-scoped cubits (`DebtPeopleCubit`, `DebtPersonCubit`) + repository; `PersonalDebtsCubit`, `DebtPerson.group`, `DebtTile`, the settle / cancel code, the debt form page and the debt detail page are deleted.

**Moved to fe-core (not mine any more)**
- §1.3 entry detail → the TRANSACTION DETAIL PAGE in debt mode (type → Paid / Received, category → person, wallet may be ไม่ผูก). A LedgerRow tap opens it.
- §1.4 entry sheet + §1.5 → QUICK CREATE in DEBT MODE: mode chips on top, Paid / Received, a person chip row in place of category, a wallet row with ไม่ผูก, tags only with a wallet, the compact note, collapsible "mark entries paid", and the result line under the amount ("หลังบันทึก: แม่ติดคุณ 200").
- Delete: a confirm modal names the debt + the wallet tx (the balance comes back), then deletes both; split-sourced entries name the debt only.

**API (§3) changes for BE**
- #3 entries item: `amount` positive + `direction: paid|received` (replaces the signed amount); filter `direction=paid|received`.
- #4 `POST …/entries`: `{direction, amount>0, account_id?, date?, description?, note?, tag_ids?, mark_paid_ids?[]}` (tags only with `account_id`). Also return `{result_net}`, or let the FE compute the preview line locally (instant feedback rule) from `person_balance.net` ± amount.
- #1 people list: add `side=owed_to_me|i_owe` (the summary-box filter, server side).
- Unchanged: #2, #5 (but entry detail = tx detail, so `GET /personal-debts/{id}` must give that page everything it needs in debt mode), #6, #7, #8.

**Q1–Q5 status:** Q1 yes (one record type); Q2 delete both (owner); Q3 open; Q4 superseded (fixed Paid / Received toggle); Q5 single currency (user-level, locked).
- Q3 answered (Lead): hidden = net 0 AND every entry labelled paid; "ทั้งหมด" shows them; net ≠ 0 is never hidden (BE rule behind `all`). The preview line under the amount is local (person_balance.net ± amount).

---

## 2026-10-13 — FE-DEBT: Debts rework step 2 (data layer + people list + person page)
DONE (pages + data layer; cleanup waits on fe-core) · analyze: 0 errors / 0 warnings in my files (7 issues left, all in fe-event's in-flight projects files) · full `flutter test`: 686 pass / 3 fail (hub flow ratchets, see below) · nothing built / committed · not run against the BE (handlers not live yet).

**Data layer (matches openapi.yaml, tag Debts)**
- `domain/debt_ledger.dart`: PersonBalance (= DebtPerson), DebtTotals, DebtPeoplePage, DebtEntry (+ source / transaction), DebtEntriesPage, DebtPersonDetail, DebtEntryDetail, DebtEntryWriteResult, DebtEntryDeleteResult, DebtSplitChangeResult, DebtEntryQuery / DebtEntrySort, NetSide, `debtPersonKey`, `debtDateWire`. `debt_direction.dart` (DebtEntryDirection paid / received) and `debt_link.dart` (DebtLink, for `Transaction.counterparty`; no import of the ledger file, so no cycle).
- `data/personal_debts_repository.dart`: listPeople · person · entries · createEntry · getEntry · updateEntry(DebtEntryUpdate: null = unchanged, `clearAccount` → `account_id: null`) · setPaid · deleteEntry · acceptSplit · applySplit. fe-core's quick create / tx detail debt mode build on these.
- Page-scoped cubits: `DebtPeopleCubit` (search debounced, `all`, `side`, paging, stale-response guard, `applyBalance`) and `DebtPersonCubit` (one open call, the money tab on its first open, per-tab search / filter / sort / paging, `setPaid`, `applyBalance`).

**Pages (kit + template only)**
- `/personal-debts`: ListPageBody + DebtSummaryCard (net, the two side boxes filter on the server) + ListToolbar (search, "ทั้งหมด" chip) + PersonBalanceRow rows, paged with a load-more error row. Empty: EmptyView; no match: EmptyView.compact. Open = 1 call; search / chip / box / next page = 1 call each. The AddTile is gone (the centre + opens debt mode).
- `/personal-debts/people/:key` (new route; `extra` = the name for the top bar before the load): TabbedDetailBody: HeaderCard (PersonMark, contact button, NetBalance hero, icon tint) + CompactHeroBar; belowHero = AppButton "+ บันทึกรายการ" (→ `showQuickCreateSheet(preset: QuickCreatePreset.debt(person))`) + for a typed name the "ผูกกับผู้ติดต่อ" row (absorb, then pushReplacement to `c:<id>`). Tabs "รายการหนี้" / "ประวัติการจ่าย": ListToolbar (search, ประเภท จ่าย / รับ, สถานะ ค้างอยู่ / จ่ายแล้ว on tab 1, SortChip), DateGroupHeader per day in date order (none for amount sorts), LedgerRow rows (title = description ?? "จ่ายให้ / รับจาก {name}", wallet mini chip, paid chip, source title). 404 on a typed name → not-found view. Open = 1 call; tab 2 = 1 call on first open.
- Router (debts block, granted): `/personal-debts/new` and `/personal-debts/person` removed; `personal_debt_form_page.dart` deleted. Links (granted lines): contact detail and tx detail `_openSplits` → `/personal-debts/people/<key>`; cross_tab_links_test line 73; page_presets_test debts lines.
- arb: 18 keys appended (debtsTab*, debtsSort*, debtsDir*, debtsAddEntry, debtsPaidChip, debtsTimelineEmpty, debtsMoneyEmpty, debtsEntriesNoMatch, debtsEntrySearchHint, debtEntryPaidTo / debtEntryReceivedFrom); gen-l10n run.

**Tests (new, test/features/personal_debts, 28)**: models + cubits (fake repo: one call per open, debounce, side / all, stale response dropped, money tab once, paging, setPaid patch, error states); repository against a fake HTTP adapter (query params, URL-encoded key, `account_id: null` vs absent, tags only with a wallet, every result shape, 404); pages with prod-shaped JSON (rows / hero / tabs, quick create preset before the load, failed load → error + retry, 404 → not found).

**Open / TODO**
- TODO(debt-mode), fe-core: the entry detail route `/personal-debts/entries/:id` (tx detail in debt mode). Until then a LedgerRow with a wallet tx opens `/transactions/<id>`; ledger-only rows aren't tappable. The OLD `PersonalDebtDetailPage` still sits on `/personal-debts/:id` (broken against the new API); it goes with that route.
- TODO(debt-mode), fe-core: quick create returns only `bool` today, so after a save the person page re-opens (1 call). Patch from DebtEntryWriteResult once the sheet returns it.
- Old code still in the tree: `PersonalDebtsCubit`, `debt_widgets.dart` (DebtTile, settle sheet), `personal_debt.dart` (old model), the old repository methods. My pages no longer use them; fe-core's files do (app.dart, home, notifications, tx detail, hub). fe-core is clearing them, then I delete them in one go. resolve_sheet already moved to createEntry (fe-event).
- 3 red hub ratchets (page_flows_test ×2, api_spec_ratchet): the debts flows in `lib/hub/api/page_flows.dart` still name the retired operationIds, and the new debts calls have no flow. A ready block was sent to fe-core (file owner); the `/projects/*` lines in the same failure are fe-event's.
- Money tab: no wallet filter (it would need the wallet list = an extra call); search + type + sort only.
- Not verified on a device or against a live BE.

## 2026-10-13 — FE-DEBT: old debts code removed + patch after quick create
DONE · `flutter analyze` (whole app): No issues · full `flutter test`: 701 pass / 3 fail (none debts: fe-event's `/projects/{}/detail|tags|tags/import` flows ×2 ratchets, and `event_pick_test` "txCanJoinEvent a debt repayment" = transactions, fe-core's in-flight repayment → counterparty change) · nothing built / committed.
- Deleted (fe-core cleared its side first): `PersonalDebtsCubit`, `debt_widgets.dart` (DebtTile, settle sheet), `personal_debt.dart` (old model incl. DebtPerson.group / PeopleResponse), `personal_debt_detail_page.dart` + its `/personal-debts/:id` route (nothing links to it any more), and every old repository method (list / listAll / get / create / update / delete / cancel / settle / acceptSplitRequest / applySplitChange). The repository is the new API only.
- Person page "+ บันทึกรายการ" → `showQuickCreateSheet(preset: debt(person), onDebtSaved: cubit.addEntry)`: no re-fetch. `addEntry` patches the hero + counts from `person_balance` and inserts the entry by date into each loaded default-view tab (an entry older than every loaded row with more pages is left to paging). A filtered tab, or a save that also labelled other entries paid (open count ≠ old + 1), re-runs that tab's list (1 call). +3 cubit tests (31 debts tests total).
- Home tile: my pages make no writes of their own today (no paid toggle in the UI), so nothing to `markStale()`; quick create does it.
- Still open: entry detail route `/personal-debts/entries/:id` (fe-core, next); LedgerRow taps open `/transactions/<id>` until then; ledger-only rows not tappable. The people list doesn't hear a centre-+ save (the shell owns that sheet): it shows the change on the next open / pull.

## 2026-10-23 — FE-debts (นายE): debt rows → AppListRow; old debt rows removed
DONE · files: personal_debts_page.dart (_row), debt_person_page.dart (_statementRow), hub/pages/domain_debts_page.dart, hub_registry.dart, ui.dart; deleted ui/domain/people/person_row.dart, person_balance_row.dart, ui/domain/money/ledger_row.dart, DebtStatementRow (debt_person_pieces.dart) · analyze: my files + tests clean; tests NOT run (owner decides)
deviations/notes:
- People row: PersonMark 36 (link = corner badge) | title | line2 = "ครบกำหนด {date}" / "เลยกำหนด {n} วัน" (warning span) when next_due_date, else "ค้างมา {n} วันแล้ว" (warning span past 30 days) | ListRowTrailing.value(MoneyText, income / expense / plain by side).
- Statement row: IconTile 36 (debt / cash) | title | status ListRowChip("จ่ายแล้ว", check) | line2 parts [where from / to] | MoneyText (repayment plain, debt by side).
- Hub debts page: demos of PersonRow, PersonBalanceRow, LedgerRow (+ playground) and DebtStatementRow removed; the debt pages' rows are shown as AppListRow instead. Covers PersonRow, PersonBalanceRow, DebtStatementRow, LedgerRow, LedgerDirection dropped.
- Tests updated for the change (not run): debt_pages_test (AppListRow finders, line2, the person hero now says "Owes me" / "I owe" only, a due-date line test replaces the old last-activity test), debt_pieces_test / debt_person_pieces_test (cases for the deleted rows removed). Lead's wording rollout may still leave other strings red in debt_pages_test.
- Same day, also mine (uncommitted): due-date feature (BE migration 000071 + personal_debts, openapi; quick create row; detail page row + status by the paid circle; list line 2), debt detail redesign (☑ CheckCircleButton, FlowCards wallet ⇄ person, ผูก / สร้างรายการจากหนี้ card), debts list sections (ลูกหนี้ / เจ้าหนี้ / เคลียร์แล้ว, "รวม" + coloured total), person hero "ลูกหนี้" only.
