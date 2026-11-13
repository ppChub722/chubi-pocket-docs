# Savings wallet flag (auto-save) — plan

Status 2026-11-13: BUILT in the working trees (BE migration 000008 + app), tested, NOT committed or deployed. BE: full suite green except the 8 baseline failures (auth passwordless, chatbot x2, connections x3, telegram x2). App: analyze clean, accounts tests pass; `hub_coverage_test` fails on `memberName`, from another session's uncommitted work. Beyond the plan: recurring saving rule with no goal on a savings wallet is refused (409); the saving form's "available" for a savings wallet is its unallocated part and it asks for a goal. Owner decisions 2026-11-13.

## What the owner wants

A per-wallet setting "savings wallet" (`auto_save`). While on, the WHOLE wallet balance counts as saved:

- money in → saved grows; money out → saved shrinks (unallocated part first). No saving entry is written per transaction.
- goals still work as today: the owner allocates part of the wallet to goals. Allocated money is never taken out automatically; the owner withdraws it from the goal by hand.
- transferring out more than the unallocated part → unallocated goes negative = the existing `saved_exceeds_balance` warning (red, nothing blocked).
- turning it off: confirm dialog when goal allocations exist; allocations stay as they are; the unallocated part becomes "available" of the wallet again.
- flag off = behaviour exactly as today.

## Decisions

1. Enabling clears the wallet's existing spare (no-goal) saving: ask to confirm, then book compensating `withdraw` entries (spare → available) per wallet. Entries are NOT deleted: the ledger stays consistent (a `move` spare→goal also carries a goal balance).
2. The flag is available only when the wallet has no other active member; inviting a member is refused while the flag is on. Disabled in the app with a short reason.
3. Only tracked, non-liability wallets (`track_balance` and not credit_card / pay_later). Never on credit types.

4. Owner 2026-11-13: try the derived design first ("ลองแบบนี้ดูก่อน"). No real auto-written entries. No "+500 auto-save" history lines either (owner decided against them); the wallet hero card gets a chip instead.

## Multi-wallet totals

Per wallet, then summed: flagged wallet saved = its balance (spare derived); unflagged wallet saved = its ledger. Untracked and credit wallets are not counted. A goal's total = sum over wallets. "Withdraw spare to available" draws only from unflagged wallets (a flagged wallet's money is already in the wallet). The over-balance alert is per wallet, never netted across wallets.

## Design: derived, not written

Savings are a ledger (`saving_entries`: kinds save / withdraw / move; buckets available / spare / goal; per user + wallet). For a flagged wallet the spare bucket is never written; it is derived on read:

- `spare = balance − Σ goal buckets in the wallet`, `saved = balance`, `available = 0`.
- goals ≥ balance → spare negative, `saved_exceeds_balance = true`, `over_by = goals − balance`.
- allocate to a goal in a flagged wallet = existing `save` entry (available → goal); take back = `withdraw` (goal → available). Both already exist; the derived spare moves on its own.

## BE work

- migration: `accounts.auto_save boolean NOT NULL DEFAULT false`.
- accounts: PATCH validation (tracked, non-credit, sole member; enable books the clearing entries in one tx; disable needs no data change); response field `auto_save`; members: refuse an invite while `auto_save`; OpenAPI.
- `shared/savings.go`: `LoadWalletSavings` derives for flagged wallets; `LoadSavingTotals` / `savingTotalsOf` count a flagged wallet's derived spare in spare/saved and leave it out of `available`.
- `saving_goals/writes.go`: refuse any entry whose bucket is `spare` on a flagged wallet (save with no goal, move/withdraw touching spare); `Close(to=spare)` must write `withdraw` (not `move`→spare) for a flagged wallet; spare split / `bucketBalances(spare)` never draws from a flagged wallet.
- credit fix on the way: `saved_exceeds_balance` never fires for liability wallets (today a credit wallet with negative balance shows "saved more than the wallet holds").
- checks still to read: `recurring` saving rules + `occ.go`, `me/me.go`, `sync/fingerprint.go` (wallet fingerprint must change when the flag or derived values change), `accounts/delete.go`.
- tests: derived numbers (in / out / goal allocation / negative), enable clears spare and keeps goals, disable keeps goals, members guard both ways, credit warning gone, totals.

## App work

- wallet settings: switch "Savings wallet" with a one-line description; disabled + reason when the wallet has other members, is untracked, or is a credit type.
- enable: confirm that existing unallocated saving in this wallet is cleared; disable: warning when goal allocations exist.
- wallet detail: with the flag on show "saved = whole balance", split goals / unallocated; hide the spare entry form for this wallet; keep the over-balance alert.
- hero card: a chip "Auto-save" (th: ออมอัตโนมัติ) in the hero chip row (`HeroChipRow`, beside "รวมในรายงาน" etc.). Owner 2026-11-13: NO history lines in the saving history; this chip is the only hint.
- th + en strings, gallery demo if a new shared widget appears, no hard-coded text.

## Release

Needs BE + app together (new field, new rules). Build number from commit count. Gate MIN_APP_BUILD stays unless the owner asks.

## Rename (same round)

Owner 2026-11-13: Thai label of the pay_later wallet type "ผ่อนทีหลัง" → "จ่ายทีหลัง" ("ผ่อน" suggests instalments; pay later is normally paid in full at the due date). One string, `accountTypePayLater` in `app_th.arb` (+ regenerate l10n); no other source use of the old text (grep 2026-11-13). English stays "Pay Later". Ships with the app build of this round.

## Open (small)

- ShopeePayLater / FirstChoice red alert disappears with the credit fix; confirm on device after deploy.
