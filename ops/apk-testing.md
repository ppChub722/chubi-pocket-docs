# Android APK — Build & Test on Phone

Notes for sideloading the ChubiPocket Flutter app onto a physical Android phone during development. Covers connecting to a local Docker BE, building APKs, installing, and updating.

---

## TL;DR

| I want to... | Command |
|---|---|
| Run on phone (USB, fast iteration) | `flutter run --release -d <device> --dart-define=API_BASE=http://<PC-LAN-IP>:<port>` |
| Build a standalone APK | `flutter build apk --release --dart-define=API_BASE=http://<PC-LAN-IP>:<port>` |
| Install / update existing app | `adb install -r build/app/outputs/flutter-apk/app-release.apk` |
| List connected devices | `flutter devices` or `adb devices` |
| Switch to VPS later | Same build command, change `API_BASE` to the VPS URL |

---

## 1. Backend reachability (Docker on Windows → phone)

The app on the phone needs to reach the BE running in Docker on the dev PC.

### Requirements
- BE container must bind to `0.0.0.0` inside the container (not `127.0.0.1`), otherwise the Docker port mapping won't expose it.
- Docker Desktop port mapping: `-p <host-port>:<container-port>` (visible in Docker Desktop UI).
- Windows Firewall: allow inbound on the host port for **Private networks**.
- Phone and PC on the **same Wi-Fi** (same subnet, no client isolation).

### Sanity check before touching the app
From the phone's browser, open `http://<PC-LAN-IP>:<port>/health` (or any known endpoint). If that loads, the app will too. If it doesn't, fix this first — it's a network/firewall issue, not a Flutter issue.

### Find PC LAN IP
Windows: `ipconfig` → look for the active adapter's IPv4, usually `192.168.x.x`.

### Network constraints
- ✅ Same home Wi-Fi → works
- ❌ Phone on mobile data → won't reach PC
- ❌ Different Wi-Fi networks → won't work
- ⚠️ Cafe/hotel/guest Wi-Fi → often blocks client-to-client; will fail

For "anywhere" access, deploy BE to a VPS or use a tunnel (ngrok / cloudflared).

---

## 2. Configuring the API URL — `--dart-define`

URL is **not hardcoded**. It's injected at build time.

### In Dart code
```dart
class AppConfig {
  static const apiBase = String.fromEnvironment(
    'API_BASE',
    defaultValue: 'https://api.chubipocket.com', // prod fallback
  );
  static const env = String.fromEnvironment('ENV', defaultValue: 'prod');
  static const isLocal = env == 'local';
}
```

### At build time
```bash
flutter build apk --release \
  --dart-define=API_BASE=http://192.168.1.42:8080 \
  --dart-define=ENV=local
```

Or use a JSON file (`flutter --dart-define-from-file=dev.json`) once there are more flags.

### Rules
- `String.fromEnvironment` only works as `const` — name must be a literal.
- Values are **compiled into the APK as plain strings**. Never put secrets here (API keys, signing secrets). URLs and feature flags only.

### Why this matters
Switching from local Docker → VPS later = **one build command, no code change**.

```bash
# Day 1: Local Docker
flutter build apk --release --dart-define=API_BASE=http://192.168.1.42:8080

# Day N: VPS
flutter build apk --release --dart-define=API_BASE=https://api.chubipocket.com
```

---

## 3. Build & install flow

### Flow A — Phone via USB (recommended for active dev)
1. Enable Developer Options + USB Debugging on phone.
2. Plug in, accept "Allow USB debugging?" prompt.
3. Verify: `flutter devices` shows the phone.
4. Run:
   ```bash
   flutter run --release -d <device-id> --dart-define=API_BASE=http://<PC-IP>:<port>
   ```
   Builds, installs, launches, and streams logs in one step.

### Flow B — Build APK + install via adb
```bash
flutter build apk --release --dart-define=API_BASE=http://<PC-IP>:<port>
adb install -r build/app/outputs/flutter-apk/app-release.apk
```
- `-r` = reinstall keeping data. Without it, install fails because the app already exists.

### Flow C — Build APK + transfer manually (no cable)
1. Build APK as above.
2. Transfer to phone (Drive, Telegram, local HTTP server, USB copy).
3. On phone: tap the `.apk` → "Install unknown app?" → Allow → Install.
4. Slower; useful when no cable available.

### Flow D — Wireless ADB (Android 11+)
One-time pairing on phone: Settings → Developer options → Wireless debugging.
```bash
adb pair <phone-ip>:<port>      # one-time, prompts for code shown on phone
adb connect <phone-ip>:<port>   # each session
adb install -r app-release.apk  # same as Flow B
```

---

## 4. Updating the app on the phone

**There is no over-the-air auto-update for sideloaded APKs.** Flutter has no CodePush equivalent. Every code change = rebuild APK + reinstall.

### What survives an update (with `-r` or normal sideload)
- App data (SharedPreferences, sqlite, files in app dir)
- Login state
- Home screen icon position

### What breaks an update — the **signing key trap**
Android refuses to update if the new APK is signed with a different key than what's installed. Error: `INSTALL_FAILED_UPDATE_INCOMPATIBLE`.

- **Debug builds** all share the auto-generated debug key on a given machine — they update fine on top of each other.
- **Release builds** without a configured keystore use the debug key. Fine until you build on a different machine, or wipe `~/.android/debug.keystore` — then signature mismatch.

**Fix when it happens:** uninstall the old app first → reinstall fresh. **App data is lost.**

**Avoid by:** setting up a proper release keystore once early (TODO: see future `release-signing.md`).

---

## 5. Versioning — BE ↔ App contract

Plan for the case where BE has moved on but the phone still has an old APK installed.

### Pattern
- BE exposes `GET /version`:
  ```json
  { "api": "1.2.0", "minClient": "1.0.0" }
  ```
- App sends its own version in a header: `X-Client-Version: 1.0.3`
- App on startup calls `/version`, compares against its own version.
- If client < `minClient`: show "please update" screen, block usage.
- BE may also reject with `426 Upgrade Required` for old clients.

### Why bother early
Solo dev + sideloaded APKs + AI-assisted changes = guaranteed moments where BE has moved and the phone has a stale build. Without this check, you'll waste time debugging a "bug" that's just version drift. With it, the app says it explicitly.

---

## 6. When to rebuild — checklist

Rebuild + reinstall the APK when **any** of these change:
- Dart code (anywhere under `lib/`)
- Assets (`assets/` — images, fonts, l10n)
- `pubspec.yaml` (deps, version, asset list)
- Native code or Android config (`android/`)
- The `--dart-define` values (e.g., switching `API_BASE` from Docker to VPS)

You do **not** need to rebuild for:
- BE-only changes (unless they break the API contract — then yes, to update the client)
- Docker config that doesn't change the BE port

---

## 7. Future: getting auto-updates

When manual sideloading becomes painful, options ordered by effort:

| Option | Auto-update? | Effort | Notes |
|---|---|---|---|
| In-app "update available" banner | Semi (user still taps) | Low | App detects via `/version`, opens APK download link |
| Obtainium (self-hosted) | ✅ | Medium | Host APKs at a URL, testers install Obtainium app |
| Play Store **internal testing** | ✅ | Medium | $25 one-time. Add testers by email. No public listing. **Probably the right next step.** |
| Play Store public | ✅ | High | Full review, store listing, ratings |

---

## Appendix — Common errors

| Error | Cause | Fix |
|---|---|---|
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | Signing key mismatch | Uninstall old app, reinstall (loses data) |
| `Connection refused` from app | BE bound to `127.0.0.1` in container, or firewall | Bind container to `0.0.0.0`; allow port in Windows Firewall |
| `CleartextNotPermittedException` | Android 9+ blocks `http://` by default | Add `android:usesCleartextTraffic="true"` (dev only) or use HTTPS |
| `flutter devices` doesn't show phone | USB debugging off, or driver/cable issue | Re-toggle USB debugging; try different cable; `adb kill-server && adb start-server` |
| App can reach BE in browser but not from app | Likely cleartext block (above) or wrong base URL baked in | Verify `API_BASE` was passed at build time |
