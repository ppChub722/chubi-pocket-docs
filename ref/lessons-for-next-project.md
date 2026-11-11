# Lessons for the next project

General lessons for building an app with an AI team. Each lesson is stated for any project; the **Example** under it is the evidence from ChubiPocket (the BE migration history before 111 migrations were squashed into one baseline on 2026-11-02, the audits in `team/reports/`, and the shared docs as of 2026-11-09). The checklist that turns these into setup steps is [`new-project-blueprint.md`](new-project-blueprint.md).

Why something was reworked is an interpretation of the history; the project kept no retro of its own.

---

## 1. Product and data model

**1.1 Logic rework is normal; plan for cheap rework, not zero rework.** The owner learns what they want by using the app, so models change after the first real build. Make change cheap: thin features, disciplined migrations, a small test suite.
- Example: almost no new migrations before mid-September; about 40 in the two weeks after the app was in real use (17-31 October).

**1.2 Write the domain rules before the tables.** Most rework comes from a case nobody walked through. Write each rule as a sentence plus a worked example with real numbers, then design the data.
- Example: debts were rebuilt four times: tables dropped and rebuilt (000024), a person ledger (000054), repayments moved to transactions tied to a person (000081), one link only (000083), mirrors wiped (000094), event-line debts retired (000104). Each round came from a case like "someone else paid", "partial repayment" or "delete one side". The rule that finally held was written with numbers: 60 + 500 + 70 - 400 = 230.

**1.3 For anything two people can change, answer four questions first:** whose it is, who can edit, does the other side see an edit, what happens to the other side on delete.
- Example: shared bills / events / projects went from three tables to one, then a "claim" flow, then a "separate book", then the paper model; people-sync triggers were added and dropped (000127-129) and hidden split events deleted (000130). These questions were answered one screen at a time.

**1.4 Settle the model in its own round, apart from UI polish.** Deciding data rules during page-by-page UI review mixes cheap changes (colour, wording) with expensive ones (tables, API), and every model change ripples through pages already polished.
- Example: debt and bill rules in `rules/decisions.md` were decided during page rounds next to separator and icon rules.

**1.5 Ship every feature thin first.** Build the smallest usable version, use it for a week or two, then invest.
- Example: `scheduled_transactions` was replaced by `recurring` (000057), `budgets_v1` dropped (000059), saving goals rebuilt as v2 (000060); auto-saving took three shapes in nine days (000062 → 000067 → 000077, the last one dropping the table).

**1.6 One delete / archive policy for the whole system.**
- Example: `categories` went from soft delete to always-hard delete (000043) and then lost its `status` column (000061), against the soft-delete policy written at the start.

**1.7 Keep the user's word apart from the code's word.** A UI string is cheap to change; a table or API name is not. Keep a glossary.
- Example: "wallet" in the UI, `account` in code / DB / API, because "account" already meant the user account. One umbrella label "Projects & Events" at the entry points, one word inside each screen.

**1.8 Things added and removed again are a sign the rule was not decided.**
- Example: `contacts.nickname` was dropped (000029) and added back (000053).

---

## 2. Client foundation

**2.1 Build the foundation before the first page: one UI, page templates that own their states, one error path, one action path, one fetch path, and scans that enforce them.** Added later, each one has to be chased through hundreds of call sites.
- Example (kit audit): 295 hand-sized gaps, 177 direct text-style uses in 53 feature files, 82 raw icons, 69 colour literals, 22 raw cards had to be pulled into the kit.

**2.2 Tokens and the kit come first, with a showcase page per piece; new pieces follow one flow:** check for an existing piece → build it in the kit → put it on the showcase → use it on a page.
- Example: rules like the " | " separator, equal 12 gaps, "no absence labels" and hero colours were found by polishing page after page; picker, list-row and header unification came afterwards.

**2.3 Errors need one design end to end:** a single envelope and an enum of codes in the contract; one client mapper from code to text with a test for missing texts; no raw `message` in the UI; one network classifier; one feedback channel; app-level 401 / forced update / offline handled once.
- Example (error audit, 2026-10-28): about 50 snackbars showed raw English or exception text, about 100 catch blocks built their own snackbar with no retry, 48 of 69 BE error codes were never referenced by the app, several catches were silent, and offline produced a banner plus a duplicate snackbar.

**2.4 Saves and deletes go through one action helper** that disables the button, sends an idempotency key, maps the error, offers retry and always ends the spinner.
- Example: submit buttons stayed enabled offline; a non-API throw was suspected to leave a save overlay spinning; the idempotency header existed on the BE before the app sent it.

**2.5 Shape the API per screen.** Opening a page is one call; rows carry what they need to draw; count endpoints replace polling; short timeouts.
- Example (API audit, 2026-10-12): home loaded reference lists so other pages could draw icons, deep links rendered worse, the badge polled a list every 30 s with no count endpoint, a cold detail page fetched page 1 of a list to find its row, and a detail page sat on its skeleton 10-25 s before showing an error. The fix rule became "opening a page = one call".

---

## 3. Data, migrations and operations

**3.1 Treat data as real from migration 1.** Never edit a merged migration, always write the reverse, no wipes inside migrations, back up before every deploy.
- Example: migrations 000068, 000081, 000094 and 000104 deleted data; later the owner ruled "prod data is real" and every migration had to keep or convert rows.

**3.2 Leave room for offline and sync even if not building them yet:** a version on rows, idempotency keys, client-creatable ids.
- Example: "phase 1 online only" led later to sync fingerprints (000066), a sync cache project and a separate concept round on what "linked" means.

**3.3 No temporary sync triggers between an old and a new model.** They become the next thing to drop.
- Example: people-sync triggers in 000127 were dropped two migrations later.

**3.4 Pick hosting that stays up and write the runbook as you go,** including a "never do" list.
- Example: the first VPS kept going down and was replaced; the 1 GB box cannot build images (build on the dev PC and load them); a proxied DNS record breaks the certificate.

---

## 4. Tests

**4.1 Decide the test strategy before the suite grows:** logic as plain tests, a contract test against the API file, UI only through the showcase plus source scans.
- Example: the suite reached 1,148 tests and was cut to the minimum; page and widget tests broke on every polish (18 failures after one hero / picker change).

**4.2 Test output is a cost.** Redirect it to a per-session file and read only the summary and failures; run only the tests for what changed.
- Example: a bare `flutter test` printed about 560 KB; one shared log file was overwritten by several sessions.

---

## 5. Docs and the shared record

**5.1 The record lives in the repo, not in a session.** Anything another session or machine needs goes in the docs or `CLAUDE.md`.
- Example: Windows Update restarted the PC three times and killed every session; nothing was lost because the work was in worktrees and the notes in the docs. Session memory, by contrast, does not follow a clone to another folder or machine.

**5.2 Cap the size of shared files and prune instead of stacking.** A file that must be read before work starts has to stay small.
- Example: the start-of-work read was about 110 KB (`rules/decisions.md` 93 KB plus `now/STATUS.md` 20 KB); single rules carried stacked "SUPERSEDED / REVISED / REFINED" notes; the team inbox reached 23 files and about 1 MB.

**5.3 Use a fixed structure with no new file types.** Every kind of information has one slot; anything that fits no slot is a question for the owner.
- Example: briefs had free names (`0.4.1-2-plan`, `paper-plan`, `debt-page-and-tab-nav`), and one feature's facts were spread across a module spec, the decisions file, briefs, several inboxes, the schema and the API doc.

**5.4 State which doc wins when two disagree.**
- Example (worked well): API: `openapi.yaml` → API notes → API doc → module spec; behaviour: newest owner rule → the spec's top block → the rest of the spec.

**5.5 Write a rule in one place and link to it.**
- Example: the test-running rule lived in `CLAUDE.md`, `rules/decisions.md` and the lead skill at the same time, and changed several times.

---

## 6. Working with AI sessions

**6.1 Keep sessions independent:** the owner orders each session directly, each session works in its own clone and branch, and conflicts are fixed at merge time (the later merger rebases and renumbers clashing numbered files such as migrations). No AI-to-AI messaging, no lead session.
- Example: the lead-and-roles setup cost roll calls (session names were reassigned each round), routing rules ("never assign work to another session yourself"), relayed summaries, and several changes to who runs tests, each re-taught to every session.

**6.2 Keep the owner-only gates:** coding on an explicit order, commits, builds, deploys, production data. Discussion is not an order.
- Example: the order words were "จัด", "ทำเลย", "แก้เลย"; "not yet" meant a line in the backlog and nothing else.

**6.3 Measure before arguing.** Read-only audits give the owner numbers to decide on.
- Example: the API audit, API diet survey (calls per page, SQL per call), test diet and wording audit each ended a discussion.

**6.4 Ask when a short remark can be read two ways** (order, scope) before building or pushing docs.

**6.5 Keep reports short and in a fixed shape;** long reasoning goes into the plan or the spec.
- Example: inbox entries ran to hundreds of lines per task and were rarely read again; the next session read the status file instead, so the same facts lived in two places.

**6.6 Skills route, they do not hold rules.** A project-map skill says "to do X read Y, the code is in Z", with folder-level paths; rules stay in the docs.
- Example: five role skills of 3-7 KB worked well as a first read; copying rules into them created a third copy.

---

## 7. AI features inside the product

**7.1 Model output is untrusted input.** Every field is an enum, an id from the user's own lists, a number, a date, or a verbatim copy of the user's words; the server validates and drops the rest.
- Example: the Telegram chatbot sends wallets and categories as short aliases, maps them back to ids, and turns unknown aliases into null; the model never writes free text.

**7.2 Nothing is saved without the user's confirmation.**
- Example: a card with confirm / cancel; edits only by replying to the card; no chat memory.

**7.3 Put the provider behind one interface with a fake for tests, and no silent fallback.**
- Example: one `llm.Client` interface, a router returning the server default, a `fake` adapter, one provider-neutral schema; a new model goes live only after the eval passes.

**7.4 Log and cap every call from the first version; decide pricing and tiers before wiring the call.**
- Example: input of at most 500 characters, per-minute and monthly caps, an `llm_calls` log; the user tier and caps had to be added mid-build because billing was deferred.

**7.5 Keep an eval set that runs on demand,** including injection and off-topic cases, and re-run it when the prompt or model changes.
- Example: `chatbot-try` with 37 grouped cases, run on the real API only on the owner's order.

**7.6 Settle user-facing details before launch** (currency, defaults, what happens on restart).
- Example: the card showed a fixed baht; the default wallet was undecided; unconfirmed cards were lost on a restart.

**7.7 Keep secrets out of chat, git and logs; test on a separate dev instance first.**
- Example: the API key went into the server `.env` over ssh; tokens were redacted from errors; the bot was tried on a separate dev bot against a local server.

---

## What worked, keep it

- Globally unique, time-ordered ids; exact numeric types for money; `/v1` from day one; one error envelope; audit columns on every table.
- Tag-based releases with a forced-update gate, which made breaking API changes safe.
- The shared record in the docs repo, a status file that is rewritten rather than appended, and an archive for finished docs.
- The glossary split between the user's word and the code's word.
- A showcase (hub) as the single source of truth for UI, enforced by source scans.
