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

## 2026-10-10 — ส่งต่องาน UI ก่อนล้าง session (UI lead `d2` รวบรวมจาก ui · ราก · ปั้น · BE)

> 0.3.1-4 **live แล้ว** (app `58d74a3` · be `d8f32c7` · migration 052 · APK build 45 · `LATEST_APP_BUILD=45` · `MIN_APP_BUILD=0`) — รายละเอียดใน entry "ปล่อย 0.3.1-4" ข้างล่าง · **owner ยังไม่ได้ลองบนเครื่องจริง**

**วิธีทำงาน (owner)**
- คุย UI กับ UI lead → UI lead ส่ง brief ให้ session ตามหน้าที่: **ui** (หน้าจอ) · **ราก** (navigation / kit / ลิสต์รายการ) · **ปั้น** (motion / shell / แดชบอร์ด) · **BE** · **release** (commit / deploy / APK เท่านั้น)
- ชื่อ session (`chubi-pocket-xx`) เปลี่ยนทุกครั้งที่เปิดใหม่ → `ListAgents` แล้วถามทีละตัวว่าเป็นใคร
- **แก้ UI ทีละหน้า ให้จบเป็นหน้าๆ** · รายการ (สร้าง / ลิสต์ / detail) จบแล้ว · หน้าถัดไป = **กระเป๋า** (ค้างคำถามด้านล่าง)
- commit / deploy: owner สั่งเองใน release session · ก่อน release ให้ทุก session หยุดแก้ไฟล์

**กฎที่ owner ตัดสินรอบนี้ (ยังไม่มีในโค้ดบางส่วน)**
- **name / description / note:** สิ่งของมีครบ 3 ช่อง · รายการมี description (= "ค่าอะไร") + note · คำบนจอ ชื่อ / คำอธิบาย / โน้ต · **แท็กมีแค่ชื่อไปก่อน** · รายการระบบ description = ว่าง (แอปแปลชื่อหมวดระบบเอง)
- **ลบ / เก็บถาวร:** แผนอนุมัติแล้ว ทำใน v0.3.3 → [engineering/v0.3.3-delete-archive-plan.md](engineering/v0.3.3-delete-archive-plan.md) · รายการ / หนี้ / หมวด / แท็ก = ลบอย่างเดียว · เก็บถาวร = ซ่อน + ไม่นับ + กู้ได้
- **หน้า detail รายการ:** โหมดดูไม่มีแถวประเภท (ใช้สี) · ไม่มีคำอธิบายก็ว่าง (ใส่ชื่อหมวดแทนเฉพาะในลิสต์) · ✏️ มุมขวาบน มีชิปวันที่อยู่ซ้าย · ยอดไม่มี ± และ ฿ ติดตัวเลข · ประเภทแก้ไม่ได้หลังบันทึก
- **การหาร:** แก้หลังบันทึกได้อิสระ ยอดจ่ายคืนไม่จำกัด · คงเหลือติดลบ = จ่ายเกิน แสดงกลับทิศ · ลบคนที่จ่ายคืนแล้ว = ยอด 0 · อีกฝ่ายได้แค่แจ้งเตือน "อัปเดตตาม" (หลักสมุดบันทึก ไม่แก้ของคนอื่น)
- **back ในโหมดแก้ไข:** ถามเฉพาะตอนมีของที่แก้ค้าง (owner กลับคำจาก "ไม่ถาม") · ปุ่มยกเลิกไม่ถาม
- **การปัด:** ปัดที่บาร์ล่าง = เปลี่ยน tab เสมอ · ปัดเนื้อหา = หน้านั้นก่อน (แดชบอร์ด / ลิสต์ เปลี่ยนช่วงเวลา) สุดทางค่อยเปลี่ยน tab · ไม่มีโซนขอบจอ

**รอ owner ตอบ**
- **หน้ากระเป๋า 5 ข้อ:** แยกกลุ่ม ของฉัน / กระเป๋าร่วม + ปุ่ม ⇅ จัดลำดับ · การ์ดหัว detail มีชิป ประเภท / แชร์ / วงเงิน และย้ายปรับยอดออกนอกการ์ด · ปุ่มลัด ปรับยอด / เพิ่มรายการ / โอน · เอาการ์ดสรุปช่วงเวลาออก (ใช้ tab รายการแทน) · คนที่ไม่ใช่เจ้าของปรับยอดได้ไหม
- **ลิสต์รายการ:** tab รายการในหน้ากระเป๋าเปิดที่ "ทั้งหมด" (ตอนนี้) หรือเดือนนี้ · แท็กเป็น badge จิ๋ว vs ข้อความสี (ดู gallery) · ส่วนหัวเลื่อนไปกับลิสต์ vs ติดค้าง
- **หนี้:** แก้หนี้ตรงๆ (`PUT /personal-debts/:id`) ยังห้ามตั้งยอดคืนแล้วให้เกินยอดหนี้ จะผ่อนกฎไหม
- **รอบ "จ่ายหนี้" (owner จะคุยเอง):** แก้ยอดรายการจ่ายคืน · ปุ่ม "ไม่ใช่การจ่ายหนี้" (เลิกผูก) · แถว "จ่ายหนี้ให้: ลี ›" — BE จดวิธีทำไว้แล้ว

**ยังไม่ได้ลองบนเครื่อง:** ระยะขยับตามนิ้วตอนปัด (`_maxNudge` 24 / `_enterShift` 0.06) · "ต้องจัดการ" บนแดชบอร์ด (ไม่มี widget test) · ปุ่มดาวน์โหลดในหน้าบังคับอัปเดต · ทั้งส่วนรายการ 0.3.1-4

**บั๊ก / จุดที่ยังค้าง**
- บน prod: ลบรายการในโปรเจกต์ที่มีคนคัดลอกไปแล้ว → 500 (CHECK `transactions_project_id_implies_source`) · รายการประจำที่หยุดไว้หายจากลิสต์ — ทั้งคู่อยู่ในแผน v0.3.3 ขั้น 1–2
- สร้างรายการยังไม่เช็ค Σ ยอดหาร ≤ ยอดรายการ (ตอนแก้เช็คแล้ว)
- อีกฝ่ายกดซ่อนแจ้งเตือนการหารไปแล้ว → กดอัปเดตตามไม่ได้ (`NOTIFICATION_STATE_CONFLICT`) รอกู้คืนแจ้งเตือนใน v0.3.3
- module ที่ปิด: route redirect แล้ว แต่การ์ดแดชบอร์ด / แถวในตั้งค่ายังโผล่ · `push` ใน tab เดียวกันไปหน้า module ที่ปิดยังได้หน้าสำรอง
- **ความเสี่ยง:** push หน้าขึ้น root navigator ตรงๆ ทับ shell (ไม่มี sheet คั่น) อาจ assert "multiple heroes share the same tag" (tag ของ AppTopBar ตายตัว)

**เลื่อนไว้:** โหมดอีเวนต์ / รายการประจำใน sheet ยังเป็นแบบเก่า (รีวิวพร้อมหน้าของมัน) · เปลี่ยนคำ โปรเจกต์ → อีเวนต์ (ทำตอนรีวิวหน้าโปรเจกต์) · เอา pill kit (`chips/pill.dart`) ไปใช้แทน pill เก่า ~9 จุด · month picker ไปใช้ในหน้างบ · section แบบใหม่ในหน้าโปรเจกต์ / สมาชิกกระเป๋า / กระเป๋าที่เก็บถาวร · LLM ของ 0.3.2 รอ owner เปิดเรื่องเอง · l10n ที่ไม่ใช้แล้วลบได้ (`homeComingUp`, `pendingBlockTitle`, `homePrevMonth`, `homeNextMonth`, `commonDiscard*` ถ้าไม่ใช้)

**จุดที่ต้องระวัง (แอป)**
- ลิงก์ไปหน้าของ tab อื่นต้องใช้ `openPage` / `pageOpener` (มี `cross_tab_links_test` จับ) · page group ใหม่ = `ShellTab` + `_tabRoutes` + `ShellRow` + `ShellTab._segments`
- หลังเขียนข้อมูลฝั่ง server ใช้ `TransactionsCubit.bookChanged()` หรือ `refresh()` **ห้าม `load()` เปล่า** (ล้างตัวกรอง)
- sheet ที่มีช่องพิมพ์: controller ต้องอยู่ใน State แล้ว dispose ใน `dispose()` — dispose ทันทีหลัง `await showAppSheet` = พังตอนแอนิเมชันปิด
- `AppSheetScaffold` เว้นที่ keyboard ให้แล้ว ของข้างในห้ามบวก viewInsets ซ้ำ
- หมวดระบบดูจากไอคอนที่สงวนไว้ (`category_label.dart`) เพราะ BE ไม่ส่ง `system_kind`
- ลิสต์ไม่มี `splits` (มีแค่ `GET /:id`) · ปุ่มกดของแจ้งเตือนทุกอันอยู่ที่ `notification_actions.dart` (inbox + แดชบอร์ดใช้ร่วม)
- หน้าแรกของ tab ใหม่ต้องห่อ body ด้วย `TabSwitchBody` / `TabRootScaffold` · motion ทุกตัวต้องเคารพ `MediaQuery.disableAnimations`
- `SectionCard` วาดเส้นคั่น + แถบเอง (section แรก `first: true`) · แถบยื่นเลย padding `lg` ตายตัว · แถบปุ่มล่างใช้ `PinnedBar`
- text limits จาก `TextLimits` · label จาก `commonName` / `commonDescription` / `commonNote` · กระเป๋าล่าสุด `StorageKeys.lastAccountId`
- arb แก้แบบต่อท้ายเมื่อหลาย session ทำพร้อมกัน · ใช้ flutter ของ fvm 3.47.3

**จุดที่ต้องระวัง (BE)**
- test ที่ใช้ DB: `TEST_DATABASE_URL=postgres://chubadmin:admin1234@localhost:5433/chubi_pocket_db?sslmode=disable` — ไม่ตั้ง = skip เงียบๆ
- รัน migrate ผ่าน PowerShell (Git Bash ทำ path ของ docker เพี้ยน) · `core.autocrlf=true` มี noise CRLF/LF ไม่ใช่ diff จริง · gofmt เฉพาะไฟล์ที่แตะ
- version gate: บังคับอัปเดต = ส่ง APK ก่อน แล้วค่อยตั้ง `MIN_APP_BUILD` (+ recreate container) · **ขั้นลบกระเป๋าใน v0.3.3 ต้องออกพร้อมแอป + ขยับ `MIN_APP_BUILD`** ไม่งั้นแอปเก่ากด "เก็บเข้าคลัง" = ลบจริง

---

## 2026-10-10 — ปล่อย 0.3.1-4 (release = session `chubi-pocket-32`)

> owner สั่งผ่าน d2 + ยืนยันใน session นี้ · ก่อน commit: app analyze ผ่าน · test 183/183 · BE go vet + go test ผ่าน · migration **052** `editable_splits` (ไม่ breaking สำหรับ build 44)

- **be** `d8f32c7` แก้ยอดหารหลังบันทึก · split_changed · ลบรายการจ่ายหนี้ · ยอดรวมหน้ารายการ · detail fields — งาน 0b · live · backup `chubi_pocket-20261010-1303.dump.gz` · migration 52 ✓ · health ✓
- **app** `58d74a3` redesign สร้าง / รายการ / รายละเอียด transaction · แก้ยอดหาร · tag picker · ต้องจัดการ · swipe แถบล่าง · แจ้งเตือน split_changed · แก้ crash sheet ซ้อน + version `0.3.1-4` (commit เดียว → build **45**) · APK ส่ง `firsttester` แล้ว (Firebase 2045)
- **prod `.env`:** `LATEST_APP_BUILD=45` (backup `.env.bak-<เวลา>`) · `MIN_APP_BUILD=0` คงเดิม · recreate app · `GET /api/v1/app/version` → latest 45 ✓ — เครื่อง build 44 จะเห็นแถบ "มีเวอร์ชันใหม่" ครั้งแรก
- tag `v0.3.1-4`: app `58d74a3` · be `d8f32c7` · docs (commit นี้)
- **owner ทดสอบ:** แถบอัปเดตบน build 44 → ติดตั้ง 45 · แก้ยอดหารหลังบันทึก + อีกฝ่ายได้ split_changed / "อัปเดตตาม"
- อื่น ๆ: `ppforge-infra` `950c2f1` — `pull-to-dev.sh` ดึง backup prod แล้ว restore เข้า DB dev ในเครื่องทุกครั้ง (`NO_RESTORE=1` ข้าม)

---

## 2026-10-10 — BE สำหรับ 0.3.1-4: แก้ยอดหารหลังบันทึก · split_changed · ลบรายการจ่ายหนี้ · ยอดรวมหน้ารายการ (ยังไม่ commit)

> session BE 0.3.2 · brief ผ่าน d2 · local เท่านั้น · migration **052** (`editable_splits`) · `go vet` + `go test ./...` ผ่าน (DB จริง, ไม่ skip)

- **แก้ยอดหาร:** `PUT /v1/transactions/:id/splits` (ส่งรายการทั้งชุด: เพิ่ม / แก้ยอด / เอาออก) · ยอดจ่ายคืน**ไม่จำกัด**การแก้ → ยอดคงค้างติดลบได้ (= จ่ายเกิน แสดงเป็นหนี้กลับด้าน) · เอาคนที่จ่ายคืนแล้วออก = เก็บแถวไว้ยอด 0 · คนที่ยังไม่จ่าย = ลบแถว
- **แจ้งอีกฝ่าย:** คนเพิ่ม → `split_created` เดิม · แก้ยอด / เอาออก (อีกฝ่ายเพิ่มหนี้ไว้แล้ว) → `split_changed` + ปุ่ม "อัปเดตตาม" ใช้ครั้งเดียว `POST /v1/personal-debts/split-changes/:id/apply` · อันใหม่แทนอันเก่า (superseded) · ยังไม่เพิ่ม → แก้ยอดใน split_created ที่รออยู่
- **หนี้จ่ายเกิน:** ยอดรวมคน / แดชบอร์ดนับฝั่งกลับ · `settled` เมื่อจ่ายคืน = ยอดพอดี · ปิดหนี้ที่จ่ายเกิน → `DEBT_OVERPAID`
- **ลบรายการจ่ายหนี้ได้แล้ว:** ยอดจ่ายคืนของหนี้ลดตาม (แก้ / ยกเลิกการผูก "ไม่ใช่การจ่ายหนี้" → รอบ "จ่ายหนี้")
- รอบก่อนหน้า (ยังไม่ commit เช่นกัน): ไม่ใส่ข้อความอังกฤษในรายการระบบ · `totals` ใน `GET /transactions` · detail `split_count` / `splits` / `project`
- docs: spec 04 / 12 / 13 · api-document 0.7 · schema (personal_debts) · แผน v0.3.3 เลื่อนเป็น migration 053

---

## 2026-10-10 — แผน v0.3.3: ลบ / เก็บถาวร / สถานะกลาง (owner อนุมัติ · ยังไม่เริ่ม)

> แผนเต็ม: [engineering/v0.3.3-delete-archive-plan.md](engineering/v0.3.3-delete-archive-plan.md) — สถานะ active / inactive / completed / archived / ลบ · ลบกระเป๋าจริง (รายการไม่ผูกกระเป๋า) · เก็บถาวร = ซ่อน + ไม่ถูกนับ · migration 053 · 12 ขั้น (บั๊กลบรายการในโปรเจกต์ + รายการประจำที่พักไว้หาย ทำก่อน) · **ขั้น 12 ต้องปล่อยพร้อมแอป + ตั้ง `MIN_APP_BUILD`**

---

## 2026-10-10 — ปล่อย 0.3.1-3 (release = session `chubi-pocket-5f`)

> owner สั่งผ่าน d2 + ยืนยันใน session นี้ · ก่อน commit: BE build/vet/test ผ่าน (กับ DB เครื่อง) · app analyze ผ่าน · test 138 ผ่าน · ไม่มี migration

- **be** `980c24f` ด่านเวอร์ชันแอป (`GET /v1/app/version`, middleware 426 `APP_OUTDATED`, CORS `X-App-Build`) — งาน session `60` · live · backup `chubi_pocket-20261010-0825.dump.gz` · health ✓
- **app** `d04afd0` ด่านเวอร์ชัน (ราก) + BrandLogo / splash ใหม่ / native launch screen (ui) + version `0.3.1-3` — commit เดียวรวม bump เพื่อให้ build = **44** · APK 0.3.1-3 build 44 ส่ง `firsttester` แล้ว
- **prod `/srv/chubi/.env`** (backup เป็น `.env.bak-<เวลา>`): `MIN_APP_BUILD=0` (ด่านปิด) · `LATEST_APP_BUILD=44` · `APP_DOWNLOAD_URL` = ลิงก์ tester ของแอป (ไม่ผูก release → ชี้ build ล่าสุดเสมอ) · ข้อความ TH/EN ไม่ตั้ง · compose บน server ใช้ `env_file: .env` อยู่แล้ว ไม่ต้องแก้ · `up -d --force-recreate app`
- ตรวจ: `GET /api/v1/app/version` → `min 0 · latest 44 · download_url` ✓ · `X-App-Build: 1` ผ่านด่าน (401 จาก auth ไม่ใช่ 426) ✓ · health 200 ✓
- **ปล่อยรอบหน้า:** หลังอัปโหลด APK ใหม่ ต้องขยับ `LATEST_APP_BUILD` ใน `.env` ด้วย (+ recreate app) · จะบังคับอัปเดตเมื่อไหร่ = ตั้ง `MIN_APP_BUILD`
- tag `v0.3.1-3`: app `d04afd0` · be `980c24f` · docs (commit นี้)
- **owner ทดสอบ:** ติดตั้ง build 44 · splash ใหม่ (สว่าง/มืด) · ปุ่มดาวน์โหลดในหน้าอัปเดตเปิดลิงก์ Firebase
- อื่น ๆ วันนี้: ค่าตั้งจริงของเครื่องเก่าเก็บลง repo `ppforge-infra` แล้ว (`capture/`) — ร่าง infra แก้ให้ตรงของจริง ([vps-migration.md](engineering/vps-migration.md))

---

## 2026-10-10 — FE: ด่านเวอร์ชันแอป (app version gate) (session "ราก" — ยังไม่ commit)

> brief จาก UI lead `chubi-pocket-d2` (owner GO) · คู่กับ BE `chubi-pocket-60` (contract v1) · app analyze ผ่าน · test 138 ผ่าน · **ยังไม่ได้รันบนโทรศัพท์**

- ทุก request ส่ง `X-App-Build: <buildNumber>` (package_info, ใน `ApiClient`) · 426 / `APP_OUTDATED` ที่ request ไหนก็ได้ → stream `onOutdated` → บล็อกทันที
- `GET /app/version` ตอนเปิดแอป (splash รอ สูงสุด 5 วิ) + ทุกครั้งที่กลับเข้าแอป: build < `min_build` → `/update-required` หน้าบล็อก (`BrandLogo`, ข้อความจาก server ตามภาษา, ปุ่ม "ดาวน์โหลดเวอร์ชันใหม่" เปิด `download_url` ด้วย url_launcher, back = ปิดแอป) · build < `latest_build` → แถบ "มีเวอร์ชันใหม่" ปิดได้ (ไม่โผล่ซ้ำ 1 วัน) · เช็คไม่สำเร็จ (offline/5xx/timeout) → ให้เข้า (แต่ไม่ปลดบล็อกที่รู้อยู่แล้ว) · `/dev/*` ไม่โดนบล็อก
- โค้ด: `lib/features/app_version/` (info · repository · cubit · หน้า · แถบ · `versionGateRedirect`) · `api_client.dart` · `app_router.dart` · `app.dart` · l10n `appUpdate*` · dependency ใหม่ `url_launcher` · gallery มี demo · test `test/features/app_version/app_version_gate_test.dart`
- ใช้งานจริง: ตั้ง `MIN_APP_BUILD` / `LATEST_APP_BUILD` / `APP_DOWNLOAD_URL` ที่ BE (restart container) — **APK ที่มีด่านนี้ต้องออกไปก่อน** ค่อยตั้ง min (เครื่องเก่าไม่มีด่าน จะเจอแค่ 426 เป็น error ธรรมดา)

---

## 2026-10-10 — ปล่อย 0.3.1-2 (release = session `chubi-pocket-5f`)

> owner สั่งผ่าน d2 + ยืนยันใน session นี้ · ทุก session หยุดแก้ระหว่างปล่อย (d2 แจ้ง) · ก่อน commit: BE build/vet ผ่าน · test ผ่านทั้งชุดกับ DB ในเครื่อง (`TEST_DATABASE_URL`, local DB ที่ migration 51) · app analyze ผ่าน · test 121 ผ่าน · pub รับ `0.3.1-2`

### commit
- **be:** `33d29c2` มาตรฐาน name / description / note + migration 51 (งาน session `60`)
- **app:** `e12d831` งาน UX ของ d2 · ราก · ui · ปั้น (รวม commit เดียวเพราะไฟล์ทับกัน — ตามแนวเดิม) · `fcc7e52` version `0.3.1-2`
- **docs:** entry ของ BE + ราก + entry นี้ · schema 0.13 · api-document 0.5 · spec 07/08/15 · ux-overhaul-plan · frontend overview

### deploy
- BE + APK ต้องขึ้นพร้อมกัน (contacts `notes` → `note` — แอปเก่าพังที่หน้าผู้ติดต่อ/งบ)
- รอบแรกติด: VPS ติดต่อไม่ได้ (ssh timeout ตั้งแต่ขั้นอัปโหลด) — ไม่มีอะไรถูกแตะบน prod · VPS กลับมา 15:07
- **BE ✅** commit `33d29c2` live · backup `chubi_pocket-20261010-0810.dump.gz` · **migration 51 ผ่าน** · health ✓
- **APK** 0.3.1-2 **build 43** (`fcc7e52`) — build จาก working tree ตอนยังสะอาด (compile เสร็จก่อน session อื่นเริ่มแก้) · ส่ง Firebase `firsttester` ต่อท้าย deploy เดียวกัน
- tag `v0.3.1-2`: app `fcc7e52` · be `33d29c2` · docs (commit นี้)
- VPS ล่ม 2 รอบวันนี้ → owner ตัดสินใจย้ายเครื่อง: แผนร่างใน [engineering/vps-migration.md](engineering/vps-migration.md)

---

## 2026-10-10 — BE: มาตรฐาน name / description / note ทุกตาราง (migration 51) (ยังไม่ commit)

> session BE 0.3.2 · owner สั่งผ่าน UI lead `chubi-pocket-d2` · FE ทำคู่กันที่ session `chubi-pocket-a4` (ส่ง contract v1 แล้ว) · **ได้รับอนุญาตแค่ local:** migrate DB เครื่อง + รัน test — ยังไม่ commit / push / migrate prod / deploy

### กติกา (owner)
- **ของ (things)** — กระเป๋า หมวด แท็ก ผู้ติดต่อ งบ เป้าออม โปรเจกต์ รายการประจำ: `name` + `description` + `note`
- **รายการ (records)** — transactions, pending draft, project_transactions, personal_debts: `description` (= ค่าอะไร, หัวเรื่อง) + `note`
- ยกเว้น: users, project_members, เลขบัญชีกระเป๋า, notifications, import_logs, payment_providers
- ยาว: name 100 (แท็ก 50) · description 200 · note 500 ตัวอักษร (API) · แก้ไข: ไม่ส่ง key = คงเดิม · `null` หรือ `""` = ล้าง
- คัดลอกข้ามรายการ: description → description, note → note เสมอ (เลิก `note ?? description`)

### migration `000051_name_description_note` (up/down/up ผ่านบน DB เครื่อง)
- + description: transactions, tags, contacts, personal_debts, saving_goals, scheduled_transactions · + note: tags, projects
- contacts `notes` → `note` (breaking — FE ตาม)
- budgets: + `name` NOT NULL ← ย้ายค่า `description` เดิม (เป็นชื่องบ) มาใส่ ถ้าว่างใช้ชื่อหมวด · `description` ล้างเป็น NULL แล้วเป็น TEXT

### BE
- `internal/shared/text.go`: `CleanText` (trim, ว่าง → NULL) · `DecodeTracked` (รู้ว่า body มี key ไหน) · `TextChange`
- ทุก UpdateRequest ที่มี description/note รู้ว่า key ไหนถูกส่งมา (absent ≠ null) · `transactions.UpdateRequest.SetText` สำหรับโค้ดที่ copy
- mapping: สำเนาโปรเจกต์ + "อัปเดตให้ตรง" · รายการประจำจ่ายเลย (description = ชื่อรายการประจำ) · split → หนี้ทั้งสองฝั่ง · ปิดหนี้ (ไม่ส่ง description → ของหนี้) · quick create · pending submit · ปรับยอด (default "Balance adjustment") · ยอดเริ่มต้น (description "Opening balance") · สลิป: description = ผู้รับ (ค่าธรรมเนียม: `ค่าธรรมเนียม · <ผู้รับ>`), note = บันทึกช่วยจำ
- แจ้งเตือน: `split_created` / `project_tx_recorded_for_you` / `personal_update` มี `description` · diff ของ `project_tx_changed` มี `description`
- ค้นหารายการ `q` ค้น description ด้วย
- test ใหม่ `text_test.go` ใน 10 module (ใช้ DB จริงผ่าน `internal/platform/testdb`, ตั้ง `TEST_DATABASE_URL` → port **5433**): แก้ไม่ส่ง key = คงเดิม · null / "" = ล้าง · ค่าถูก trim + mapping (จ่ายเลย, ปิดหนี้, split, suggestion) · `go vet` + `go test ./...` ผ่านทั้งหมด (DB test ไม่ skip)

### docs
- `design/database/schema.md` 0.13 · `design/api/api-document.md` 0.5 (Conventions: name / description / note) · spec 07 (contacts note) · 08 (budget name) · 15 (สลิป description/note)

### ค้าง
- commit / push / migrate prod / deploy — รอ owner สั่ง
- เมื่อ 0.3.2 LLM เริ่ม: JSON ร่างใช้ description = ค่าอะไรสั้น ๆ, note = ที่เหลือ

---

## 2026-10-10 — แท็บต่อหน้า · section/แถบ · ปุ่มติดล่าง · back = ยกเลิก · ตระกูล pill (session "ราก" — ส่วนใหญ่ยังไม่ commit)

> session "ราก" (แชต "0.3.2") · รับ brief ผ่าน UI lead `chubi-pocket-d2` · app analyze ผ่าน · test 122 ผ่าน · **ยังไม่ได้รันบนโทรศัพท์** (owner รันเอง) · working tree เดียวกับ session ui (กำลัง sweep ชื่อ/คำอธิบาย/โน้ตทั้งแอป) + ปั้น (แอนิเมชัน)

### 1. แท็บต่อหน้า — **commit แล้ว** (อยู่ใน app `6e0fd5a`)
- ทุกกลุ่มหน้าเป็นแท็บของตัวเอง (`ShellTab` ใน `lib/app/shell/tab_nav.dart`): 4 ช่อง nav · ⏳🔔👤 (หน้าแรกไม่มี ←) · ทุกการ์ดในเพิ่มเติม (เปิดที่หน้าแรกเสมอ, มี ←) · ชั้น overlay + `overlay_nav.dart` เลิกแล้ว
- ช่องเพิ่มเติมไฮไลต์เฉพาะหน้า hub · กดเพิ่มเติม = hub เสมอ
- back ย้อนตามประวัติแท็บ (ไม่ซ้ำ) → ไม่มี: การ์ดเพิ่มเติม → hub, อื่น ๆ → แดชบอร์ด → "ปิดแอป?" · ← ที่หน้าแรกใช้ทางเดียวกัน (`ShellBackScope`)
- ลิงก์ข้ามแท็บ = `openPage` / `pageOpener` (กระโดดไปแท็บเจ้าของหน้า, หน้ามาเดี่ยว ๆ) · route detail เป็นพี่น้องกับ list
- docs: `product/phase2/ux-overhaul-plan.md` §2 + `design/frontend/app/overview.md` §4 อัปเดตแล้ว (entry นี้)

### 2. Brief 1–3 จาก d2 — ยังไม่ commit
- **section (#16/#17):** `SectionCard` วางเส้นคั่นระหว่างแถวเอง + `first` / `trailing` / `locked` / `dividers` · `SectionBand` แถบสีเต็มจอระหว่าง section (ทะลุ padding lg ของหน้า) · `DetailAddRow` · แปลง 13 หน้า (กระเป๋า หมวด ผู้ติดต่อ งบ เป้าออม รายการประจำ หนี้×2 รายการ โปรไฟล์ ตั้งค่า ตั้งค่าแจ้งเตือน สมัคร) · gallery + playground ใช้ของจริง · `test/shared/section_card_test.dart`
- **ปุ่มติดล่างทับแถบ gesture:** `PinnedBar` ใน kit → footer quick create ×2, แถบ "ยืนยันที่เลือก", footer จดหลายรายการ · ตรวจแล้วที่เหลือ OK (`ModeActionBar`, `AppSheetScaffold`)
- **back ในโหมดแก้ไข = ยกเลิก:** `EditModeMixin.handleBack` = `cancelEdit` ไม่ถาม · `leavePage` ย้ายเข้า mixin (pop / ไม่มีให้ pop → shell back) ลบ override 10 หน้า · reorder หมวด + เปลี่ยนรหัส: back = ปุ่มยกเลิก
- แก้: ลบรายการที่เปิดเดี่ยวในแท็บแล้วค้างหน้าเดิม → ตอนนี้ย้อนตาม shell back

### 3. Brief ล่าสุด — ยังไม่ commit (เฉพาะ kit / router / test / docs — ไม่แตะไฟล์ของ ui)
- **ตระกูล pill** (`lib/shared/widgets/chips/pill.dart`): `PillSize` mini 18 · small 22 · medium 28 · large 36 · `StatusPill` (เพิ่ม `size`, API เดิม) · `LabelPill` ใหม่ (ไม่มีจุด, tone หรือสีเอง, outlined) · `ActionPill` (เพิ่ม `size` + `style: raised` แบบปุ่ม "ปรับยอด") · `TagPill` (`#ชื่อ` บนสีแท็ก + ไอคอน) · `PillOverflowRow` (n อันแรก + `+n`) · `TypeIndicator` ใช้ `LabelPill` แล้ว · `FilterDropdownChip`/`SortChip` ใช้ขนาด large ร่วมกัน · gallery: ขนาดทุกแบบ + **เทียบแถวรายการ: ข้อความ #แท็ก vs pill เล็ก สูงสุด 2 / 3** (owner เลือกบนโทรศัพท์) · `test/shared/pill_test.dart`
  - **ยังไม่ย้ายหน้าไปใช้** (รอ ui เสร็จ) — pill เก่าที่ต้องย้าย: `ProjectStatusPill` (projects/widgets/project_common.dart) · `_TypePill` (categories/pages/category_detail_page.dart) · `_VariantPill` ×2 (scheduled_transactions/pages/scheduled_transaction_detail_page.dart, widgets/scheduled_card.dart) · `_TypeChip` + `_PillButton` (accounts/pages/account_detail_page.dart) · `_Chip` (accounts/pages/wallet_members_page.dart) · `TxTypeChip` + `_DatePill` (transactions/widgets/tx_hero_card.dart) · `TagChip` / `TagShortList` (tags/widgets/tag_chip.dart — ยังไม่ปรับขนาดให้ตรง เพราะอยู่นอก kit) · `TypeIndicator` ยังไม่ export ใน `ui.dart` (export แล้ว import ตรงใน category_detail_page กลายเป็นซ้ำ — ทำตอนย้าย)
- **กันลิงก์ข้ามแท็บ:** `test/app/shell/cross_tab_links_test.dart` สแกน `lib/` — `push` route ของแท็บอื่น / `go` ลึกเข้าแท็บอื่น / เป้าที่ไม่ใช่ string (นอกรายการตรวจแล้ว) = ล้ม · ตอนนี้ผ่าน
- **โมดูลที่ปิด (`AppModules`):** router redirect (`offModuleRedirect` ใน tab_nav.dart) — การ์ดเพิ่มเติม → `/more`, ⏳🔔 → `/` · ตั้งค่าแจ้งเตือนใต้ตั้งค่านับเป็นของแจ้งเตือน · `test/app/shell/off_module_redirect_test.dart` · ข้อจำกัด: `push` route ของโมดูลที่ปิดจากแท็บเดียวกันจะ push หน้าแดชบอร์ด/hub ซ้อน → ทางเข้าใน UI (การ์ดแดชบอร์ด, แถวในตั้งค่า) ต้องซ่อนเอง (รอ ui)

### ค้าง / ต่อไป
1. owner: ทดสอบบนโทรศัพท์ — แท็บ/back, section + แถบ, ปุ่มล่าง (มือถือมีแถบ gesture), back ในโหมดแก้ไข, gallery เทียบ pill แท็ก
2. ตัดสินใจ: หน้าตั้งค่าแจ้งเตือน (แยก section ตามกลุ่ม, ย้ายสวิตช์ "เคลียร์รายการของฉันในโปรเจกต์" เข้ากลุ่มโปรเจกต์) · หนี้ตามคน · ประวัติรายการประจำ · แท็กบนแถวรายการ (ข้อความ vs pill)
3. หลัง ui sweep เสร็จ: ย้ายหน้าไปใช้ pill ใหม่ · ซ่อนทางเข้าโมดูลที่ปิด · ลบ l10n `commonDiscard*` ที่ไม่ใช้แล้ว
4. สลับแท็บไปเจอหน้า detail (ไม่ใช่หน้าแรก) ไม่มีแอนิเมชัน — ของ ปั้น
5. commit: แยก commit ของ "ราก" ออกจากงาน ui (ไฟล์ทับกัน: หน้า detail, ตั้งค่า, quick create, รอยืนยัน)

---

## 2026-10-10 — 0.3.1.1 (FE): เลขบัญชีในหน้ากระเป๋า · สวิตช์หมวดค่าธรรมเนียม — ปล่อยแล้ว

> **ปล่อยแล้ว:** owner commit รวมกับงาน nav แท็บต่อหน้าของ session "ราก" เป็น app `6e0fd5a` · tag `v0.3.1.1` (app) · APK **0.3.1 build 41** ส่ง Firebase `firsttester` (owner เลือกคงชื่อ 0.3.1 + build ใหม่ — Flutter ไม่รับเลข 4 ส่วน `0.3.1.1`) · BE ไม่ได้ deploy (ไม่มีอะไรเปลี่ยน) · ก่อนปล่อย: analyze ผ่าน · test 91 ผ่าน (รวม `main_shell_test`)

> session `chubi-pocket-5f` (ต่อจากเจ้าของ 0.3.1) · FE checklist ข้อ 10 ใน entry (5) · app analyze ผ่าน · test ใหม่ 8 ผ่าน · test ทั้งชุด: ล้ม 1 ตัวใน `test/app/shell/main_shell_test.dart` (ไฟล์ของ session nav/แอนิเมชันที่กำลังแก้อยู่ — ตัวที่ล้มเปลี่ยนไประหว่างรัน 2 รอบ ไม่ใช่ของงานนี้) · **ยังไม่ได้รันบนโทรศัพท์** (owner รันเอง) · ทำงานคู่กับงาน nav ของ session "ราก" ใน working tree เดียวกัน — แตะ `account_detail_page.dart` / `category_detail_page.dart` แบบเพิ่มเท่านั้น

### หน้ากระเป๋า — ส่วน "เลขบัญชี · พร้อมเพย์ · บัตร" (แท็บภาพรวม ต่อจาก `_infoSection`)
- model `AccountIdentifier` (`accounts/domain/account_identifier.dart`): kind 4 แบบ · normalize เหมือน BE · `formatted` (บัญชี 10 หลัก `123-4-52780-6`, เบอร์, เลขบัตร ปชช., บัตร 4-4-4-4) · `masked` = `•••• 2780`
- `Account.identifiers` · สร้าง = ส่งเมื่อมี · แก้ = ส่งทั้งรายการเสมอ (BE แทนที่) — `_save` ส่งจาก draft ทั้งสองทาง
- โหมดดู: รายการ + **👁 ตัวเดียวกับเงิน** (`MoneyVisibilityToggle`/`isMoneyHidden`) ซ่อน = `•••• 2780` · ว่าง = แถว "ยังไม่มีเลข" แตะเพื่อเข้าโหมดแก้ · คนที่ไม่ใช่เจ้าของเห็นเฉพาะเมื่อมีเลข
- โหมดแก้ / สร้าง: แตะแถว = แก้ · × = ลบ · `AddTile` = เพิ่ม → sheet (`widgets/identifier_widgets.dart`): เลือกชนิด (การ์ด 4) · **ธนาคาร** (เฉพาะเลขบัญชี; จาก `GET /v1/payment-providers` + "ไม่ระบุ") · ช่องเลข (ตัวเลข/x/ขีด, ≥4 หลัก, ≤32)
- `AccountsRepository.paymentProviders()` cache ครั้งเดียวต่อรันแอป · `INVALID_IDENTIFIER` → `walletErrorInvalidIdentifier` · `AppIcons.accountNumber` ใหม่ (ชนิด "อื่น ๆ")
- widget อยู่ใน feature (ไม่ใช่ shared) จึงไม่ได้ใส่ gallery

### หน้าแก้ไขหมวด — สวิตช์ "ใช้เป็นหมวดค่าธรรมเนียม"
- เฉพาะหมวด**รายจ่าย**ที่บันทึกแล้ว · มีผลทันที (preference ไม่ใช่ field ของหมวด) · เปิด = `PUT /users/me {preferences:{fee_category_id}}` · ปิด = `null` · ทีละหมวด
- `User.feeCategoryId` (อ่านจาก `preferences`) · `UsersRepository.getMe()` / `setFeeCategory()` · หน้าโหลด `GET /users/me` ตอนเปิด (login ไม่ส่ง preferences) แล้ว `AuthCubit.updateUser`

### l10n ใหม่
`accountIdentifiers*` · `identifierKind*` · `identifierSheet*` · `identifierBank*` · `identifierValue*` · `identifierDelete` · `walletErrorInvalidIdentifier` · `categoryFeeSwitch*`

### owner ทดสอบ
1. กระเป๋า → แก้ไข → เพิ่มเลข (เลขบัญชี + ธนาคาร / พร้อมเพย์ / บัตร) → บันทึก → 👁 ซ่อน/แสดง
2. หมวดรายจ่าย → เปิดสวิตช์ค่าธรรมเนียม → เปิดอีกหมวด → หมวดแรกต้องปิดเอง
3. Imports lab ลองสลิป: กระเป๋าที่ใส่เลขแล้วต้องถูกเลือกใน JSON (`account_id`)

### ค้าง
- (ไม่บังคับ) Imports lab แสดงชื่อกระเป๋าแทน `account_id`
- 0.3.2 ส่วนหลัก: ข้อความอิสระ → LLM → JSON

---

## 2026-10-09 (9) — ปล่อย 0.3.1 (release owner = session `chubi-pocket-32`)

> owner สั่งขึ้น 0.3.1 ก่อนเลิกงาน · session `0b` / `0d` หยุดแล้วตอน commit · app analyze ผ่าน · test 72 ผ่าน · BE vet/test ผ่าน · **owner ทดสอบบนแอปที่ชี้ VPS ต่อ**

### commit
- **be:** `7bab423` identifiers + fee category (mig 48) · `0d02d25` payment providers + import logs (mig 49–50) · `6c1668f` อ่านสลิป → JSON (Tesseract ใน Docker, กฎ KBank, จับคู่กระเป๋า)
- **app:** `d088a57` slip lab + QR บนเครื่อง (entry 5) · `0747046` UX polish ทั้งหมดของ `0b`/`0d` (entry 6–8) — รวมเป็น commit เดียว เพราะไฟล์ทับกันเยอะ (+ `dart format` ทั้งแอป) แยกตามหัวข้อไม่ได้โดยไม่ใช้ interactive add · `cb61ac4` version 0.3.1
- **docs:** spec 15 + schema + spec 03 + ops-runbook + log นี้

### deploy
- `be/scripts/deploy.sh` (BE + APK) ✅ · **BE** commit `6c1668f` live · backup `chubi_pocket-20261009-1043.dump.gz` · migration 48/49/50 ผ่าน · health ✓ · route ใหม่ตอบ 401 (มีจริง) · **APK** 0.3.1 build 40 (`cb61ac4`) ส่ง Firebase `firsttester` แล้ว
- ยังไม่ได้ยืนยัน: tesseract ทำงานบน VPS (ลองสลิปจริงใน lab — ถ้าได้ 503 `OCR_UNAVAILABLE` = image ไม่มี tesseract)
- ไม่มีบน prod: OCR dump (`OCR_DUMP` ไม่ได้ตั้ง + `APP_ENV=production`)

### owner ทดสอบบนแอป (APK ชี้ VPS)
1. ทุกอย่างใน entry 6–8 (top/bottom bar, ปัดแท็บ, back ปิด sheet, เหรียญ pull to refresh, หน้ากระเป๋าแท็บ, แท็ก, ผู้ติดต่อ, หมวดหมู่, เปิดแอปตอนเน็ตหลุด)
2. Dev hub → Imports lab → Real slip → OCR กับสลิปจริง — **ดูเวลา OCR บน VPS** (บน PC ~2–3 s)
3. log ฝั่ง prod: `sudo docker logs chubi_app | grep imports` · import logs: ops-runbook §3

### ถัดไป
- 0.3.2: FE checklist ข้อ 10 ใน entry 5 (identifiers ในหน้ากระเป๋า + สวิตช์หมวดค่าธรรมเนียม) + free text → LLM → JSON
- เศษ 0.3.0 ที่ยังค้าง: entry 8 ข้อ 3 · entry 7 ข้อ 3–4

---

## 2026-10-09 (8) — เก็บเศษ 0.3.0 (ขึ้น 0.3.1): top bar/bottom bar motion · pull to refresh เหรียญ · หน้ากระเป๋าแบ่งแท็บ · บั๊ก token/จอแดง (ยังไม่ commit)

> session `0b` = คนเก็บเศษ 0.3.0 (owner 0.3.1 เป็นอีก session) · app analyze ผ่าน · test 58+ ผ่าน · `dart format` ทั้งแอปแล้ว (owner อนุญาต) · **รันบนโทรศัพท์บางส่วน** (owner รันเอง)
> **ถึง owner 0.3.1 (checklist 10-B):** `account_detail_page.dart` เปลี่ยนโครงแล้ว — การ์ดหัว (ชื่อ+คำอธิบายแก้ในการ์ด) ค้างด้านบน · ใต้ลงมาเป็นแท็บ **ภาพรวม | รายการ** (`PageView`) · ส่วนเลขบัญชีให้ใส่ใน `_overview()` (แท็บภาพรวม, ต่อจาก `_infoSection`) · แถวคำอธิบายย้ายขึ้นการ์ดหัวแล้ว · รายการล่าสุด 5 อันเอาออก (มีแท็บรายการแทน)

### 1. เครื่องมือ
- `app/run-phone.sh` — รันบนมือถือผ่านสาย: `./run-phone.sh` (API prod) · `local` (เปิด docker BE ให้ + `adb reverse`) · `attach` (แอปปิดแล้วต่อกลับไม่ต้อง build) · debug/profile manifest เปิด `usesCleartextTraffic` (release ยัง https)

### 2. บั๊ก
- จอแดงหน้ากระเป๋า: `context.select` ผิด context — ที่หน้ากระเป๋า + `isMoneyHidden`/`moneyString` (ใช้ `watch` แทน แก้ทั้งแอป)
- **เปิดแอปตอนเน็ตหลุด → token ถูกลบ ต้อง login ใหม่:** `AuthCubit.init` ลบ token เฉพาะ 401/403 · อื่น ๆ เก็บ token + splash โชว์ `ErrorView` + ลองใหม่ (`AuthInitial.startupError`) · test 3 เคส
- ดึงรีเฟรชหน้าว่าง → skeleton แวบเต็มจอ: `AsyncStateView` โชว์ skeleton เฉพาะโหลดครั้งแรก
- หน้ากระเป๋าเคย `TransactionsCubit.load(accountId)` บน cubit กลาง → แท็บรายการหลักถูกกรองตามไปด้วย · ตอนนี้แท็บรายการของกระเป๋าใช้ cubit ของตัวเอง
- เปิดรายการจาก list ที่ใช้ cubit แยก → "ไม่พบ": detail ดึงแถวเองด้วย `TransactionsCubit.refreshOne(id)` ใหม่

### 3. Bottom bar
- ทุกแท็บ = ไอคอน 28 + ชื่อ 10pt ข้างใต้ · ไฮไลต์ก้อนเดียว**เลื่อน**ไปแท็บที่เลือก (ลอดใต้ +) · แถบโค้ง 30 / ไฮไลต์ 24 / เว้น 6 · ไม่มี ripple

### 4. Top bar (กติกาใหม่ owner)
- **ไม่ขยับตอน push/back** — ซ้ายและขวาเป็น `Hero` · ฝั่งซ้าย cross-fade (ชื่อ, breadcrumb, ← / ✕ / ไม่มี)
- **ชิปขวา ⏳🔔👤 ลอยขึ้นพ้นจอ** ในหน้าที่ไม่มีชิป (ตั้งค่า, แจ้งเตือน, รอยืนยัน) **และใน edit mode** (เปลี่ยนจากกติกาเดิมที่ชิปค้างใน edit mode)
- หน้าเพิ่มเติม (ไม่มีกล่องซ้าย): กล่องซ้ายลอยขึ้น/ลง ทั้งตอน push/back และตอนสลับแท็บ (shell จำว่าแต่ละแท็บโชว์อะไร — `TabSwitchScope`)
- ทุกการเคลื่อนไหวผ่าน `_ParkingHero` ตัวเดียว · `AppDurations.chrome` 450ms + `chromeCurve` (= page transition Android + Hero) · สลับแท็บ: เนื้อหา fade ใต้ top bar (`TabSwitchBody`), top bar นิ่ง · แท็บที่ซ่อน `HeroMode(false)`

### 5. Pull to refresh
- หน้าตาใหม่ **เหรียญ ฿ หย่อนลงกระเป๋า** (`PullToRefresh` บน `RefreshIndicator.noSpinner`, `CoinDropIndicator`) · gallery มี
- `AsyncStateView`: หน้าว่าง / error / ไม่พบ ดึงรีเฟรชได้เอง (ผ่าน `onRetry`) · `PullToRefresh(enabled:)`
- เพิ่มที่ detail: งบ · หมวด · ผู้ติดต่อ · หนี้ · เป้าออม · รายการประจำ · รายการ (ปิดตอนสร้าง; ผู้ติดต่อ/หนี้ปิดตอนแก้)

### 6. หน้า detail กระเป๋า
- การ์ดหัว: ชื่อ + คำอธิบาย (ใหญ่ขึ้น แก้ตรงนี้) ข้างไอคอน · [ปรับยอด] ข้าง ✏️ · ประเภท = chip สีกระเป๋า · edit mode ซ่อนสรุป · บันทึกว่าง = บรรทัดเดียว
- แท็บ **ภาพรวม | รายการ** ปัด/แตะ · การ์ดหัวค้าง · edit mode ล็อกภาพรวม · แท็บรายการ = `TransactionsListPage(embedded:, lockedAccount:)` (ค้นหา/กรอง/โหลดเพิ่ม, ซ่อนตัวกรองกระเป๋า, `AddTile` ท้ายรายการ preset กระเป๋านี้)
- `showQuickCreateSheet(account:)` ใหม่ — preset กระเป๋า

### 7. Shared widget ที่เปลี่ยน
- `SelectCardGroup`: ที่เลือก = ไอคอนในวงทึบ + ✓ มุม + เงาสี (ทุกที่ที่ใช้)
- `InlineField`: ว่าง = บรรทัดเดียว (`minLines: 1`) · `InlineTitleField(style:, maxLines:)`

### ค้าง / ต่อไป
1. owner: ทดสอบบนโทรศัพท์ทั้งหมดข้างบน · offline start (ปิดเน็ต → ปิดแอปจริง → เปิด)
2. ~~ปัดแท็บมี 2 แบบ~~ ✅ owner เลือกแบบกระเป๋า (ตามนิ้ว) → **`AppTabPager<T>`** ใหม่ใน `app_tab_bar.dart` (PageView + keep-alive · แตะแท็บ 320ms `easeInOutCubic` ช้า-เร็ว-ช้า · ปล่อยนิ้ว spring แข็งขึ้น · `enabled:false` หยุดด้วย physics ไม่เปลี่ยน tree) · `AppTabBar(pager:)` เส้นใต้ตามตำแหน่งหน้า (ตามนิ้วด้วย) · ใช้ที่กระเป๋า + หมวดหมู่ (หมวดหมู่: `ScrollController` แยกต่อแท็บ, auto-scroll ใช้ของแท็บที่เลือก, เปลี่ยนแท็บผ่าน `_setListType`) · **ลบ `AppTabSwipe`** (entry 7) · gallery + `test/shared/app_tab_bar_test.dart` เปลี่ยนเป็น pager
3. ~~เศษ 0.3.0 ที่เหลือ (A1–A6 + docs)~~ ✅
   - **A1** shared ใหม่ `showActionSheet` + `ActionSheetHeader` + `SheetAction` (`sheets/action_sheet.dart`) — sheet จัดการสมาชิกโปรเจกต์ + sheet แตะแถวรายการโปรเจกต์ (เดิมต่อ `ListTile` เอง)
   - **A2** detail รายการประจำ: ข้อมูล / สร้างตอนนี้ / ประวัติ → `SectionCard` + `DetailRow` (เลิก `Card` + แถวทำเอง)
   - **A3** shared ใหม่ `showChoiceDialog` + `DialogChoice` (`feedback/choice_dialog.dart`, ปุ่มเรียงเต็มกว้าง) — dialog ปิด quick create (เก็บร่าง / แก้ต่อ / ทิ้ง)
   - **A4** เพิ่มแท็กโหมด event → `showAppSheet` + `AppTextField` (เลิก `AlertDialog` + `TextField`)
   - **A5** `showAppSheetCustom` = route เดียวกับ `showAppSheet` สำหรับ sheet ที่มี `AppSheetScaffold` เอง — ปรับยอด + เชิญสมาชิกกระเป๋า · `showModalBottomSheet` ที่เหลือตั้งใจ (quick create ปิดลากลง, icon maker, dev)
   - **A6** ลบ l10n ไม่ใช้ 6 ตัว (`accountDetailSeeAll` `accountDetailDescription` `transactionsEmptyAccountMessage` `quickAllCategories` `quickCreateNameSection` `quickCreateSubmit` — owner ตัดชิปหมวดล่าสุด) · สคริปต์ย้ายมา `app/scripts/unused_l10n.js` (`node scripts/unused_l10n.js [--apply]`, เว้น `common*`/`pending*`) · เพิ่ม `appExitTitle`/`appExitConfirm` ให้ session `0d`
   - **docs** `schema.md` project_transactions: `category_name`/`category_icon_code` → `tags TEXT[]` (mig 47) · contract §6a: `by_category` → `by_tag` + §6a′ แท็กโปรเจกต์ (`tags` บนแถว, `GET /projects/:id/tags`)
   - gallery: `showActionSheet` · `showChoiceDialog` (Feedback) · ตัดออก (เช็คแล้วไม่ใช่ปัญหา): `TextFormField` หน้าแท็ก (ช่องแก้ชื่อในแถว ตั้งใจ) · spinner เล็กในแถวหน้าหนี้รายคน
   - app analyze ผ่าน · test 72 ผ่าน
4. ~~หน้า home~~ ✅ (owner เลือก 4 ข้อ): การ์ดไม่ได้เก่า (ใช้ cardTheme อยู่แล้ว) แต่ปรับให้เข้ากับชุดใหม่ — ทรัพย์สินสุทธิ = แบบการ์ดกระเป๋า (สีหลัก + ลายน้ำ) · การ์ด งบ/หนี้/ออม = สีกลุ่ม `ModuleColors` + ไอคอนแบบหน้าเพิ่มเติม · แถบเดือน = `AppIconButton` กลม ไม่มี spinner (เนื้อหาจางตอนโหลด) · รายการล่าสุดมี `AddTile` ท้าย · **shared ใหม่ `TintedCard` + `TintedIconBadge`** (`layout/tinted_card.dart`, gallery) — `AccountCardSurface` + การ์ดหน้าเพิ่มเติมใช้ตัวนี้ (หน้าตาเดิม โค้ดไม่ซ้ำ)
5. commit แยกหัวข้อเมื่อ owner สั่ง

---

## 2026-10-09 (7) — UX polish: แท็ก (หน้าตาใหม่ทั้งแอป) · ผู้ติดต่อ · หมวดหมู่ (filter + ปัดเปลี่ยนแท็บ) · AppTabBar เส้นใต้เลื่อน (ยังไม่ commit)

> session `chubi-pocket-0d` · app analyze ผ่าน · test 72 ผ่าน (ล่าสุดหลัง §10) · `dart format` เฉพาะไฟล์ที่แก้ · **ยังไม่ได้รันบนโทรศัพท์** (owner รันเอง) · ทำคู่กับ session `0b` (เก็บเศษ 0.3.0) — แจ้งไฟล์ที่ทับกันแล้ว ไม่ได้แตะ `transactions_list_page` / `quick_create_sheet` / `account_detail_page` ของเขา · `test/zz_scratch_topbar_test.dart` ที่ entry (6) เห็นเป็นของ session นี้ (probe ชั่วคราว) — ลบแล้ว

### 1. แท็ก — หน้าตาเดียวทั้งแอป
- **แบบเต็ม `TagChip`** (`features/tags/presentation/widgets/tag_chip.dart`): ทรงแท็ก · กรอบ + ไอคอน + ตัวอักษร = สีแท็ก · พื้น = สีเดียวกันจาง · `selected:` ใช้เป็นตัวเลือก (เลือก = เต็มสี, ไม่เลือก = กรอบเทา) · `showUsage:` โชว์ ×n
- **แบบย่อ `TagShortList`**: `#ชื่อ #ชื่อ` สีตามแท็ก บรรทัดเดียว · `tagColor(iconCode, palette)` = สีไอคอนก่อนเสมอ (แท็กไม่ใช้ bg)
- ใช้ที่: ฟอร์ม quick create (`_TagsBlock`) · แท็กโปรเจกต์ในโหมด event (ชื่อตรงกับแท็กเราใช้สีนั้น ไม่ตรง = สีหลัก) · หน้า transaction detail · **แถวรายการ: แท็กย่อขึ้นบรรทัดที่ 3** (`MoneyListTile(footer:)` ใหม่, เอาตัวนับแท็กออก) · แถวหน้ารอยืนยัน
- **บั๊ก:** `EmbeddedTag` อ่าน `color`/`icon` แต่ BE ส่ง `icon_code` → สี/ไอคอนแท็กในรายการไม่เคยมาถึงจอ · แก้เป็น `iconCode` + `asTag` (repo `attachTags` ใช้ `fromJson` ด้วย)
- **หน้าแท็ก:** โหมดแก้ไม่มี filter สี/ไอคอนแล้ว (ค้นหาอย่างเดียว; โหมดดูยังมี) · ปุ่มเข้าโหมดแก้ = ปุ่มกลม `AppIconButton` ไม่มี label · การ์ดแท็กใช้สีแท็ก (ยังเป็นการ์ดมุมโค้ง ไม่ใช่ทรงแท็ก เพราะมีช่องพิมพ์ชื่อ + error)
- **icon maker (แท็ก):** preview อยู่กลาง · ช่องเลือกไอคอนไม่มีพื้นหลัง/วงกลม (ไอคอน + สีเท่านั้น) · สร้างใหม่ไม่ใส่ bg อัตโนมัติแล้ว (เดิมได้ bg สีหลัก → ไอคอนสีหลักจมหายในช่องเลือก และ bg ไปชนะเป็นสีแท็ก)
- `_IconSwatchGrid` ในหน้าแท็ก → shared `IconSwatchGrid` (ข้อ 3)

### 2. ผู้ติดต่อ
- **"เพิ่มผู้ติดต่อ → title เลื่อน":** probe (widget test) ตอนเข้าหน้า: top bar + การ์ดหัว **นิ่งทุกเฟรม** · ที่กระตุกจริงคือ**ตอนบันทึก**: เดิม flip เป็นโหมดดู 1 เฟรม → `pushReplacement` เลื่อนหน้าใหม่เข้ามา → skeleton โหลด → ค่อยเห็นข้อมูล · แก้: บันทึกแล้วเปลี่ยนเป็นผู้ติดต่อที่สร้าง**ในหน้าเดิม** (แก้ → ดู เหมือน save ปกติ) + `context.replace` แค่แก้ URL (page key เดิม ไม่มี transition ไม่โหลดใหม่) · `_isCreate` ดูจาก state แทน `widget`
- **placeholder โหมดแก้:** ชื่อ "ชื่อ (จำเป็น)" · อีเมล/เบอร์/บันทึก "ไม่บังคับ · ตัวอย่าง" (เดิมโหมดแก้ช่องว่างไม่มี hint เลย ส่วนโหมดดูขึ้น "กดค้างเพื่อแก้ไข")
- **ไม่เจอผลลัพธ์ = `EmptyView` แบบเดียวกันทุกกรณี** (เลื่อนได้ ดึง refresh ได้): ค้นไม่เจอ (ไอคอนค้นหา) · เก็บถาวรว่าง (ไอคอนเก็บถาวร + คำอธิบาย) — เดิมเก็บถาวรขึ้นแค่ข้อความ
- **ปุ่ม `+` กลม** ขวาสุดแถว filter (ยังมีเส้นประเพิ่มท้ายรายการ)
- l10n ใหม่: `contactsNoMatchMessage` `contactsArchivedEmptyTitle/Message` `contactName/Email/Phone/NotesHint`

### 3. หมวดหมู่ + แท็บ
- **แถว filter** ใต้ค้นหา: `[สี▾][ไอคอน▾] … (✏️)(+)` · กรองตามสี/ไอคอนที่แถว**แสดง** (L2/L3 ใช้ของ L1) โชว์ผล + บรรพบุรุษเหมือนค้นหา · เปลี่ยนแท็บล้าง filter · ✏️ = เข้าโหมดจัดลำดับ (ล้างค้นหา/filter ก่อน; ต้องมี ≥2 หมวด) · ซ่อนทั้งแถวตอนจัดลำดับ
- **ปัดซ้าย/ขวาเปลี่ยนแท็บ รายจ่าย ↔ รายรับ** · ปิดตอนจัดลำดับ (ลากแนวนอน = เลือกชั้น)
- **`AppTabBar`** (shared อยู่แล้ว ใช้ 9 ที่: หมวดหมู่ · กระเป๋า · การ์ดงบ · inbox แจ้งเตือน · โปรเจกต์ · แถวรายการโปรเจกต์ · ตั้งค่า · icon maker · gallery): เส้นใต้เป็นตัวเดียว**เลื่อน**ไปแท็บที่เลือก + สีตัวอักษร fade · API เดิม ทุกที่ได้ animation เลย
- **`AppTabSwipe<T>`** ใหม่ (ไฟล์เดียวกัน): ครอบเนื้อหาใต้แท็บ → ปัดเปลี่ยนแท็บ + เนื้อหาเลื่อนเข้าจากฝั่งนั้น · ไม่เปลี่ยน tree ตอน `enabled` สลับ (long-press → ลากจัดลำดับไม่หลุด) · ตอนนี้ใช้ที่หมวดหมู่ที่เดียว
- **`IconSwatchGrid`** ใหม่ (`menus/option_menu.dart` ข้าง `ColorSwatchGrid`) — ใช้ที่แท็ก + หมวดหมู่
- test ใหม่ `test/shared/app_tab_bar_test.dart` (ปัด · ปิดแล้วไม่ปัด · เส้นใต้เลื่อนไม่กระโดด)
- gallery `/dev/widgets`: TagChip · TagShortList (โดเมน) · IconSwatchGrid · AppTabBar + AppTabSwipe (Chip)

### 4. กระเป๋า: การ์ดหลักเปลี่ยนเลย์เอาท์ตอนเข้าโหมดแก้
- **สาเหตุ:** โหมดแก้ [ปรับยอด] + ✏️ หายไป → คอลัมน์ชื่อกว้างขึ้น (ชื่อ 2 บรรทัดอาจเหลือ 1) · บรรทัดคำอธิบายโผล่เฉพาะโหมดแก้ (ถ้าว่าง) → การ์ดสูงขึ้น · ทั้งหมดกระโดดทันที
- **แก้ (`_header` / `_HeroHeader` เท่านั้น):** ปุ่มทั้งสองยังกินที่เดิม แค่ fade ออก (`actionsActive`, ใช้ `AppDurations.chrome`) + กดไม่ได้ · เจ้าของเห็นบรรทัดคำอธิบายทั้งสองโหมด (ว่าง = hint จาง ๆ) · คนอื่นเห็นเฉพาะที่มีข้อความ (เข้าโหมดแก้ไม่ได้อยู่แล้ว)
- ไม่แตะ `_overview()` / ส่วนแท็บ (`AppTabPager` ของ session `0b`)

### 5. top bar ซ้ายบน "เลื่อนลงแล้วเด้งกลับ" ตอนเข้าหน้าสร้าง/แก้ (กระเป๋า · ผู้ติดต่อ · ทุกหน้าที่ซ่อน nav)
- **สาเหตุ (ยืนยันด้วย test):** หน้าโหมดแก้/สร้างสั่ง shell ซ่อน bottom nav (240 ms) **ระหว่าง** hero flight ของ top bar · Flutter วาง shuttle ด้วย offset บน+ล่าง จากขนาด navigator ตอนเริ่มบิน → navigator สูงขึ้น กล่อง shuttle ยืด → เนื้อที่จัดกึ่งกลางแนวตั้งจมลง (ครึ่งความสูง nav = 48 px) แล้วเด้งกลับตอนลงจอด · ขากลับ (nav โผล่) ลอยขึ้นแทน · probe ครั้งแรกที่ข้อ 2 ไม่เจอเพราะไม่มี nav ที่ยุบ
- **แก้ (`app_top_bar.dart`):** shuttle ทุกตัว (กลุ่มซ้าย cross-fade + ชิปขวา) ผ่าน `AppTopBar._pinned` = ขนาดของ hero เอง ปักมุมซ้ายบน → กล่องยืดแค่ไหนก็ไม่ขยับ
- **test `test/app/shell/app_top_bar_test.dart`:** push เข้าโหมดแก้ขณะ nav ยุบ + pop ขณะ nav กลับ → y ต้องคงที่ทุกเฟรม · ลองย้อนเป็นจัดกึ่งกลางแล้ว fail ทั้ง 2 เคส (= จับบั๊กได้จริง)
- ข้อ 2 (ผู้ติดต่อ title เลื่อน) = สาเหตุเดียวกัน → ปิดข้อค้างนั้น

### 6. ชิปขวาบน (⏳🔔👤) โชว์ในหน้ารอยืนยัน · แจ้งเตือน (+ ตั้งค่าแจ้งเตือน) · ตั้งค่า
- เอา `showUniversal: false` ออกจาก 4 หน้านั้น · ยังซ่อน: register (ยังไม่ login) · หน้าฟอร์ม (เพิ่มหลายร่าง `pending_batch_add_page`, แก้โปรไฟล์, เปลี่ยนรหัส — กติกาฟอร์ม = โหมดแก้)
- `_UniversalChips._open`: กดชิปของหน้าที่อยู่ = ไม่ทำอะไร (ไม่ push ซ้ำ) · อยู่หน้าลูกของมัน (ตั้งค่าแจ้งเตือน → 🔔) = ถอยกลับ · นอกนั้น push เหมือนเดิม

### 7. เข้าหน้าสร้าง (แทบทุกหน้า) กระตุกนิด ๆ ระหว่างหน้ากำลังเลื่อนเข้า
- **สาเหตุ:** หน้าที่เปิดมาในโหมดแก้สั่งซ่อน bottom nav ตั้งแต่เฟรมแรก → nav ยุบ 240 ms **พร้อมกับ** page transition → ทั้งแท็บ (2 หน้า) layout ใหม่ทุกเฟรมระหว่างเลื่อน (+ ทำ hero ของ top bar ยืดใน §5)
- **แก้:** `whenRouteSettled(route, action)` ใหม่ใน `app/shell/shell_chrome.dart` — รอให้หน้าเลื่อนเข้าเสร็จก่อนค่อยซ่อน nav (ถ้าปิดหน้าก่อน = ไม่ซ่อนเลย) · ข้ามเฟรมแรกที่ route ยัง offstage (Flutter วัด hero, animation ถูกปักเป็น "เสร็จ") · ใช้ใน `EditModeMixin._syncShellChrome` + `ShellChromeHider` · เข้าโหมดแก้ในหน้าเดิม (ไม่มี transition) ยังซ่อนทันทีเหมือนเดิม
- ผลที่เห็น: หน้าเลื่อนเข้ามาพร้อม nav ก่อน แล้ว nav ค่อยเลื่อนลงหายทีหลัง
- test `test/app/shell/shell_chrome_test.dart`: ไม่ยิงระหว่างเลื่อน · ยิงหลังเสร็จ · ปิดก่อนเสร็จไม่ยิง
- ถ้ายังกระตุกบนเครื่อง → ต้องดู profile mode (`flutter run --profile` + DevTools) ว่าเป็นค่า build หน้าแรกของหน้านั้นเอง

### 8. Dashboard: "เงินไปไหน" ไม่มี "ดูทั้งหมด ›" แล้ว (รายการล่าสุดยังมี)

### 9. ปัดซ้าย/ขวาเปลี่ยนแท็บล่าง (`main_shell.dart`)
- fling แนวนอน (≥300 px/s) ที่ไหนก็ได้บนหน้า → แท็บข้าง ๆ (ไม่วนรอบ) · ทำงานเฉพาะ**หน้าแรกของแท็บ** (navigator ของแท็บ pop ไม่ได้) และตอน nav ไม่ถูกซ่อน (ไม่อยู่โหมดแก้/จัดลำดับ)
- อะไรข้างในที่ใช้ลากแนวนอนเอง (แท็บในหน้า/pager · แถวชิปเลื่อนข้าง · ปัดลบ) อยู่ลึกกว่าใน gesture arena → ชนะเสมอ ("กรณีไม่มี gesture อะไรบัง")

### 10. Back ที่หน้าแรกของแท็บไม่ปิดแอปทันที
- `MainShell` มี `PopScope(canPop: false)` — shell เป็นหน้าเดียวของ root navigator · back มาถึงตรงนี้เฉพาะตอนไม่มีอะไรให้ pop (หน้าลึก · sheet · หน้า overlay pop ก่อนเสมอ)
- แท็บอื่น → ไปแท็บหน้าแรก (dashboard) · อยู่ dashboard → dialog "ปิดแอป?" → ยืนยัน = `SystemNavigator.pop()`
- l10n ใหม่ `appExitTitle` ("ปิดแอป?") / `appExitConfirm` ("ปิดแอป") — session `0b` เพิ่ม + gen-l10n ให้แล้ว
- test `test/app/shell/main_shell_test.dart` (GoRouter + StatefulShellRoute จริง): ปัดไป/กลับ · ขอบแท็บแรกไม่ไป · แถวเลื่อนข้างไม่โดนแย่ง · หน้าลึกไม่ปัด · back แท็บอื่น → หน้าแรก · back หน้าลึก = pop · back หน้าแรก = dialog, ยกเลิกแล้วอยู่ต่อ

### ค้าง / ต่อไป
1. owner: ทดสอบบนโทรศัพท์ — ปัดเปลี่ยนแท็บล่าง + back (แท็บอื่น → หน้าแรก → ถามปิดแอป) · แท็กทุกที่ (quick create · detail · แถวรายการบรรทัด 3) · icon maker แท็ก · ผู้ติดต่อ: เพิ่มแล้วบันทึก (ต้องไม่เลื่อน/ไม่แวบ skeleton) · หมวดหมู่ filter + ปัด · แท็บทุกหน้าเส้นใต้เลื่อน · กระเป๋า: เข้า/ออกโหมดแก้ การ์ดหลักต้องไม่ขยับ
2. ~~ผู้ติดต่อข้อ 1 ตอนกดเข้า~~ → เจอสาเหตุแล้ว แก้ในข้อ 5 · owner ลองเข้าหน้าสร้างกระเป๋า / เพิ่มผู้ติดต่อ / แก้ไขอะไรก็ได้ที่ nav หาย ดูว่า top bar นิ่ง
3. แท็กในแถวรายการโปรเจกต์ (`project_tx_tiles.dart` `#tag` ในข้อความ) ยังไม่เปลี่ยน — แท็กโปรเจกต์ไม่มีสี · session โปรเจกต์ดูต่อ
4. เสนอ: ใส่ `AppTabSwipe` หน้าอื่นที่มีแท็บ (inbox · โปรเจกต์ · กระเป๋า) — รอ owner
5. commit แยกหัวข้อ (แท็ก / ผู้ติดต่อ / หมวดหมู่+แท็บ) เมื่อ owner สั่ง

---

## 2026-10-09 (6) — บั๊ก: ปัด back (Android) แล้ว sheet / dialog ไม่ปิด (ยังไม่ commit)

> app analyze ผ่าน (เหลือ 2 อันใน `test/zz_scratch_topbar_test.dart` ของอีก session) · test 57 ผ่าน · `dart format` แล้ว · **ยังไม่ได้รันบนโทรศัพท์** (owner รันเอง)

### อาการ
- เปิด quick create / sheet / dialog แล้วปัด back จากขอบจอ → นิ่ง ไม่ปิด

### สาเหตุ
- Flutter 3.47 + targetSdk 36 → Android ใช้ `PredictiveBackPageTransitionsBuilder` เป็นค่าเริ่มต้น · ทุกหน้าคอยรับ back gesture เองถ้าเป็นหน้าบนสุดของ **navigator ตัวเอง** (`isCurrent` ไม่ดู navigator ชั้นบน)
- shell มี navigator ซ้อน (root → แท็บ) + `FadeBranchContainer` เก็บทุกแท็บไว้ใน `IndexedStack` → ถ้าแท็บไหน (ที่เห็น**หรือที่ซ่อน**) มีหน้าลึกค้าง หน้านั้นแย่ง gesture แล้ว pop ตัวเองใต้ sheet / ในแท็บที่มองไม่เห็น · sheet บน root ไม่ได้รับ back เลย
- โดนทั้ง sheet · dialog · หน้า overlay (settings / notifications) · และหน้าลึกในแท็บอื่นหายเงียบ ๆ
- ทุกแท็บอยู่หน้าแรก = ไม่มีใครแย่ง → back ไปที่ go_router → ปิด sheet ได้ปกติ (เลยเป็นบ้างไม่เป็นบ้าง)

### แก้ (เก็บ predictive back ไว้)
- **`core/theme/app_page_transitions.dart` (ใหม่):** `AppPageTransitionsBuilder` ห่อ `PredictiveBackPageTransitionsBuilder` + ใส่ `PopScope(canPop: !covered)` ทุกหน้า · covered = route ชั้นบนไม่ current (ส่งต่อผ่าน `_RouteCover` จากหน้า shell ลงหน้าในแท็บ) หรือ tickers ปิด (แท็บที่ซ่อน) · หน้าที่ veto รับ gesture ไม่ได้ → back ตกไปที่ go_router (`popRoute`) ซึ่งเลือก sheet → overlay → แท็บที่เปิดอยู่ ถูกเอง · ใช้แค่ public API ไม่ได้ copy โค้ด Flutter
- **`theme_builder.dart`:** `pageTransitionsTheme` → Android ใช้ builder ใหม่ (แพลตฟอร์มอื่น = default เดิม)
- **`fade_branch_container.dart`:** แท็บที่ไม่ได้เลือก `TickerMode(enabled: false)` — animation ในแท็บที่ซ่อนหยุด (ประหยัด) + เป็นสัญญาณ "ซ่อนอยู่" ให้ builder
- **test `test/core/theme/app_page_transitions_test.dart`:** จำลอง predictive back ผ่าน channel `flutter/backgesture` · 3 เคส: pop หน้าที่เห็น · ปิด sheet แต่หน้าใต้ยังอยู่ · หน้าลึกในแท็บที่ซ่อนไม่หาย · ลองกับ builder เดิมของ Flutter แล้ว 2 เคส sheet fail (= ยืนยันสาเหตุ)

### ข้อจำกัด
- ตัว sheet ไม่ขยับตามนิ้วระหว่างปัด (Flutter ยังไม่มี predictive back ให้ bottom sheet) — ปล่อยนิ้วแล้วปิด · quick create มีของค้าง → dialog ทิ้ง/เก็บร่าง

### ค้าง / ต่อไป
1. owner: ทดสอบบนโทรศัพท์ (`fvm flutter run`) — หน้าลึก + กด `+` + ปัด back · เปิดหน้าลึกค้างอีกแท็บแล้วลองซ้ำ · settings ปัด back · หน้าลึกปกติยังเห็นหน้าก่อนโผล่ตามนิ้ว
2. commit แยกเป็นหัวข้อของตัวเอง เมื่อ owner สั่ง

---

## 2026-10-09 (5) — 0.3.1 เริ่ม: OCR สลิป (Tesseract) · QR บนเครื่อง · Imports lab ใช้สลิปจริง (ยังไม่ commit)

> owner 0.3.1 = session นี้ · 0.3.0 deploy แล้ว (owner) · เก็บเศษ 0.3.0 = อีก agent · BE build/vet/test ผ่าน · app analyze ผ่าน · test 52 ผ่าน · **ยังไม่ได้รันบนโทรศัพท์** (owner รันเอง)

### กติกาที่ owner ตัดสิน
- **นำเข้าสลิปทำได้บนแอป Android เท่านั้น** — บนเว็บซ่อนปุ่ม (`SlipQrReader.isSupported`) · ถ้ายังมีอะไรเรียกบนเว็บ → `UnsupportedError`
- QR อ่าน**บนเครื่อง** (ML Kit) · ทดสอบบนโทรศัพท์ด้วยสลิปจริง (owner จะส่งให้) — ไม่ทำ bench tool
- `scan-slip` ตอบผล OCR กลับเลย (ยังไม่สร้างร่าง — 0.3.3)

### BE
- **Docker:** `apk add tesseract-ocr` (5.3.4) + `tha`/`eng` จาก `tessdata_best` tag 4.1.0 (`ADD` ตอน build) · โมเดล 2 ตัวรวม ~23 MB + lib ของ tesseract
- **`internal/modules/imports/ocr`:** `Reader` interface · `Tesseract` เรียก CLI (stdin → txt + tsv ใน temp dir) · `--oem 1` · `preserve_interword_spaces=1` · `OMP_THREAD_LIMIT=1` · slot พร้อมกัน 1 · timeout 30 s · ผล = ข้อความ + บรรทัด (กรอบ + conf) + เวลา prep/ocr
  - preprocess (เทา + ขยายถ้ากว้าง < 1600) — **ปิดเป็นค่าเริ่มต้น**: ลองกับภาพสังเคราะห์แล้วไม่ช่วย แค่ช้าลง
  - แก้ "ํา" → "ำ" (Tesseract เขียนสระอำแยก)
  - Alpine build tesseract แบบ OpenCL → profile เครื่องทุกครั้งถ้าเขียนไฟล์ไม่ได้ → รันใน `/tmp`
- **`POST /v1/pending-transactions/scan-slip`:** รับ PNG/JPEG เท่านั้น (`UNSUPPORTED_IMAGE`) · field ใหม่ `psm` (3/4/6/11, default 6) · `preprocess` ("1" = เปิด) · ตอบ `{file_key, trans_ref, filename, size, content_type, ocr:{text, lines[{text,conf,box}], conf, width, height, lang, psm, preprocess, scale, prep_ms, ocr_ms}}` · error: 503 `OCR_UNAVAILABLE` (ไม่มี tesseract เช่น `go run` บน Windows) · 504 `OCR_TIMEOUT` · file_key นับว่า "เห็นแล้ว" เฉพาะตอนอ่านสำเร็จ · ขยาย read/write deadline ของ request นี้เป็น 90 s (server ปกติ 10 s) · log **ไม่เก็บข้อความ** (มีชื่อ/เลขบัญชี) เก็บแค่ความยาว/conf/เวลา
- config ใหม่ (มี default ไม่ต้องตั้ง): `OCR_TESSERACT_BIN` `OCR_LANG` `OCR_TIMEOUT` `OCR_CONCURRENCY`
- `go.mod`: เพิ่ม `golang.org/x/image v0.36.0` (ตัวล่าสุดบังคับ go 1.26 — Docker ใช้ 1.25)
- smoke test กับ tesseract จริง (build tag `ocrsmoke`, วิธีรันอยู่หัวไฟล์ `ocr/smoke_test.go`): สลิปสังเคราะห์ภาษาไทยอ่านยอด/เลขอ้างอิง/ชื่อ/วันที่ถูก · conf ~93 · ~2–6 s บน PC (VPS น่าจะช้ากว่า)

### App
- `features/pending/domain/slip_qr.dart` — แยก QR สลิป ธปท. (tag 00 → API id / รหัสธนาคาร / `trans_ref` · 51 TH · 91 CRC-16/CCITT-FALSE) · CRC ไม่ตรงยังคืน ref แต่ติดธง · test 4 เคส
- `features/pending/data/slip_qr_reader.dart` — ML Kit อ่าน QR จากไฟล์ · deps ใหม่ `image_picker`, `google_mlkit_barcode_scanning`
- หน้ารอยืนยัน: ปุ่ม "นำเข้าสลิป" ไม่โชว์บนเว็บ (ยังกดแล้วไม่ทำอะไรบนแอป — flow จริงคือ 0.3.3)
- **Imports lab การ์ดใหม่ "Real slip → OCR"** (บนสุด): เลือกหลายรูปจากแกลเลอรี → QR บนเครื่อง → อัปโหลด → โชว์ผล QR · conf/เวลา · รูปสลิป + กรอบแต่ละบรรทัด (เขียว ≥80 / ส้ม ≥60 / แดง) · ข้อความ · รายบรรทัด · request/response · เลือก psm / preprocess แล้วกด "Run again" เทียบได้ · บนเว็บการ์ดขึ้น error แทนปุ่ม

### ทดสอบบนโทรศัพท์
- BE ในเครื่อง: `cd chubi-pocket-app && ./run-phone.sh local` (สร้าง BE จาก Dockerfile นี้ — มี tesseract) → Dev hub → Imports lab
- หรือ deploy BE ก่อนแล้วใช้ `./run-phone.sh` ปกติ

### ค้าง / ต่อไป
1. owner: ส่งสลิปจริง 10–20 ใบ (คละธนาคาร) · ทดสอบใน lab บนโทรศัพท์ → ดู QR อ่านได้ไหม / CRC ตรงไหม / OCR ครบไหม / เวลา
2. จากผลจริง: เลือก psm + preprocess default · ถ้าช้าบน VPS ลอง `tessdata_fast` หรือ crop
3. commit + deploy เมื่อ owner สั่ง (BE image ต้อง build ใหม่ — ADD โหลดโมเดลจาก GitHub ครั้งแรก)
4. 0.3.2 = ข้อความอิสระ (แชต) → LLM → JSON (owner แก้ลำดับ 2026-10-09)
5. **OCR dump (เก็บไว้, เปิดปิดได้):** `be/internal/modules/imports/ocr_dump.go` — `OCR_DUMP=1` (dev compose เปิดไว้, prod ไม่ทำงาน) สลิปที่สแกนถูกอ่านซ้ำทุก psm × preprocess แล้ว dump รูป + `result.json` ไว้ที่ `/tmp/ocr-dump` ใน container (`docker cp chubi_pocket_app:/tmp/ocr-dump .`) · ใช้เทียบเมื่อได้สลิปธนาคารอื่น
6. **ผล 12 สลิป K PLUS:** QR 12/12 · ยอด 12/12 · psm 11 อ่านชื่อผู้รับถูก 11/12 (3/4 = 7/12) → **default psm 11** · preprocess ทำให้วันที่แย่ลง → ปิด
7. **spec ส่วนที่เหลือของ 0.3.1 (owner ตัดสินแล้ว — ทั้งเส้นทางสลิปคือ 0.3.1, ไม่ใช้ LLM):** [design/spec/15-slip-import.md](design/spec/15-slip-import.md) — กฎแยกข้อความ (ไม่ใช้ LLM) · `accounts.identifiers` JSONB + จับคู่เลขบัญชี → +/−/โอน · ค่าธรรมเนียมแยกร่าง · หมวด: จำจากผู้รับ → ว่าง (LLM เดาหมวดรอ 0.3.2) · "จำเลขนี้ไว้กับกระเป๋า" · `slip_imports` กันซ้ำด้วย `trans_ref`
8. **รูป → JSON ทำได้แล้ว (KBank):** `be/internal/modules/imports/slip` (ตัวแยก K PLUS, หา label ไม่ใช่ตำแหน่ง, กรองขยะโลโก้ด้วยตำแหน่ง x) · `imports/result.go` (`ScanResult` v1: status · slip · pending · ocr เมื่อ `debug=1`) · `imports/draft.go` (ตอนนี้: รายจ่าย กระเป๋าว่าง + ร่างค่าธรรมเนียมเมื่อ > 0) · `scan-slip` รับ `bank_code` จาก QR (ไม่มีกฎ → `unsupported_bank` + log) · OCR ใช้ข้อความจาก txt แทนการต่อคำจาก TSV (ช่องว่างไทยถูกขึ้น) · test: สลิปปลอม 10 ใบจากของจริง (ชื่อ/เลขบัญชีเปลี่ยนแล้ว) ใน `slip/testdata/kbank` · lab: ไม่มี QR สลิป = `not_slip` ไม่อัปโหลด, โชว์ status + slip + pending · ลองรูปจริง 3 ใบผ่าน BE ในเครื่องได้ JSON ถูก · user ทดสอบในเครื่อง `ocrbot` · **ถัดไป:** `accounts.identifiers` (migration 48) + จับคู่ +/−/โอน → สวิตช์หมวดค่าธรรมเนียม
9. **identifiers + จับคู่กระเป๋า (BE เสร็จ, FE รอ):** migration `000048_account_identifiers` (`accounts.identifiers` JSONB) · `accounts/identifiers.go` (ตรวจ/จัดรูป: ตัวเลข+x, ≥4 หลัก, ≤10 อัน, bank_code 3 หลัก) · สร้าง/แก้กระเป๋ารับ `identifiers` · `POST /accounts/:id/identifiers` (เพิ่มทีละอัน, เจ้าของเท่านั้น) · `imports/match.go` + `draft.go` (ฝั่งผู้โอน=รายจ่าย · ผู้รับ=รายรับ · ทั้งคู่=โอน · ไม่เจอ=รายจ่ายกระเป๋าว่าง · ตรงหลายกระเป๋า=ว่าง) · preference `fee_category_id` (ต้องเป็นหมวดรายจ่ายของตัวเอง, ร่างค่าธรรมเนียมใช้หมวดนี้) · ลองกับ DB ในเครื่อง: สลิปโอนเข้าบัญชีตัวเอง → โอน 2780→0693 ✓ · docs: schema.md, spec 03 §2.8, spec 15 §5.2 · **FE ถัดไป:** ส่วน identifiers ในหน้ากระเป๋า (ซ่อน/แสดงเลข, เลือกธนาคาร) + สวิตช์หมวดค่าธรรมเนียมในหน้าแก้ไขหมวด
9b. **payment_providers + import_logs (BE เสร็จ):** migration `000049_payment_providers` (kind · scheme · code, seed bot 002/004/006/014 เท่านั้น — รหัสที่ยืนยันได้) · `GET /v1/payment-providers` (module `providers`) · migration `000050_import_logs` + `imports/logs.go`: เขียนทันทีเมื่อเจอ `unknown_provider` / `unsupported_bank` / `incomplete` (ไม่มี cron — owner เปิดดูเองตามรอบ, คำสั่งอยู่ ops-runbook §3) · ไม่มี API ทางการ/โอเพนซอร์สที่ดูแลอยู่สำหรับรหัสธนาคาร 3 หลัก (ค้นแล้ว) → ระบบเรียนรู้จากรหัสใน QR สลิปแทน · `slip_imports` เลื่อนเป็น migration 51 · ลองกับ DB ในเครื่องแล้ว ✓
10. **FE ที่ต้องทำ — ย้ายไป 0.3.2 (owner 2026-10-09, ปล่อย 0.3.1 โดยไม่มีส่วนนี้) — checklist:**
    - [ ] **A. model/repo กระเป๋า:** `AccountIdentifier {kind, value, bankCode}` · อ่าน `identifiers` จาก API · ส่งไปกับสร้าง/แก้กระเป๋า (ส่ง = แทนทั้งรายการ) · map error `INVALID_IDENTIFIER` ใน `wallet_errors.dart`
    - [ ] **B. ส่วน "เลขบัญชี · พร้อมเพย์ · บัตร" ในหน้ากระเป๋า** (`account_detail_page.dart`): โหมดดู = รายการ (ชนิด · ธนาคาร · เลข) + **ซ่อน/แสดงเลขด้วยปุ่ม 👁 ตัวเดียวกับ `MoneyText`** (ซ่อน = `•••• 2780`) · โหมดแก้ = `AddTile` → sheet: เลือกชนิด 4 แบบ (การ์ด) · **เลือกธนาคาร** (bank_account; รายชื่อจาก `GET /v1/payment-providers` + ตัวเลือก "อื่น ๆ" = ไม่ระบุ) · ช่องเลข (รับตัวเลข/x/ขีด) · ลบทีละแถว · ใช้ได้ตอนสร้างกระเป๋าด้วย · กระเป๋าแชร์: สมาชิกที่ไม่ใช่เจ้าของดูได้อย่างเดียว
    - [ ] **C. สวิตช์ "ใช้เป็นหมวดค่าธรรมเนียม"** ในหน้าแก้ไขหมวด (เฉพาะหมวดรายจ่าย): อ่าน `preferences.fee_category_id` จากโปรไฟล์ · เปิด = `PUT /users/me {preferences:{fee_category_id: id}}` · ปิด = `null` · ได้ทีละหมวด (เปิดอันใหม่ = อันเก่าหลุดเอง) · อาจมีป้ายในรายการหมวด
    - [ ] **D. l10n** ไทย/อังกฤษ ของ A–C
    - [ ] **E. widget ใหม่ที่ใช้ร่วม** (ถ้ามี เช่น ตัวเลือกธนาคาร) → `ui.dart` + gallery `/dev/widgets` ตามกติกา
    - [ ] **F. (ไม่บังคับ) Imports lab:** แสดงชื่อกระเป๋าแทน `account_id` ใน JSON ร่างรายการ
    - ไม่อยู่ใน 0.3.1 (→ 0.3.3): ปุ่ม "จำเลขนี้ไว้กับกระเป๋านี้" ในหน้ารอยืนยัน · ปุ่มนำเข้าจริง + เลือกอัลบั้ม + progress chip · บันทึกร่างลง pending

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
