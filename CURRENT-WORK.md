# Current Work — สมุดปูมงาน (append-only)

> **กติกาไฟล์นี้:** เขียนต่อท้ายเรื่อย ๆ **ไม่แก้ของเก่า** — entry ใหม่สุดอยู่**บนสุด** (ใต้หัวข้อนี้)
> ใช้ส่งงานข้ามเครื่อง/ข้ามวัน: อ่านอันบนสุดก็รู้ว่าตอนนี้ค้างอะไร ทำอะไรไปแล้ว
>
> **ของที่ git ไม่พาไป:**
> - **SSH เข้า VPS** — อย่าก๊อป private key ข้ามเครื่อง! แต่ละเครื่องสร้าง key ของตัวเอง แล้วแปะ public key ที่ VPS (วิธีเต็มดู entry 2026-09-17 หัวข้อ "SSH หลายเครื่อง")
> - Auto-memory ของ Claude Code (`~/.claude/.../memory/`) — local machine, ไม่ sync
>
> **เริ่มงานบนเครื่องใหม่เสมอ:** `git pull origin main` ทุก repo (app / be / web / docs)
> **Infra bible:** [engineering/ops-runbook.md](engineering/ops-runbook.md) — ทุกคำสั่ง deploy/backup/gotcha อยู่นั่น

---

## 2026-10-09 (4) — UI unification รอบใหญ่: top bar ใหม่ · ปุ่มย้ายลงหน้า · กระเป๋า/งบ/เป้าออมเป็นหน้าเดียว · รายการประจำเข้า quick create (ยังไม่ commit)

> อยู่ในขอบเขต **0.3.0** (release owner = session `chubi-pocket-6f`, ดู entry 3) · session นี้ทำงานคู่กับ entry ล่าง (อีก session) ใน working tree เดียวกัน — ตอน commit แยกตามหัวข้อ · app analyze ผ่าน · test 43 ผ่าน · `dart format` ไฟล์ที่แก้แล้ว · **ยังไม่ได้รันบนเครื่อง** (owner รันเอง: `cd chubi-pocket-app && ./run-web.sh`)

### 1. กติกา UI ที่ owner ตัดสินวันนี้
- **Top bar = `[← │ title]` + ⏳🔔👤 เท่านั้น ทุกหน้า ทุกโหมด** — ไม่มีปุ่มของหน้าเลย (แม้แก้/ลบ) · `AppTopBar` ไม่มีพารามิเตอร์ `actions` แล้ว (`AppBarAction` ลบทิ้ง) · โหมดแก้: ← เป็น ✕, ชิปยังอยู่
- **ปุ่มย้ายลงในหน้า:** ✏️ = ดินสอบน `HeaderCard(onEdit:)` + กดค้าง · 🗑/🗄 = `DangerRow` (ใหม่, แถวแดงท้ายหน้า เฉพาะโหมดแก้; detail รายการ/รายการประจำโชว์ตลอด) · ➕ = `AddTile` ท้ายรายการ + หน้าว่าง · เชิญสมาชิก/อ่านทั้งหมด/ตั้งค่าแจ้งเตือน/นำเข้าสลิป = อยู่ในเนื้อหน้า
- **Top bar ลอยทุกหน้า:** `extendBodyBehindAppBar` + เนื้อหาเว้น `MediaQuery.paddingOf(context).top` · หน้า root ใช้ `TabRootScaffold` · `PullToRefresh` เลื่อน spinner ลงใต้ bar เอง
- **การ์ดเลือกค่า:** `PickCard` (shared) + `CategoryPickCard` / `WalletPickCard` — เลือกแล้วใช้สี/ไอคอนของหมวด/กระเป๋า (กระเป๋าหน้าตาเหมือนการ์ดกระเป๋า) · ยังไม่เลือก = เส้นประ · ไม่มี ✕ (เอาออกให้เลือก "ไม่ระบุ" ใน picker)
- **สีกลุ่มโมดูล:** `ModuleColors` (`core/theme/module_colors.dart`, ThemeExtension) คลัง/คน/วางแผน ต่อธีม (Sweet ชมพู·พีช·ม่วง / Mint มรกต·ฟ้า·คราม) · ใช้ที่หน้าเพิ่มเติม · ดูได้ที่ `/dev` theme preview

### 2. Shell / nav
- Bottom bar ลอยทรงแคปซูล · แท็บที่เลือกขยายเป็นไอคอน+ชื่อ · ปุ่ม `+` ขนาด 76 ล้นขอบบนล่างเท่ากัน มีวงแหวนสีพื้น
- เปลี่ยนแท็บ fade (`FadeBranchContainer`, router ใช้ `StatefulShellRoute(navigatorContainerBuilder:)`) · nav ซ่อน/กลับแบบเลื่อน · shell ไม่ถือ top bar แล้ว (กันหน้ากระโดดตอน push)
- **บั๊กแก้:** ออกจากฟอร์มแล้ว bottom bar หาย (`ShellChromeController` notify กลาง frame → เลื่อนไปหลัง frame)
- เงาปุ่มโปรไฟล์ตาม shape ของ avatar · หน้าเพิ่มเติมไม่มี title

### 3. Module ที่รื้อเป็นหน้าเดียว (สร้าง/ดู/แก้, `EditModeMixin`)
- **กระเป๋า** (`AccountDetailPage({accountId, startEditing})`): การ์ดหัว = ดีไซน์การ์ดกระเป๋า + ปุ่ม [ปรับยอด] · ปรับยอดเป็น sheet (`adjust_balance_sheet.dart`) มีแจ้งว่าจะสร้างรายการ · หมวด "การแชร์และรายงาน" (สมาชิก + รวมในรายงาน) แทน settings sheet · ประเภทเป็นการ์ด 3+2 (`SelectCardGroup(columns:)`) · ไม่มีช่องสกุลเงิน (สร้าง = สกุลเงิน user) · หน้ารวมมีการ์ดสรุป (ยอดสุทธิ · สัดส่วนตามประเภท · หนี้บัตร · กองกลาง · วงเงิน) + grid 2 คอลัมน์ · ลบ `account_form_page`, `wallet_settings_sheet`, `add_account_tile`
- **งบประมาณ** (`BudgetDetailPage({id, startEditing})`): หน้ารวมมี dashboard จาก overview API (ใช้ไป/เพดาน/เหลือ/เกินกี่งบ, สลับรอบ, จัดกลุ่มตามรอบ) · "คำอธิบาย" → "ชื่องบ" · รอบเป็นการ์ด 3 ใบ · ตัด helper · เปลี่ยนหมวดได้ · เก็บถาวร+ลบอยู่ท้ายโหมดแก้
- **เป้าออม** (`SavingGoalDetailPage({id, startEditing})`): แบบเดียวกัน · กระเป๋าล็อกหลังสร้าง · เก็บถาวร+ลบท้ายโหมดแก้
- route `/x/new` → create, `/x/:id/edit` → detail `startEditing: true` · ลบ form page ทั้ง 3
- หน้า detail จำข้อมูลล่าสุดไว้ตอนกำลังปิดหลังลบ/เก็บ (ไม่แวบ "ไม่พบ")

### 4. รายการประจำ → quick create โหมด `scheduled:` (ตามกติกา "ฟอร์มรายการมีที่เดียว")
- `showQuickCreateSheet(context, scheduled: true[, scheduledEntry: e])` · ฟิลด์เฉพาะอยู่ `draft_form_scheduled.dart` (`part of draft_form.dart`): ประเภทรายการประจำ/ผ่อน/กู้, รอบ, วันตัดถัดไป, ยอดรวม/ดาวน์/งวด/ดอกเบี้ย, ไอคอน, ชื่อ — ครบตามฟอร์มเดิม
- detail = ดูอย่างเดียว · ดินสอเปิด sheet · ลบเป็นแถวแดงท้ายหน้า · หยุด/ทำต่อ/ยกเลิก ที่ status pill · ลบ route `/scheduled-transactions/new` และ `/:id/edit` + `ScheduledTransactionFormPage`

### 5. BE + docs
- **BE `budgets`:** `PUT /v1/budgets/:id` รับ `category_id` (ต้องเป็นหมวดรายจ่ายของเจ้าของงบ, ซ้ำ → `DUPLICATE_BUDGET`) · build/vet/test ผ่าน · **ยังไม่ deploy**
- docs: spec `08-budgets.md` §3.4 + `phase1c/overview.md`

### 6. เก็บเศษ
- `showAppSnackBar` ทุกที่ (+ `showAppSnackBarOn(messenger, …)` ใช้หลัง await/pop) · spinner → skeleton (โหลดเพิ่มท้ายรายการ, แจ้งเตือน, สมาชิก, event sheet) · `Icons.*` → `AppIcons` (เพิ่ม trend/language/font/lightMode/darkMode/email/chevronLeft) · picker 3 ตัวเปิดด้วย `showAppSheet` · category picker ไม่มี ✓ ใช้แถวไฮไลต์ · ไอคอนหมวดในแถวรายการ = `IconDisplay` สีตามหมวดแม่ · ช่องค้นหารายการมี hint · เปลี่ยนรหัสผ่านใช้ `AppTextField`
- **บั๊กแก้:** spinner โผล่ท้ายรายการทุกครั้งที่เปลี่ยน filter (`TransactionsState.loadingMore` แยกจาก `status`)
- โปรเจกต์: ปุ่มเพิ่มรายการในแท็บแดชบอร์ด + แท็บรายการ · โหมดแก้เลื่อนได้ (ไม่ล้นจอตอนคีย์บอร์ด)

### 7. รอบเก็บท้าย (owner สั่ง)
- **ยอดติดลบได้:** `AmountField(allowNegative:)` มีชิป ± สลับเครื่องหมาย (`ThousandsInputFormatter(allowNegative:)` รับ `-` นำหน้า, test ใหม่ `test/shared/amount_field_test.dart`) · ใช้ที่ยอดเริ่มตอนสร้างกระเป๋า + sheet ปรับยอด ทุกประเภท (บัตร: ยอดค้างติดลบ = จ่ายเกิน)
- **ปรับยอดมีโน้ต:** sheet คืน `({balance, note})` → ส่ง `note` ไป API
- **BE `accounts` บั๊ก:** `AdjustBalanceRequest.NewBalance` เป็น `*float64` — เดิม `required` บน float64 ทำให้ปรับยอดเป็น **0 พอดีไม่ได้** · build ผ่าน · ต้อง deploy คู่ budgets
- **l10n:** ลบ key ที่ไม่มีโค้ดใช้ 152 ตัว (เหลือ 1028, en = th) · เว้น `common*` / `pending*` (ฟีเจอร์สแกนสลิปที่กำลังทำ) / `quick*` (ชิปหมวดล่าสุดที่พักไว้) · สคริปต์ตรวจ: `node unused_l10n.js` (อยู่ใน scratchpad ของ session — ถ้าจะใช้ซ้ำควรย้ายเข้า `app/scripts/`)
- ตัวเลือกคำอธิบายโหมด event → `showAppSheet` + `AppTextField` + `AddTile` + `SectionHeader` + `DetailRow`
- `AppIcons.pause` / `resume` / `stop` → เมนูเปลี่ยนสถานะรายการประจำ (ไอคอนสีตามสถานะปลายทาง)

### ค้าง / ต่อไป
1. **owner:** ทดสอบบนเครื่อง · แยก commit (app/be/docs; ไฟล์ของอีก session ปนอยู่ · `be/internal/modules/personal_debts/store.go` ไม่ใช่ของ session นี้) · deploy BE (budget category + adjust-balance 0)
2. ยังเหลือเล็ก ๆ: sheet ตัวเลือกสมาชิกโปรเจกต์ใช้ `ListTile` ดิบ · การ์ด Stats ของรายการประจำยังเป็น Card เดิม
3. "นำเข้าจากสลิป" ยังไม่ทำงาน (ดู entry ล่าง ข้อ 4)

---

## 2026-10-09 (3) — แผนเวอร์ชัน 0.3.x (owner ตัดสินแล้ว)

> เริ่ม 0.3.1 **หลัง** 0.3.0 deploy แล้วเท่านั้น · ทั้งหมดอยู่ใน Go service เดิม (module `imports` / `parse` หลัง interface `Parser`) — ไม่แยก service

| เวอร์ชัน | ขั้น | ทำอะไร |
|---|---|---|
| **0.3.0** | ปล่อยของที่ทำแล้ว | entry (2) + entry 2026-10-09 ข้างล่าง · release owner = Claude session `chubi-pocket-6f` |
| **0.3.1** | **image → text** | Tesseract OCR (Apache 2.0) บน BE: `tesseract-ocr` + `tha` (ลอง `tessdata_best`) ใน Docker image, เรียกผ่าน CLI · ปรับรูปก่อน OCR (ขาวดำ/ขยาย/คอนทราสต์) · ได้ข้อความ + ตำแหน่ง (TSV) · แอปอ่าน QR สลิปบนเครื่องก่อน (ไม่มี QR / `trans_ref` ซ้ำ → ข้าม) · วัดผลกับสลิปจริง 10–20 ใบจาก owner · Imports lab โชว์ข้อความที่ OCR ได้ |
| **0.3.2** | **text → JSON** | LLM (Anthropic, Go SDK `anthropic-sdk-go`, structured outputs `output_config.format` — ห้ามใช้ forced `tool_choice`, Opus/Sonnet 5.5 ตอบ 400) จัดข้อความ OCR / ข้อความแชตเป็น JSON ร่าง · ส่งวันนี้ (Asia/Bangkok) + หมวด/กระเป๋าของผู้ใช้เป็น enum + ชื่อเจ้าของบัญชี · ไม่มั่นใจ → fallback ส่งรูปให้ LLM อ่านเอง · ข้อความแชตสั้นใช้กฎก่อน (ตัวเลข/คำบอกวัน/ประวัติหมวด) ค่อย LLM · model ยังไม่เลือก (แนะนำ Opus 5.5 เริ่ม, config แยกสลิป/ข้อความ) · ต้องมี API key + ตั้งเพดานใช้จ่ายใน Console · log `usage` ทุก call |
| **0.3.3** | **JSON → ทุก module** | เอา JSON ไปใช้จริงทุก module (สร้างร่างใน pending, รายการ ฯลฯ) · ตาราง `slip_imports` แทน memory · ผูกปุ่ม Import / แชต / progress chip ในแอป |

ประมาณการค่า LLM (ใช้ทุกวัน, ถ้าส่งรูปทั้งหมด): ปกติ (สลิป 5 + ข้อความ 5/วัน) Opus 5.5 ~$4.5/เดือน · Sonnet 5.5 ~$2.3 · Haiku 4.5 ~$0.8 — ส่งเป็นข้อความ OCR แทนรูปจะถูกลงอีกราวครึ่ง

---

## 2026-10-09 (2) — 0.3.0 ต่อ: หนี้สิน "List failed" · loading/error/empty กลางทั้งแอป · run-web.sh · สี status bar (ยังไม่ commit)

> ส่วนหนึ่งของ 0.3.0 เหมือน entry ข้างล่าง — ทำคู่กันวันเดียวกัน ตอน commit แยกตามหัวข้อ

### 1. BE: หน้าหนี้สินขึ้น "List failed" (500)
- **สาเหตุ:** migration 45 เพิ่ม `counterpart_debt_id` เข้า `debtColumns` แล้ว แต่ `Store.List` (`be/internal/modules/personal_debts/store.go`) scan เองแยกจาก `scanDebt` และไม่ได้อัปเดต → query คืน 17 คอลัมน์ แต่มีตัวรับ 16 ตัว → pgx error
- **แก้:** เพิ่ม `&v.CounterpartDebtID` ใน scan ของ `List` · `go vet` ผ่าน · query อื่นใช้ `scanDebt` อยู่แล้ว ไม่โดน
- **ยังไม่ rebuild / deploy**

### 2. App: loading / error / empty ใช้กติกาเดียวทุกหน้า
- **ปัญหาเดิม:** โหลดไม่สำเร็จแล้ว list ว่าง → หน้าจอขึ้น "ยังไม่มี…" + snackbar error (เหมือนไม่มีข้อมูล) · หน้า detail ขึ้น "ไม่พบ…" แทน error · เปิดหน้าครั้งแรกเห็น empty แวบก่อนโหลด
- **Widget กลาง `AsyncStateView`** (`shared/widgets/async_state_view.dart`, อยู่ใน `ui.dart` + gallery หมวด Feedback):
  | ยังไม่มีข้อมูล + | แสดง |
  |---|---|
  | กำลังโหลด (รวม `initial`) | skeleton |
  | error | `ErrorView` + ปุ่มลองอีกครั้ง |
  | โหลดเสร็จ ว่าง | empty ของหน้านั้น (ส่งมาเอง) |
  | **มีข้อมูลอยู่แล้ว** | แสดงข้อมูลต่อ · refresh ไม่สำเร็จ → snackbar ภาษาไทย (`ErrorView.titleFor`) |
  - `AsyncStateView.fallback` สำหรับหน้า detail: skeleton → error → "ไม่พบ…"
  - `snackOnRefreshError: false` ใช้ที่ home (มี banner แดงของตัวเองตอนข้อมูลเก่า)
- **Cubit 14 ตัว:** `String? errorMessage` → `ApiException? error` (มี getter `errorMessage` ไว้ให้โค้ดเดิม) · `load()`/`loadMore()` จับ error ทุกชนิด → `ApiException.from(e, st)` (error ที่ไม่ใช่ API เช่น parse JSON พัง → log + เข้า error state แทนค้าง skeleton)
- **หน้าที่ย้ายมาใช้:** list — หนี้สิน, budgets, saving goals, scheduled, projects, contacts, tags, categories, notifications, pending, กระเป๋า, กระเป๋าเก็บถาวร, transactions, home · detail — account, budget, goal, scheduled, transaction, หนี้รายคน
- **บั๊กเล็กที่แก้ไปด้วย:** contacts filter เก็บถาวรแล้วว่าง → ขึ้น "ไม่พบ" (เดิม "เพิ่มคนแรก") · category detail หาไม่เจอ → "ไม่พบหมวดหมู่" (l10n ใหม่ `categoryDetailNotFound*`, เดิมขึ้น "ยังไม่มีหมวดหมู่") · notification settings โหลดไม่สำเร็จ → `ErrorView` (เดิมค้าง skeleton + snackbar "บันทึกไม่สำเร็จ") · กระเป๋าเก็บถาวรโหลดไม่สำเร็จ (เดิมขึ้นเหมือนไม่มี)
- `transactionsListRetry` (l10n) ไม่มีใครใช้แล้ว — ยังไม่ลบ
- test ใหม่ `test/shared/async_state_view_test.dart` (6 เคส) · analyze ผ่าน · test 43 ผ่าน

### 3. `run-web.sh` (เปิดเว็บขนาดมือถือ) — แก้ขนาดหน้าต่าง + แท็บ `0.0.3.147`
- **สาเหตุ:** `--web-browser-flag` ของ flutter ตัดค่าที่คอมมา → Chrome ได้ `--window-size=412` กับ `915` แยกกัน → `915` ถูกเปิดเป็น URL = IP `0.0.3.147` · และหน้าต่าง Chrome แบบปกติบน Windows แคบกว่า ~500px ไม่ได้อยู่แล้ว (วัดจริงได้ 516) · flutter `-d chrome` ยังจำขนาดหน้าต่างล่าสุดไว้ใน `.dart_tool/chrome-device`
- **แก้:** flutter รัน `-d web-server --web-port=5173` · script รอ server แล้วเปิด Chrome เองแบบ `--app` + `--window-size` + profile แยก (วัดจริงได้ 412×915 / 390×844) · r/R ยัง hot reload ได้ · ปิดหน้าต่างแล้วต้องกด `q` เอง · รันขนาดใหม่ต้องปิดหน้าต่างเก่าก่อน
- `launch.json`: ลบ config "web (phone · VPS)" (ทำขนาดมือถือไม่ได้) เหลือ "full" + comment ให้ใช้ `./run-web.sh`

### 4. Android: icon บน status bar (เวลา/แบต) เป็นสีขาวบนพื้นขาว
- **สาเหตุ:** `AppTopBar` เป็น `AppBar` พื้นโปร่งใส → Flutter เดาว่าพื้นมืด (ค่า 0 = ดำ) → ใช้ icon ขาว
- **แก้:** `ThemeBuilder.systemBarsStyle(background)` เลือกสี icon จาก**สีพื้นหลังจริง** (`estimateBrightnessForColor`) — ใส่ใน `appBarTheme.systemOverlayStyle` + `AnnotatedRegion` ที่ราก app (หน้าที่ไม่มี AppBar) · ครอบ nav bar ล่างด้วย
- หน้าในอนาคตที่มี header สีเข้มชิดบนจอ → ต้องครอบ `AnnotatedRegion` ด้วยสีของตัวเอง

### ค้าง / ต่อไป
1. owner: rebuild + deploy BE (ข้อ 1) · ทดสอบบนเครื่อง: หน้าหนี้สิน, ปุ่มลองอีกครั้ง (ปิดเน็ตแล้วเปิดหน้า), status bar ธีมสว่าง/มืด, `./run-web.sh`
2. แยก commit ตามหัวข้อ (รวมกับหัวข้อของ entry 0.3.0 ข้างล่าง)
3. ถ้าอยากกด F5 แล้วได้ขนาดมือถือ → ทำ VS Code task เปิดหน้าต่าง `--app` คู่ web-server (ยังไม่ทำ)

---

## 2026-10-09 — 0.3.0 เริ่ม: quick create เป็นฟอร์มกลาง · tag โปรเจกต์ · stub นำเข้าสลิป/ข้อความ (ยังไม่ commit)

> มีหลาย agent ทำงานพร้อมกันวันนี้ — working tree ของ app/be ปนงานหลายเรื่อง ตอน commit ให้แยกตามหัวข้อด้านล่าง

### 1. Quick create = ฟอร์มกลางของทุกการสร้าง/แก้รายการ
- **กติกา (owner):** อะไรที่สร้าง/แก้ transaction → ใช้ quick create sheet (`showQuickCreateSheet`) หรือ custom จากมัน — ห้ามมีฟอร์มแยกใหม่
- **`DraftForm` + `DraftFormController`** (`app/lib/features/transactions/presentation/widgets/draft_form.dart`) = ฟิลด์ข้างใน sheet แยกออกมาให้ใช้ซ้ำ: ประเภท · ยอด · การ์ดหมวด + กระเป๋า (`CategoryPickCard` / `WalletPickCard`) · วันที่ + โน้ต · "รายละเอียดเพิ่ม ▾" (ปิดไว้ก่อน, เปิดเองถ้ามีของ): แท็ก · หาร · ช่องเสริม
- **โหมดของ sheet** (`quick_create_sheet.dart`):
  | เรียกด้วย | ใช้ตอน | ปุ่มล่าง |
  |---|---|---|
  | (ไม่มี) | `+` bottom bar, ปุ่ม "เพิ่มรายการแรก" | บันทึกร่าง · บันทึก |
  | `draft:` | แตะการ์ดในหน้ารอยืนยัน | บันทึกร่าง · ยืนยันรายการนี้ · ทิ้ง |
  | `transaction:` | ปุ่มแก้ไขในหน้า detail | บันทึก — ประเภทล็อก, ซ่อนหาร/อีเวนต์ (create-only), แถวของสมาชิกอื่นแก้หมวดไม่ได้, แถว ex-member อ่านอย่างเดียว |
  | `project:` (+ `projectRow:`) | เพิ่ม/แก้รายการในโปรเจกต์ | บันทึก — ดูข้อ 2 |
- เปิดแบบ `draft:`/`transaction:` จะ **รอ cache กระเป๋า/หมวดโหลดก่อน** (เดิม cold start แล้วช่องว่าง)
- **ลบของเก่า:** `TransactionFormPage`, `TransactionFormBody`, `EventSection`, `ProjectTransactionFormPage` · route `/transactions/new`, `/transactions/:id/edit`, `/projects/:id/transactions/new` · l10n key ที่ไม่มีใครใช้แล้ว
- chip "หมวดล่าสุด" ใน quick create ถูกเอาออก (ใช้การ์ดแทน) — owner ยังไม่ได้ตัดสินว่าจะเอาคืนไหม
- ยังไม่ย้าย: ฟอร์มรายการตั้งเวลา (`/scheduled-transactions/new`)

### 2. โปรเจกต์: หมวด → tag, โหมด event
- **BE migration `000047_project_transaction_tags`:** `project_transactions.tags TEXT[]` · ชื่อหมวดเดิมย้ายเป็น tag แรก (ไอคอนทิ้ง) · ลบ `category_name` / `category_icon_code`
- tag เก็บเป็น array บนแถว (ไม่มีตารางแยก) → รายชื่อ tag ของโปรเจกต์ = รวมจากทุกแถว, tag ที่ไม่มีใครใช้หายเอง · BE trim + dedupe ไม่สนตัวพิมพ์ (`normalizeTags`)
- **API:** create/update project row รับ `tags: [string]` (update: ส่ง = แทนที่ทั้งชุด) · ใหม่ `GET /v1/projects/:id/tags` → `{data:[{name,count}]}` ใช้บ่อยสุดก่อน · summary `by_category` → `by_tag` · "คัดลอกเข้าสมุดตัวเอง" จับคู่หมวดของผู้ใช้จากชื่อ tag
- **App โหมด event** (`draft_form_event.dart`, `part of draft_form.dart`): จ่าย/รับ (ไม่มีโอน) · ยอดตามสกุลเงินโปรเจกต์ · `MemberPickCard` คนจ่าย (default = ฉัน, แก้แถวเดิมแล้วล็อก) · คำอธิบาย = แตะแล้วเลือกจากที่เคยใช้ในโปรเจกต์/พิมพ์ใหม่ · ใน "รายละเอียดเพิ่ม": โน้ต · tag (chip + "แท็กใหม่") · หารกับสมาชิก + หารเท่ากัน
- หน้าโปรเจกต์: หัวแถว = คำอธิบาย (ไม่มี → tag แรก) · บรรทัดรองมี `#tag` · dashboard "แท็กที่ใช้มากสุด" · ค้นหา/เรียงตาม tag

### 3. หน้ารอยืนยัน (Pending) — UI ใหม่
- แถว "เลือกทั้งหมด" ใต้ top bar (แทนปุ่ม ✓ มุมขวาที่ไม่มีใครเข้าใจ) · ลบ subtitle "ยังไม่นับในยอด…"
- ปุ่ม **นำเข้าสลิป** มุมขวาบน (ยังไม่ทำอะไร) · ปุ่มลอย **ChatDial** มุมขวาล่าง กดแล้วขยายเป็นช่องพิมพ์แบบแชต (ส่งยังไม่ทำอะไร)
- "เพิ่มร่าง" อยู่ใต้การ์ดสุดท้าย · ปุ่ม "ยืนยันที่เลือก" ปุ่มเดียว โผล่เมื่อมีที่ติ๊ก
- `/pending/new` (เพิ่มหลายร่าง) = หลายแถวของ `DraftForm` (โหมด compact)
- widget กลางใหม่ (อยู่ใน `ui.dart` + gallery): `ChatDial` · `AppIconButton(activity: none|progress|done)` สำหรับ chip รอยืนยันตอนสแกน (ซ่อน badge + แถบ progress ใต้ไอคอน → ✓ + badge กลับ → กดเข้าไปแล้วหาย) — **ยังไม่ผูกกับ chip จริง**

### 4. นำเข้าสลิป / ข้อความ → ร่าง — BE เป็น STUB
- **Flow ที่ตกลง:** สแกนเฉพาะตอน user กด (ปุ่ม หรือแตะ notification รายวัน) — ไม่มี background scan · อ่านอัลบั้มสลิปของแอปธนาคารที่เลือกไว้ → ส่ง**แค่ชื่อไฟล์**ไปเช็ค → BE ตอบอันไหนใหม่ → ตรวจ QR บนเครื่อง (ได้ `trans_ref`) → อัปโหลดเฉพาะอันใหม่ → BE อ่านด้วย LLM แล้วสร้าง pending (`source='ocr'`, ข้อมูลสลิปใน `source_ref`) · ไม่เก็บรูป · กันซ้ำ 2 ชั้น: file key + `trans_ref`
- **Endpoint stub** (`be/internal/modules/imports/`) — ตรวจ request · log ว่าสำเร็จ + payload · echo กลับ · ยังไม่ parse ไม่สร้างร่าง:
  - `POST /v1/slip-imports/check` `{files:["name|size|modified"]}` → `{new_files, seen_files}`
  - `POST /v1/pending-transactions/scan-slip` multipart `image` (≤10 MB) · `file_key` · `trans_ref` → echo metadata, จำ `file_key` ว่าเห็นแล้ว
  - `DELETE /v1/slip-imports` → ล้างประวัติ
  - `POST /v1/pending-transactions/parse-text` `{text}` → echo
  - "เห็นแล้ว" เก็บใน memory (restart หาย) — ของจริงย้ายไปตาราง `slip_imports`
- **ทดสอบจากแอป:** Dev hub → **Imports lab** (`/dev/imports`) — การ์ด Slip flow โชว์ทีละขั้น (ชื่อที่ส่ง → check → NEW/SEEN → อัปโหลดทีละไฟล์) + การ์ด chat · โชว์ request / status / response
- **รอ owner:** Anthropic API key + ยืนยันส่งรูปสลิปไป API ได้

### ค้าง / ต่อไป
1. owner: รัน migration 47 · rebuild BE · ทดสอบบนเครื่อง · แยก commit · deploy
2. Parser จริง (LLM, structured output) + ตาราง `slip_imports` + `scan-slip` สร้าง pending จริง → แล้วผูก chat กับ `parse-text`
3. แอปนำเข้าสลิป: หน้าตั้งค่า `/settings/slip-import` (เลือกอัลบั้ม, ย้อนกี่วัน, notification รายวัน) · `photo_manager` + ML Kit barcode · ผูกปุ่ม/progress chip
4. OCR ใบเสร็จจากกล้อง — ยังไม่เริ่ม
5. **เฟสหน้า (ตกลงแล้ว):** ข้อมูล DB ทิ้งได้ → squash migration เป็น baseline + script `reset-db` / `seed-dev` + สูตร reset บน prod
6. docs spec/API (pending, tag โปรเจกต์, imports) ยังไม่อัปเดต — entry นี้คือแหล่งอ้างอิงไปก่อน

---

## 2026-10-07 — ช่องโหว่ BE + API contract + routing + icon maker ใหม่ (ยังไม่ commit)

- **BE security** (`personal_debts`): create/update debt + split ตรวจว่า contact เป็นของผู้ใช้ → `400 CONTACT_NOT_FOUND` · `people` กรอง contact ตาม user · เจอช่องโหว่หนักกว่าเดิม: split ด้วย contact คนอื่นสร้างหนี้ใส่บัญชีคนอื่นได้ — แก้แล้ว
- **BE** `IconCode.Shape` (+ allowlist, test) · `go build` ผ่าน · test ผ่าน ยกเว้น `projects/quick_test.go` ที่ compile ไม่ผ่านมาก่อน
- **API contract**: [design/api/ux-overhaul-contract.md](design/api/ux-overhaul-contract.md)
- **Routing** (แผน §2): settings/notifications เป็นชั้น overlay · FAB ทุกหน้า · ไฮไลต์ "เพิ่มเติม" · หมวดหมู่กลับเข้า shell · ฟอร์มซ่อน nav (`ShellChromeHider`) · ลบ `MainTopBar` · แก้ top bar ซ้อนหน้ารายการ
- **Icon maker ใหม่ + shape** ตาม mockup v7 · gallery มีทรงทั้งหมด · app analyze ผ่าน · test 33 ผ่าน
- ต่อไป: หมวดหมู่ → แท็ก → ผู้ติดต่อ (แผน §4–6)

---

## 2026-10-06 — Phase 2 UX overhaul: วางแผน + widget กลาง + icon maker mockup

**แผนหลัก:** [product/phase2/ux-overhaul-plan.md](product/phase2/ux-overhaul-plan.md) (กติกา UI ทั้งแอป, routing, ทุกหน้า, BE backlog §14, บั๊กที่เจอ §15)

### ทำเสร็จ ✅ (ยังไม่ commit — อยู่ใน working tree ของ app)
- สแกน BE ครบ → ผลอยู่ในแผน §14–15
- Shared UI kit `lib/shared/widgets/ui.dart` (ปุ่ม, ช่องกรอก, chip/popover, detail rows, sheet, MoneyText + 👁, ModeActionBar ฯลฯ) + `AppTopBar` เพิ่ม `editing`/`showUniversal`
- หน้า gallery `/dev/widgets` · ทางเข้า dev: แตะชื่อหน้า login 5 ครั้ง หรือแตะเวอร์ชันแอปในการตั้งค่า 5 ครั้ง
- ตัวเลือกกระเป๋าใหม่ (grid AccountCard) — ฟอร์มรายการได้หน้าตาใหม่ด้วย
- icon maker: เพิ่ม `showIcon` / `IconMakerLayers` (7 โหมดชั้น) · ชั้นเดียวซ่อนแถวการ์ด
- mockup icon maker ใหม่ตกลงแล้ว: https://claude.ai/artifact/P8MZxnpnVqyvoatmAFdxUp (v7) → แผน §3.5 (รวม field `shape`)
- Flutter ต้องใช้ fvm: `C:\Users\poomp\fvm\versions\3.47.3\bin\flutter` (ตัวใน PATH 3.38 resolve ไม่ผ่าน) · analyze ผ่าน · test 28 ผ่าน

### ต่อพรุ่งนี้ (ตามลำดับ)
1. แก้ช่องโหว่ BE: `personal_debts` create/update ไม่เช็คเจ้าของ contact + `people` query ไม่กรอง user (แผน §15 #1)
2. เขียน API contract ของ endpoint ใหม่ทั้งหมด → `design/api/`
3. Routing (แผน §2) → icon maker ใหม่ + shape (§3.5) → หมวดหมู่ → แท็ก → ผู้ติดต่อ → …

---

## 2026-09-17 — SSH หลายเครื่อง (แนวทางถูกต้อง)

**หลักการ: 1 เครื่อง = 1 keypair ของตัวเอง — private key ห้ามเดินทาง**
VPS รับได้หลาย public key พร้อมกัน (`~/.ssh/authorized_keys`) เครื่องไหนหาย/เลิกใช้ ลบเฉพาะ key ของมันได้ ไม่กระทบเครื่องอื่น · **อย่าก๊อป private key ผ่าน USB/แชต/cloud**

**เพิ่มเครื่องใหม่ให้เข้า VPS ได้ (ทำครั้งเดียว):**
1. เครื่องใหม่สร้าง key ตัวเอง:
   ```powershell
   ssh-keygen -t ed25519 -f $env:USERPROFILE\.ssh\ppforge_vps -C "machine-2"
   ```
2. ก๊อปเนื้อ `ppforge_vps.pub` (บรรทัดเดียว `ssh-ed25519 AAAA... machine-2` — **ไม่ลับ ส่งทางไหนก็ได้**)
3. จากเครื่องที่เข้า VPS ได้อยู่แล้ว แปะต่อท้าย authorized_keys:
   ```bash
   ssh -i ~/.ssh/ppforge_vps Admin@160.238.13.137 'echo "<pubkey เครื่องใหม่>" >> ~/.ssh/authorized_keys'
   ```
4. เครื่องใหม่ทดสอบ: `ssh -i ~/.ssh/ppforge_vps Admin@160.238.13.137`

**ถ้าไม่มีเครื่องไหนเข้า VPS ได้เลย** (เข้าตาจน) → happy-host.net → VPS → **Console** → เพิ่ม public key ใหม่เข้า authorized_keys เอง (password login ปิดถาวร)

**ถอนสิทธิ์เครื่องที่เลิกใช้:** ลบบรรทัด public key ของมันออกจาก `~/.ssh/authorized_keys` บน VPS

---

## 2026-09-17 — branding/version + เคสแฟนเน็ตหลุด

### ทำเสร็จ ✅
- **App version บนหน้า splash** (`chubi-pocket-app` commit `b474288`, push แล้ว)
  - รับ launcher-icon setup จาก remote (`assets/icon/logo.png`, adaptive bg teal `#22B2A6`)
  - bump `version: 0.1.0+1 → 0.1.0+2`
  - เพิ่ม `package_info_plus`, อ่านเวอร์ชัน runtime → splash โชว์ `v0.1.0 (2)` มุมล่างกลางจอ (ให้ tester อ้างอิงตอนแจ้งบั๊ก)
  - `flutter analyze` ผ่านสะอาด · working tree สะอาด

### เปิดค้างอยู่ 🔴
- **แฟนเน็ตหลุด (นัดแรกทดสอบ Happy-Host):** วินิจฉัยแล้ว — แพ็กเก็ตจากมือถือเธอไม่มาถึง server เลย (ทั้ง app log + Caddy เงียบสนิท) = ปัญหาเส้นทางเน็ต มือถือ↔Happy-Host **ไม่ใช่โค้ด**
  - ให้เธอลอง: (1) เปิด `https://chubipocket-api.ppforge.dev/health` บน Chrome มือถือ (2) สลับ WiFi↔4G แล้ว login ใหม่
  - **เฝ้าดู:** ถ้าหลุดถี่ → พิจารณาย้าย Vultr BKK (ทุกอย่างเป็น compose ย้าย ~1 ชม.)
  - วันนี้ฝั่ง dev เองก็ SSH หลุด 2 ครั้ง → ยิ่งเข้าเค้าว่าเส้นทาง Happy-Host วูบเป็นช่วง

### ตัดสินใจไว้ (จดกันลืม)
- adaptive icon background = teal `#22B2A6` (ตาม remote) — logo โทนครีม ถ้าอยากพื้นครีมกลมกลืนกว่านี้ แก้บรรทัดเดียวใน `android/app/src/main/res/values/colors.xml`
- web icons ยังเป็น default Flutter (config เปิดแค่ Android) — ตั้งใจ เพราะ web เป็น stopgap ทีหลัง

---

## Backlog (งานที่ยังไม่เริ่ม — เรียงลำดับคุยกันไว้)

1. ~~branding/version~~ ✅ (2026-09-17)
2. **กวาด l10n โมดูล projects** — string อังกฤษ hardcode
3. **member ตั้งงบส่วนตัวในอีเวนต์ได้** — ~1 ชม.
4. **ดึงบิลเก่าเข้าอีเวนต์เดิม** — ~1 วัน
5. **รายการลอย + ย้ายกระเป๋า** — spec ก่อน, ~2-2.5 วัน
6. **Flutter web stopgap** — รอหลังเทสรอบแรก

### Infra TODO (จาก ops-runbook §7)
- [ ] Offsite backup (rclone → Google Drive) — ตอนนี้ dump อยู่เครื่องเดียวกับ DB ดิสก์พังคือหายหมด
- [ ] Firebase App Distribution (สร้างโปรเจกต์ + อัพ APK แรก)
- [ ] ปิด `REGISTRATION_OPEN` หลังสมัครครบ 2 บัญชี
- [ ] Sentry (สมัคร → ใส่ DSN)
- [ ] ประเมิน Happy-Host หลัง 1-2 เดือน → นิ่งแล้วต่อรายปี
