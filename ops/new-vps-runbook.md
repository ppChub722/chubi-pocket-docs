# คู่มือขึ้น VPS ใหม่ — ได้เครื่องปุ๊ป deploy ได้เลย

> เขียนโดย DevOps · 2026-10-12 · ใช้คู่กับ [vps-migration.md](../archive/engineering/vps-migration.md) (archived) (เหตุผล/แผนภาพรวม) และ repo `ppforge-infra` (`projects/ppforge-infra`)
> **ข้อมูลทั้งหมดสำรองไว้แล้ว** ที่ `projects/chubi-pocket/backups/vps-happyhost-2026-10-13/` (ดู `INVENTORY.md` ในโฟลเดอร์นั้น) — มี secret ห้าม commit ห้ามวางเนื้อหาในแชต
> **สูตร restore ในไกด์นี้ทดสอบแล้ว** กับ dump จริงบน Postgres 15 (ตารางครบ 23, migration 53); ส่วน `bootstrap.sh` **ยังไม่เคยรันบนเครื่องจริง** — ดูผลลัพธ์แต่ละบรรทัดตอนรัน

---

## 0. สเปคที่แนะนำ

| | ที่แนะนำ | ขั้นต่ำ (ไม่แนะนำ) |
|---|---|---|
| CPU | **2 vCPU** | 1 vCPU |
| RAM | **4 GB** (+ swap 2 GB — `bootstrap.sh` ทำให้) | 2 GB + swap 2 GB (ตอน `docker build` + OCR จะตึง) |
| Disk | **40–60 GB SSD/NVMe** (เครื่องเก่าใช้ 5.4 GB จาก 41 GB) | 25 GB |
| OS | **Ubuntu 22.04 LTS หรือ 24.04 LTS x86_64** (เครื่องเก่า 22.04.5) | — |
| ที่ตั้ง | **สิงคโปร์** (หรือกรุงเทพถ้ามี) — ผู้ใช้อยู่ไทย | — |
| ชนิด | **KVM/VM เต็มตัว** (Docker ต้องการ — ห้าม OpenVZ/LXC) | — |

**ต้องมี:** IPv4 สาธารณะ 1 ตัว · login ด้วย SSH key ได้ · เปิดพอร์ต 22/80/443 ได้ · ไม่บล็อกพอร์ตขาเข้า 80 (Let's Encrypt ใช้)
**ควรมี:** snapshot / auto-backup ของ provider (ถูก ช่วยได้อีกชั้น) · หน้า status + SLA ≥ 99.9% · จ่ายรายเดือนได้

**ใช้ RAM จริงตอนนี้:** แอป+Postgres+Caddy รวม ~320 MB จาก 3.8 GB · ช่วง `docker build` ตอน deploy พีค ~1–1.5 GB → 4 GB เหลือเฟือ, 2 GB พอไหวแต่เสี่ยง
**ถ้าจะเพิ่มแอปอีก 2–3 ตัว:** 2 vCPU / 4 GB ยังพอ (ประมาณการใน vps-migration.md §1); ถ้ากะว่าเกิน 3 แอป → 4 vCPU / 8 GB
**งบ:** ประมาณ 300–600 ฿/เดือนสำหรับสเปคนี้ (เช็กราคา/โซนที่หน้าเว็บ provider อีกครั้ง — ราคาเปลี่ยนบ่อย)

**เลือก provider (เพราะ Happy-Host ล่มบ่อย):** ก่อนจ่าย เช็ก (1) ประวัติล่ม/หน้า status ของเจ้านั้น (2) รีวิว uptime ล่าสุด (3) มี snapshot (4) ไม่ใช่เจ้าเดียวกับ DNS/โดเมน. ตัวอย่างที่ใช้กันทั่วไปในโซนสิงคโปร์: Hetzner, Vultr, DigitalOcean, Linode/Akamai, AWS Lightsail — *ผมไม่ได้ตรวจราคา/โซนปัจจุบันของแต่ละเจ้า ให้เช็กเอง*

---

## 1. เตรียมตอนนี้ (ยังไม่มีเครื่อง ก็ทำได้)

- [ ] **password manager:** เตรียมช่องเก็บ `POSTGRES_SUPER_PASSWORD` ใหม่ · รหัส DB ของ role `chubi` ใหม่ (สร้างตอนข้อ 4) · IP ใหม่
- [ ] **SSH key:** ใช้คู่เดิม `~/.ssh/ppforge_vps` (+ `.pub`) — scripts ทุกตัวชี้ key นี้อยู่แล้ว ตอนสร้างเครื่องที่ provider ให้ใส่ public key นี้ (`cat ~/.ssh/ppforge_vps.pub`) — ดู fingerprint: `ssh-keygen -lf ~/.ssh/ppforge_vps.pub`
- [ ] **Cloudflare:** รู้ว่า record `chubipocket-api` (A) อยู่ตรงไหน — ตอนสลับให้เป็น **DNS only (เมฆเทา)** + TTL ต่ำ (60–120 วินาที)
- [ ] **โค้ดที่จะ deploy:** tag `v0.3.1-9` (be `5b7722e`) ขึ้นไป ต้องอยู่ใน `main` ของ `chubi-pocket-be` (deploy.sh ส่ง **HEAD** ของ repo ที่คุณ checkout ไว้)
- [ ] **แอป (APK) ไม่ต้องทำใหม่:** URL API ยังเป็น `chubipocket-api.ppforge.dev` เหมือนเดิม — แค่สลับ DNS ผู้ใช้ build 55 ก็ใช้ต่อได้ (JWT_SECRET เดิมถูกย้ายไปด้วย → ไม่ต้องล็อกอินใหม่)
- [ ] **ข้อมูลที่ยังไม่มีในไฟล์สำรอง:** dump ล่าสุดคือ **2026-10-12 22:13 (เวลาไทย)** — อะไรที่เขียนลง prod หลังจากนั้นจะไม่มี (ถ้า Happy-Host กลับมาอีก ให้ dump ใหม่ก่อนย้าย)

---

## 2. สิ่งที่ต้องมีบนเครื่อง dev (มีครบแล้ว)

```
C:\Users\poomp\Documents\ppond\projects\
├── ppforge-infra\                           bootstrap.sh · proxy · postgres · backup · apps/chubi
├── chubi-pocket\backups\vps-happyhost-2026-10-13\
│   ├── dumps\chubi_pocket-20261012-1513.dump.gz     ← ฐานข้อมูล
│   ├── srv-config.tar.gz                             ← .env จริง + migrations
│   └── …
└── chubi-pocket\chubi-pocket-be\scripts\deploy.sh · release.sh   (อ่านค่า VPS_HOST)
```

ตัวแปรที่ใช้ในคำสั่งด้านล่าง (ตั้งใน Git Bash ของเครื่อง dev):

```bash
export NEWIP=<IP ของเครื่องใหม่>
export KEY=~/.ssh/ppforge_vps
export BK=/c/Users/poomp/Documents/ppond/projects/chubi-pocket/backups/vps-happyhost-2026-10-13
export SSHN="ssh -i $KEY -o StrictHostKeyChecking=accept-new"
```

---

## 3. เครื่องเปล่า → พร้อมใช้ (`bootstrap.sh`)

1. Provider: สร้างเครื่อง Ubuntu + ใส่ public key ข้างบน (user เริ่มต้นอาจเป็น `root` หรือ `ubuntu` แล้วแต่เจ้า)
2. ส่ง repo ขึ้นเครื่อง แล้วรัน (เปลี่ยน `root` ถ้า user เริ่มต้นไม่ใช่ root):
   ```bash
   scp -i $KEY -r /c/Users/poomp/Documents/ppond/projects/ppforge-infra root@$NEWIP:/root/
   $SSHN root@$NEWIP 'cd /root/ppforge-infra && ADMIN_PUBKEY="'"$(cat ${KEY}.pub)"'" ./bootstrap.sh'
   ```
   สคริปต์ทำ: user `Admin` + key · ปิด password/root login · ufw 22/80/443 · fail2ban · Docker + compose · swap 2 GB · `/srv/{proxy,postgres,backup}` + network `proxy-net` · cron backup 03:00
3. **ก่อนปิด session root ให้ลอง login ใหม่** (กันล็อกตัวเองออก):
   ```bash
   $SSHN Admin@$NEWIP 'sudo docker --version && sudo ufw status | head -5 && sudo swapon --show'
   ```
   ถ้าไม่ผ่าน → ยังอยู่ใน session root แก้ได้ · **ถ้า user เริ่มต้นเป็น `ubuntu`/อื่นๆ**: ใช้ user นั้นไปจนกว่า `Admin` login ได้

---

## 4. Postgres + Caddy + role/database ของ chubi

```bash
# 4.1 Postgres กลาง (รหัส superuser ใหม่ — เก็บใน password manager)
$SSHN Admin@$NEWIP 'echo "POSTGRES_SUPER_PASSWORD=$(openssl rand -base64 24 | tr -d "/+=" | cut -c1-28)" | sudo tee /srv/postgres/.env >/dev/null && sudo chmod 600 /srv/postgres/.env && cd /srv/postgres && sudo docker compose up -d && sleep 8 && sudo docker compose ps'
#     ดูรหัสเพื่อเก็บใน password manager:   $SSHN Admin@$NEWIP 'sudo cat /srv/postgres/.env'   (อย่าวางผลในแชต)

# 4.2 Caddy (ยังออก cert ไม่ได้จนกว่า DNS จะชี้ — ปกติ)
$SSHN Admin@$NEWIP 'cd /srv/proxy && sudo docker compose up -d && sudo docker compose ps'

# 4.3 role + database ของ chubi (ชื่อต้องเป็น chubi / chubi_pocket เหมือนเดิม)
#     ห้ามใช้ new-app-db.sh กับ chubi: สคริปต์นั้นตั้งชื่อ DB = ชื่อ role (จะได้ DB "chubi" ไม่ใช่ "chubi_pocket")
CHUBI_PW="$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-28)"     # เก็บค่านี้! ใช้ในข้อ 5.2 (อย่าปิด terminal นี้)
$SSHN Admin@$NEWIP "sudo docker exec -i shared_postgres psql -U postgres -v ON_ERROR_STOP=1" <<SQL
CREATE ROLE chubi LOGIN PASSWORD '$CHUBI_PW';
CREATE DATABASE chubi_pocket OWNER chubi;
REVOKE ALL ON DATABASE chubi_pocket FROM PUBLIC;
SQL
```

---

## 5. restore ข้อมูล + ตั้งค่า chubi

```bash
# 5.1 restore ฐานข้อมูลจาก dump  (--role=chubi ทำให้ตารางเป็นของ chubi · --no-owner ข้าม owner เดิม)
scp -i $KEY $BK/dumps/chubi_pocket-20261012-1513.dump.gz Admin@$NEWIP:~/
$SSHN Admin@$NEWIP 'gunzip -c ~/chubi_pocket-20261012-1513.dump.gz | sudo docker exec -i shared_postgres pg_restore -U postgres -d chubi_pocket --role=chubi --no-owner --exit-on-error; echo "restore rc=$?"'
$SSHN Admin@$NEWIP "sudo docker exec shared_postgres psql -U postgres -d chubi_pocket -Atc \"select 'migration '||version||' dirty='||dirty from schema_migrations; select 'users '||count(*) from users; select 'transactions '||count(*) from transactions\""
#   ต้องได้ (ตัวเลขใน dump 2026-10-12 22:13): migration 53 dirty=false · users 4 · transactions 12

# 5.2 .env ของ chubi — ดึงของเดิมจากไฟล์สำรอง แล้วเปลี่ยนแค่รหัส DB (ที่เหลือ รวม JWT_SECRET ใช้ของเดิม)
mkdir -p /tmp/chubi-new && cd /tmp/chubi-new
tar -xzOf $BK/srv-config.tar.gz srv/chubi/.env > .env
sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=$CHUBI_PW|" .env
grep -E '^(DB_HOST|DB_USER|DB_NAME|LATEST_APP_BUILD|MIN_APP_BUILD)=' .env      # ตรวจ: shared_postgres / chubi / chubi_pocket / 55 / 55 (ค่าไม่ลับ)
#   ถ้า DB_HOST ไม่ใช่ shared_postgres ให้แก้ให้ตรง

# 5.3 วางไฟล์บนเครื่องใหม่: /srv/chubi = compose + .env + migrations (migrations ต้องมี ไม่งั้น release.sh จะเห็นว่า "migration ใหม่ทั้งหมด")
tar -xzf $BK/srv-config.tar.gz -C /tmp/chubi-new srv/chubi/migrations
$SSHN Admin@$NEWIP 'mkdir -p ~/chubi-stage'
scp -i $KEY -r /tmp/chubi-new/.env /tmp/chubi-new/srv/chubi/migrations /c/Users/poomp/Documents/ppond/projects/ppforge-infra/apps/chubi/docker-compose.yml Admin@$NEWIP:~/chubi-stage/
$SSHN Admin@$NEWIP 'sudo mkdir -p /srv/chubi && sudo install -m 600 -o root -g root ~/chubi-stage/.env /srv/chubi/.env && sudo install -m 644 -o root -g root ~/chubi-stage/docker-compose.yml /srv/chubi/docker-compose.yml && sudo cp -r ~/chubi-stage/migrations /srv/chubi/ && sudo chown -R Admin:Admin /srv/chubi/migrations && rm -rf ~/chubi-stage ~/chubi_pocket-20261012-1513.dump.gz && sudo ls -la /srv/chubi'
rm -rf /tmp/chubi-new            # ลบสำเนา .env ในเครื่อง dev
```

---

## 6. สลับ DNS (เครื่องเก่าล่มอยู่แล้ว จึงสลับได้เลย ไม่ต้องรอ)

1. Cloudflare → `chubipocket-api` → A → `$NEWIP` · **DNS only (เมฆเทา)** · TTL ต่ำ
2. รอ ~1–2 นาที ให้ Caddy ออก cert อัตโนมัติ แล้ว:
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" https://chubipocket-api.ppforge.dev/health     # 502 ก็ปกติตอนนี้ (ยังไม่มี app) · ถ้า SSL error รอ/ดู: ssh แล้ว sudo docker logs caddy --tail 30
   ```
   (ที่ต้องทำก่อน deploy เพราะ `deploy.sh` เช็ก health ผ่าน URL สาธารณะ)

---

## 7. Deploy ครั้งแรกบนเครื่องใหม่ (จากเครื่อง dev)

```bash
export VPS_HOST=Admin@$NEWIP        # deploy.sh / release.sh / pull-to-dev.sh อ่านตัวแปรนี้
cd /c/Users/poomp/Documents/ppond/projects/chubi-pocket/chubi-pocket-be
git status -sb && git log --oneline -1       # ต้องอยู่ main ที่ tag v0.3.1-9 ขึ้นไป (deploy ส่ง HEAD)
./scripts/deploy.sh --skip-apk
```
`deploy.sh` ทำ: อัปโหลดโค้ด → build image บนเครื่อง (ครั้งแรก 3–6 นาที) → backup → migrate (ไม่มีอะไรใหม่ ควรเขียน "no change") → ขึ้น `chubi_app` → เช็ก health → ถ้าไม่ผ่านจะถอย image (ครั้งแรกไม่มี image เก่า จึงถอยไม่ได้ ให้ดู log)

ตรวจ:
```bash
curl -s https://chubipocket-api.ppforge.dev/health                        # 200
curl -s https://chubipocket-api.ppforge.dev/api/v1/app/version            # min_build 55 · latest_build 55
curl -s -o /dev/null -w "%{http_code}\n" https://chubipocket-api.ppforge.dev/api/v1/transactions   # 401
```
แล้วลองเปิดแอป build 55 บนมือถือ: ล็อกอิน (ไม่ต้องล็อกอินใหม่ถ้า token ยังไม่หมดอายุ) → ดูกระเป๋า/รายการ → สร้าง 1 รายการ

**release รอบต่อไป (0.3.1-10 …) ใช้ flow ปกติ:** `export VPS_HOST=Admin@$NEWIP` แล้ว `release.sh <brief>` (ดู `team/templates/release-brief/README.md`)

---

## 8. หลังย้าย (ทำภายในไม่กี่วัน)

1. **เปลี่ยนค่า default ของ IP** ในสคริปต์ (`VPS="${VPS_HOST:-Admin@<ใหม่>}"` ใน `deploy.sh`, `release.sh`; `VPS_HOST` default ใน `ppforge-infra/backup/pull-to-dev.sh`) — ไม่งั้นต้อง export ทุกครั้ง
2. **backup:** `ssh Admin@$NEWIP 'sudo bash /srv/backup/backup.sh && sudo ls -lt /srv/backup/dumps | head -4'` ต้องได้ dump + roles; ตรวจ cron: `cat /etc/cron.d/chubi-backup` (03:00)
3. **เก็บสำเนานอกเครื่อง:** `./ppforge-infra/backup/pull-to-dev.sh` ทุกครั้งหลัง deploy (ตอนนี้ dev PC คือสำเนานอกเครื่องที่เดียว) · ตัดสินใจ R2/B2 (vps-migration.md §6 ข้อ 3) — dump อยู่บนเครื่องเดียวกับ DB = เครื่องหาย backup หาย · เปิด snapshot ของ provider ด้วย
4. **monitor:** UptimeRobot/Better Stack ยิง `https://chubipocket-api.ppforge.dev/health`
5. **เอกสาร:** อัปเดต ops-runbook §1–2 (IP, spec), vps-migration.md → "เสร็จ", memory deployment-plan
6. **ไฟล์สำรอง Happy-Host:** เก็บอย่างน้อย 1–2 เดือน แล้วค่อยลบ (มี secret — ห้ามขึ้น cloud ที่ไม่เข้ารหัส)
7. **Happy-Host:** ถ้ากลับมา อย่า deploy/เขียนข้อมูลอะไรที่นั่นอีก (กัน split-brain: DNS ชี้เครื่องใหม่แล้ว)

---

## 9. ปัญหาที่น่าจะเจอ

| อาการ | สาเหตุ / ทางแก้ |
|---|---|
| ssh `Permission denied (publickey)` หลัง bootstrap | ยังอยู่ session root → แก้ `~Admin/.ssh/authorized_keys` · ตรวจว่า `ADMIN_PUBKEY` เป็นของ `ppforge_vps.pub` |
| Caddy `unable to get certificate` | DNS ยังไม่ชี้ / ยังเป็นเมฆส้ม (Cloudflare proxy) / พอร์ต 80 ถูกบล็อกที่ firewall ของ provider → ตั้ง DNS only + เปิด 80/443 ที่ panel ของ provider ด้วย |
| `pg_restore` error `role "chubi" does not exist` | ข้ามข้อ 4.3 → ทำ 4.3 ก่อน แล้ว restore ใหม่บน DB เปล่า (`DROP DATABASE chubi_pocket; CREATE DATABASE …`) |
| `deploy.sh` health fail ตอนครั้งแรก | ดู `sudo docker logs chubi_app --tail 50` · ส่วนใหญ่คือ `.env` (DB_PASSWORD ไม่ตรงกับที่ตั้งในข้อ 4.3) หรือ DNS/cert ยังไม่พร้อม |
| `release.sh` บอก "new migrations …" ทั้งที่ไม่มี | `/srv/chubi/migrations` ว่าง (ข้ามข้อ 5.3) |
| บิลด์ช้า/ตัวเครื่องค้างตอน `docker build` | RAM น้อย: ตรวจ `free -h` ว่ามี swap 2 GB (bootstrap ทำ) หรือเพิ่ม RAM |
