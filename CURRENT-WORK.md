# Current Work — สมุดปูมงาน (append-only)

> **กติกาไฟล์นี้:** เขียนต่อท้ายเรื่อย ๆ **ไม่แก้ของเก่า** — entry ใหม่สุดอยู่**บนสุด** (ใต้หัวข้อนี้)
> ใช้ส่งงานข้ามเครื่อง/ข้ามวัน: อ่านอันบนสุดก็รู้ว่าตอนนี้ค้างอะไร ทำอะไรไปแล้ว
>
> **ของที่ git ไม่พาไป (ต้องก๊อปมือทุกเครื่องใหม่):**
> - SSH key `~/.ssh/ppforge_vps` — ไม่มี = SSH เข้า VPS ไม่ได้ (password login ปิดถาวร)
> - Auto-memory ของ Claude Code (`~/.claude/.../memory/`) — local machine, ไม่ sync
>
> **เริ่มงานบนเครื่องใหม่เสมอ:** `git pull origin main` ทุก repo (app / be / web / docs)
> **Infra bible:** [engineering/ops-runbook.md](engineering/ops-runbook.md) — ทุกคำสั่ง deploy/backup/gotcha อยู่นั่น

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
