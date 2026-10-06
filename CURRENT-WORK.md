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
