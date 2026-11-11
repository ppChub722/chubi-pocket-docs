# New project blueprint

One file: everything to decide and set up before the first feature of any new project. It is stack-neutral and domain-neutral; the reasons behind each item are in [`lessons-for-next-project.md`](lessons-for-next-project.md). Work top to bottom; do not start a later step while an earlier one is open. **Decide** items need the owner's answer and go into `rules.md`. **Default** items can be taken as they are. Where a stack choice is needed, the line names the question, not the answer.

Audience: the owner, and an AI session on a machine that has never seen the project.

---

## 0. Definition of done for setup
A new AI session on an empty machine can, using only the repos and the docs: clone everything, run the project and its tests, find where a given feature lives, and know what it may not do without asking. Test it by opening such a session with a small task. Every question it asks that the docs should have answered is a gap.

## 1. Product (no code yet)
1. **Decide** a one-paragraph brief: who it is for, the one job it does, what it will not do.
2. **Decide** the glossary: the word the user sees vs the word in code / data / API. Keep it in `shared/glossary.md`. Renaming code later is expensive; renaming a UI string is cheap.
3. **Decide** the rules for anything more than one person can change: whose it is, who can edit, whether the other side sees an edit, what happens to the other side on delete. Write each as a sentence plus a worked example with real numbers. This is usually the most reworked area.
4. **Decide** offline and sync: needed or not. If not now, still leave room (section 4).
5. **Decide** one delete / archive policy for the whole system.
6. **Decide** the cost model before a paid call path exists (plans, usage caps, who pays).
7. **Decide** who the users are on day one (single user, teams, public) and what must be private.
8. Walk the edge cases on a clickable mock with no database. The owner tries it before any table exists.
9. Ship every feature thin first; use it for a week or two before investing in it fully.

## 2. Repos and layout
**Default** one repo per deployable, plus one docs repo:

```
<app>-docs/      docs, skills, this blueprint
<app>-<part>/    one per deployable (backend, client, web ...)
```

Docs repo, with fixed slots:

```
README.md          entry: what it is, repos, "to do X open Y"
overview.md        system map + feature table + status (for the owner)
setup.md           clone, run, env, test from an empty machine (for a new AI session)
rules.md           owner decisions + working rules
status.md          what is happening now (rewritten, not appended)
features/<name>/   spec.md · plan.md · log.md
shared/            api (or interface contract) · data model · glossary
ops/               deploy, backup, env list (names only, no secrets)
skills/            skills, source of truth (copied to .claude/skills)
```

The feature name is the same everywhere: `features/<name>/` in docs, and the matching folder in every code repo.

Each code repo has a short `CLAUDE.md` (about 60 lines): the always-on rules, the exact test command, and "rules and contracts live in `<app>-docs`; read its `README.md` first; install skills from `skills/`".

## 3. Git and working rules
- **Decide** the commit identity for each machine (a global git identity may belong to another employer) and put it in the local git config. **Default** commit style `<type>: <summary>`.
- **Default** each AI session works in its own clone and branch. Conflicts are resolved at merge time: merge small and often, and the later merger rebases.
- **Default** if two branches add numbered files (migrations, for example) with the same number, the later merge renumbers its own.
- **Decide** the owner-only gates. Suggested: coding on an explicit order, commits, builds, deploys, anything touching production data.
- Rules that every machine needs live in the repo (`CLAUDE.md`, `rules.md`), never only in a session's memory: memory does not follow a clone.
- Docs, skills, code, comments and commits are in English only. Chat with the owner may be in any language.

## 4. Core service (back end or equivalent)
Decide each of these once, then write the answer in `rules.md`:

| Question | Notes |
|---|---|
| Language, framework, datastore | pick boring, well-supported tools; record the reason and what was rejected |
| ID scheme | globally unique and not guessable; ideally creatable by the client (helps offline) |
| Time | store in UTC; keep calendar dates separate from instants; decide whose timezone defines "today" |
| Numeric precision for anything exact (amounts, quantities, scores) | never floating point for exact values |
| Auth | token type, lifetime, refresh from the start, password hashing |
| Packaging | the same image in dev and prod |
| Logging | structured, one format |

Set up on day one:
- Versioned API prefix (`/v1`), one error envelope (`code`, `message`, `details`), one pagination shape, a request id.
- Audit fields on every table (created / updated, by whom); a `version` on rows that sync or have several editors; an idempotency key on writes that must not repeat.
- Naming rule for foreign keys, one rule for the whole schema.
- A client version gate (minimum and latest build, a public version endpoint), so a breaking change can ship safely.
- A health endpoint.
- **Migration discipline:** never edit a merged migration; always write the reverse; no data wipes inside migrations; back up before every deploy; a destructive change needs the owner's OK and a named backup. Treat data as real from migration 1.
- **Interface shaped per screen or per task,** not per table: opening a page is one call, the server prepares everything, and a count endpoint replaces polling. Write the contract file first and test the service against it.
- Config by environment; an env list (names only) in `ops/`.

## 5. Client foundation (must be ready before the first real page)
Logic will change as the owner learns what they want; that rework is normal. The foundation below is what must not be reworked: added late, it has to be chased through hundreds of call sites (hand-sized gaps, direct text styles, raw icons, colour literals, snackbars showing raw error text, hand-built catch blocks, error codes the client never shows).

If you keep a shared foundation package, take all of this from it and let the app add only its endpoints, models, error code texts, themes and features. Split the package by entry point (the look, the plumbing, the showcase and dev tools) so an app that needs only widgets does not pull in the network layer.

1. **One UI.** Tokens (color, spacing, typography, radius, icons); kit layers (atoms → molecules → organisms → templates); a showcase page for every piece. **New component flow:** check whether a piece already does the job → build it in the kit → put it on the showcase → only then use it on a page.
2. **Page templates own every state.** List, detail and form templates handle loading, empty, error, refresh and retry; a page passes data and builders and never draws its own error or spinner.
3. **Errors, end to end.** The service uses one envelope and lists its codes as an enum in the contract. The client has one mapper (code → text from the translation file) with a test that fails when a contract code has no text; raw `message` never reaches the UI; one network classifier separates offline, slow and server down; one feedback channel (a snack stack) with fixed rules (a failed page load shows in the page, a failed action shows a snack with retry, offline shows once); app-level cases handled once: 401 → login with "session expired", forced update, offline.
4. **One action path** (`runAction`): disables the button, sends an idempotency key, maps the error, offers retry, and always ends the spinner, even on a non-API throw. Buttons disable themselves while offline.
5. **One fetch path.** One API client with interceptors (auth, refresh, timeout, retry) and a repository per feature. The contract is shaped per screen: opening a page is one call and the rows carry what they need to draw (names, icons), so the client never joins caches. Count endpoints instead of polling lists. Short timeouts, so a skeleton turns into an error within seconds. Fixed refresh rules: pull-to-refresh on every page, and a defined set of what reloads after a save.
6. **Machine-checked from day one.** Scans that fail when: a page uses raw framework widgets, a colour or gap is written by hand, a feature imports past the kit entry, a kit piece has no showcase page, `message` reaches the UI, a contract error code has no text, or a detail page has no refresh. Cheap on an empty project, expensive later.
7. All user-visible strings in a translation file from the first screen.

## 6. Tests
**Default** the smallest suite that catches regressions:
- Logic as plain tests (parsing, calculations, state, request bodies, formatting).
- A contract test of the service against the contract file.
- UI only through the showcase (one smoke test that renders every showcase page) plus the scans above. No per-page widget tests.
- Output goes to a per-session file; read only the summary and the failures. Put the exact command in `CLAUDE.md`.
- Tests run on request (they cost tokens and time); a failing test is reported before anything is fixed.

## 7. Infra and release
- **Decide** hosting: one that stays up and keeps backups. **Default** a small VPS with HTTPS from a reverse proxy.
- If the server is small, build the image on the dev machine and load it there.
- A scheduled database dump kept for a set number of days, and one restore tested before launch.
- Secrets live only in the server environment and are set over ssh; never in chat, git or docs. Docs say where a secret is and who hands it out.
- Release by tag: the owner orders it, the version is bumped, `v<version>` is tagged in every repo, and deploys come from the tag in a separate worktree. Any tag can be redeployed or rolled back.
- A distribution channel for the client and the forced-update gate from section 4.
- `ops/deploy.md` that a new session can follow, with a "never do" list.
- DNS and proxy quirks go into the runbook the day they are found (for example a proxied record that broke certificates).

## 8. Docs and skills discipline
- **No new file types.** A new file is allowed only for a new feature folder (`spec.md`, `plan.md`, `log.md`) or when the owner orders a system doc. Anything else goes into an existing file.
- Where information goes:

| It is | Put it in |
|---|---|
| behavior or rules of a feature | `features/<name>/spec.md` |
| plan of the work in progress | `features/<name>/plan.md` (merge into spec and delete when done) |
| a report of what was done | append to `features/<name>/log.md` |
| a rule across features | `rules.md` |
| data model, contract, terms | `shared/` |
| deploy and operations | `ops/` |
| what is happening now | `status.md` |
| nothing above | ask the owner before creating anything |

- A rule that changes is edited in place; the old text goes to git history or `archive/`. No stacked "revised / superseded" notes.
- Size caps, loose at first and tightened with use: `status.md` about 80 lines, `spec.md` about 400, `log.md` about 300. Over the cap means trim, not append.
- A `check-docs` script fails when a file is outside the allowed slots, a cap is exceeded, or a path named in a skill does not exist. Run it before finishing any task.
- **Skills:** a fixed set by task type (`project-map`, `new-feature`, `new-migration`, `run-tests`, `deploy`, `release`). `project-map` is a routing table ("to do X read Y, the code is in Z") using folder-level paths and the shared feature name, with no rules copied in. Descriptions are written as triggers. The source is `skills/`, copied to `.claude/skills/` by an install script; `CLAUDE.md` says so in one line.
- No rule is written in two places; pick one and link.

## 9. Working with AI
- The owner gives orders directly to each session; sessions do not message each other. Shared state lives in the docs.
- Each session works from its own clone and branch, updates only its own lines in `status.md`, and appends to its feature's `log.md`.
- Output of tests, builds and logs goes to a file; read only the tail and the failures.
- For any AI feature inside the product:
  - treat model output as untrusted: validate against ids and enums from the user's own data, and never let free text reach stored records;
  - require the user's confirmation before saving;
  - log every call (provider, model, tokens, status) and cap usage per user;
  - put the provider behind one interface with a fake for tests;
  - keep an on-demand eval, and re-run it when the prompt or model changes;
  - decide pricing and tiers before the call path is built.

## 10. Order of work
1. Sections 1-3 (product, repos, rules). No code.
2. The contract for the first two screens, a mock, and the owner's review.
3. Core service skeleton (section 4) with migration 1 and the checks (`vet` or lint, tests, `check-docs`).
4. Client foundation (section 5), before any real page.
5. Infra, deploy and one restore test (section 7).
6. First feature, thin; used for a week before the next.
7. Run the section 0 test with a fresh session and fix every gap it finds.

## 11. Checklist
- [ ] Brief, glossary, shared-data rules, delete policy, cost model, user model decided
- [ ] Repos created, fixed docs layout, `CLAUDE.md` in each code repo
- [ ] Commit identity and style set; owner-only gates written
- [ ] Versioned API, error envelope, audit fields, version gate, health endpoint
- [ ] Migration discipline and backup in place
- [ ] Contract file drawn first; service tested against it
- [ ] Foundation ready (section 5): kit + showcase, page templates, error mapper, `runAction`, one API client, scans (from the shared foundation package if there is one)
- [ ] Test strategy and the exact test command in `CLAUDE.md`
- [ ] Hosting, HTTPS, scheduled dump, one restore tested
- [ ] Secrets only on the server; docs say where
- [ ] Tag-based release; client gate
- [ ] `check-docs` and skills (`project-map` first) installed
- [ ] Fresh-session test passed
