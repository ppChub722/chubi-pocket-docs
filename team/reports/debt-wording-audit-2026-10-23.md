# Debt wording audit (2026-10-23, Lead, branch wip/0.4.0-3)

The owner asked where รอรับ / รอจ่าย and the other debt words appear across the app. The rule is in decisions.md → Wording: ลูกหนี้ (they owe me) / เจ้าหนี้ (I owe), quick create first.

Source: `chubi-pocket-app/lib/l10n/app_th.arb` plus every `l.<key>` use in `lib/`, and the BE. 171 Thai strings carry a debt word: 115 are used, 56 are not used anywhere.

## 1. Direction / state words still on รอรับ / รอจ่าย (to replace)

| Where (page) | Key | Now |
|---|---|---|
| Debts list: hero tiles + filter chips | `fpDebtsOwedToMeTile` / `fpDebtsIOweTile` | รอรับ \| {count} คน / รอจ่าย \| {count} คน |
| Debts list + person page: rows, NetBalance, filters | `debtsOwedToMe` / `debtsIOwe` | รอรับ / รอจ่าย |
| Person page hero sentence | `debtPersonOwedFrom` / `debtPersonOweTo` | รอรับจาก{name} / รอจ่ายให้{name} (no space) |
| Person page empty state | `debtsEmptyMessage` | บันทึกรายการรอรับ / รอจ่ายกับเพื่อน — หรือหารบิลจากรายการ |
| More page tile | `moreDebtsDesc` | รอรับ / รอจ่ายกับใครเท่าไร |
| More page live line | `moreLiveDebts` | รอรับ {owed} \| รอจ่าย {owe} |
| Events list + detail: position | `fpEventsOwed` / `fpEventsOwe` | รอรับ / รอจ่าย |
| Event detail: member strip | `fpEventsMemberOwed` / `fpEventsMemberOwe` | รอรับ {amount} / รอจ่าย {amount} |
| Events list: paid line | `fpEventsPaidLine` | ฉันจ่ายไป {paid} → รอรับ {receivable} |
| Event tx tiles | `projectTxOwes` | รอจ่ายให้{name} |
| Event resolve sheet | `debtTheyOweYou` / `debtYouOwe` | รอรับจาก {name} / รอจ่าย {name} |
| Event bill form hint | `projectTxSplitsHint` | แต่ละคนรอจ่ายให้คนจ่ายเท่าไร \| คนจ่ายรับส่วนที่เหลือ |
| Tx form (quick create tx mode + tx edit), split lines | `txShareOthersOweYou` / `txShareYouOweOthers` | รอรับจากคนอื่น {amount} / รอจ่ายคนอื่น {amount} |
| Tx form, "จ่ายแทน" line | `txLinkShareIOwe` | รอจ่ายให้{name} {amount} |
| Notification tile action | `notifActionAddDebt` | เพิ่มเข้ารอจ่ายของฉัน |
| Notification actions (split changed) | `notifSplitChangeUpdated` / `…Deleted` / `…Gone` | อัปเดตรายการรอจ่ายตามแล้ว / ลบรายการรอจ่ายนี้ออกแล้ว / รายการรอจ่ายนี้ถูกลบไปแล้ว |
| Debt detail page: type chips | `debtDirectionOwedToMe` / `debtDirectionIOwe` | จดให้ยืม / จดยืมมา (uncommitted; HEAD has รอรับ / รอจ่าย; author unknown) |
| **BE** share message ("สรุปยอด / ทวง" sheet) | `chubi-pocket-be/internal/modules/personal_debts/message.go:95-97` | ฉันรอรับจาก %s … / ฉันรอจ่ายให้ %s … |

Only the hub / dev pages hard-code รอรับ / รอจ่าย in Dart (`hub/pages/domain_debts_page.dart`, `domain_events_page.dart`, `domain_transactions_page.dart`, `hub/api/page_flows.dart`). Pages use l10n only.

## 2. "Settled" has three different words

| Key | Now | Where |
|---|---|---|
| `debtSettledLabel` | หายกัน | contact picker (debts mode), quick create person card |
| `debtsEven` | เคลียร์แล้ว | debts list, person page |
| `debtRepayCleared` / `debtSummaryCleared` | เคลียร์ครบ / เคลียร์ครบกับ {name} แล้ว | quick create (overpay dialog, summary row) |
| `debtEarlierShow` | เคลียร์ครบ {date} \| ดูรอบก่อน ▾ | person page |
| `fpEventsTileUnsettled` | ยังเคลียร์ไม่หมด | events list |

## 3. "ค้าง" (outstanding / age): no direction, can stay

`fpDebtsDaysOutstanding` ค้าง {count} วัน · `debtsOver30Label` ค้างเกิน 30 วัน · `debtsOpenCount` ค้าง {count} รายการ (contact picker) · `homeDebtsOpen` ค้าง {count} รายการ · `homeDebtsNone` / `debtsEmptyOpenTitle` ไม่มีหนี้ค้าง · `debtMarkPaidNone` ไม่มีรายการค้าง · `debtRepayNoOpen` ไม่มีใครค้างกันอยู่ · `debtRepayPickTitle` คนที่ยังค้างกันอยู่ · `debtOverpayTitle` / `debtOverpayWarn` จ่ายเกินยอดค้าง / เกินยอดค้าง · `fpEventsMembersTitle` สมาชิก \| ใครจ่าย / ใครค้าง.

## 4. Action words (ยืม / คืน / จ่ายหนี้): fine, listed for consistency

- Quick create:
  - `debtRecordChip` จดหนี้
  - `debtSettleChip` จ่ายหนี้
  - `debtOriginLend` ให้ {name} ยืม
  - `debtOriginBorrow` ยืมจาก {name}
  - `debtRepayDescPay` จ่ายคืน {name}
  - `debtRepayDescReceive` รับคืนจาก {name}
  - `debtRepayTo` / `debtRepayFrom` จ่ายคืนให้ / รับคืนจาก
  - `debtTxHintLend` / `debtTxHintBorrow` เงินออกจากกระเป๋า (ให้ยืม) / เงินเข้ากระเป๋า (ยืมมา)
  - `debtMarkPaidLabel` ปิดหนี้
- Person page:
  - `debtPersonSettlePay` / `debtPersonSettleReceive` จ่ายคืน / รับคืน {amount}
  - `debtRowIPaidBack` คุณจ่ายคืน{name}
  - `debtRowTheyPaidBack` {name}คืนเงิน (no space)
- Debts list: `debtsLastIPaidBack` / `debtsLastTheyPaidBack`
- Tx detail split status:
  - `txSplitStatusToPay` ต้องคืน
  - `txSplitStatusAwaiting` รอคืน
  - `txSplitStatusRepaid` ✓ คืนแล้ว
  - `txSplitStatusPartRepaid` คืนแล้ว {paid} จาก {total}
  - `txSplitStatusOverpaid…` จ่ายเกิน … \| เขาต้องคืน / ต้องคืนให้เขา
- System categories: `categorySystemDebtPaid` ชำระหนี้, `categorySystemDebtReceived` รับชำระหนี้. Formal, and they differ from the chip "จ่ายหนี้".
- Module names: `moreDebts` / `homeLiabilities` หนี้สิน, `debtsHeroNet` หนี้สุทธิ, `quickModeDebt` หนี้, `quickCreateBtnDebt` จดหนี้.

## 5. Already on the new words (quick create only)

`debtRoleDebtor` ลูกหนี้ · `debtRoleCreditor` เจ้าหนี้ · `debtSummaryDebtor` / `debtSummaryCreditor` {name} เป็นลูกหนี้ / เจ้าหนี้ · `debtSummaryBecomesDebtor` / `debtSummaryBecomesCreditor` {name} กลายเป็นลูกหนี้ / เจ้าหนี้. Used by: debt_entry_form, quick_create_sheet, contact_picker (debts mode, which is also opened from the debt entry edit page).

## 6. Unused keys (56, cleanup candidates; no `l.<key>` anywhere in lib/)

debtAmountBelowSettled, debtCancel, debtCancelBody, debtCancelTitle, debtCancelled, debtCreateTxHint, debtDeleteThis, debtDeleteTitle, debtDeleted, debtDirectionIOweDesc, debtDirectionIOweSub, debtDirectionOwedToMeDesc, debtDirectionOwedToMeSub, debtEditTitle, debtNewTitle, debtOutstanding, debtOverpaidCantSettle, debtOverpaidIOwe, debtOverpaidTheyOwe, debtProgress, debtReceive, debtSentenceBorrowTx, debtSentenceLendTx, debtSentenceRecordIn, debtSentenceRecordOut, debtSentenceSettleIn, debtSentenceSettleOut, debtSettleDone, debtSettleOver, debtSettleTitlePay, debtSettleTitleReceive, debtSettled, debtStatusSettled, debtSubRecord, debtSubRepay, debtTitleHintIOwe, debtTitleHintOwedToMe, debtsAddNew, debtsEmptyTitle, debtsPersonAdd, debtsStatusOpen, debtsTabEntries, fpDebtsCycleHeaderSince, fpDebtsEarlierHeader, fpDebtsIncludeCleared, fpDebtsOver30, fpDebtsSortOldest, fpDebtsTotalCaption, notifSplitChangeZeroed, projectResolveComingSoon, projectTabResolve, transactionSplitShareTitle, txDetailSplitEditElsewhere, txShareOthersOwe, txSplitEditOnDebts, txSplitOwes.

Several of these were left by the 0.4.0-3 quick-create rework (debtSentence*, debtResult*, debtWalletUnusedLabel). debtResultNow / debtResultWallet / debtWalletNotUsed / debtWalletUnusedLabel are also unused now (DebtResultBox is kept in the kit for the hub only).

## 7. Not debt (excluded on purpose)

- Budgets "รอจ่าย" (`bgFactPending`, expected bills) is a different concept and stays.
- Recurring "ค้าง" (`occurrenceStateNotCreated`, `occurrenceDueSince`), pending "ค้าง {failed}", the card "ยอดค้างชำระ" (accounts), ผู้ติดต่อ / ติดตามยอดเงิน / ติดแท็ก / แตะค้าง / กู้คืน.
