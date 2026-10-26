# QA scripts (playwright-core + system Chrome)

Reusable, runnable QA for the chubi-pocket Flutter web app. Written by the QA session; keep it current when a
page changes (debt selectors live in ONE file: `pages/debts.mjs`).

## Prerequisites
- BE `http://localhost:8080/api/v1` + web `http://localhost:5181` up (DevOps brings them up; QA never starts/restarts servers, never touches prod).
- Node 20+, Google Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe` (override `QA_CHROME`).
- `npm install` once in this folder (installs playwright-core only; `node_modules/` is git-ignored).
- QA user `qlead657724` / `qapass1234` (override `QA_USER` / `QA_PASS`; `QA_WEB`, `QA_API` for other hosts).
  The first run logs in through the UI and saves the session to `.auth/state.json` (git-ignored); delete it to force a fresh login.

## Run
```
cd chubi-pocket-docs/team/qa
node run-debts.mjs                  # all debt flows, combined tally
node flows/debt-repay.mjs           # one flow
node flows/dev-appchip-shots.mjs    # screenshots of the /dev/widgets AppChip tab
```
A flow prints `PASS id` / `FAIL id · repro/expected-vs-actual` / `NOTE id · odd but not a hard fail`, then
`SUMMARY PASS n · FAIL n · NOTE n` (exit code 1 when any FAIL). Flows create their own uniquely named QA data
(`QA <thing> <rand>`) and never touch other data; the dev DB is disposable.

## How the driver works (rules that matter)
- Viewport 412x915. The app uses **hash routes**: `http://localhost:5181/#/personal-debts`. `goTo(page, route)` does a
  full reload (clean state, login kept in localStorage); `hashTo(page, route)` navigates in-app without a reload.
- **Read** a screen as text from the semantics tree: `readScreen(page)` (on-screen lines, merged labels joined by ` | `).
  Only rows that are on screen are in the tree (lazy lists): to find something in a long list use the search field or `scrollTo`.
- **Tap** by mouse coordinates; the semantics overlay is made click-through (`pointer-events:none`) so taps do not misroute.
  `tapText(page, match)` finds the node by text and taps its centre. `match` = substring (string) or RegExp. Use an exact
  RegExp (`/^บันทึก$/`) when the word also appears in a title or another button (e.g. "บันทึก" vs "บันทึกหนี้", "ลบ" vs "ลบหนี้นี้").
- Text fields expose no semantics label: tap by position, then `page.keyboard.type`.
- Merged nodes (hero cards) swallow their children: tap a pencil/icon inside by coordinates (see `DETAIL.editPencil`).
- Description / note **values** on a debt detail are not in the semantics tree (labels only) - verify those by screenshot.
- Screenshots only when asked or for a big visual FAIL: `shots/<YYYY-MM-DD>/<what-it-shows>.png` (git-ignored).

## Map: page / flow → script
| What | Script | Notes |
|---|---|---|
| Browser, login, helpers | `lib/browser.mjs` (launch, env), `lib/auth.mjs` (login, ensureLoggedIn), `lib/nav.mjs` (goTo, hashTo), `lib/screen.mjs` (readScreen, nodes, find, tapText, tapAt, typeInto, waitForText, scrollTo), `lib/check.mjs` (check/note/report) | shared by everything |
| Debts: selectors + page helpers | `pages/debts.mjs` | ALL debt labels/positions/routes in one place: `ROUTES`, `L`, `FORM`, `DETAIL`, `REPAY`, `LIST`, `openList/openNew/openDetail/openPerson`, `createDebt`, `fillAndSaveNew`, `repay`, `cancelDebt`, `deleteFromEdit`, `deleteDebtById`, `money` |
| Contacts: list → contact detail | `pages/contacts.mjs` | `openContacts`, `openContactDetail(page, /^QR/)`; also `createContact`, `contactNames` (used by debt flows) |
| Transactions: list → transaction detail | `pages/transactions.mjs` | `openTransactions`, `openTransactionDetail(page, match?)` (default first row), `readTransaction` |
| Wallets (กระเป๋า): list → wallet detail | `pages/accounts.mjs` | `openAccounts`, `openAccountDetail(page, match?)` |
| Saving goals: list → goal detail | `pages/saving-goals.mjs` | `openGoals`, `openGoalDetail(page, match?)`, `readGoal` |
| Full-page shot of any screen | `lib/screen.mjs` `fullPageShot(page, path)` | grows the viewport to 412x2400, crops to the content, shoots, restores |
| Categories: list → category detail | `pages/categories.mjs` | `openCategories(page, 'expense'|'income')`, `openCategoryDetail(page, /^Groceries/)`, `readCategory` |
| Dev widget gallery (no login) | `pages/dev-widgets.mjs` | `openGalleryTab(page, 'AppChip')`, `listTabs`, `selectTab`, `scrollBody` - any gallery tab is one call |
| Debts list (hero, cards = direction filter, status, search, row→person, More tile) | `flows/debt-list.mjs` | creates + deletes its own big fixtures |
| Create a debt (validation, owedToMe/iOwe, cancel) | `flows/debt-create.mjs` | |
| Repay: partial / half / overpay blocked / full, iOwe, resulting txs | `flows/debt-repay.mjs` | |
| Edit a debt (below-repaid rejected, save, cancel) | `flows/debt-edit.mjs` | |
| Cancel ("ยกเลิกหนี้นี้") + delete ("ลบหนี้นี้") | `flows/debt-cancel-delete.mjs` | |
| Person page, link to contact, save-as-contact | `flows/debt-person.mjs` | |
| Gallery "รายละเอียด" Part 1 sample page (view mode), one shot | `flows/dev-detail-sample-shot.mjs` | `node flows/dev-detail-sample-shot.mjs 2026-10-12` → `shots/<date>/detail-sample.png` |
| AppChip size matrix screenshot | `flows/dev-appchip-shots.mjs` | `node flows/dev-appchip-shots.mjs 2026-10-11` |
| All debt flows | `run-debts.mjs` | |

## When debts are reworked
Fix labels/positions in `pages/debts.mjs` first (`L`, `FORM`, `DETAIL`, `REPAY`, `LIST`); then adjust the `check()` lines in the
flows whose behaviour changed (e.g. the new person page tabs "รายการหนี้" / "ประวัติการจ่าย", repayments tied to the person).
