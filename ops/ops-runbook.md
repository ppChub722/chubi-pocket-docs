# Ops Runbook — ทุกอย่างที่ต้องรู้เกี่ยวกับ infra (ไม่ต้องนั่งนึก)

> อัพเดตล่าสุด: 2026-09-16 (deploy ครั้งแรก)
> ไฟล์นี้ **ไม่มีรหัสผ่าน/secret** — ทุก secret อยู่บน server ในไฟล์ `.env` (วิธีดูอยู่ข้างล่าง)

---

## 1. ของอยู่ที่ไหนบ้าง (Inventory)

| ของ | ที่ไหน | รายละเอียด |
|---|---|---|
| **VPS (ตั้งแต่ 2026-10-24)** | Cloud VPS 00 · 150฿/เดือน | 1 vCore / 1 GB / 15 GB SSD · Ubuntu 24.04.5 · hostname `ppForge` · ใช้ส่วนตัว (chubi + อีก ~1 แอป) · **build image บนเครื่อง dev แล้ว `docker save \| ssh … docker load`** (เครื่อง 1 GB ห้าม build เอง) · Postgres จูนเหลือ shared_buffers 64MB / max_connections 30 / mem 256m · chubi_app mem 512m · DB เริ่มใหม่ (ไม่ได้ย้ายข้อมูล prod เก่า) |
| **IP** | `143.14.147.249` | เข้าเครื่อง: `ssh ppforge` (alias ใน `~/.ssh/config` → `Admin@143.14.147.249`, key `~/.ssh/ppforge_vps`) · root + password login ปิด |
| **VPS เก่า (เลิกใช้)** | Happy-Host `160.238.13.137` | ล่มบ่อย ย้ายออก 2026-10-24 — **ยกเลิกต่ออายุอัตโนมัติที่ happy-host.net** |
| **แผงควบคุม VPS** | เว็บ happy-host.net → login | ปุ่มสำคัญ: Power on/off, Reboot, Reset OS |
| **Domain** | `ppforge.dev` @ **Cloudflare** | บัญชี: Poompich.e@gmail.com · ~430฿/ปี · จัดการ DNS ที่ dash.cloudflare.com → ppforge.dev → DNS → Records |
| **DNS records** | Cloudflare | `chubipocket-api` → A → 143.14.147.249 → **DNS only (เมฆเทา — ห้ามเปิดส้ม ไม่งั้น cert พัง)** · อนาคต: `chubipocket-web` |
| **API URL** | https://chubipocket-api.ppforge.dev | health check: `/health` → `{"status":"ok"}` |
| **GitHub** | github.com/ppChub722 | repos: chubi-pocket-be / -app / -web / -docs (private) — push ในนาม ppChub722 (remote URL ฝัง user ไว้แล้ว) |
| **Firebase** | console.firebase.google.com → project **chubipocket** | App Distribution แจก APK · Project ID: `chubipocket` · Project number: `1059791337506` · บัญชี: Poompich.e@gmail.com |
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
- Firewall (UFW): เปิดแค่ 22, 80, 443 · **ไม่มี fail2ban** (ตรวจ 2026-10-10: ไม่ได้ติดตั้ง — ที่จดไว้เดิมผิด) · SSH: key อย่างเดียว, `MaxAuthTries 3`

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

### Deploy ด้วยคำสั่งเดียว (ใช้อันนี้) — แก้ 2026-10-26 สำหรับ ppForge
รันจาก **Git Bash** บนเครื่อง dev · **ต้องเปิด Docker Desktop** (image build ที่เครื่องเรา ไม่ build บน VPS 1 GB):
```bash
cd chubi-pocket-be
./scripts/deploy.sh --skip-apk            # BE อย่างเดียว (ใช้จริงครั้งแรก 2026-10-26, commit 21fe2b2)
./scripts/deploy.sh                       # BE + APK
```
- BE: `git archive HEAD` (โค้ดที่ **commit แล้ว**) → `docker build` ที่เครื่องเรา → `docker save | ssh … docker load` → backup DB → migrate → สลับ image (ตัวเดิมเก็บเป็น `chubi-be:prev`) → เช็ก `/health` + `/api/v1/health` · ไม่ผ่าน = ถอยกลับ image เดิมเอง (migration ไม่ถอย — ใช้ dump ที่เพิ่ง backup)
- host ตั้งต้น = `Admin@143.14.147.249` (ppForge) · เปลี่ยนได้ด้วย `VPS_HOST`
- APK: build number = จำนวน commit ของ repo แอป → แจกกลุ่ม `firsttester` · ตั้งแต่ build 172 แอปส่ง `X-App-Build` เป็นเลข pubspec (172) · BE อ่าน versionCode แบบแยก ABI (2172) เป็น 172 ด้วย (`appversion.PubspecBuild`)

### Deploy BE บน ppForge แบบทำมือ (ใช้เมื่อ script ใช้ไม่ได้)
```bash
cd chubi-pocket-be && ./scripts/local-deploy.sh                      # build image จาก tree ที่ commit แล้ว (ได้ chubi-pocket-be-app:latest)
docker tag chubi-pocket-be-app:latest chubi-be:prod-new
docker save chubi-be:prod-new | gzip -1 | ssh ppforge 'gunzip | sudo docker load'
tar -czf - migrations | ssh ppforge 'rm -rf ~/upload && mkdir -p ~/upload && tar -xzf - -C ~/upload'
ssh ppforge 'sudo bash /srv/backup/backup.sh'                        # backup ก่อน migrate
ssh ppforge 'sudo cp -r ~/upload/migrations/. /srv/chubi/migrations/ && cd /srv/chubi && sudo docker compose --profile tools run -T --rm migrate </dev/null'
ssh ppforge 'sudo docker tag chubi-be:prod chubi-be:prev && sudo docker tag chubi-be:prod-new chubi-be:prod && cd /srv/chubi && sudo docker compose up -d app'
curl -s https://chubipocket-api.ppforge.dev/health; curl -s https://chubipocket-api.ppforge.dev/api/v1/health
```
ถอย: `ssh ppforge 'sudo docker tag chubi-be:prev chubi-be:prod && cd /srv/chubi && sudo docker compose up -d app'` · gate อัปเดตแอป: ดูหัวข้อ "บังคับอัปเดตแอป" (backup `.env` ก่อนแก้ทุกครั้ง)

### Deploy โค้ด BE เวอร์ชันใหม่ (ทำมือ — ใช้เมื่อ script ใช้ไม่ได้)
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

### บังคับอัปเดตแอป (app version check, 0.3.1-3)
แอปส่งเลข build ใน header `X-App-Build` · build ที่ต่ำกว่า `MIN_APP_BUILD` จะได้ `426 APP_OUTDATED` (พร้อมลิงก์ดาวน์โหลด) ทุก API ยกเว้น `GET /api/v1/app/version` · ไม่มี header (เว็บ, Postman, curl) = ผ่านเสมอ · ค่าถูกอ่านตอน start → แก้ `.env` แล้วต้อง `up -d app`
```bash
# ใส่ครั้งแรก (ถ้ายังไม่มีบรรทัดนี้ใน .env) — แก้เลขให้ตรง build ล่าสุด
echo 'APP_DOWNLOAD_URL=<ลิงก์ tester ของ Firebase App Distribution>' | sudo tee -a /srv/chubi/.env
echo 'LATEST_APP_BUILD=42' | sudo tee -a /srv/chubi/.env
echo 'MIN_APP_BUILD=0'     | sudo tee -a /srv/chubi/.env
# ภายหลัง: เปลี่ยนค่า
sudo sed -i 's/^MIN_APP_BUILD=.*/MIN_APP_BUILD=42/' /srv/chubi/.env
cd /srv/chubi && sudo docker compose up -d app
curl -s https://chubipocket-api.ppforge.dev/api/v1/app/version     # ต้องเห็นค่าใหม่
```
**ลำดับตอนปล่อย:** deploy BE + อัป APK ขึ้น Firebase ก่อน → ค่อยขยับ `LATEST_APP_BUILD` / `MIN_APP_BUILD` เป็น build ใหม่ · ถ้าตั้ง `MIN_APP_BUILD` สูงกว่า build ที่โหลดได้ = ทุกคนเข้าแอปไม่ได้ · ถ้า `/srv/chubi/docker-compose.yml` ใส่ env แบบระบุทีละตัว (ไม่ใช้ `env_file: .env`) ต้องเพิ่ม 5 ตัวนี้ในนั้นด้วย (`MIN_APP_BUILD`, `LATEST_APP_BUILD`, `APP_DOWNLOAD_URL`, `APP_UPDATE_MESSAGE_TH`, `APP_UPDATE_MESSAGE_EN`)

### Build APK ให้แฟน (ที่เครื่อง dev ใน chubi-pocket-app)
```powershell
fvm flutter build apk --release --split-per-abi --dart-define=API_BASE_URL=https://chubipocket-api.ppforge.dev/api/v1
# อัพ Firebase เฉพาะไฟล์นี้ (มือถือยุคใหม่ทุกเครื่อง ~30MB):
#   build\app\outputs\flutter-apk\app-arm64-v8a-release.apk
# ตัว armeabi-v7a/x86_64 ไม่ต้องใช้ (มือถือโบราณ/emulator)
```
อัพ + แจกผ่าน terminal (login ครั้งแรกครั้งเดียว: `npx -y firebase-tools login` ใน terminal จริง):
```powershell
npx -y firebase-tools appdistribution:distribute build\app\outputs\flutter-apk\app-arm64-v8a-release.apk `
  --app 1:1059791337506:android:426c08daa2b6a91d5a327b --groups firsttester --release-notes "<เวอร์ชัน — สรุป>"
```
> build number บน Firebase/ในแอปจะเป็น `2000 + build` (split-per-abi ของ arm64) เช่น `+3` → `2003` — ปกติ

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

### เปิดดู import logs (นำเข้าสลิป — ไม่มี cron, เปิดดูตามรอบเอง)
ระบบเขียนทันทีที่เจอ: `unknown_provider` (รหัสธนาคารจาก QR ไม่มีใน `payment_providers` → เพิ่มด้วย migration) · `unsupported_bank` (รู้จักธนาคาร แต่ยังไม่มีกฎอ่านสลิป) · `incomplete` (อ่านยอด/วันที่ไม่ได้) · ไม่มีข้อความ/รูปสลิปในตารางนี้ ([spec 15 §11](../modules/15-slip-import.md))
```bash
# สรุปตามชนิด + รหัส (กี่ครั้ง · กี่คน · ล่าสุด)
sudo docker exec shared_postgres psql -U postgres -d chubi_pocket -c "
  SELECT kind, scheme, code, count(*) AS times, count(DISTINCT user_id) AS users, max(created_at) AS last
  FROM import_logs GROUP BY 1,2,3 ORDER BY last DESC;"
# รายการล่าสุดพร้อมผู้ใช้
sudo docker exec shared_postgres psql -U postgres -d chubi_pocket -c "
  SELECT l.created_at, l.kind, l.code, l.trans_ref, l.details, u.username, u.email
  FROM import_logs l JOIN users u ON u.id = l.user_id ORDER BY l.created_at DESC LIMIT 30;"
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
| `MIN_APP_BUILD` | `0` (ปิด) | ตั้งตอน 0.3.1-3 — ขยับเมื่ออยากบังคับอัปเดต (§3 "บังคับอัปเดตแอป") |
| `LATEST_APP_BUILD` | build ล่าสุดที่อัป Firebase | แอปที่เก่ากว่าจะเห็น "มีเวอร์ชันใหม่" |
| `APP_DOWNLOAD_URL` | ลิงก์ tester Firebase | |

## 7. TODO ที่จดค้างไว้

- [ ] Offsite backup (rclone → Google Drive)
- [ ] Firebase App Distribution (สร้างโปรเจกต์ + อัพ APK แรก)
- [ ] ปิด REGISTRATION_OPEN หลังสมัครสองบัญชี
- [ ] Sentry (สมัครบัญชี → ใส่ DSN) — ตาม logging-plan.md
- [ ] ประเมิน Happy-Host หลัง 1-2 เดือน → ถ้านิ่ง ต่อรายปี (ลด 2 เดือน)
