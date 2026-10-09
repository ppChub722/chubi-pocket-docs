# 15 — Slip Import (bank slip → pending drafts)

A bank-app transfer slip (a screenshot the bank app saved to the gallery)
becomes one or two **pending drafts** (spec: pending, migration 46). Nothing
is ever booked straight away — the user confirms in รอยืนยัน, where every
guess below can be fixed.

References: `pending_transactions` (where drafts land), `accounts` (wallet
matching), `categories` (category guess), `imports` module (endpoints).

Status: **draft spec, owner decisions 2026-10-09.** 0.3.1 (image → text)
is built; the rest of this spec is also **0.3.1** (owner: the whole slip
path is 0.3.1). 0.3.2 is free text → LLM → JSON (chat), a separate spec.

---

## 1. Principles (owner)

- **Phone only.** Slip import runs in the Android app; on web the entry
  points are hidden (`SlipQrReader.isSupported`).
- **Uploading a slip = "I want this recorded."** No questions up front;
  the draft is the question.
- **Rules only, no LLM (0.3.1).** Everything (amount, fee, date, masked
  account numbers, payee) is parsed by rule — zero tokens. An LLM
  category guess may join once 0.3.2 brings the LLM in (§6).
- **Unsure → leave it empty.** An empty wallet / category in a draft is
  fine; a wrong one is worse.
- The slip **image is never stored** (beyond the dev-only OCR dump).

## 2. Pipeline

```
phone                                   BE
─────                                   ──
QR (ML Kit) → trans_ref, bank code ──┐
image ───────────────────────────────┼─▶ OCR (tesseract, psm 11)        [0.3.1 ✓]
                                     │      ↓
                                     │   rule parser → ParsedSlip        [0.3.1]
                                     │      ↓
                                     │   wallet match (identifiers) → type, wallet(s)
                                     │      ↓
                                     │   category: payee memory → empty     
                                     │      ↓
                                     └─▶ dedupe (trans_ref) → pending draft(s)
```

## 3. What a slip carries (K PLUS, 12 real slips)

| Field | Example | Source of truth |
|---|---|---|
| Slip kind (header) | โอนเงินสำเร็จ · ชำระเงินสำเร็จ · จ่ายบิลสำเร็จ | OCR |
| Date-time | `9 ต.ค. 69 13:19 น.` (2-digit Buddhist year, Asia/Bangkok) | OCR |
| Sender | name (bank truncates the surname), bank, masked acct `xxx-x-x2780-x` | OCR |
| Receiver | one of: bank acct · PromptPay (`xxx-xxx-4464`) · merchant (shop + company + ref) · biller (name + Ref 1/2) | OCR |
| Amount | `19,241.95` | OCR (12/12) |
| Fee | `0.00` | OCR |
| Transaction ref | `016281153039APM00726` | **QR** (12/12; OCR misreads 0/O) |
| Sending bank | `004` | QR |
| Memo (บันทึกช่วยจำ) | `บันทึกช่วยจำ: ซื้อไอติม` — last line, grey band under the slip, only when the user typed one | OCR (psm 11: 3/3) |

Other banks: **not sampled yet** — add a rule set per bank as slips come in.

### 3.1 QR first, then the bank's rule set (owner rule)

1. **Find the slip QR first** (on the phone). No slip QR → the image is
   **not a slip**: not uploaded, no OCR, status `not_slip`.
2. The QR's **bank code** picks the rule set. No rule set for that bank
   yet → status `unsupported_bank` (the ref is still kept; a later rule
   set or the 0.3.2 LLM can read it).
3. The rule set reads the OCR text (psm 11).

### 3.2 Rule set: KBank / K PLUS (`004`) — from 15 real slips

Text order (psm 11, junk lines in between are ignored):

```
<header>                 โอนเงินสำเร็จ | ชำระเงินสำเร็จ | จ่ายบิลสำเร็จ
<d> <mon>. <yy> <HH:MM> น.
<sender name>            surname cut to its first letter ("นาย ภูมิพิชญ์ เ")
ธ.<bank>
xxx-x-x<4 digits>-x      sender account
<receiver block>         one of:
  transfer → bank:       <name> · ธ.<bank> · xxx-x-x<4>-x
  transfer → PromptPay:  <name> · รหัสพร้อมเพย์ · xxx-xxx-<4> (or a 13-digit id, masked)
  payment (merchant):    <shop name, may wrap> · <company> · <merchant ref digits>
  bill:                  <biller name> · <ref 1> · <ref 2>
จำนวน:          → next amount line   "<n,nnn.nn> บาท"  (บาท may read as uw/um)
ค่าธรรมเนียม:   → next amount line   "<n.nn> บาท"
เลขที่รายการ:   → ref (ignored — the QR's is right; OCR mixes 0/O)
สแกน ตรวจสอบสลิป  (QR caption — ignored)
บันทึกช่วยจำ: <memo>   last line, only if the user typed one
```

- Labels may move: on a bill slip `เลขที่รายการ` comes **before**
  `จำนวน`. Find values by label, not by position.
- An amount is `\d{1,3}(,\d{3})*\.\d{2}`; the first one after `จำนวน:` is
  the amount, the first after `ค่าธรรมเนียม:` the fee.
- Date: `ต.ค.` may read `ต.ุค.` — strip stray marks before matching the
  month table.

## 4. The JSON (what 0.3.1 produces)

**0.3.1 = image → this JSON.** **One image → one JSON** (one
`POST /pending-transactions/scan-slip` call; walking a whole album is
0.3.3). The Imports lab shows it. Its destination is
`pending_transactions`: every item in `pending` is a row as-is
(`source`, `kind`, `draft`, `source_ref`) — saving them is 0.3.3.

Example — slip 041182 (own KBank 2780 → own KBank 0693, memo), with both
wallets' numbers known:

```json
{
  "v": 1,
  "status": "ok",
  "file_key": "1000041182.jpg|115254|1791534700",
  "trans_ref": "016282153110ATF02062",
  "bank_code": "004",
  "slip": {
    "kind": "transfer",
    "occurred_at": "2026-10-09T15:31:00+07:00",
    "amount": 10.00,
    "fee": 0.00,
    "sender":   { "name": "นาย ภูมิพิชญ์ เ",        "bank": "ธ.กสิกรไทย", "masked": "xxxxx2780x" },
    "receiver": { "kind": "bank_account", "name": "นาย ภูมิพิชญ์ เอี๊ยบทวี", "bank": "ธ.กสิกรไทย", "masked": "xxxxx0693x" },
    "memo": "จองโรงแรม",
    "missing": []
  },
  "pending": [
    {
      "source": "ocr",
      "kind": "create",
      "draft": {
        "type": "transfer",
        "amount": 10.00,
        "account_id": "<wallet 2780>",
        "transfer_to_account_id": "<wallet 0693>",
        "date": "2026-10-09",
        "note": "จองโรงแรม"
      },
      "source_ref": {
        "type": "slip",
        "part": "main",
        "trans_ref": "016282153110ATF02062",
        "bank_code": "004",
        "slip_kind": "transfer",
        "occurred_at": "2026-10-09T15:31:00+07:00",
        "payee": "นาย ภูมิพิชญ์ เอี๊ยบทวี",
        "memo": "จองโรงแรม",
        "sender_masked": "xxxxx2780x",
        "receiver_masked": "xxxxx0693x",
        "guessed": { "type": "identifiers", "account": "identifier", "category": "none" }
      }
    }
  ],
  "ocr": { "text": "…", "lines": [ … ], "conf": 91.9, "psm": 11, "ocr_ms": 2625 }
}
```

Rules for the whole JSON:

- `v` — schema version; bump on a breaking change (0.3.2 chat answers
  reuse `pending`).
- **Unknown → key absent** (never `null`, never a guess); `slip.missing`
  names the required ones that couldn't be read.
- `ocr` only with `debug=1` (the lab) — the app doesn't need it.

| `status` | `slip` | `pending` | Decided by |
|---|---|---|---|
| `ok` | full | 1–2 items | BE |
| `incomplete` | partial, see `missing` (`amount`, `occurred_at`) | 1 item with what was read | BE |
| `not_slip` | — | — | **phone** — no slip QR, never uploaded |
| `unsupported_bank` | — (only `trans_ref`, `bank_code`) | — | BE — no rule set for that bank; logged (bank code + user) |
| `duplicate` | — | — | BE, from 0.3.3 (`slip_imports`) |

`receiver.kind`: `bank_account` (name, bank, masked) · `promptpay`
(name, masked) · `merchant` (name, company, ref) · `biller` (name, ref1,
ref2).

### 4.1 `slip` — what was read (no user data)

- `kind`: `transfer` (โอนเงินสำเร็จ) · `payment` (ชำระเงินสำเร็จ) ·
  `bill` (จ่ายบิลสำเร็จ).
- `occurred_at`: Thai month abbreviations (ม.ค. … ธ.ค.); year `69` →
  2569 BE → 2026 CE. Tolerate OCR noise like `ต.ุค.`.
- `masked`: digits kept, every hidden digit as `x`, separators dropped
  (`xxx-x-x2780-x` → `xxxxx2780x`). Bill Ref 1 is kept whole
  (`4784480005601503` — a credit card number).
- `receiver.name`: the payee line — merchant / biller / person. Used for
  the category and the note; **not** matched to contacts (owner: don't
  care who the counterparty is).
- `memo`: the text after `บันทึกช่วยจำ:` (absent when the slip has none).
  One line in every sample; a long memo may wrap — take lines up to the
  end of the text.
- `missing`: required fields the rules couldn't read (`amount`,
  `occurred_at`). Non-empty → the draft keeps what it has; a later
  version may fall back to an LLM / vision read.

## 5. Wallet identifiers

### 5.1 Data

```sql
-- migration 000048_account_identifiers
ALTER TABLE accounts ADD COLUMN identifiers JSONB NOT NULL DEFAULT '[]'::jsonb;
```

```json
[
  { "kind": "bank_account", "value": "1234527806", "bank_code": "004" },
  { "kind": "promptpay",    "value": "0812344464" },
  { "kind": "card",         "value": "4784480005601503" },
  { "kind": "other",        "value": "xxxxx2780x" }
]
```

- `kind`: `bank_account` · `promptpay` (phone or national ID) · `card` ·
  `other`. Custom kinds may come later; JSONB means no migration then.
- `value`: digits, with `x` for digits not known. The user may type a
  full number, or the app saves a **masked** one from a slip (§8) —
  both work. Stored per wallet, so every member of a shared wallet
  benefits.

### 5.2 Matching

Built (`imports/match.go`). Only the caller's **active** wallets (own and
shared) are checked.

- **Same length** (a full number, or a masked one saved from a slip):
  digit by digit, every position where both show a digit agrees, and at
  least 4 were compared.
- **Different length** (the user typed part of it, e.g. `2780`): a run of
  4+ visible digits on the slip appears in the stored value.
- **Kinds per side:** sender → `bank_account` · `other`; receiver
  `bank_account` → `bank_account` · `other`; `promptpay` → `promptpay` ·
  `other`; `biller` → `card` · `bank_account` · `other`; a merchant's ref
  is never ours.
- **Bank:** the QR's bank code is the sender's; an identifier with a
  `bank_code` must agree with it (sender side only).
- Exactly **one** wallet matches → use it. None, or more than one → **no
  wallet** (leave empty). The same wallet on both sides counts as sender
  only.

### 5.3 Direction (sign of the draft)

| Our wallet found on | Draft | Wallet(s) | Fee draft (fee > 0) |
|---|---|---|---|
| sender only | **expense** (−) | `account_id` = sender's | expense from the same wallet |
| receiver only | **income** (+) | `account_id` = receiver's | none — the sender paid it |
| both | **transfer** | `account_id` → `transfer_to_account_id` | expense from the sending wallet |
| neither | **expense** (default) | empty | expense, wallet empty |

Covers own-account moves (the 30,000 slip `2780 → 0693`) and card bills
(Ref 1 = a card wallet's number → transfer to the card).

## 6. Category

1. **Payee memory** — the user's latest *confirmed* transaction from a
   slip with the same payee name → its category. Free, and gets better
   with use.
   Needs confirmed slip drafts to learn from — so it only starts answering
   once 0.3.3 saves drafts (the payee + final category get kept on
   submit, e.g. in `slip_imports`). In 0.3.1 the category is empty.
2. Otherwise **empty** — the user picks it on the pending page, which
   also teaches step 1 for next time.

Later (after 0.3.2 brings the LLM): between 1 and 2, ask the LLM — memo
(the best hint: "ซื้อไอติม", "จองโรงแรม") + payee name + slip kind + the user's categories as an enum → one category id or
none (~200 tokens, a small model).

Transfers get no category (as today).

## 7. `pending` — the drafts

One item for the slip (`part: main`), plus one for the fee
(`part: fee`) when `fee > 0` and we paid it (§5.3).

`draft` is the pending `Draft` (= the `POST /transactions` body, every key
optional):

| Key | From |
|---|---|
| `type` | §5.3 — `expense` · `income` · `transfer` |
| `amount` | slip amount (fee item: the fee) |
| `account_id` | §5.3 — absent when no single wallet matched |
| `transfer_to_account_id` | transfers only |
| `category_id` | §6 — absent when unknown; never on transfers |
| `date` | `occurred_at` as **`YYYY-MM-DD`** (Bangkok) — transactions are date-only |
| `note` | `memo` if the slip has one, else the payee (fee item: `ค่าธรรมเนียม · <payee>`) |

`source_ref` keeps what the draft can't: the time (`occurred_at`), the
slip's own ref + bank (dedupe, §9), payee + memo (category memory, §6),
both masked numbers ("remember this number", §8), and `guessed` — how
each guess was made (`account: identifier | none`,
`category: payee_memory | none`) so the pending card can say so and the
app knows when to offer §8. Display only — submit never reads it.

The fee item: `type: expense`, the paying wallet, and the user's **fee
category** — set by a switch "ใช้เป็นหมวดค่าธรรมเนียม" on the category
edit page (expense categories, one at a time), stored as
`user_preferences.preferences.fee_category_id` (no migration). Not set, or that
category was deleted → no category.

## 8. Remember a number (pending page)

When a slip draft has **no wallet** and the user picks one, the app asks
once: **"จำเลข xxx-x-x2780-x ไว้กับกระเป๋านี้ไหม"**. Yes →

`POST /v1/accounts/:id/identifiers` `{kind, value, bank_code?}` — appends
(skips an identical one). Next slip from that account picks the wallet
by itself; the user never has to type numbers into the wallet page.

The masked number comes from the draft's `source_ref.slip`
(`sender_masked` for expense, `receiver_masked` for income).

## 9. Dedupe

```sql
-- migration 000051_slip_imports (replaces the 0.3.0 in-memory "seen" map)
CREATE TABLE slip_imports (
    id          UUID PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_key    VARCHAR(300),
    trans_ref   VARCHAR(64),
    bank_code   VARCHAR(8),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX ON slip_imports(user_id, file_key)  WHERE file_key  IS NOT NULL;
CREATE UNIQUE INDEX ON slip_imports(user_id, trans_ref) WHERE trans_ref IS NOT NULL;
```

- `/slip-imports/check` answers by `file_key` (before upload).
- `scan-slip` with a `trans_ref` already in the table → **no draft**,
  answer `duplicate: true` (same slip saved twice / renamed / re-shot).
- `DELETE /slip-imports` clears the user's rows ("ล้างประวัติการสแกน").

## 10. Phasing

| Version | Ships |
|---|---|
| **0.3.1** (done) | OCR (tesseract, psm 11) · QR on phone · Imports lab |
| **0.3.1** (BE done) | rule parser (K PLUS) · `accounts.identifiers` (migration 48, create/update + `POST …/identifiers`) · matching + direction · `fee_category_id` preference · `scan-slip` → §4 JSON |
| **0.3.2** (FE, moved from 0.3.1) | wallet page: identifiers section (show/hide numbers, bank picker) · category page: fee-category switch |
| **0.3.3** | the JSON's `pending` items saved to pending · `slip_imports` (migration 51) dedupe · "remember this number" prompt · import button + album picker + progress chip |
| **0.3.2** | free text → LLM → JSON (chat box); LLM category for slips can reuse it |

## 11. Open

- **Reporting — built (0.3.1, owner: no cron, we read it on our own
  schedule):** `import_logs` (migration 50) gets a row the moment a slip
  hits an `unknown_provider` (QR bank code not in `payment_providers`,
  migration 49), an `unsupported_bank` or an `incomplete` read — user,
  bank code, ref, details; never the slip's text or image. Queries in
  ops-runbook §3. Bank picker on the wallet page reads
  `GET /v1/payment-providers`.
- **Later, with the LLM (0.3.2):** `unsupported_bank` → read the OCR text
  with the LLM instead of rules. Sending the slip text/image itself to the
  team needs the user's consent first.
- Other banks' layouts (SCB, Krungthai, …) — waiting for sample slips.
- Shared wallet: two members importing the same slip → dedupe is per
  user today, so both could book it. Revisit if it happens.
