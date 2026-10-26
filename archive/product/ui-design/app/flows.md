# 02 — User Flows

Key end-to-end user journeys for the ChubiPocket mobile app. Each flow is a sequence of screens with a trigger, expected outcome, and edge cases. Designer should turn each flow into a Figma prototype with linked frames.

For per-screen detail, see [`screens/`](screens/). For visual tokens and component reference, see [`design-sheet.md`](design-sheet.md).

Each flow tagged with phase scope: **P0** = Phase 0, **P1a** = Phase 1a, etc.

---

## Flow index

| # | Flow | Scope | Why it matters |
|---|---|---|---|
| 1 | First-time onboarding | P0 + P1a | First impression; conversion to active user |
| 2 | Daily expense logging | P1a | Most-used flow; must be ≤ 4 taps |
| 3 | Logging a transfer between own accounts | P1a | Common; tests transfer UX |
| 4 | Splitting an expense with friends | P1b | Core differentiator; complex form |
| 5 | Adding a contact | P1b | Prereq for splits & projects |
| 6 | Linking a contact to a real app user | P1b | Trust + accuracy moment |
| 7 | Starting a project | P1b | Multi-user surface |
| 8 | Resolving a project split (payer side) | P1b | Closes the loop |
| 9 | Resolving a project split (creditor side) | P1b | Receives payment |
| 10 | Setting a budget | P1c | Planning |
| 11 | Setting a saving goal | P1c | Planning |
| 12 | Setting up a recurring transaction | P1c | Automation |
| 13 | Reviewing & settling debts | P1b | Cross-cutting summary |
| 14 | Adjusting account balance | P1a | Reconciliation |
| 15 | Logging out | P0 | Trust + multi-device |

---

## 1. First-time onboarding — P0 → P1a

**Trigger:** user installs the app and opens it for the first time.

**Steps:**

1. **Splash** — logo + indicator while auth state resolves
2. **Login** — no token found → routed to `/auth/login`
3. **Register** — tap "Don't have an account? Register"
   - Fill: username, display name, password, confirm, currency (default THB)
   - Email optional (Phase 1)
4. **Submit** — backend creates user + auto-issues token
5. **Home (Phase 0 stub)** — shows `EmptyView` "Ready to start — add your first account" with CTA
6. **Account form** — tap CTA → `/accounts/new`
   - Fill: name, type, opening balance, currency, icon, color
7. **Account detail** — first account created
8. **FAB → Quick-add transaction** — log first transaction
   - Default expense, today, amount, category from "top 6 most used" stub
9. **Transaction saved** — snackbar; list refreshes; user is now an "active" user

**Success outcome:** user has 1 account + 1 transaction. They've experienced the full happy path.

**Edge cases:**
- Username taken → inline error, suggest alternatives (Phase 2 polish)
- Network error during register → top banner with Retry
- User abandons mid-form → no draft persistence in Phase 0; warn before back

**Designer notes:**
- Onboarding hero illustration on Register page would help (currently icon-only)
- Consider a brief "what is ChubiPocket?" splash card before login (skippable; Phase 2)

---

## 2. Daily expense logging — P1a (the most common flow)

**Trigger:** user wants to log an expense they just made (e.g., lunch).

**Constraint:** ≤ 4 taps from any screen.

**Steps (golden path):**

1. **Tap FAB** — from Home / Transactions / Accounts → `QuickAddTransactionModal` slides up
2. **Type amount** — large numeric input auto-focused; numeric keyboard up
3. **Pick category** — top 6 chips visible; tap one (e.g., "Food")
4. **Tap Save** — modal closes; snackbar "Transaction saved"

That's 4 taps including FAB.

**Variations:**
- Change account — tap account chip row (one extra tap)
- Change date — tap date row → date picker (default today)
- Add note — tap note row (one extra tap, full keyboard)
- Switch type — tap "Income" / "Transfer" tab at top

**Edge cases:**
- Amount = 0 → Save disabled
- No accounts yet → modal redirects to "Add account first"
- Network failure on save → modal stays open, error banner, Save retries

**Designer notes:**
- Numeric keypad layout on mobile is critical — designer should mock the OS keyboard up
- Top-6-categories logic is "most-used by user"; cold start uses defaults (Food, Transport, etc.)
- Web variant: amount + category visible in one viewport; no scrolling

---

## 3. Logging a transfer between own accounts — P1a

**Trigger:** user moves money between their own accounts (e.g., savings to checking).

**Steps:**

1. **FAB → Quick-add modal**
2. **Switch type to Transfer** — tab at top
3. **Pick source account** — chips row
4. **Pick destination account** — chips row (filtered to exclude source)
5. **Type amount**
6. **Save**

**Visual cues:**
- Amount displays neutral (no red/green) since transfer is internal
- Both accounts show the resulting transaction (out of source, in to destination)

**Edge cases:**
- Source = destination → inline error, Save disabled
- Source account currency ≠ destination currency → Phase 1 doesn't support FX conversion; show error "Transfers must be same currency"

---

## 4. Splitting an expense with friends — P1b

**Trigger:** user paid for a shared meal, wants to track who owes them what.

**Steps:**

1. **Quick-add → Expense** — amount, account, category as usual
2. **Tap "Split"** — toggle expands `SplitEditor`
3. **Add splits** — tap "+ Add person"
   - Pick from contacts, or type ad-hoc name (free text)
   - Per-row: amount (or % toggle)
4. **Sum validates** — splits must sum to total (or designer-chosen "difference goes to me")
5. **Save** — transaction saved; splits visible on detail page

**Edge cases:**
- Sum doesn't match total → inline error, Save disabled
- Contact doesn't exist yet → "Create new contact" inline option
- Mix of contacts + ad-hoc → both supported

**Designer notes:**
- The `SplitEditor` is a complex widget — needs its own dedicated screen file
- Fixed vs. percent toggle is a key UX choice — both should be one tap apart
- Web wide layout: splits could be a side panel beside the main form

---

## 5. Adding a contact — P1b

**Trigger:** user wants to add someone they regularly split with.

**Steps:**

1. **Navigate** — `/more/contacts` → tap "+"
2. **Contact form** — display name (required) + nickname, email, phone, notes (optional) + icon
3. **Optional absorb step** — if user has unlinked ad-hoc names ("John" used in 3 splits), checklist appears: "Wire these names to this contact?"
4. **Save**

**Outcome:** contact exists; future splits can pick them; absorbed splits get `contact_id` set.

**Edge cases:**
- No ad-hoc names → absorb step doesn't appear
- Display name conflicts with existing contact → warn but allow

---

## 6. Linking a contact to a real app user — P1b

**Trigger:** user wants their contact to be a real ChubiPocket user (so debts auto-sync).

**Steps:**

1. **Contact detail** → overflow → "Link to app user"
2. **`ContactLinkModal`** opens
3. **Generate code** — primary button → 8-char code displayed; QR + copy + share row
4. **Share** — Line / Messages / Email / Copy
5. **Wait** — modal stays in "Pending acceptance" state
6. **Other user opens link** — `AcceptContactInvitePage` (deep link → `/invite/contact/:code`)
7. **Other user accepts** — `POST /contacts/accept-invite`
8. **Original user sees update** — modal flips to "Accepted"; contact now shows linked-user badge

**Edge cases:**
- Invite expires (7 days) → status badge "Expired"; user can regenerate
- Other user already exists → seamless link
- Other user not registered → invite link opens register page first

---

## 7. Starting a project — P1b

**Trigger:** user wants to start a shared book (trip, freelance gig, etc.)

**Steps:**

1. **Navigate** — `/more/projects` → tap "+"
2. **Project form** — name, type (Trip / Freelance / Sales / Other), date range, description
3. **Save** — project created
4. **Project detail** — opens with empty state + highlighted "Add member" CTA
5. **Add members** — Members page → tap "+"
   - From contacts (pick existing) / By invite (pending member + code) / Ad-hoc (name only)
6. **Members invited** — pending state until acceptance
7. **First shared expense** — FAB on project detail → quick-add pre-filled with `project_id`
8. **Splits between members** — `SplitEditor` populated from project members

**Edge cases:**
- No contacts yet → "From contacts" tab is empty; surface "Add contact" inline
- Solo project (just owner) → unusual but allowed; user sees "no other members" guidance

**Designer notes:**
- Project surface uses `surface-container-high` (slightly elevated) to distinguish from personal book
- Member-add modal has 3 tabs — keep them visible on first open (not behind a chevron)

---

## 8. Resolving a project split — payer side — P1b

**Trigger:** user owes a project split (someone paid for them on a project).

**Steps:**

1. **Project detail** → Transactions tab → tap a split they owe
2. **Transaction detail** — split shows "Outstanding ฿X to {creditor}"
3. **Tap "Pay now"** — `ResolvePayNowModal` opens
   - Default amount = outstanding (editable for partial)
   - Pick own account (where money's coming from)
   - Date (default today)
   - Optional note
4. **Confirm** — modal closes; snackbar "Payment recorded"
5. **Outcome:** new transaction created (expense from user's account); split marked settled

**Alternative path: Add to my debts** (record the obligation without paying yet):
1. Tap "Add to my debts" instead
2. `ResolveAddDebtModal` confirms — single button "Add to my debts"
3. `personal_debts` entry created; tracked in user's debt summary

**Batch resolve:**
- Project header has "Resolve all" button → list of all unresolved items with checkboxes
- Pick default account for all → one-tap resolve all selected

---

## 9. Resolving a project split — creditor side — P1b

**Trigger:** another user paid the original user for a split (record receipt).

**Steps:**

1. **Project detail** → Transactions tab → tap split where user is the payee
2. **Tap "Record receipt"** — `ResolveReceiveModal` opens
   - Default amount = payment amount
   - Pick account where money landed
   - Date, optional note
3. **Confirm** — income transaction created in user's account; split marked settled

**Edge cases:**
- Payment received via cash, not in any account → user picks "Cash" account
- Payment received in different currency → out of scope Phase 1

---

## 10. Setting a budget — P1c

**Trigger:** user wants to cap their spending in a category.

**Steps:**

1. **Navigate** — `/more/budgets` → tap "+"
2. **`BudgetFormModal`** opens
3. **Pick category** — expense categories only; tree picker
4. **Enter amount** — period budget cap
5. **Pick period** — Weekly / Monthly / Yearly
6. **Pick scope** — User (default) or Project (if user has projects)
7. **Save**

**Outcome:** budget appears in `BudgetsListPage` with progress bar.

**Real-time progress:**
- As user logs transactions in that category, budget card updates
- At 80% used → warning color
- At 100%+ → over-limit warning, prominent red

**Edge cases:**
- Duplicate category + period → warn "You already have a Monthly budget for Food. Replace?"
- Child category transactions count toward parent budget (Phase 1 default)

---

## 11. Setting a saving goal — P1c

**Trigger:** user wants to save toward a target.

**Steps:**

1. **Navigate** — `/more/saving-goals` → tap "+"
2. **`SavingGoalFormModal`** opens
3. **Enter name** (e.g., "Tokyo trip")
4. **Target amount**
5. **Linked account** — pick account where the savings live
6. **Allocation %** — how much of that account is for this goal (helper shows: "Account has X% allocated; Y% available")
7. **Deadline** (optional) → if set, shows "Required: ฿N / month"
8. **Icon + color**
9. **Save**

**Outcome:** goal in `SavingGoalsListPage` with progress.

**Allocation gotcha:**
- Sum of all allocations on one account ≤ 100%
- Inline error if exceeded; designer should mock this clearly

**Edge cases:**
- Account balance drops below allocated amount → goal still shows progress but prominently flagged

---

## 12. Setting up a recurring transaction — P1c

**Trigger:** user wants to track a subscription, installment, or loan.

**Steps:**

1. **Navigate** — `/more/scheduled` → tap "+"
2. **`ScheduledFormPage`** opens (full page, not modal — too many fields)
3. **Pick entry type** — Recurring / Installment / Loan (segmented control)
4. **Common fields** — name, type (Expense / Income), amount, account, category, billing cycle, next billing date, note
5. **Conditional fields:**
   - Recurring → just common
   - Installment → total amount, down payment, total installments, remaining
   - Loan → all installment fields + interest rate
6. **Save**

**Outcome:** entry in `ScheduledListPage`; backend will generate transactions on each billing date.

**Edge cases:**
- Next billing date in the past → backend generates immediately
- Installment 0 of N → completed; offer to auto-archive

---

## 13. Reviewing & settling debts — P1b

**Trigger:** user wants to see who owes them and who they owe.

**Steps:**

1. **Home** → tap `DebtSummaryCard` → `/more/debts`
2. **Debt summary page** — two sections
   - **Owed to me** — grouped by person; tap → list of unsettled splits with that person
   - **I owe** — `personal_debts` + derived debts; tap → detail
3. **Drill into person** — list of items; tap one → resolve modal (Pay now / Add to debts / Record receipt)
4. **Settle** — same modals as flows 8 & 9

**Outcome:** user has a clear picture of their debt position; can settle in one place.

---

## 14. Adjusting account balance — P1a

**Trigger:** user notices the account balance in the app doesn't match reality (e.g., bank app shows different number).

**Steps:**

1. **Account detail** → overflow → "Adjust balance"
2. **`AdjustBalanceModal`** — bottom sheet
   - Current balance shown
   - Enter new balance
   - Auto-computed: "Adjustment of +฿X / -฿X will be created"
   - Date (default today)
   - Optional note
3. **Confirm** → backend creates an `Adjustment` transaction; balance updates

**Outcome:** transaction history retains audit trail; balance now matches reality.

**Edge cases:**
- New balance = current → confirmation reads "No adjustment needed"; Confirm disabled
- User accidentally adjusts wrong way → no undo (deletion of the adjustment is allowed; designer should consider an "Undo" snackbar)

---

## 15. Logging out — P0

**Trigger:** user wants to log out (e.g., shared device, switching accounts).

**Steps:**

1. **Settings** → tap "Log out"
2. **Confirm dialog** — "Log out of ChubiPocket?"
3. **Confirm** → `POST /auth/logout` → token cleared from secure storage
4. **Routed** → `/auth/login`

**Outcome:** clean logged-out state.

**Edge cases:**
- Network failure during logout → token cleared locally regardless; user sees login page
- Re-login on same device → token re-issued; data picks up where left off

---

## Cross-cutting flow conventions

### Confirmation patterns
- **Destructive** (delete transaction, delete account, archive contact) → always `AlertDialog` with warning text + Cancel / Confirm
- **Irreversible but non-destructive** (pay now, resolve receive) → bottom sheet summary + single Confirm button
- **Reversible** (change category, edit amount) → save directly; snackbar with Undo (Phase 2 polish)

### Empty-state CTAs
Each list-page empty state has a clear next action:

| Page | Empty CTA |
|---|---|
| Accounts | Add your first account |
| Transactions | Log a transaction |
| Contacts | Add your first contact |
| Projects | Start a project |
| Budgets | Create a budget |
| Saving goals | Set a goal |
| Scheduled | Add a recurring or loan |

### Error handling
- Network failures → top banner (offline) or inline error with Retry
- Server errors → snackbar with description; full ErrorView for page-level failures
- Validation errors → inline at the field; never block on advisory warnings (budget over, weird category) — those are warnings only

### Loading
- < 100 ms — no skeleton (avoid flash)
- ≥ 100 ms — skeleton appears
- ≥ 5 s — banner suggests slow connection (Phase 2 polish)

---

## Status

- **Phase** — pre-handoff scaffolding; flows describe expected UX, designer to validate via Figma prototypes
- **Last updated** — 2026-04-26
- **Version** — 0.1 (initial scaffolding; 15 flows covering Phase 0 + Phase 1)
