# AI team inbox

One file per session role, append-only, newest entry at the BOTTOM:
`lead.md`, `be.md`, `qa.md`, `devops.md`, `fe-a.md` … `fe-e.md` (session names), `fe-<area>.md` (page owners: `fe-core`, `fe-debts`, `fe-events`, `fe-recurrent`).
Inboxes of roles nobody uses any more move to `../../archive/ai/inbox/`.

## Rules
- **Work done:** append the full report to YOUR file, then send Lead ONE line:
  `DONE <task> → ai/inbox/<file>.md`
- **Questions / blocked:** send them to Lead directly (SendMessage). Not in the file.
  Lead answers if it can; only owner-level decisions go to the owner.
- No reports to the owner in your own session. The owner reads these files directly.

## Entry format
```
## <YYYY-MM-DD HH:MM> — <task>
DONE · files: <main files> · analyze/test: <result>
deviations/notes: <only if any>
```
