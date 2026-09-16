# Ops Runbook — ทุกอย่างที่ต้องรู้เกี่ยวกับ infra (ไม่ต้องนั่งนึก)

> อัพเดตล่าสุด: 2026-09-16 (deploy ครั้งแรก)
> ไฟล์นี้ **ไม่มีรหัสผ่าน/secret** — ทุก secret อยู่บน server ในไฟล์ `.env` (วิธีดูอยู่ข้างล่าง)

---

## 1. ของอยู่ที่ไหนบ้าง (Inventory)

| ของ | ที่ไหน | รายละเอียด |
|---|---|---|
| **VPS** | Happy-Host (happy-host.net) | แพ็กเกจ VPS-SSD-01 · 220฿/เดือน · 2C/4GB/40GB NVMe · Ubuntu 22.04 · **ต่ออายุอัตโนมัติรายเดือน (เปิดไว้แล้ว)** — จ่ายรายเดือนไปก่อน ยังไม่ต่อรายปีจนกว่าจะนิ่ง 1-2 เดือน |
| **IP** | `160.238.13.137` | |
| **แผงควบคุม VPS** | เว็บ happy-host.net → login | ปุ่มสำคัญ: Power on/off, Reboot, Reset OS |
| **Domain** | `ppforge.dev` @ **Cloudflare** | บัญชี: Poompich.e@gmail.com · ~430฿/ปี · จัดการ DNS ที่ dash.cloudflare.com → ppforge.dev → DNS → Records |
| **DNS records** | Cloudflare | `chubipocket-api` → A → 160.238.13.137 → **DNS only (เมฆเทา — ห้ามเปิดส้ม ไม่งั้น cert พัง)** · อนาคต: `chubipocket-web` |
| **API URL** | https://chubipocket-api.ppforge.dev | health check: `/health` → `{"status":"ok"}` |
| **GitHub** | github.com/ppChub722 | repos: chubi-pocket-be / -app / -web / -docs (private) — push ในนาม ppChub722 (remote URL ฝัง user ไว้แล้ว) |
| **Firebase** | (ยังไม่สร้าง) | ไว้แจก APK ผ่าน App Distribution |
| **SSH key** | เครื่อง dev: `C:\Users\poomp\.ssh\ppforge_vps` | user บนเครื่อง: `Admin` · **password login ปิดถาวร** — key หายคือเข้าไม่ได้ ต้องใช้ Console ในแผง Happy-Host กู้ |

**ค่าใช้จ่ายรวม: ~255฿/เดือน** (VPS 220 + โดเมนเฉลี่ย 35)

---

## 2. โครงบน server (`ssh` เข้าไปเจออะไร)

```
ssh -i ~/.ssh/ppforge_vps Admin@160.238.13.137

/srv/
├── proxy/      Caddy (ประตูบ้าน 80/443, HTTPS อัตโนมัติ) — Caddyfile อยู่นี่
├── postgres/   Postgres 15 กลาง 1 ตัว (หลาย database ได้) — ไม่เปิด port สู่โลก
├── chubi/      chubi API — docker-compose.yml + .env (secrets!) + migrations/
└── backup/     backup.sh + dumps/ (pg_dump รายวัน 03:00 เก็บ 14 วัน)
```

- ทุก container คุยกันผ่าน docker network ชื่อ **`proxy-net`**
- **ดู secrets**: `sudo cat /srv/chubi/.env` (JWT_SECRET, รหัส DB) / `sudo cat /srv/postgres/.env` (รหัส superuser)
- Firewall (UFW): เปิดแค่ 22, 80, 443 · fail2ban กัน brute-force SSH

---

## 3. งานที่ทำบ่อย (copy-paste ได้เลย)

### ดู log แอป (เวลามีคนบอก "มันพัง")
```bash
ssh -i ~/.ssh/ppforge_vps Admin@160.238.13.137
sudo docker logs chubi_app --tail 100          # log ล่าสุด
sudo docker logs chubi_app | grep <request_id> # ตามรอย request เดียว (แอปโชว์ id ตอน error)
```

### Restart แอป
```bash
cd /srv/chubi && sudo docker compose restart app
```

### Deploy โค้ด BE เวอร์ชันใหม่ (จากเครื่อง dev)
```powershell
# 1. build + export (ที่เครื่องเรา ใน chubi-pocket-be)
docker compose build app
docker tag chubi-pocket-be-app:latest chubi-be:prod
docker save chubi-be:prod -o $env:TEMP\chubi-be-prod.tar
scp -i $env:USERPROFILE\.ssh\ppforge_vps $env:TEMP\chubi-be-prod.tar Admin@160.238.13.137:/home/Admin/
# 2. ถ้ามี migration ใหม่ ให้ scp โฟลเดอร์ migrations ไปทับด้วย:
scp -i $env:USERPROFILE\.ssh\ppforge_vps -r migrations Admin@160.238.13.137:/home/Admin/upload/
```
```bash
# 3. บน server
sudo docker load -i /home/Admin/chubi-be-prod.tar
sudo cp -r /home/Admin/upload/migrations/. /srv/chubi/migrations/   # ถ้ามี migration ใหม่
cd /srv/chubi
sudo docker compose --profile tools run --rm migrate               # ถ้ามี migration ใหม่
sudo docker compose up -d app
curl -s https://chubipocket-api.ppforge.dev/health                 # ต้องได้ {"status":"ok"}
```

### เปิด/ปิดสมัครสมาชิก (decoy)
```bash
sudo sed -i 's/REGISTRATION_OPEN=.*/REGISTRATION_OPEN=false/' /srv/chubi/.env   # ปิด (true = เปิด)
cd /srv/chubi && sudo docker compose up -d app
```
ปิดแล้วคนสมัครจะได้ "สำเร็จ" ปลอม ๆ แต่ login ไม่ได้ — คนนอกไม่รู้ว่าปิด

### Build APK ให้แฟน (ที่เครื่อง dev ใน chubi-pocket-app)
```powershell
fvm flutter build apk --release --dart-define=API_BASE_URL=https://chubipocket-api.ppforge.dev/api/v1
# ไฟล์ออกที่ build\app\outputs\flutter-apk\app-release.apk
```

### Backup & Restore
```bash
ls /srv/backup/dumps/                              # ดู backup ที่มี (รายวัน 03:00 เก็บ 14 วัน)
sudo bash /srv/backup/backup.sh                    # สั่ง backup เดี๋ยวนี้
# Restore (ระวัง: ทับข้อมูลปัจจุบัน!):
gunzip -c /srv/backup/dumps/chubi_pocket-XXXX.dump.gz | sudo docker exec -i shared_postgres pg_restore -U postgres -d chubi_pocket --clean
```
> ⚠️ **TODO ค้าง: offsite backup** — ตอนนี้ dump อยู่บนเครื่องเดียวกับ DB ถ้าดิสก์เครื่องพังคือหายหมด ควรตั้ง rclone sync ไป Google Drive (ต้อง login บัญชี Google ครั้งแรก)

### เช็คสุขภาพเครื่อง
```bash
sudo docker ps                  # container ครบ 3 ตัวไหม (caddy, chubi_app, shared_postgres)
df -h /                         # ดิสก์เหลือเท่าไหร่ (ตันเมื่อไหร่ = ปัญหา)
free -h                         # RAM
sudo docker system prune -f     # เคลียร์ขยะ docker (backup.sh ทำให้ทุกคืนอยู่แล้ว)
```

### เข้า database ตรง ๆ
```bash
sudo docker exec -it shared_postgres psql -U postgres -d chubi_pocket
```

---

## 4. เพิ่มแอป/โปรเจกต์ใหม่ลงเครื่องนี้ (สูตรตายตัว)

1. สร้าง database ใน postgres กลาง: `CREATE ROLE appb LOGIN PASSWORD '...'; CREATE DATABASE appb OWNER appb;`
2. สร้าง `/srv/appb/` + docker-compose.yml ของมันเอง (join network `proxy-net`, **ห้ามรัน postgres ของตัวเอง**, **ห้าม publish port**)
3. เพิ่ม DNS record ใน Cloudflare (`appb` → A → 160.238.13.137, เมฆเทา)
4. เพิ่ม block ใน `/srv/proxy/Caddyfile`:
   ```
   appb.ppforge.dev {
       reverse_proxy appb_container:PORT
   }
   ```
   แล้ว `cd /srv/proxy && sudo docker compose restart caddy` — HTTPS มาเอง
5. backup.sh เก็บ database ใหม่ให้อัตโนมัติ (มัน dump ทุก db อยู่แล้ว)

---

## 5. แก้ปัญหาที่อาจเจอ

| อาการ | ทำไง |
|---|---|
| API ไม่ตอบ | `ssh` เข้าไป → `sudo docker ps` ดูตัวไหนดับ → `docker logs <ตัวนั้น> --tail 50` → `docker compose restart` |
| HTTPS/cert พัง | เช็คว่า DNS record ยังเป็น**เมฆเทา** → `sudo docker logs caddy --tail 20` ดู error ACME |
| SSH เข้าไม่ได้ | รอ 10 นาที (อาจโดน fail2ban แบนชั่วคราวจากพิมพ์รหัสผิด) → ยังไม่ได้ = ใช้ Console ในแผง Happy-Host |
| ดิสก์เต็ม | `df -h` → `sudo docker system prune -af` → ลบ dumps เก่าใน /srv/backup/dumps |
| เครื่อง Happy-Host ล่มถาวร/เจ้าเจ๊ง | ซื้อ VPS ใหม่ที่ไหนก็ได้ → ทำตาม runbook นี้ตั้งแต่ต้น (ทุกอย่างเป็น compose) → restore dump ล่าสุด → ชี้ DNS ใหม่ — **~1 ชั่วโมงกลับมาครบ** (นี่คือเหตุผลที่ offsite backup สำคัญ) |

---

## 6. สถานะ flag ปัจจุบันบน prod

| Flag | ค่า | หมายเหตุ |
|---|---|---|
| `REGISTRATION_OPEN` | `true` | **ตัดสินใจเปิดไว้** (2026-09-16) — beta ปิดวงแคบ โดเมนยังไม่ public ความเสี่ยงต่ำ · ตรวจคนสมัครใหม่: `sudo docker exec shared_postgres psql -U postgres -d chubi_pocket -c "SELECT username, created_at FROM users ORDER BY created_at DESC LIMIT 10"` · ปิดเป็น decoy เมื่อไหร่ก็ได้ (วิธีอยู่ §3) |
| `LOG_LEVEL` | `debug` | closed beta — เปลี่ยนเป็น `info` ตอน wider beta |
| `LOG_BODIES` | `true` | closed beta เท่านั้น — **ต้องปิดก่อน wider beta** |
| `APP_ENV` | `production` | |

## 7. TODO ที่จดค้างไว้

- [ ] Offsite backup (rclone → Google Drive)
- [ ] Firebase App Distribution (สร้างโปรเจกต์ + อัพ APK แรก)
- [ ] ปิด REGISTRATION_OPEN หลังสมัครสองบัญชี
- [ ] Sentry (สมัครบัญชี → ใส่ DSN) — ตาม logging-plan.md
- [ ] ประเมิน Happy-Host หลัง 1-2 เดือน → ถ้านิ่ง ต่อรายปี (ลด 2 เดือน)
