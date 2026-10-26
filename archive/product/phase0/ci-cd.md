# Phase 0 — CI/CD

**Status: deferred from Phase 0.** Local-first development; CI/CD added when local workflow is stable and we want to automate.

This file documents the **intended approach** so that when Phase 0 ships and we're ready to add CI, there's a plan rather than a fresh blank-page decision.

---

## Why deferred

- **Solo project, AI-assisted.** No team needs PR gates or merge-blocking CI from day one.
- **Local workflow needs to stabilize first.** Setting up CI before `docker-compose up` works locally is wasted effort.
- **Phase 0 deliverables are validatable manually.** Smoke tests + manual curl/click-through of auth flow on Android + web is enough.
- **GitHub Actions takes setup time.** That time is better spent on backend + frontend code in Phase 0.

CI/CD becomes important when:
- Multiple commits / branches need to coexist without breaking each other
- Manual smoke testing becomes too slow
- We want to publish Android APKs / web bundles automatically
- We deploy to a real server (Phase 3 production)

---

## Intended approach (when added)

### Tooling

- **CI platform:** GitHub Actions (workflows in `.github/workflows/` per repo)
- **Three repos, three independent workflows:** `be/`, `app/`, `web/` each have their own
- **Caching:** Go module cache + Flutter pub cache for fast runs

### Backend repo (`be/`) workflow

Triggered on push to any branch + on PR:

- [ ] **Lint** — `golangci-lint run`
- [ ] **Build** — `go build ./...` (catches compile errors)
- [ ] **Unit tests** — `go test ./...` (no DB required)
- [ ] **Integration tests** — `go test -tags=integration ./...`; uses `docker-compose` to spin up Postgres in CI runner OR `testcontainers-go` for ephemeral test DBs
- [ ] **Docker build verification** — `docker build .` succeeds (catches Dockerfile drift before deploy)

### Frontend (`app/`) workflow

Triggered on push to any branch + on PR:

- [ ] **Analyze** — `flutter analyze` (catches lint + analyzer errors)
- [ ] **Format check** — `dart format --set-exit-if-changed .`
- [ ] **Test** — `flutter test`
- [ ] **Build APK** — `flutter build apk --debug` (catches Android build issues)
- [ ] **Build web** — `flutter build web` (catches web build issues)

### Web (`web/`) workflow (Phase 3)

Phase 3 power-user web (Nuxt 3); analogous Node/Nuxt CI setup. Out of Phase 0 scope.

### Phase 3 deployment workflow

When VPS is ready (Phase 3):

- [ ] **On tag push (e.g., `v1.0.0`)**: build production Docker images for backend + Nuxt admin/web; push to a registry (Docker Hub / GitHub Container Registry)
- [ ] **On manual trigger** (or auto-deploy from `main`): SSH to VPS; `docker-compose pull` + `docker-compose up -d`; run migrations
- [ ] **Rollback plan** — keep previous image tag; `docker-compose` swap back; <5 min RTO

---

## What we're NOT doing in Phase 0

- ❌ Required PR reviews (solo project)
- ❌ Branch protection rules (overhead without team)
- ❌ Auto-deploy on merge (no production environment yet)
- ❌ Slack/Discord notifications (no team to notify)
- ❌ Full integration test suites in CI (Phase 0 is too early; smoke tests are fine)

---

## When to add CI

Reasonable triggers:
- **Manual smoke testing takes > 10 min** to verify a change works
- **Multiple developers** join the project (CI becomes the contract)
- **External users** start using deployed builds (need green-CI gate before publish)
- **Phase 1b lands** — multi-feature modules introduce more chances for regressions

When you decide to add CI, this file is the starting point. Spec the workflows first, then commit `.github/workflows/*.yml` files.

---

## Done when (CI/CD ready, NOT Phase 0 ready)

CI/CD doesn't need to be done for Phase 0 exit criteria. When we DO add it:

- [ ] Backend repo CI green on push (lint + build + test + integration)
- [ ] App repo CI green on push (analyze + test + build APK + build web)
- [ ] Docker build verification in CI catches Dockerfile drift
- [ ] CI runs in < 5 minutes per repo (with caching)
- [ ] Failing CI blocks merge to `main` (branch protection enabled at this point)

---

## Risks of deferring

- **Risk:** local-only workflow means it works on your machine; might break on a fresh clone or different OS
  - **Mitigation:** Docker eliminates most "works on my machine" risk
- **Risk:** test coverage drifts (no enforcement)
  - **Mitigation:** if you skip tests in Phase 0, that's a Phase 0 decision; add CI to enforce in Phase 1+
- **Risk:** Dockerfile drift not caught early
  - **Mitigation:** test `docker-compose down -v && docker-compose up` periodically as a smoke test
