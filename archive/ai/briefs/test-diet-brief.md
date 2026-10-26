# Brief: test diet (0.4.0-4), 4 sessions, Lead = chubi-pocket-d8

Owner 2026-10-24, approved: cut the Flutter suite to the minimum. UI is tested ONLY through the hub smoke plus the kit-usage ratchets. Everything else is plain logic tests. Logic that lives inside a widget today is pulled out into a plain function or class, tested with `test()`, and then the widget test is deleted.

The plan, per file, is in `chubi-pocket-docs/ai/reports/test-diet-2026-10-24.md`. Read the WHOLE intro first, then your own slice's section, including its "Logic gaps" list.

## Where
- Repo `chubi-pocket-app`, branch **`wip/0.4.0-4`** (already checked out; do not switch branches).
- Flutter is `./.fvm/flutter_sdk/bin/flutter`, run from the app root. The flutter on PATH fails, so never use it.

## Who does what (stay inside your slice: other sessions are editing the rest)

| session | test files | lib files you may change | gaps |
|---|---|---|---|
| chubi-pocket-da | test/features/transactions/** | lib/features/transactions/**, lib/features/personal_debts/** (only to share a debt body builder) | "test/features/transactions" section: all 12 |
| chubi-pocket-6b | test/features/** EXCEPT transactions | lib/features/** EXCEPT transactions and personal_debts presentation/widgets | "test/features (all but transactions)" section: G1–G10, G12–G15 (NOT G11) |
| chubi-pocket-27 | test/app/**, test/core/**, test/hub/**, test/shared/**, test/widget_test.dart | lib/app/**, lib/core/**, lib/ui/templates/edit_mode_mixin.dart, lib/ui/organisms/async_state_view.dart | "test/app, core, hub, shared, root" section: gaps 1–5 and 7 (6 = accept, no test) + G11 from the features section (the debt person preset lives in lib/app/shell) |
| chubi-pocket-9c | test/ui/** | lib/ui/** EXCEPT the 2 files 27 owns | "test/ui" section + its 2 logic items (the MoneyStyle.apply sign table; recurrence sheet choices → RecurrenceRule as a pure function) |

If a change needs a file outside your column, STOP and message Lead (chubi-pocket-d8) with the file and the reason. Never edit another session's files.

## Steps, per gap (one at a time)
1. Read the widget test that guards it today. Write down what it expects, e.g. the exact request body or the exact back target. That is your spec.
2. Find the logic in the widget / page. MOVE it into a plain top-level function, or a small class, in the same feature folder (for example `.../presentation/debt_entry_body.dart`). Move the code; don't rewrite it. Behaviour must stay byte-for-byte the same. The widget then calls the new function.
3. Write a plain `test()` (no `testWidgets`, no pumping) for it, from the spec in step 1. Use one table-driven test for several cases:
   ```dart
   test('debt record body', () {
     for (final c in [ (name: 'ledger only', ..., want: {...}), ... ]) {
       expect(buildX(...), c.want, reason: c.name);
     }
   });
   ```
4. Then do the files in your slice's table: delete the "delete file" ones (`git rm`), and trim / merge the kept ones exactly as the table says (merge = several cases → one table test).
5. Delete test helpers / fixtures / baselines that nothing uses any more, but ONLY inside your test folders. Keep the 7 ratchet baselines in test/ui and test/hub/openapi_fixture.dart.

## Rules
- Edit code with the Read + Edit tools. No sed / python on code. Deleting files with `git rm` is fine.
- No comments unless truly needed (1–2 lines, no history, no dates). Match the surrounding code style.
- Don't change behaviour. If you find a real bug, don't fix it: put it in your report.
- Do NOT commit. Lead commits at the end.
- Do NOT run `flutter analyze` on the whole app (others are mid-edit). To check your own files, use `./.fvm/flutter_sdk/bin/flutter analyze <your changed lib and test paths>`.
- Tests: run ONLY your own test folders, ONLY with this command, and NEVER read the full log:
  ```
  ./.fvm/flutter_sdk/bin/flutter test -r failures-only <your folders> > $TEMP/t-<you>.log 2>&1; tail -n 1 $TEMP/t-<you>.log; grep '\[E\]' $TEMP/t-<you>.log | cut -c1-200 | head -n 20
  ```
  A kept test that fails: fix it only if it fails because of YOUR move. If it was already red for another reason (many are red since 0.4.0-3), fix it only if the fix is obvious and stays inside the test; otherwise list it in the report. At most 3 fix-and-run loops; then report.
- Do not touch the BE, docs or other repos.

## Report (when done, or when blocked)
SendMessage to **chubi-pocket-d8**, in English, short:
```
DONE <slice>
- tests: <before> → <after> (files deleted: N)
- extracted: <file>: <function> — guards <gap>   (one line each)
- gaps left untested: <gap> — <why>
- run: <the tail line> ; red: <test> — <one-line cause>  (or "all green")
- found bugs (not fixed): ...
```
