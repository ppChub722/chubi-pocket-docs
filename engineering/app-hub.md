# The app hub — the single source of truth for the UI

Owner decision 2026-10-12. Every UI piece of the app has a page in the **hub**
(`/#/dev`, reachable in prod through the secret tap). A UI change goes to the hub
first, the owner reviews it there, then the pages adopt it. Features never build
one-off widgets. The hub is English only; app UI strings stay Thai.

## Layers (Atomic Design)

```
lib/ui/
  ui.dart            THE GATE — features import ONLY this from lib/ui
  tokens/            spacing, radius, durations, chip_size, icon_size, tone, typography   ← structure (generic)
    app/             colours (money, module), themes, fonts, icons, text limits, currencies ← the app's own values
  atoms/             app_button, app_icon_button, app_chip, app_badge, app_input, app_switch, app_divider,
                     app_text, app_card, app_avatar, app_spinner, app_icon, select_check, add_tile, skeletons,
                     ui_config (UiStrings / UiErrors / UiConfig)…
  molecules/         detail_row, danger_row, pick_card, stepper_pill, month/day pickers, amount_input,
                     snackbar, dialogs, empty/error/loading views, chip_row, filter_bar, …
  organisms/         section_card, hero_card, sheets (app/picker/option/action/side), async_state_view,
                     pull_to_refresh, saving_overlay, reorder/, charts/
  templates/         detail_page, list_page, form_sheet, edit_mode_mixin
  domain/            the app's own pieces: money/, people/, icons/ (icon maker), transactions/ (tx_row),
                     brand/, feedback/, l10n/ (AppUiConfig — the Thai for the generic kit)
  debug/             secret_tap
lib/hub/             the hub screens (registry, index, page frame, pages/, debug/)
```

* **Generic** pieces (tokens, atoms, molecules, organisms, templates) never import
  features, app models, the localisation strings, the network layer or money
  colours — a future core library ("ppForge") can be extracted from them. They get
  words and error descriptions from `UiConfig` (`UiStrings`, `UiErrors`); the app
  fills them once at its root with `AppUiConfig` (`ui/domain/l10n/`).
* **Domain** pieces may know the app (money, people, transactions…).
* Every piece is tagged generic | domain on its hub page.

## Rules (enforced by tests in `test/ui/`)

1. `layering_test.dart` — a file in `lib/features/**` imports nothing from `lib/ui`
   except `ui/ui.dart`; generic layers must not import features / l10n / `core/network`
   (a ratchet file `generic_baseline.txt` lists known violations; it only shrinks).
2. `hub_coverage_test.dart` — every public piece the gate exports (following barrels)
   must be listed in some hub page's `covers`; `hub_uncovered_baseline.txt` is the debt
   and only shrinks. `UPDATE_BASELINE=1 flutter test test/ui` regenerates after you
   fix something.

## Adding or changing a piece

1. Build / change it under `lib/ui/<level>/` (generic or domain), export it from `ui.dart`.
2. Show every variant and state on its hub page (`lib/hub/pages/…`, built from
   `hub_kit.dart`: `HubDemo`, `HubCell`, `HubRow`); add the piece's name to the page's
   `covers` in `lib/hub/hub_registry.dart`.
3. The owner reviews it at `/#/dev/<level>/<slug>` (a "Reviewed" tick is kept on the
   device), then pages adopt it.

## URLs — the developer portal

`/#/dev` is the developer portal: UI levels, then API, Labs, Debug.
`/#/dev/<tokens|atoms|molecules|organisms|templates|domain|api|labs|debug>/<slug>`.
The slugs are in `lib/hub/hub_registry.dart`:

- UI — e.g. `/#/dev/atoms/chip`, `/#/dev/templates/detail-page`.
- API (view-only, read from `GET /api/v1/openapi.json` of the server the app talks to):
  `/#/dev/api/endpoints` (by module, request / responses / examples, a "breaking"
  badge, the coverage counter "spec covers X of Y registered routes"),
  `/#/dev/api/schemas`, `/#/dev/api/pages` (page → endpoints it calls, from `x-used-by`).
- Labs — `/#/dev/labs/imports` (slips, chat parse).
- Debug — `/#/dev/debug/logs`, `/#/dev/debug/theme`, `/#/dev/debug/env` (API base URL, build, platform).

### API section internals

- Views: `/dev/api/pages` (THE API view: coverage counter on top, then page → trigger (on open / a button) → endpoint rows, each expandable in place with request, responses, schema links, examples, breaking note; last group "Not used by any page") and `/dev/api/schemas`. No separate endpoints page.
- `lib/hub/api/page_flows.dart` is the FE page-flow registry and the source of "used by" (the spec's `x-used-by` is ignored). It describes the TARGET flows of the 0.3.1-9 rework: `FlowStep.open` = what runs on open (target: 1 call), `FlowStep.action("Button …")` = what a button / gesture calls (target: 1). A page over the target gets a red badge. `today:` on a step is the current behaviour for contrast (read from code; only set where known). A call the spec lacks is `FlowCall.unspecified` (grey "not in spec yet"); reached pages must have none.
- `openapi_model.dart` is a tolerant reader (follows `#/components/...` refs; works without the `x-` extensions); `openapi_source.dart` fetches + caches `GET /openapi.json` (tests set `HubOpenApi.testSource` / `testFlows`).
- Tests (`test/hub`): `api_spec_ratchet_test` parses the BE's `chubi-pocket-be/internal/apidoc/openapi.yaml` (skipped if the checkout is absent): it parses, every `$ref` resolves, every endpoint has a summary, spec endpoints in no flow = baseline `api_unused_baseline.txt`. `page_flows_test`: every operationId in a flow exists in the spec, an unspecified call is really not in it, every endpoint the app calls (scan of `dio.get/post/…`) is in a flow or on `api_flows_baseline.txt`. Baselines only shrink; `UPDATE_BASELINE=1 flutter test test/hub` regenerates.

## The one text input

`AppInput` (atoms): `AppInput(...)` field, `.inline` (view ⇄ edit, long-press),
`.title`, `.search`; looks filled / outlined / underline / pill / bare. Never a raw
`TextField` / `TextFormField` in a feature.
