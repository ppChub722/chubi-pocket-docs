# แผนย้าย VPS — รองรับ 2–3 แอป

> สถานะ: **ร่าง (2026-10-10)** — owner ตัดสินใจย้ายแน่ หลัง Happy-Host ติดต่อไม่ได้ 2 รอบในวันเดียว (2026-10-10)
> เครื่องปัจจุบัน: [ops-runbook.md](ops-runbook.md) §1–2

**สาเหตุที่ล่ม (ตรวจ 2026-10-10 รอบที่ 3, ~17:50–18:03):** เครื่อง**ไม่ได้รีบูต** (uptime ตั้งแต่ 2026-09-16) · container ทั้ง 3 รันต่อเนื่อง · ไม่มี OOM / panic · RAM ใช้ ~350 MB / 3.8 GB · แต่จากภายนอก ping / 22 / 443 เข้าไม่ถึง แล้วกลับมาเอง → **ปัญหาเครือข่ายของ host** ไม่ใช่ของเรา (จำกัด RAM ไม่ได้แก้) · เวลาที่ล่มวันนั้น (ไทย): ~13:xx · ~14:55–15:07 · ~17:50–18:03

---

## 1. เครื่องใหม่: Cloud VPS 02 (2 vCPU / 4 GB / 60 GB, 350฿/เดือน)

**ทำไมไม่เล็กกว่านี้:** image ถูก build บนเครื่องทุกครั้งที่ deploy และมี OCR (Tesseract) ที่กิน CPU/RAM ช่วงสั้น ๆ

ประมาณการ RAM เมื่อมี 3 แอป:

| ตัว | RAM โดยประมาณ |
|---|---|
| Postgres กลาง 1 ตัว (ทุกแอป) | 300–500 MB (ตั้ง `shared_buffers` 256 MB) |
| Caddy | ~50 MB |
| chubi API (Go) | ~60 MB ปกติ · +300 MB ตอน OCR |
| แอป 2–3 (Go/Node) | 100–300 MB ต่อแอป |
| `docker build` ตอน deploy (Go) | ช่วงพีค 1–1.5 GB |
| **รวมช่วงพีค** | ~2.5–3 GB → **4 GB + swap 2 GB** พอ |

- **จ่ายรายเดือนก่อน** (กติกาเดิม: รอให้ host พิสูจน์ตัวเอง) — ยังไม่เอาส่วนลด 12 เดือน
- **Disk 60 GB:** image + dump 14 วัน + log เหลือเฟือ

---

## 2. ความเสี่ยงหลัก: ค่าตั้งของเครื่องฐาน**ไม่อยู่ใน git**

สิ่งที่อยู่บน server เท่านั้น (ตั้งด้วยมือตอน 2026-09-16):

```
/srv/proxy/      docker-compose.yml + Caddyfile          (Caddy กลาง)
/srv/postgres/   docker-compose.yml + .env               (Postgres กลาง)
/srv/chubi/      docker-compose.yml + .env + migrations/  (chubi API)
/srv/backup/     backup.sh + dumps/  + crontab (03:00 ทุกวัน, เก็บ 14 วัน)
/etc/ufw, /etc/fail2ban, /etc/ssh/sshd_config.d/*
```

`chubi-pocket-be/docker-compose.deploy.yml` กับ `Caddyfile` ใน repo เป็น**แบบเก่า** (แอปเดียว มี DB ของตัวเอง) **ไม่ตรงกับของจริง**

**ก่อนย้าย ต้องเก็บของจริงลง git** — owner รันบนเครื่องเก่า (ไม่รวม `.env`):
```bash
sudo tar czf /tmp/srv-config.tgz --exclude='*.env' --exclude='.env' --exclude='dumps' \
  /srv/proxy /srv/postgres /srv/chubi/docker-compose.yml /srv/backup/backup.sh \
  /etc/ufw/user.rules /etc/fail2ban/jail.local /etc/ssh/sshd_config.d 2>/dev/null
sudo crontab -l > /tmp/root-crontab.txt
# แล้ว scp /tmp/srv-config.tgz /tmp/root-crontab.txt กลับมาเครื่อง dev
```
`.env` ทั้งหมด (JWT_SECRET, รหัส DB) → **ย้ายด้วยมือ / เก็บใน password manager** ไม่ลง git

---

## 3. Infra เป็นโค้ด — repo ใหม่ `ppforge-infra` (ใช้ร่วมทุกแอป)

```
ppforge-infra/
├── bootstrap.sh          # เครื่องเปล่า → พร้อมใช้: user Admin + ssh key, ปิด password,
│                         #   ufw (22/80/443), fail2ban, docker + compose, swap 2 GB,
│                         #   network proxy-net, /srv/*, cron backup
├── proxy/                # Caddy กลาง
│   ├── docker-compose.yml
│   └── Caddyfile         # 1 block ต่อแอป (subdomain → container:port)
├── postgres/             # Postgres 15 กลาง (ไม่ publish port)
│   ├── docker-compose.yml
│   └── new-app-db.sh     # สร้าง role + database ต่อแอป
├── backup/
│   └── backup.sh         # pg_dump ทุก db · เก็บ 14 วัน · + ส่ง offsite (ข้อ 6)
├── apps/
│   └── chubi/
│       ├── docker-compose.yml   # ของจริงจาก /srv/chubi
│       └── .env.example
└── README.md             # สูตรเพิ่มแอป (= ops-runbook §4) + ย้ายเครื่อง
```

- ทำไมแยก repo: Caddy / Postgres / backup เป็นของกลางของทุกแอป ไม่ใช่ของ chubi
- `chubi-pocket-be/scripts/deploy.sh`: เปลี่ยน IP ที่ฝังไว้ (`VPS="Admin@160.238.13.137"`) เป็นตัวแปร `VPS_HOST` (default = เครื่องใหม่)

### กติกาเมื่อมี 2–3 แอป
- **Postgres ตัวเดียว**, database + role แยกต่อแอป (`CREATE ROLE appb …; CREATE DATABASE appb OWNER appb;`)
- **ชื่อ container ขึ้นต้นด้วยชื่อแอป** (`chubi_app`, `appb_app`) ทุกตัวต่อ `proxy-net` · **ห้าม publish port** (มีแค่ Caddy ที่ 80/443)
- **จำกัด RAM ต่อแอป** ใน compose (`mem_limit`) — แอปเดียวรั่วไม่ลากทั้งเครื่องลง
- **Subdomain ต่อแอป** ใน Cloudflare (A → IP ใหม่, **DNS only / เมฆเทา** เหมือนเดิม)
- **Uptime monitor ต่อแอป** (UptimeRobot / Better Stack ยิง `/health`)

---

## 4. ขั้นตอนย้าย (ข้อมูลไม่หาย · downtime ~15–30 นาที)

**เตรียม (เครื่องเก่ายังรันปกติ)**
1. ซื้อเครื่องใหม่ (Ubuntu 22.04/24.04) · ใส่ public key ของเครื่อง dev
2. เก็บ config เครื่องเก่าลง `ppforge-infra` (ข้อ 2) → เทียบ/แก้ให้ตรง
3. รัน `bootstrap.sh` บนเครื่องใหม่ → ขึ้น `proxy` + `postgres`
4. ขึ้น chubi บนเครื่องใหม่ (build image + `.env` ย้ายด้วยมือ) **ยังไม่ชี้ DNS**
5. Cloudflare: ลด TTL ของ `chubipocket-api` เหลือ 60–120 วินาที (ล่วงหน้า ≥ 1 ชม.)
6. ซ้อม restore: dump ล่าสุดจากเครื่องเก่า → restore บนเครื่องใหม่ → `migrate up` → `curl` ผ่าน IP ตรง

**วันย้าย**
7. หยุด chubi API บนเครื่องเก่า (`docker compose stop app`) — กันข้อมูลเขียนเพิ่ม
8. `pg_dump` ครั้งสุดท้าย → scp → restore บนเครื่องใหม่ → `migrate up`
9. Cloudflare: เปลี่ยน A record → IP ใหม่
10. รอ Caddy ออก cert (ต้องให้ DNS ชี้มาก่อน) → `curl https://chubipocket-api.ppforge.dev/health` → ลอง login / ดูกระเป๋า / สแกนสลิป 1 ใบ
11. อัปเดต: `deploy.sh` (`VPS_HOST`) · ops-runbook §1–2 · memory deployment-plan · SSH key ของทุกเครื่อง dev

**หลังย้าย**
12. เก็บเครื่องเก่าไว้ 3–7 วัน (ปิด app แล้ว) → ยกเลิกต่ออายุ Happy-Host

**ถอยกลับ:** ชี้ A record กลับ IP เก่า + `docker compose start app` บนเครื่องเก่า (ข้อมูลระหว่างนั้นต้อง dump กลับด้วยมือ — ช่วงสั้นมาก)

---

## 5. ค่าใช้จ่าย

| | ตอนนี้ | หลังย้าย |
|---|---|---|
| VPS | 220฿ | 350฿ |
| โดเมน (เฉลี่ย) | ~35฿ | ~35฿ |
| Offsite backup | — | ~0–30฿ (ข้อ 6) |
| **รวม/เดือน** | ~255฿ | ~385–415฿ |

---

## 6. ต้องตัดสิน (owner)
1. **host ใหม่คือเจ้าไหน** — เช็คประวัติล่ม / หน้า status ก่อนจ่าย
2. **ชื่อ subdomain ของแอป 2–3** (ถ้ารู้แล้ว)
3. **offsite backup** — ตอนนี้ dump อยู่บนเครื่องเดียวกับ DB (เครื่องหาย = backup หาย) · เสนอ Cloudflare R2 หรือ Backblaze B2 (ฟรี/ถูกมากที่ขนาดเรา) ส่งทุกคืนหลัง dump
4. **build image ที่ไหน** — บนเครื่อง prod (แบบเดิม ง่าย แต่กิน RAM ตอน deploy) หรือ build บนเครื่อง dev / GitHub Actions แล้วส่ง image ขึ้นไป (เครื่อง prod เบาลง เหมาะเมื่อมี 3 แอป)
5. ~~repo `ppforge-infra`~~ ✅ owner อนุมัติ (2026-10-10) — ร่างอยู่ในเครื่องที่ `projects/ppforge-infra` (commit `ab26add`: bootstrap.sh · proxy · postgres + new-app-db.sh · backup.sh · apps/chubi · capture/) · รอ owner สร้าง repo เปล่าบน GitHub แล้ว push
