# Phase 2 — UX/UI overhaul plan (app-wide)

> สถานะ: **ตกลงแล้ว รอเริ่มลงมือ** (2026-10-06) · ต่อยอดจาก [inline-edit-ux.md](inline-edit-ux.md)
> เป้า: ทุกหน้าเป็นภาษาเดียวกันกับ categories / tags / contacts ที่ปรับแล้ว และ **polished** — ไม่ใช่แค่ restyle
> โมดูลเก่าหลายตัว (projects, debts, notifications) ทำแบบ "ให้ใช้ได้ก่อน" — รอบนี้ออกแบบ interaction ใหม่ได้

---

## 0. ขอบเขต & หลักการ

- **มือถือแนวตั้งก่อน** (360–412dp) — tablet / responsive เลื่อนไปทีหลัง
- **ไม่แตะ business logic / API** ในรอบ UX — อะไรที่ต้องพึ่ง BE: ออกแบบ UI เต็ม แล้วซ่อนไว้ (flag) จนกว่า BE เสร็จ → ดู §14 BE backlog
- ทุก string ผ่าน l10n · สีจาก theme (ห้าม `Colors.green/redAccent`) · เงินผ่าน `CurrencyFormatter` · ระยะผ่าน `AppSpacing`
- Reuse ก่อนเขียนใหม่ — ทุกอย่างที่ใช้ ≥2 ที่ ย้ายเข้า `shared/`
- ตรวจหลังแต่ละขั้น: `flutter analyze` + test ที่มี · เจ้าของรันแอปทดสอบเอง · ไม่ commit จนกว่าสั่ง

## 1. กติกา UI ทั้งแอป

### 1.1 Top bar (`AppTopBar` ตัวเดียวทั้งแอป — ลบ `MainTopBar`)
```
โหมดดู:     [ ← │ ชื่อหน้า ]        [ action ] [ หลัก ] │ [🔔] [👤]
โหมดแก้ไข:  [ ✕ │ ชื่อโหมด ]                [ action ของโหมด / 🗑 ]
ชั้น overlay: [ ← │ ชื่อหน้า ]                     [ action ของหน้า ]
```
- action **หลักอยู่ขวาสุดติดเส้นคั่น** (หน้า list = เพิ่ม, หน้า detail = ✏️)
- โหมดดูมี action ของหน้า **≤ 2 ปุ่ม** — เกินให้ย้ายตัวที่ใช้น้อยไปโหมดแก้ไข
- โหมดแก้ไข: ← เป็น ✕ (= ยกเลิก), ไม่มี 🔔 👤
- ปุ่มเพิ่มบน top bar ใช้ **ไอคอนเฉพาะหน้า** (person_add, new_label, create_new_folder, note_add …) เพื่อไม่ชนกับ `+` quick create ด้านล่าง *(ค่าเริ่มต้น — รอยืนยัน)*
- 🗑 = **ปุ่มแดงมีข้อความ "🗑 ลบ"** (`AppBarAction(destructive: true)` แสดงเป็น `ActionPill` อัตโนมัติ) + ยืนยันทุกครั้ง — ลบสำคัญเลยต้องอ่านออก ไม่ใช่ไอคอนเดี่ยว
- หน้า root ของแท็บไม่มี ←
- **Breadcrumb `หน้าแม่ › หน้านี้`** (ตัดสินใจ 2026-10-07): หน้าแม่สีจาง แตะแล้วกลับไปหน้านั้น (ถ้าอยู่ใน stack = pop ไปถึง, ไม่อยู่ = go) · ยาวได้ไม่เกิน ~40% จอ ชื่อหน้าถูกตัดก่อน · หน้า root ของแต่ละส่วน (`/projects`, แท็บ) ไม่มีหน้าแม่ · โหมดแก้ไขยังโชว์แต่แตะไม่ได้ (ออกด้วย ✕) · ค่าเริ่มต้นหาจาก route ในตารางกลาง `top_bar_crumbs.dart` · หน้าที่แม่เป็นชื่อเฉพาะ (สมาชิกของ "ทริปญี่ปุ่น") ส่ง `parent:` เอง

### 1.2 ปุ่มเพิ่ม: top bar vs การ์ดเส้นประ (`AddTile`)
| ประเภทหน้า | ใช้ |
|---|---|
| การ์ด / ของไม่เยอะ — กระเป๋า, งบประมาณ, เป้าหมายออม, ตั้งเวลา, โปรเจกต์, **แท็ก** | **การ์ดเส้นประท้ายรายการ** · ไม่มีเพิ่มบน top bar |
| รายการยาว / ค้นหา — ผู้ติดต่อ, หมวดหมู่, หนี้ | **เพิ่มบน top bar** |
- `AddTile` 3 ทรง: การ์ดเต็มกว้าง · แถว (ในรายการ/ฟอร์ม) · วงกลม (`MemberStrip`)
- ใช้ในฟอร์มด้วย: "+ เพิ่มการหาร", "+ เชิญสมาชิก", "+ บันทึกหนี้กับคนนี้"
- Empty state ทุกหน้า: `EmptyView` + `AddTile` เป็น CTA

### 1.3 แถบล่าง (nav) + ปุ่ม `+` quick create
- แสดง **ทุกหน้า** ยกเว้น **โหมดแก้ไข** และ **ชั้น overlay**
- `+` = quick create รายการ (sheet เดิม) เท่านั้น
- ทุก list มี bottom padding กัน FAB บัง (ใส่ใน widget กลาง)

### 1.4 โหมดแก้ไข
- ซ่อน nav + FAB → `ModeActionBar` (ยกเลิก · ↶ · บันทึก) · บันทึกกดได้เมื่อ dirty
- ย้อนกลับตอน dirty → ยืนยันทิ้ง
- **อะไรที่แก้ไม่ได้ในหน้านั้น → จาง + กดไม่ได้** (`LockedInEdit`): การ์ดสรุป, รายการ, ส่วน action, pill สถานะ
- ฟอร์มทุกหน้า = โหมดแก้ไข
- **หน้าที่เลือกได้หลายอัน** (แท็ก, ต่อไปผู้ติดต่อ ฯลฯ): action กับของที่เลือกอยู่ **แถวใต้ช่องค้นหา ชิดขวา** — ซ้ายยังเป็นตัวกรองเหมือนเดิม `[◯ n] [สี▾][ไอคอน▾] … [🎨][⬡][🗑 ลบ]` · action แสดงตลอดในโหมดแก้ไข จางกดไม่ได้จนกว่าจะเลือก ≥1 · ทุกปุ่มมีข้อความ `[🎨 เปลี่ยนสี][⬡ เปลี่ยนไอคอน][🗑 ลบ]` · 🗑 บน top bar = ลบ*หน้านั้น* (detail) (ตัดสินใจ 2026-10-07)

### 1.5 หน้า detail
- สไตล์ category detail: header card + `SectionCard`/`DetailRow` · ดู/แก้ในหน้าเดียว · สร้างใหม่เปิดเข้าโหมดแก้ไขทันที
- **สถานะ** (โปรเจกต์ / หนี้): pill ใน header card → sheet เลือก · มีผลทันที · ยืนยันถ้าทำให้ล็อก · จางในโหมดแก้ไข

## 2. Routing

```
ชั้น overlay (root navigator, ไม่มี nav/FAB):  การตั้งค่า · โปรไฟล์ · เปลี่ยนรหัส · การแจ้งเตือน · ตั้งค่าการแจ้งเตือน
──────────────────────────────────────────────────────────────
ชั้นแท็บ (StatefulShellRoute — จำ stack แยกต่อแท็บ):
  แดชบอร์ด · รายการ · กระเป๋า   (+ หน้าในเมนูเพิ่มเติม ซ้อนในแท็บที่เปิด)
```
| การกระทำ | ผล |
|---|---|
| กดแท็บอื่น | ไปแท็บนั้น **ที่ stack ล่าสุด** |
| กดแท็บที่อยู่อยู่แล้ว | กลับหน้าแรกของแท็บ |
| 👤 / 🔔 | เปิดชั้น overlay ทับ · ← ปิดกลับไปแท็บตรงที่ค้างไว้ |
| หน้าในเมนูเพิ่มเติม | ~~ซ้อนใน stack ของแท็บปัจจุบัน~~ → **อัปเดต 2026-10-07: "เพิ่มเติม" เป็นแท็บที่ 4** (`/more` = หน้า hub การ์ดใหญ่ 3 กลุ่ม, คำอธิบายคงที่ — ตัวเลขสดรอ `/dashboard`) · ทุกหน้าในเมนูอยู่ใน stack ของแท็บนี้ (path เดิม) · ลบ `MoreMenuSheet` |
| ลิงก์ข้ามแท็บ (เช่น หนี้ → รายละเอียดรายการ) | ต้องการ: เปิดซ้อนใน stack ปัจจุบัน · ← กลับที่เดิม — **ลองพฤติกรรม default ของ go_router ก่อน** ถ้าเด้งข้ามแท็บค่อยลง route หลาย path |

งานโค้ด: แยก route เมนูเพิ่มเติมออกจากใต้ `/` · ย้าย categories กลับเข้า shell (เลิก `rootNavigatorKey` + ลบ `MainBottomNav` ที่วาดเองใน category detail) · settings/notifications ไป root navigator · แสดง FAB ทุกหน้า · ลอจิกไฮไลต์ nav

## 3. Shared widgets (ทำก่อนแตะหน้าใด)

> ✅ **สร้างแล้ว 2026-10-06** — import เดียว `shared/widgets/ui.dart` · ดูสด/กดเล่นที่ `/dev/widgets` (Dev hub → Widget gallery)
> โครง: `buttons/` (AppButton, AppIconButton) · `inputs/` (AppTextField, InlineField/InlineTitleField, AmountField, AppSearchBar, PickerTile, SelectCardGroup) · `chips/` (FilterDropdownChip, SortChip, FilterBar, StatusPill, AppBadge, Tone) · `layout/` (HeaderCard, SectionCard/DetailRow/DetailStacked/RowDivider, SectionHeader, AppTabBar, LockedInEdit, AddTile) · `feedback/` (showConfirmDialog, showAppSnackBar, ProgressRow) · `sheets/` (showAppSheet, showOptionSheet) · `data/` (MoneyText + 👁 MoneyVisibilityCubit, SummaryStats, MoneyListTile, IconBubble, CornerBadge, DateGroupHeader, PersonRef/AvatarStack/MemberStrip) · `mode_action_bar.dart` (`ReorderActionBar` = typedef ชั่วคราว) · `AppTopBar` +`editing`/`showUniversal`/action `destructive`/`enabled` · `DateFormatter.friendly`
> ยังไม่ทำ (ผูก domain — ทำตอนแก้หน้านั้น): `TransactionTile` (บน `MoneyListTile`), `PeriodSummaryCard` (บน `SummaryStats`), `ContactPickerSheet`, `CurrencyTile` (บน `showOptionSheet`), mixin lifecycle โหมดแก้ไข

| # | Widget | ที่มา / หมายเหตุ |
|---|---|---|
| 1 | `AppTopBar` | + `editing`, `AppBarAction.destructive/enabled`, ซ่อน 🔔👤 ใน overlay |
| 2 | `ModeActionBar` | rename `ReorderActionBar` |
| 3 | `showConfirmDialog()` | แทน `AlertDialog` ~25 จุด · มีแบบ destructive |
| 4 | `LockedInEdit` | `IgnorePointer` + `AnimatedOpacity` |
| 5 | `AppSearchBar` | ดึงจาก tags |
| 6 | `FilterDropdownChip` + sort chip | ดึงจาก tags (สี/ไอคอน/ชื่อ) |
| 7 | `detail/`: `HeaderCard`, `SectionCard`, `DetailRow`, `DetailStacked`, `InlineField`, `RowDivider` | ดึงจาก category detail · `HeaderCard` ต้อง generic (ไม่ผูก `Category`) |
| 8 | `AppTabBar` | ดึงจาก `_TypeTabBar` ของ categories |
| 9 | `StatusPill` + `showStatusPicker()` | โปรเจกต์, หนี้ (ต่อไป งบ/เป้าหมาย) |
| 10 | `ProgressRow` | หนี้, งบ, เป้าหมาย, วงเงินบัตร, งบโปรเจกต์ |
| 11 | `SectionHeader` | หัวข้อ + จำนวน + "ดูทั้งหมด ›" |
| 12 | `MemberStrip` | avatar+ชื่อ+วงกลมเชิญ · ปรับ `MemberAvatarStack` ให้ไม่ผูก `WalletMember` |
| 13 | `AmountField` | ช่องเงินใหญ่ |
| 14 | `ContactPickerSheet` | ค้นหา + พิมพ์ชื่อใหม่ได้ |
| 15 | `CurrencyTile` | ดึงจาก `account_form_page` |
| 16 | `AddTile` | ดึงจาก `AddAccountTile` + `DashedRectBorder` · 3 ทรง |
| 17 | `TransactionTile` | รวม 3 ชุด (home / tx list / account detail) |
| 18 | `PeriodSummaryCard` | รวม `_MonthlySummaryCard` + `_LiveSummaryCard` |
| 19 | `FilterSummaryStrip` | รายจ่าย/รายรับ/สุทธิ ตาม filter — tx list + project tx tab |
| 20 | `MoneyText` + privacy 👁 | ซ่อนยอดได้ทั้งแอป (local pref) |
| 21 | date format | `date_formatter`: วันนี้ / เมื่อวาน / 17 ก.ย. (+ปีถ้าไม่ใช่ปีนี้) |

ทีหลัง: mixin lifecycle โหมดแก้ไข (`_original/_working`, undo, dirty, `PopScope`) หลัง categories/tags/contacts ใช้ widget กลางครบ

## 3.5 Icon maker ใหม่ (+ shape)

> mockup ที่ตกลงแล้ว: https://claude.ai/artifact/P8MZxnpnVqyvoatmAFdxUp (v7) · ไฟล์ `shared/icon_maker/icon_maker_sheet.dart`

- **บนสุด**: ชื่อ sheet + ⋯ (รีเซ็ตเป็นค่าเริ่มต้น — ยืนยันก่อน · ไม่ใช้ไอคอน) · preview 3 ขนาด (72 header · 40 แถวรายการ · 24 chip)
- **แถวเลือกชั้น** แถวเดียว `[ ไอคอน | พื้นหลัง | ขอบ ]` + จุดสีของชั้นนั้น (ชั้นที่ไม่ใช้แสดง ⊘) · แทนการ์ดสูง ~100px · **แก้ได้ชั้นเดียว → ซ่อนแถวนี้** (ทำแล้ว)
- **แท็บ `รูปแบบ | สี`** (`AppTabBar`) เต็มความกว้าง ยืดเต็มความสูง sheet — เลิกแบ่งซ้าย/ขวา 300px
- **แท็บรูปแบบ**
  - ช่องแรกของทุกชั้น = **"ไม่มี"** (ซ่อนชั้นนั้นแต่จำรูปแบบ + สีไว้ เลือกแบบไหนก็กลับมาพร้อมสีเดิม) — แทนการล้างค่าแบบเดิม
  - ไอคอน: `AppSearchBar` (ค้นชื่อไทย/อังกฤษ) + chip ตาม pack (`FilterBar`) · grid 6 คอลัมน์
  - **พื้นหลัง = ทรง × ลาย**: แถว "ทรง" (วงกลม มนมาก มน เหลี่ยม ใบไม้ หยดน้ำ) + grid "ลาย"
  - ทุก tile แสดงด้วยสี/พื้นที่ใช้อยู่จริง · ตัวที่เลือก = วงแหวน (`SelectableFrame`) · **จุดสีใต้ช่องคงไว้** = จำนวนช่องสี (0–3) + สีปัจจุบัน · แบบเปลี่ยนสีไม่ได้เขียน "พรีเซ็ต"
- **แท็บสี** (บน → ล่าง): แถวบน = ช่องสีของแบบปัจจุบัน 1–3 ช่อง พร้อม **รหัส hex ใต้แต่ละช่อง** (แตะเลือกช่องที่จะแก้) + ครึ่งขวา **ช่องพิมพ์/วาง hex ของช่องที่เลือก** + ปุ่ม ↺ **คืนสีตั้งต้นของช่องนี้** (hex ที่พิมพ์เข้า "เลือกเอง" ด้วย) · ธีม 6 สี · สีทั่วไป 6 สี · **แถว "เลือกเอง"** = หลอดดูดสี (เปิด color picker เดิม `flutter_colorpicker` ที่มีช่องพิมพ์/วาง hex อยู่แล้ว — `hexInputBar: true`) + สีที่เลือกเองล่าสุด 5 สี · เอา badge 🎨 บน swatch ออก · ไม่มี/พรีเซ็ต → แท็บจาง + บอกเหตุผล
- **footer** = `ModeActionBar` (ยกเลิก · ↶ · ใช้รูปนี้) — ↶ โผล่เมื่อมีอะไรให้เลิกทำ
- **ปรับตามโหมดที่เรียก** (ตกลง 2026-10-06):
  - เหลือแท็บเดียว (`showIconPicker:false` / `showColorPicker:false`) → ซ่อนแถบแท็บ แสดงเนื้อหาเลย
  - จุดสีใต้ช่องแสดง**ทุกแบบ** (รวม 1 ช่อง — เผื่อไอคอนหลายสีในอนาคต) · **ไม่มีคำว่า "พรีเซ็ต"/"ไม่มี" ใต้ช่อง** — ไม่มีจุด = เปลี่ยนสีไม่ได้
  - แถว "เลือกเอง" คงวงเส้นประว่างไว้ (บอกว่าตรงนี้คือสีล่าสุด)
  - ไม่จำแท็บล่าสุดของแต่ละชั้น (คงพฤติกรรมเดิม)
  - ชื่อ sheet ตามประเภท ("ไอคอนกระเป๋า", "รูปโปรไฟล์") หรืองาน ("เปลี่ยนสี 3 แท็ก")
  - ⋯ → "ใช้ไอคอนเริ่มต้นของแอป" แสดงเฉพาะเมื่อส่ง `removeLabel` (โปรไฟล์)
  - ลาย/ขอบ: เตรียม chip ตาม pack แบบไอคอน — ซ่อนเมื่อมี pack เดียว
  - จอเตี้ย: เลื่อนตารางแล้ว preview ย่อเหลือขนาดเดียว
  - color picker (`flutter_colorpicker`) หุ้มด้วย `showAppSheet` ให้เข้าชุด · แยก `icon_maker_sheet.dart` (1,385 บรรทัด) เป็นหลายไฟล์ตอนรื้อ layout
- logic สี/undo/slot เดิมไม่เปลี่ยน (สีผูก index ช่อง, ช่องที่ไม่เลือกใช้สีตั้งต้นของแบบ)
- **Shape (ใหม่)** — ต้องแก้ 4 จุด:
  1. BE `internal/shared/iconcode.go`: เพิ่ม `Shape *string json:"shape"` (JSONB — ไม่ต้อง migrate · ไม่เพิ่ม = BE ทิ้งค่าตอนบันทึก) + แก้คอมเมนต์ "Shape is always a circle"
  2. FE `IconCode`: เพิ่ม `shape` (fromJson/toJson/==) · null = วงกลม → ของเดิมแสดงเหมือนเดิม
  3. `IconCodeWidget` / `IconDisplay`: clip พื้นหลัง + วาดขอบตามทรง — **กระทบทุกที่ที่แสดงไอคอน ทดสอบทั้งแอป**
  4. icon maker: แถวทรงในชั้นพื้นหลัง · gallery `/dev/widgets` แท็บ Icon maker ต้องโชว์ทุกทรง
- ลำดับ: ทำหลัง widget กลาง/routing ก่อนหมวดหมู่ (หน้าหมวดหมู่/แท็ก/ผู้ติดต่อใช้ maker)

## 4. หมวดหมู่
- **List**: `AppSearchBar` · ผลค้นหา **คงโครงสร้าง tree** (แสดงตัวตรง + บรรพบุรุษ, auto-expand) · ระหว่างค้นหาปิด long-press เข้าจัดลำดับ · ไม่มี sort/filter · โหมดจัดลำดับใช้ `editing` + ชื่อ "จัดลำดับ"
- **Detail**: ย้ายไปใช้ `detail/` (หน้าตาเดิม, ไฟล์สั้นลง ~300 บรรทัด) · `editing` ในแก้ไข/สร้าง
- **🗑 ลบหมวดหมู่** — **ลบจริงเสมอ** (ตัดสินใจ 2026-10-07): ยืนยันด้วย "หมวดย่อยจะย้ายขึ้นไปอยู่ใต้หมวดแม่" + "รายการ n รายการจะกลายเป็น ไม่มีหมวด" + "งบประมาณ n รายการจะถูกลบด้วย" (ดึงจาก `GET /categories/:id`) · snackbar "ลบแล้ว" · ซ่อน 🗑 สำหรับหมวดระบบ
- ~~หมวดที่เก็บถาวร~~ — ยกเลิก: ไม่มีสถานะเก็บถาวรสำหรับหมวดแล้ว (BE ถอด restore/permanent, migration 000043 ล้างของเก่า)
- ย้าย route กลับเข้า shell (§2)

## 5. แท็ก
- **Grid 2 คอลัมน์** ทั้งโหมดดูและแก้ไข · **การ์ดเส้นประ "+ เพิ่มแท็ก" ท้ายรายการ** (ไม่มีเพิ่มบน top bar) — ตั้งใจให้การเพิ่มอยู่ท้าย ไม่ชวนสร้างแท็กเยอะ
- โหมดดู: `[ ← │ แท็ก ] [✏️] │ 🔔 👤` · search เต็มกว้าง · `[สี▾][ไอคอน▾] … [ชื่อ▾]`
- โหมดแก้ไข: `[ ✕ │ แก้ไขแท็ก ]` · แถว 1 search · แถว 2 `[◯ n] [สี▾][ไอคอน▾]` + ขวาสุด `[🎨 เปลี่ยนสี][⬡ เปลี่ยนไอคอน][🗑 ลบ]` จางจนกว่าจะเลือก ≥1 (ดู §1.4) · ไม่มี sort · แถวเครื่องมือสูงเท่ากันทั้ง 2 โหมด
- เซลล์แก้ไขใน grid แคบ (~160dp): ไอคอน + ช่องชื่อ, ช่องเลือกเล็กมุมเซลล์ — **ลองแล้วปรับ**
- **กติกากรองในโหมดแก้ไข**
  1. validate `_working` ทุกตัวตอนบันทึก (ไม่ใช่แค่ field ที่ mount) — เจอผิดที่ซ่อน → ล้างตัวกรอง + เลื่อนไปหา
  2. แถวที่แก้/เพิ่มใน session นี้แสดงเสมอ
  3. แถวที่เลือกแล้วถูกกรองออก → ยกเลิกเลือก · "เลือกทั้งหมด" = ที่มองเห็น
  4. ไม่ re-sort ระหว่างแก้

## 6. ผู้ติดต่อ
- **List**: `AppSearchBar` (ชื่อ/อีเมล/เบอร์) · segmented ใช้งาน/เก็บถาวร/ทั้งหมด ชิดซ้าย · `[👤+]` บน top bar
- **Detail = category style (รวม form)**
  - header: avatar (โหมดแก้ไข → icon maker `pack_contact`) + ชื่อ + 🔗
  - แถว: อีเมล · เบอร์ · บันทึก (linked → ชื่อ/อีเมลล็อก)
  - ส่วน action (จางในโหมดแก้ไข): เชื่อมบัญชี (ขอ/ยกเลิก) · จับคู่ชื่อในรายการหาร · เก็บถาวร/กู้คืน · หนี้กับคนนี้ ›
  - top bar: ดู `[🗑][✏️]` · แก้ไข `[🗑]` · สร้างใหม่ไม่มี 🗑
- `/contacts/new`, `/contacts/:id/edit` → หน้าใหม่ · `ContactFormPage` คงไว้เฉพาะ flow ยอมรับคำขอเชื่อม
- l10n ทั้งหน้า

## 7. การตั้งค่า · โปรไฟล์ · การแจ้งเตือน (ชั้น overlay)
- **การตั้งค่า**: `SectionCard`/`DetailRow` ทั้งหน้า · สกุลเงินเริ่มต้นแก้ที่นี่ที่เดียว (`CurrencyTile`) *(ค่าเริ่มต้น — รอยืนยัน)* · ธีมเป็นการ์ดตัวอย่างสี (ชื่อแปล แทน `mint`/`sweet`) · ภาษา/ฟอนต์เป็น sheet (ฟอนต์ preview ด้วยตัวมันเอง) · + แถว "การแจ้งเตือน ›" · เวอร์ชัน "1.0.0 (1)" · ออกจากระบบใช้ `showConfirmDialog`
- **โปรไฟล์**: เปิดเข้าโหมดแก้ไขทันที *(รอยืนยัน)* · header card (avatar + ชื่อ inline) · ชื่อผู้ใช้เป็นแถวล็อก 🔒 · อีเมล · ชิดบน (เลิก `Center`+`maxWidth`) · `ModeActionBar`
- **เปลี่ยนรหัสผ่าน**: `editing` + `ModeActionBar`
- **กล่องการแจ้งเตือน**: `[ ← │ การแจ้งเตือน ] [✓✓][⚙]` · segmented ทั้งหมด/ยังไม่อ่าน · จัดกลุ่มวัน + **เวลาทุกแถว** · avatar ผู้ส่ง + badge ประเภท · ● ยังไม่อ่าน · **ปัดซ้ายซ่อน** (เลิก ⋮) · แตะ = อ่าน + ไปลิงก์ · คำขอที่ตอบแล้วแสดงสถานะ ("✓ ยอมรับแล้ว · แตะเพื่อ…") · ปุ่มยอมรับ/ปฏิเสธใหญ่ขึ้น, ปฏิเสธต้องยืนยัน · เงินผ่าน formatter · skeleton + `EmptyView` · l10n ทุกประเภท · ลอจิก routing ของแต่ละประเภทไม่เปลี่ยน
- ⚠️ BE scan: notification ประเภท split ทั้ง 3 **ยังไม่ถูกส่งจริง** และ switch อัตโนมัติทั้ง 4 **ยังไม่มีผลอะไร** (BE ไม่ได้อ่านค่า) — ต้องตัดสินใจว่าจะซ่อน section นี้จนกว่า BE ทำ หรือแสดงพร้อมป้าย "เร็วๆ นี้"
- **ตั้งค่าการแจ้งเตือน**: section "การแจ้งเตือนที่ได้รับ" (per-type — **รอ BE**) + "การทำงานอัตโนมัติ" แยก การหารบิล / การรับเงิน (+ แถว "กระเป๋าที่รับเงิน" → `defaultAccountId` ซึ่ง cubit รองรับแล้ว) / โปรเจกต์ · switch แบบ optimistic, ล้มเหลวเด้งกลับ + snackbar

## 8. แดชบอร์ด
ลำดับ: **ทรัพย์สินสุทธิ (👁) → สรุปช่วงเวลา → งบประมาณ → รายการที่จะถึง → หนี้ → เป้าหมายออม → ยอดตามหมวด → รายการล่าสุด**
- ทุก section ทำได้ด้วย API ที่มีอยู่: `/budgets/overview` · `/scheduled-transactions/upcoming?days=` · `/personal-debts/people` · `/saving-goals` · `/transactions/summary?group_by=category` (ยอดตามหมวด — ไม่ต้องรอ BE) — section ที่ไม่มีข้อมูลซ่อนเอง
- ข้อจำกัด: ยิงหลาย request → BE backlog: endpoint `/dashboard` รวม
- `PeriodSummaryCard` · ไม่มีรายการ → empty เล็ก + CTA เพิ่มรายการ
- รายการล่าสุด `TransactionTile` · "ดูทั้งหมด" → แท็บรายการ
- skeleton + `PullToRefresh`

## 9. แท็บรายการ
- แก้ top bar ซ้อน → `AppTopBar` "รายการ" (ไม่มี ←)
- `FilterSummaryStrip` → `AppSearchBar` (**ซ่อนไว้จนกว่า BE มี `q`** — API ยังไม่มี search/tag filter) → `[ประเภท▾][ช่วงเวลา▾][กระเป๋า▾][หมวด▾]` เลื่อนแนวนอน · "ไม่มีกระเป๋า" อยู่ใน dropdown กระเป๋า (`no_wallet=true`) · sort ใช้ `sort=` ที่ API มี (วันที่/ยอด)
- หัวข้อวัน "วันนี้ · −฿540" (ยอดรวมวัน) · `TransactionTile`
- **Detail**: `AppTopBar` `[🗑][✏️]` (ซ่อนเมื่อเป็นรายการระบบ — แก้/ลบไม่ได้) · `detail/` · แสดง วันที่, กระเป๋า, หมวด, แท็ก, บันทึก, "มีการหาร" (`has_splits` — API ไม่ส่งรายละเอียด split), ผู้บันทึก (`created_by` เฉพาะกระเป๋าที่แชร์), ลิงก์ที่มา (หนี้/โปรเจกต์) · อีเวนต์: API ไม่ส่ง → ไม่แสดง
- **Form**: คงหน้าแยก (ซับซ้อน) แต่เป็นโหมดแก้ไข: ✕ + `ModeActionBar` + ซ่อน nav · `AmountField` + field แบบ tile ทั้งหน้า · "+ เพิ่มการหาร" เป็น `AddTile`

## 10. แท็บกระเป๋า
- **List**: **ยังไม่จัดกลุ่ม** — คง grid 2 คอลัมน์ · การ์ดยอดรวมบน (👁) · การ์ดบัตรเครดิตมี `ProgressRow` วงเงิน · `AddTile` เพิ่มกระเป๋า · "กระเป๋าที่เก็บถาวร (n) ›" ท้ายหน้า (`?status=archived` · กู้คืน = `PUT status=active`) · ✏️ = โหมดจัดลำดับ (มี `sort_order` แล้วแต่ไม่มี bulk endpoint → **รอ BE** `PATCH /accounts/reorder` แทนการยิง PUT ทีละใบ)
- **Detail = แก้ในหน้าเดิม** (รวม `account_form_page`)
  - ⋮ เดิม 4 ตัว → ✏️ บน top bar · "ปรับยอด" ปุ่มรองใน header · ตั้งค่ากระเป๋า → `MemberStrip` + แถวในหน้า · เก็บถาวร → top bar โหมดแก้ไข (เจ้าของเท่านั้น · BE บล็อกถ้ามีสมาชิก >1 → แจ้งเหตุผลก่อนกด)
  - ✏️ แก้ได้เฉพาะเจ้าของ (BE update เช็ค owner) → สมาชิกที่ไม่ใช่เจ้าของไม่เห็น ✏️
  - แถวมี label (คำอธิบาย / บันทึก)
  - `PeriodSummaryCard` + รายการ (`TransactionTile`) — **จางในโหมดแก้ไข**
  - "ดูทั้งหมด ›" → tx list กรองกระเป๋านี้ ซ้อนใน stack แท็บกระเป๋า
  - บัตรเครดิต: `ProgressRow` + รอบบิลเป็น `DetailRow`

## 11. หนี้ (มองตามคน)
- **List** (หน้าเดียว ไม่มีแท็บ): การ์ดสรุป (สุทธิใหญ่ + กล่อง ติดคุณ / คุณติด กดกรองได้) · `AppSearchBar` · `[สถานะ: ค้างอยู่ ▾]` · แถวรายคน (`UserAvatar`, จำนวนค้าง, ยอดลงสี + ติดคุณ/คุณติด) → หน้ารายคน · `[note_add]` บน top bar
- **หน้ารายคน** (route ใหม่, กรองฝั่งแอปด้วย `counterparty_contact_id` หรือชื่อ): header (avatar, ชื่อ, สุทธิ, 🔗 ผู้ติดต่อ) · ค้างอยู่ (`ProgressRow`) · ประวัติ (พับ — โหลด `status=all`) · `AddTile` "+ บันทึกหนี้กับคนนี้" (prefill)
  - key ของคน = `(contact_id, ชื่อ)` เหมือน BE — แถวที่ผูกผู้ติดต่อกับแถวชื่อพิมพ์เองที่ชื่อซ้ำ จะเป็นคนละแถว → ในหน้ารายคนของชื่อพิมพ์เอง เสนอปุ่ม "ผูกกับผู้ติดต่อ" (ใช้ `POST /contacts/:id/absorb` ที่มีอยู่)
  - avatar: `people` ไม่ส่งไอคอน → lookup จาก `ContactsCubit` ฝั่งแอป
- **Detail**: header ("Aom ติดคุณ" + `StatusPill` + คงค้างใหญ่ + `ProgressRow`) · ปุ่มหลัก "รับเงินคืน"/"จ่ายคืน" (เมื่อค้าง) · แถว ยอดเต็ม/คืนแล้ว/ที่มา (กดไปรายการ/โปรเจกต์)/บันทึก/**วันที่สร้าง** (`created_at` มีใน JSON แล้ว — แค่เพิ่มใน model ฝั่งแอป) · "ยกเลิกหนี้นี้" ปุ่มรองจางท้ายหน้า
  - top bar ดู `[🗑][✏️]` · **มี `PUT /personal-debts/:id` แล้ว** → โหมดแก้ไขในหน้าเดิม: ยอด, กับใคร, บันทึก (ไม่ให้แก้ settled/status ตรงๆ — ใช้ flow คืนเงิน/ยกเลิก)
- **Sheet คืนเงิน** (แทน `AlertDialog`, รวม 2 ปุ่มเดิม): `AmountField` + [ทั้งหมด][ครึ่งหนึ่ง] (เกินยอดค้าง → BE ตอบ `OVERPAYMENT`, validate ก่อนส่ง) · ☑ บันทึกเป็นรายการในกระเป๋า → `showAccountPickerSheet` + วันที่ (`settle(date:)`) / ไม่ติ๊ก → `direct: true` และ**ซ่อนช่องวันที่** (BE ไม่เก็บวันที่ในโหมดนี้)
- **Form**: การ์ดทิศทาง 2 ใบ · `AmountField` · "กับใคร" `ContactPickerSheet` (ส่ง `counterpartyContactId`) หรือพิมพ์ชื่อ · `CurrencyTile` · บันทึก · `ModeActionBar` + ซ่อน nav
- เงิน/สีผ่าน formatter + theme · l10n ทั้งโมดูล

## 12. โปรเจกต์ (3 รอบ)
- **a — List + พื้นฐาน**: `AppTopBar` + `AddTile` ท้ายรายการ · `AppSearchBar` · `[สถานะ ▾]` (ครบ 5 ค่า รวม "ยกเลิก" ที่หายไป) + sort · แถว: ไอคอน + ชื่อ + `StatusPill` + "3 สมาชิก · ฿12,400 / ฿20,000" · skeleton + `EmptyView` · l10n ทั้งโมดูล (~65) · `AppTopBar` ทุกหน้า
- **b — Detail**
  - top bar: ดู `[✏️][+รายการ]` · แก้ไข `[🗑]` · **เลิก ⋮**: สถานะ → `StatusPill` ใน header · ออกจากโปรเจกต์ → หน้าสมาชิก · ✏️ แก้ข้อมูลโปรเจกต์ในหน้าเดิม (เลิกใช้ `project_form_page` สำหรับแก้)
  - แท็บ `AppTabBar`: **แดชบอร์ด** (default) / **รายการ** / **เคลียร์ยอด** (เงื่อนไขเดิม)
  - แดชบอร์ด: header · งบ vs ใช้จริง (`ProgressRow`) · ยอดรวม · `MemberStrip` · ใครจ่ายเท่าไร · หมวดที่ใช้มากสุด (คำนวณจาก `trees`) · ล่าสุด 3 + ดูทั้งหมด → แท็บรายการ — *ลองแล้วปรับ*
  - รายการ: `FilterSummaryStrip` · search · `[ประเภท▾][เฉพาะฉัน]` + sort · หัวข้อวัน · `EmptyView`
  - หน้าสมาชิก: เข้า go_router + `AppTopBar` · กลุ่ม สมาชิก/รอตอบรับ/ออกแล้ว · pill role · `AddTile` เชิญ (อีเมล หรือชื่อเฉย ๆ แบบ ad-hoc) · ออกจากโปรเจกต์ (แดง, **ไม่แสดงให้เจ้าของ** — BE ห้ามเจ้าของออก) · แตะสมาชิก → sheet: เปลี่ยน role / ลบออก / **โอนความเป็นเจ้าของ** (มี endpoint แล้ว)
  - **สิทธิ์ (BE)**: เปลี่ยนสถานะ, ลบโปรเจกต์, แก้ข้อมูล, จัดการสมาชิก = **เจ้าของเท่านั้น** → คนอื่นไม่เห็น ✏️/🗑, pill สถานะกดไม่ได้, ไม่เห็นปุ่มจัดการสมาชิก
  - **role**: BE ยังไม่แยก viewer กับ contributor (ทำได้เท่ากัน) → UI แสดงแค่ เจ้าของ / สมาชิก ไปก่อน *(BE backlog)*
  - **🗑**: BE บล็อกถ้ามีรายการ (`PROJECT_HAS_TRANSACTIONS`) → ใช้ได้เฉพาะโปรเจกต์ว่าง · ถ้ามีรายการ ให้ข้อความแนะนำ "เก็บถาวร" แทน
  - **ล็อกตามสถานะ**: เสร็จสิ้น → ซ่อน +รายการ · ยกเลิก → ซ่อน +รายการ และแก้/ลบรายการไม่ได้ · เก็บถาวร → อ่านอย่างเดียวทั้งหมด (รวมการติ๊กเคลียร์ยอดและสมาชิก) · แสดงแถบบอกสถานะล็อกใต้ header
  - แท็บเคลียร์ยอด: แอปเปิดเมื่อ `completed || archived` แต่ BE บล็อก mark ตอน archived → ใน archived แสดงแบบอ่านอย่างเดียว
  - แยกไฟล์ `project_detail_page.dart` (1,980 บรรทัด) → `widgets/` (ย้ายโค้ดล้วน)
- **c — Project tx form**: รวม form + edit เป็นหน้าเดียว · field แบบ tile + `AmountField` · `ModeActionBar` + ซ่อน nav

## 13. ลำดับลงมือ
0. ~~สแกน BE~~ ✅ 2026-10-06 → ผลอยู่ใน §14–15 และแทรกไว้ในแต่ละหัวข้อแล้ว
1. ~~Shared widgets (§3)~~ ✅
2. ~~Shell & routing (§2) + กติกา nav/FAB~~ ✅ 2026-10-07 — overlay (settings/notifications บน root navigator + `pushFromOverlay`), หมวดหมู่กลับเข้า shell, FAB ทุกหน้า, ไฮไลต์ "เพิ่มเติม", ลบ `MainTopBar`, แก้ top bar ซ้อนหน้ารายการ, ฟอร์มทุกหน้าห่อ `ShellChromeHider`
2.5 ~~Icon maker ใหม่ + shape (§3.5)~~ ✅ 2026-10-07 — ยังไม่ได้แยกไฟล์ maker / ยังไม่ส่ง `title` จากหน้าที่เรียก (ทำตอนแก้แต่ละหน้า) · BE `IconCode.Shape` เสร็จแล้ว
2.6 ~~ส่วนกลางรอบ 2~~ ✅ 2026-10-07 — `AppIcons` (ทะเบียนไอคอนเชิงความหมาย `core/constants/app_icons.dart` + แท็บ "ไอคอน" ใน gallery; ย้าย shared/shell/icon maker/account type แล้ว, หน้าอื่นย้ายตอนแก้ทีละหน้า) · domain widgets: `TransactionTile`, `PeriodSummaryCard`, `showContactPickerSheet` (ผลแบบ sealed: เลือก contact / พิมพ์ชื่อเอง), `CurrencyTile` + `Currencies` (register/edit profile ใช้แล้ว) — ดูที่แท็บ "โดเมน" · `EditModeMixin` (`shared/edit_mode/`) = draft original/working, undo (พิมพ์รวบเป็น 1 step), discard confirm, PopScope, ซ่อน nav/FAB — หน้า category ยังใช้โค้ดเดิม จะย้ายมาใช้ mixin ตอนแก้หน้า category
3. ~~หมวดหมู่~~ ✅ 2026-10-07 (รอทดสอบบนเครื่อง) — detail ย้ายมาใช้ `EditModeMixin` + kit (1,261 → 729 บรรทัด) · 🗑 ในโหมดแก้ไข (ซ่อนสำหรับหมวดระบบ) ลบจริงเสมอ + ยืนยันบอกจำนวนรายการ/งบที่กระทบ · list: ค้นหาคง tree + ปิด long-press ระหว่างค้นหา · `AppTabBar` · เอาปุ่ม undo บน top bar ออก (undo แค่ state ในเครื่อง ไม่ย้อนบน server)
4. ~~แท็ก~~ ✅ 2026-10-07 (รอทดสอบบนเครื่อง) — grid 2 คอลัมน์ทั้ง 2 โหมด + `AddTile` ท้าย grid (ถอดปุ่ม + ข้างช่องค้นหา) · `EditModeMixin` (ย้อนกลับตอนแก้ค้าง → ถามทิ้ง) · โหมดแก้ไขครอบแท็กทั้งหมด + ค้นหา/กรองได้ตามกติกา 1–4 · action กับที่เลือกอยู่แถวตัวกรอง ชิดขวา · เลือก = วงแหวน + `SelectCheck` ซ้ายเซลล์ · filter ใช้ `PopoverAnchor`/`ColorSwatchGrid`/`SortChip` ของ kit
5. ~~ผู้ติดต่อ~~ ✅ 2026-10-07 (รอทดสอบบนเครื่อง) — list: ค้นหา (ชื่อ/อีเมล/เบอร์) + สถานะเป็น popover · detail = หน้าเดียวดู⇄แก้ (`EditModeMixin`, ชื่อ/อีเมล/ไอคอนล็อกเมื่อเชื่อมบัญชี) · ส่วนจัดการจางในโหมดแก้ไข: เชื่อม/ยกเลิกเชื่อม · จับคู่ชื่อในรายการหาร · หนี้กับคนนี้ › · เก็บถาวร/กู้คืน · 🗑 ในโหมดแก้ไข · `/contacts/new` + `/:id/edit` ใช้หน้าใหม่ (`ContactFormPage` เหลือเฉพาะ flow คำขอเชื่อม, l10n แล้ว) · **แก้บั๊ก**: repo ส่ง `icon` (string) แต่ BE รับ `icon_code` → ตั้งไอคอนผู้ติดต่อไม่เคยได้
6. ~~การตั้งค่า / โปรไฟล์ / การแจ้งเตือน~~ ✅ 2026-10-07 (รอทดสอบบนเครื่อง) — ตั้งค่า: `SectionCard`/`DetailRow` ทั้งหน้า · สกุลเงินเริ่มต้นแก้ที่นี่ที่เดียว (`CurrencyTile`, บันทึกทันที) · ธีมเป็นการ์ดสี + ชื่อแปล · โหมดสี `AppTabBar` · ภาษา/ฟอนต์เป็น sheet (ฟอนต์ preview ตัวเอง) · แถว "การแจ้งเตือน ›" · เวอร์ชัน "1.0.0 (1)" · ออกจากระบบ `showConfirmDialog` · โปรไฟล์: เปิดเข้าโหมดแก้ไขทันที (`EditModeMixin`) · header (avatar → icon maker, ชื่อ inline) · ชื่อผู้ใช้ล็อก 🔒 · ย้ายสกุลเงินออก · เปลี่ยนรหัสผ่าน: `editing` + `ModeActionBar` · กล่องแจ้งเตือน: `[✓✓][⚙]` · แท็บ ทั้งหมด/ยังไม่อ่าน · หัวข้อวัน + เวลาทุกแถว · avatar ผู้ส่ง + badge ประเภท · ● ยังไม่อ่าน · ปัดซ้ายซ่อน · คำขอที่ตอบแล้วขึ้น "ตอบรับแล้ว · แตะเพื่อเปิด" · ปฏิเสธต้องยืนยัน · l10n ทุกประเภท · ตั้งค่าการแจ้งเตือน: "การแจ้งเตือนที่ได้รับ" แยกกลุ่ม (คำเชิญ/คำขอเปิดตลอด) ส่ง `muted_types` (**รอ BE contract §5**) + "การทำงานอัตโนมัติ" แยก หารบิล/รับเงิน (+ กระเป๋าที่รับเงิน)/โปรเจกต์ พร้อมป้าย "เร็ว ๆ นี้" (BE ยังไม่อ่านค่า) · switch แบบ optimistic เด้งกลับ + snackbar ถ้าล้มเหลว
7. ~~แดชบอร์ด~~ ✅ 2026-10-07 (รอทดสอบบนเครื่อง) — ลำดับ ทรัพย์สินสุทธิ (👁) → `PeriodSummaryCard` → งบ → ที่จะถึงใน 7 วัน → หนี้ → เป้าหมายออม → ใช้จ่ายตามหมวด (`group_by=category&type=expense`; ตัวเลขจะแยกรายจ่ายถูกต้องเมื่อ BE ทำ contract §2) → ล่าสุด (`TransactionTile`) · section ไม่มีข้อมูลซ่อนเอง · skeleton + `PullToRefresh` (โหลดทุก section ใหม่) · ยังไม่มีรายการ → `AddTile` "เพิ่มรายการแรก"
8. ~~แท็บรายการ~~ ✅ 2026-10-07 (รอทดสอบบนเครื่อง) — `[ประเภท▾][ช่วงเวลา▾][กระเป๋า▾ (มี "ไม่มีกระเป๋า")][หมวด▾]` เลื่อนแนวนอน + sort ใหม่สุด/เก่าสุด/ยอดมาก/ยอดน้อย · หัวข้อวัน + ยอดสุทธิวัน · `TransactionTile` · ว่าง/กรองแล้วไม่เจอ (ปุ่มล้างตัวกรอง) · ค้นหายังซ่อน (รอ `q`) · detail: `[🗑 ลบ][✏️]` (ซ่อนเมื่อเป็นรายการระบบ + แถบล็อก) · header + แถว กระเป๋า (กดไปได้)/หมวด/ยอดคงเหลือหลังรายการ/แท็ก/บันทึก/มีการหาร/ผู้บันทึก/ที่มาโปรเจกต์ · form: ✕ (ถามก่อนทิ้ง) + `ModeActionBar` · `AmountField` · "บันทึกแล้วเพิ่มต่อ" เป็นปุ่มรองท้ายฟอร์ม · "+ เพิ่มการหาร" เป็น `AddTile` · splits l10n
9. ~~กระเป๋า~~ ✅ 2026-10-07 (รอทดสอบบนเครื่อง) — list: การ์ดยอดรวม ของฉัน/กองกลาง (👁) · `AddTile` · "กระเป๋าที่เก็บถาวร (n) ›" → `/accounts/archived` (กู้คืน = `PUT status=active`) · จัดลำดับยังไม่ทำ (รอ BE `PATCH /accounts/reorder`) · detail: ✏️ เฉพาะเจ้าของ · header (ยอด + "ปรับยอด" + `ProgressRow` วงเงินบัตร) · `MemberStrip` (กระเป๋าร่วม) + แถวตั้งค่ากระเป๋า · คำอธิบาย/บันทึก/รอบบิล เป็นแถว · `PeriodSummaryCard` · รายการล่าสุด 5 + "ดูทั้งหมด ›" → `/accounts/:id/transactions` (cubit แยก ไม่กวนแท็บรายการ) · **ยังไม่ได้รวม form เข้าหน้า detail** — form แยกเดิมแต่เป็นโหมดแก้ไข (✕ + `ModeActionBar`) และย้าย "เก็บเข้าคลัง" มาไว้ top bar ของ form (บอกเหตุผลก่อนถ้ายังมีสมาชิกอื่น)
10. ~~หนี้~~ ✅ 2026-10-07 (รอทดสอบบนเครื่อง) — โหลดหนี้ทุกสถานะเข้า cubit แล้วจัดกลุ่มตามคนฝั่งแอป (`DebtPerson`, key เดียวกับ BE) · list: สรุปสุทธิ + กล่อง ติดคุณ/คุณติด (กดกรอง) · ค้นหา · สถานะ · หน้ารายคนใหม่ `/personal-debts/person` (ค้างอยู่ · ประวัติพับ · + บันทึกหนี้กับคนนี้ · ผูกกับผู้ติดต่อ) · detail ดู⇄แก้ (ยอด/กับใคร/บันทึก) + ปุ่มคืนเงิน + ยกเลิกหนี้ · sheet คืนเงิน (ทั้งหมด/ครึ่ง · ติ๊กบันทึกเป็นรายการ → กระเป๋า+วันที่) · form ใหม่ (การ์ดทิศทาง · `AmountField` · `ContactPickerSheet` · `CurrencyTile`) · ส่ง `counterparty_contact_id: null` ตอนเปลี่ยนเป็นชื่อพิมพ์เอง (รอ BE contract §7)
11. ~~โปรเจกต์ a → b → c~~ ✅ 2026-10-07 (รอทดสอบบนเครื่อง) — a: list การ์ด + ค้นหา + สถานะครบ 5 + sort + `AddTile` · b: detail แตกเป็น `widgets/` (1,983 → 511 บรรทัด + tabs/tiles) · header + pill สถานะ (เจ้าของกดเปลี่ยน, ยืนยันถ้าล็อก) · แถบล็อก · แท็บ แดชบอร์ด (ยอด/งบ/สมาชิก/ใครจ่าย/หมวดเด่น/ล่าสุด 3)/รายการ (ค้นหา/ประเภท/เฉพาะฉัน/sort/หัวข้อวัน)/เคลียร์ยอด (ยังเป็น placeholder) · แก้ข้อมูลโปรเจกต์ในหน้าเดิม (เจ้าของ) · หน้าสมาชิก `/projects/:id/members` (กลุ่ม · โอนเจ้าของ · นำออก · ออกจากโปรเจกต์) · c: form รายการรวมสร้าง+แก้เป็นหน้าเดียว (หารเท่ากัน · ส่วนของคนจ่าย) · l10n ทั้งโมดูล
12. ~~งบประมาณ · เป้าหมายออม · รายการตามกำหนด~~ ✅ 2026-10-07 (รอทดสอบบนเครื่อง) — ใช้กติกาเดียวกัน: list = การ์ด + `AddTile` ท้าย (เลิก + บน top bar) · skeleton · `EmptyView` + `AddTile` · `PullToRefresh` · การ์ดใช้ `ProgressRow` + 👁 · detail: `AppTopBar` `[🗑 ลบ][✏️]` (เลิก ⋮) · header `HeaderCard` · แถว `SectionCard`/`DetailRow` · เก็บถาวรเป็นปุ่มรองท้ายหน้า · รายการตามกำหนด: หยุดชั่วคราว/ทำต่อ/ยกเลิก ย้ายไปที่ pill สถานะ (§1.5) · form: ✕ + `ModeActionBar` + `AmountField` (+ `AppTabBar` รอบงบ) · หน้าสมาชิกกระเป๋า: เชิญย้ายไป top bar (เลิก extended FAB ที่ชน + กลาง) + breadcrumb ชื่อกระเป๋า

แต่ละขั้นสรุปให้รีวิวก่อนไปขั้นถัดไป

## 14. BE backlog (ทำหลัง UX — อัปเดตจากสแกน BE 2026-10-06)

> สเปก endpoint ทั้งหมดอยู่ที่ [design/api/ux-overhaul-contract.md](../../design/api/ux-overhaul-contract.md) (§0 + §10 shape ทำแล้ว)

**ฟีเจอร์ที่ UI ออกแบบรอไว้**
- การแจ้งเตือน: ค่าเปิด/ปิดรายประเภท (column + API) · ทำให้ switch อัตโนมัติ 4 ตัว**มีผลจริง** · ส่ง notification ประเภท split (มี type แล้วแต่ไม่มีโค้ดส่ง)
- รายการ: search `q` (ชื่อ/บันทึก) + filter แท็ก · summary `group_by` แยก income/expense (ตอนนี้รวมกัน)
- กระเป๋า: `PATCH /accounts/reorder` (bulk)
- แดชบอร์ด: `/dashboard` รวม (สุทธิ, สรุป, งบ, ที่จะถึง, หนี้, เป้าหมาย, ตามหมวด, ล่าสุด)
- โปรเจกต์: per-member breakdown (จ่าย/ค้าง/สุทธิ) · per-category · `my_position` (ประกาศไว้แต่ไม่เคย set) · บังคับสิทธิ์ viewer จริง
- หนี้: `people` ส่ง `icon_code` ของผู้ติดต่อ
- ผู้ติดต่อ: search ครอบคลุมอีเมล/เบอร์ (ตอนนี้ชื่ออย่างเดียว — แอปกรองเองได้เพราะไม่มี pagination)

- IconCode: field `shape` (ดู §3.5) — ทำคู่กับ FE ตอนทำ icon maker ได้ เพราะแก้แค่ struct

**ฝั่งแอป (ไม่ต้องรอ BE — ทำในรอบ UX ได้)**
- `PersonalDebt` เพิ่ม `createdAt`/`updatedAt` (JSON มีแล้ว)
- `CategoriesCubit.delete` คืนค่า `deleted`/`archived`

## 15. บั๊ก/ช่องโหว่ที่เจอระหว่างสแกน (ยังไม่แก้ — รอตัดสินใจ)
| # | ที่ | อาการ | ระดับ |
|---|---|---|---|
| 1 | BE `PUT /personal-debts/:id` | ไม่เช็คว่า `counterparty_contact_id` เป็นของผู้ใช้ → ผูกกับ contact ของคนอื่นได้ และ `people` join เอา `display_name` ของ contact นั้นมาแสดง = **ข้อมูลรั่วข้ามบัญชี** · ✅ **แก้แล้ว 2026-10-07** พร้อมช่องโหว่ที่หนักกว่าที่เจอเพิ่ม: split ด้วย contact ของคนอื่นสร้างหนี้ `i_owe` ใส่บัญชีคนอื่นได้ → ตอนนี้ตอบ `400 CONTACT_NOT_FOUND` (ดู API contract §0) | ✅ fixed |
| 1b | BE test `projects/quick_test.go` | compile ไม่ผ่านอยู่ก่อนแล้ว (`acctPersonal` ส่ง `uuid.UUID` แทน `*uuid.UUID`) — ไม่เกี่ยวกับงานนี้ | 🟡 |
| 2 | BE ลบหมวดหมู่ | หมวดที่มีงบผูก → FK `RESTRICT` → **500** · ✅ **แก้แล้ว 2026-10-07**: งบถูกลบตามหมวด (CASCADE, migration 000043) | ✅ fixed |
| 3 | แอป settle แบบ direct | ส่ง `account_id` = nil UUID แต่ BE `binding:"required"` → **น่าจะโดน 400** — ต้องทดสอบ | 🟠 |
| 4 | BE `UpdateMember` (projects) | เปลี่ยน role ของแถวเจ้าของเองเป็น contributor ได้ | 🟡 |
| 5 | BE ปฏิเสธคำเชิญโปรเจกต์ | แค่ dismiss notification แถวสมาชิก pending ค้างตลอด | 🟡 |
| 6 | BE `settled_amount > amount` ผ่าน PUT | ชน DB CHECK → 500 แทน 400 | 🟡 |
| 7 | BE dismiss + actioned พร้อมกัน | ชน DB CHECK → 500 | 🟡 |
| 8 | BE summary / people | `currency` hardcode `"THB"` | 🟡 (เมื่อมีหลายสกุล) |
