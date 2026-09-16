# DevOps — deployment

How `chubi-pocket-be` is deployed. The frontend is distributed as an APK that users install directly on their devices, so there is no FE deployment to plan for.

Operational runbook (copy-paste commands, troubleshooting): [`chubi-pocket-be/DEPLOY.md`](../../../chubi-pocket-be/DEPLOY.md).
This document is the architectural overview + step-by-step walkthrough.

---

## Architecture

| Environment | Where it runs | URL | TLS | Notes |
|---|---|---|---|---|
| **local** | Laptop, `docker-compose.yml` | `http://localhost:8080` | None | Dev defaults, no Caddy |
| **dev** | VPS, `docker-compose.deploy.yml` | `https://<name>.duckdns.org` | Caddy + Let's Encrypt | Internal users only |
| **prod** | VPS, `docker-compose.deploy.yml` | `https://api.<your-domain>` | Caddy + Let's Encrypt | Public users (future) |

Dev and prod share the same compose file. Only `.env` differs (domain, secrets, `APP_ENV`).

### Why HTTPS even on dev

Android 9+ blocks cleartext HTTP by default. The APK can't talk to a plain `http://` URL on a public IP without explicit `usesCleartextTraffic` configuration. Forcing HTTPS keeps the APK's networking code identical between dev and prod, and avoids leaking login passwords / JWTs in plain text.

DuckDNS (free) gives a real subdomain that Let's Encrypt happily issues certs for. No domain purchase needed.

### Why no FE deployment

The frontend is a Flutter app shipped as an APK. Users install it directly. There is no web build hosted anywhere. The only piece of infrastructure to operate is the backend.

---

## VPS spec

Tested target: 2 vCPU / 2 GB RAM / 40 GB disk on Ubuntu 22.04 LTS.

Resource budget at idle:
- Postgres: ~150 MB
- Go API: ~50–100 MB
- Caddy: ~20 MB
- OS + headroom: ~500 MB

= ~750 MB used, plenty of room on a 2 GB box.

---

## First-time deployment walkthrough

End-to-end on a fresh VPS, ~45 minutes.

### Step 0 — Laptop prep

Generate an SSH key if you don't have one:

```powershell
ls $env:USERPROFILE\.ssh\id_ed25519.pub
# If missing:
ssh-keygen -t ed25519 -C "your-email@example.com"
```

Copy the public key — paste it into the VPS provider's setup form when ordering:

```powershell
cat $env:USERPROFILE\.ssh\id_ed25519.pub
```

### Step 1 — Buy the VPS

- **OS**: Ubuntu 22.04
- **SSH key**: paste the public key from Step 0
- **Add-ons**: Basic Support (free), Manual Backup (free), Basic Firewall (free if zero-config). Skip the paid extras for dev.

Wait for the activation email with the public IP.

### Step 2 — DuckDNS

1. Go to https://www.duckdns.org → sign in with GitHub
2. Pick a name (e.g. `chubipocket-dev`) → "add domain"
3. Paste your VPS public IP → "update ip"
4. Full domain becomes `chubipocket-dev.duckdns.org`

Verify on the laptop:

```powershell
nslookup chubipocket-dev.duckdns.org
```

### Step 3 — SSH in + harden

```powershell
ssh root@<vps-ip>
```

Create deploy user:

```bash
adduser deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

**In a new terminal**, verify before continuing:

```powershell
ssh deploy@<vps-ip>
```

Back in the root session — lock down SSH:

```bash
sudo sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart ssh
```

Firewall:

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

Install Docker:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker deploy
exit
```

Reconnect as `deploy` so docker group takes effect:

```powershell
ssh deploy@<vps-ip>
docker version           # works without sudo
```

### Step 4 — Upload the code

From laptop, in `c:\Users\User\Documents\chubi-pocket`:

```powershell
# Option A — tar-pipe (excludes .git, .env, backups)
tar --exclude='chubi-pocket-be/.git' --exclude='chubi-pocket-be/.env' --exclude='chubi-pocket-be/backups' -cf - chubi-pocket-be | ssh deploy@<vps-ip> "tar -xf - -C ~"

# Option B — git clone (if repo is on GitHub)
ssh deploy@<vps-ip>
git clone <repo-url> chubi-pocket-be
```

### Step 5 — Configure secrets

On the VPS:

```bash
cd ~/chubi-pocket-be
chmod +x scripts/setup-vps.sh
./scripts/setup-vps.sh dev
```

Prompts:
- **DOMAIN**: `chubipocket-dev.duckdns.org`
- **DB_USER**: Enter (default `chubadmin`)
- **DB_NAME**: Enter (default `chubi_pocket_db`)
- **DB_PASSWORD**: Enter to auto-generate
- **JWT_SECRET**: Enter to auto-generate

**Save the printed `DB_PASSWORD` and `JWT_SECRET` in your password manager immediately** — they're shown once.

### Step 6 — Deploy

```bash
docker compose -f docker-compose.deploy.yml up -d --build
docker logs -f chubi_pocket_caddy
```

Wait for `certificate obtained successfully` (~30s). Ctrl-C to exit logs.

### Step 7 — Verify

```bash
# On the VPS
curl https://chubipocket-dev.duckdns.org/health
# → {"status":"ok"}
```

End-to-end smoke from the laptop:

```powershell
curl -X POST https://chubipocket-dev.duckdns.org/api/v1/auth/register `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"smoke@test.com\",\"password\":\"TestPassword123\",\"display_name\":\"smoke\"}'
```

If a JSON token comes back — live.

---

## Day-2 operations

### Logs

```bash
docker logs -f chubi_pocket_app
docker logs -f chubi_pocket_caddy
```

JSON log rotation is configured (10 MB × 3 files per service).

### Redeploy after a code change

```bash
cd ~/chubi-pocket-be
git pull                                                 # or re-tar from laptop
docker compose -f docker-compose.deploy.yml up -d --build app
```

`migrate` re-runs and applies new migrations idempotently. `db` and `caddy` are not rebuilt unless their config changes.

### Database shell

```bash
docker exec -it chubi_pocket_db psql -U chubadmin -d chubi_pocket_db
```

### Manual backup

```bash
mkdir -p ~/backups
docker exec chubi_pocket_db pg_dump -U chubadmin chubi_pocket_db \
  > ~/backups/chubi_$(date +%Y%m%d_%H%M%S).sql
```

For dev, the provider's free Manual Backup snapshot is enough. Cron `pg_dump` for prod when there are real users.

### Stop / start / wipe

```bash
docker compose -f docker-compose.deploy.yml stop          # graceful, keep data
docker compose -f docker-compose.deploy.yml start         # bring back up
docker compose -f docker-compose.deploy.yml down          # remove containers, KEEP volumes
docker compose -f docker-compose.deploy.yml down -v       # WIPE everything incl. DB
```

### APK side

Build the APK with `https://chubipocket-dev.duckdns.org` as the API base URL. Use Flutter build flavors or `--dart-define=API_BASE_URL=...` to switch between dev and prod APKs once a prod environment exists.

---

## Roadmap

Items deferred from the dev deploy. Tackle when the situation demands.

| Item | Trigger to add it |
|---|---|
| Nightly `pg_dump` cron + offsite copy (rclone → B2/S3) | When prod has real users |
| Rate limit on `/auth/login` and `/auth/register` (Gin middleware) | Before opening prod to public |
| Uptime monitor on `/health` (UptimeRobot, Better Stack) | Prod only |
| CI/CD: build image in GitHub Actions, push to GHCR | When manual `git pull && up --build` becomes painful |
| Error tracking (Sentry) | When debugging prod issues blind becomes painful |
| Real domain | When DuckDNS subdomain feels unprofessional or DuckDNS reliability becomes a problem |
| Separate prod VPS | When dev needs to break things without affecting users |

---

## Reference files (in `chubi-pocket-be/`)

- [`docker-compose.yml`](../../../chubi-pocket-be/docker-compose.yml) — local dev
- [`docker-compose.deploy.yml`](../../../chubi-pocket-be/docker-compose.deploy.yml) — VPS (dev or prod)
- [`Caddyfile`](../../../chubi-pocket-be/Caddyfile) — auto-TLS reverse proxy
- [`.env.dev.example`](../../../chubi-pocket-be/.env.dev.example) — dev template
- [`.env.prod.example`](../../../chubi-pocket-be/.env.prod.example) — prod template
- [`scripts/setup-vps.sh`](../../../chubi-pocket-be/scripts/setup-vps.sh) — interactive `.env` generator
- [`DEPLOY.md`](../../../chubi-pocket-be/DEPLOY.md) — operational runbook + troubleshooting
