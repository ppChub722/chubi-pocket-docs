# Frontend — App (Flutter)

Engineering reference for the ChubiPocket Flutter client (Android + Flutter web). Stack, design tokens, navigation, state management patterns (Bloc + Repository), reusable widgets, platform differences.

**Designer-facing screen specs and visual design** live in [`../../../product/ui-design/app/`](../../../product/ui-design/app/) — this folder is implementation-only.

**Cross-frontend conventions** (API contract, auth flow, error envelope handling, pagination, dates) shared with future Phase 3 admin (Next.js) and power-user web (Nuxt 3) live in [`../overview.md`](../overview.md).

**Global backend conventions** (base URL, `/v1/` versioning, error envelope) are in [`../../spec/overview.md`](../../spec/overview.md). Individual module specs (data shapes, API endpoints, business rules) live in [`../../spec/`](../../spec/).

---

## 1. Stack & tooling

| Concern | Choice | Notes |
|---|---|---|
| **Framework** | Flutter (latest stable) | Single codebase → Android + Flutter web |
| **State management** | Bloc (`flutter_bloc`) — **Cubit by default**, Bloc when events make sense | Class-based; Repository pattern composes naturally; `bloc_test` for testable units. Cubit covers most cases (simple state container with methods); Bloc reserved for event-driven flows |
| **Routing** | `go_router` | URL-based, deep-link friendly, works naturally on Flutter web |
| **HTTP client** | `dio` + `dio_smart_retry` | Interceptor handles auth header + refresh flow (Phase 2+) |
| **Local storage** | `sqflite` (mobile) / IndexedDB adapter (web) | Session, offline cache |
| **Secure storage** | `flutter_secure_storage` | Auth tokens on mobile; falls back to `shared_preferences` on web (acceptable risk with Phase 2 short-lived tokens) |
| **Design system** | Material 3 (`useMaterial3: true`) + custom brand tokens | Standard widgets, themed with brand colors |
| **Localization** | `intl` + ARB files | Phase 0 scaffolded with `en` + `th`; Phase 2 real i18n |
| **Date/time** | `intl` | Locale-aware; respects user's `preferences.timezone` |
| **Charts (Phase 2)** | `fl_chart` | Standard Flutter charts |
| **Forms** | `flutter_form_builder` + `flutter_form_builder_validators` | Reusable form scaffolding |

Not used:
- Navigator 2.0 directly — abstracted by `go_router`
- Provider — superseded by Bloc + Repository pattern
- GetX — polarizing, harder to test cleanly

## 2. Design principles

1. **Real money clarity.** Every transaction corresponds to a real money movement. No staged / pending states in the user model (Phase 1). Balance changes are immediate and visible.
2. **Two-books metaphor.** Personal book is the user's own; shared book (projects) is coordination. Visually distinguish: the shared book uses a lighter surface color and "shared" badge.
3. **Low-friction logging.** The most common action (log an expense) should take ≤ 4 taps from any screen: FAB → amount → category → save.
4. **Content over chrome.** Prefer showing actual data over decorative UI. Skeleton loaders beat spinners. Empty states include clear next-step CTAs.
5. **Forgiving by default.** Advisory warnings, not hard blocks. Budget overage, negative balance, weird categories — all warn but never reject.
6. **Keyboard-friendly on web.** Flutter web users expect tabs, hotkeys, and mouse affordances.
7. **Thai first, English second.** Default locale is `th`; English is the fallback. Currency default THB.

## 3. Design tokens

### 3.1 Color system

Material 3 seed-based `ColorScheme.fromSeed`. Brand seed color: **teal/green** to evoke finance + growth (exact hex deferred to visual design; placeholder `#00A389`).

Semantic aliases:

| Token | Usage |
|---|---|
| `colorScheme.primary` | Primary actions (FAB, primary buttons) |
| `colorScheme.secondary` | Secondary actions |
| `colorScheme.error` | Errors, overdue, negative amounts |
| `colorScheme.tertiary` | Warnings (budget over 80%) |
| `colorScheme.surface` | Page background |
| `colorScheme.surfaceContainer` | Card backgrounds |
| `colorScheme.surfaceContainerHigh` | Shared-book surfaces (projects) — slightly elevated to distinguish |

App-specific semantics:

- **Amount red** → `colorScheme.error` for expense amounts displayed negatively
- **Amount green** → custom `#2E7D32` (light) / `#81C784` (dark) for income amounts
- **Amount neutral** → `onSurface` for transfers
- **Account card accent** → uses each account's stored `color` (hex)
- **Category chip** → uses each category's stored `color` (hex)

### 3.2 Typography

Material 3 `TextTheme` defaults with one override: numeric amounts use a tabular-figure font variant (`FontFeature.tabularFigures()`) so columns align in lists.

### 3.3 Spacing scale

Base unit = 4 dp.

- `xs` = 4, `sm` = 8, `md` = 16, `lg` = 24, `xl` = 32, `xxl` = 48
- Page padding = `md` (16 dp) horizontal on mobile; `xl` (32 dp) on web wide layouts

### 3.4 Iconography

Material Icons (built-in) as the primary set. Category / account / goal icons are stored server-side as string identifiers (`'restaurant'`, `'bank'`, `'shield'`) — client maps them to `Icons.*` via a lookup.

Phase 2+: curated icon set with more personality may be bundled as SVGs.

### 3.5 Elevation & surfaces

Material 3 elevation tonal overlay system. Cards use `surfaceContainer`. Modals use `surfaceContainerHigh`. No explicit shadow manipulation beyond the theme.

### 3.6 Theme

App ships with a **theme registry** — multiple named themes the user can pick from. Each theme defines its own seed (or full `ColorScheme`) and produces both light + dark variants via `ColorScheme.fromSeed`.

**Phase 0 themes:**

| Theme ID | Seed | Role |
|---|---|---|
| `mint` | `#00A389` (brand) | **Default** |
| `sweet` | (alternative seed) | Alternative — proves the theme registry works |

**Selection** — `themeId` stored in `shared_preferences` (Phase 0) → `user_preferences.theme_id` (Phase 2+ once user accounts persist this server-side). Users switch via Settings → theme picker.

**Light/dark mode** is orthogonal to themeId: each theme produces both. `themeMode` (light / dark / system) is its own preference.

```dart
// One theme entry in the registry
ThemeData buildTheme({required Color seed, required Brightness brightness}) => ThemeData(
  useMaterial3: true,
  colorScheme: ColorScheme.fromSeed(seedColor: seed, brightness: brightness),
  typography: Typography.material2021(),
);
```

Adding a new theme = one entry in the registry. No screen changes required (everything reads from `Theme.of(context).colorScheme`).

## 4. Navigation

### 4.1 Bottom navigation — 4 tabs (mobile)

| Tab | Icon | Route root | Contains |
|---|---|---|---|
| **Home** | `home_filled` | `/` | Account summary cards + recent transactions + outstanding debts (debt summary card) + quick-add FAB |
| **Transactions** | `receipt_long` | `/transactions` | Full transaction list with filters; search; summary toggle |
| **Accounts** | `account_balance_wallet` | `/accounts` | Accounts list; tap → account detail with its transactions |
| **More** | `menu` | `/more` | Hub for Budgets, Saving Goals, Scheduled Transactions, Projects, Contacts, Settings |

Home is the landing page. The FAB is present on Home + Transactions + Accounts; tapping it opens the quick-add transaction modal.

### 4.2 Web sidebar (Flutter web ≥ medium width)

On Flutter web above ~800 dp width, the bottom nav collapses into a left sidebar with the same 4 entries + inline sub-menu expansion for **More**. Below medium width, web uses the mobile bottom nav (responsive breakpoint).

### 4.3 Route table

Using `go_router`. All routes are authenticated except `/auth/*`.

```
/                               → HomePage
/transactions                   → TransactionsListPage
/transactions/new               → TransactionFormPage (modal / full-screen)
/transactions/:id               → TransactionDetailPage
/transactions/:id/edit          → TransactionFormPage
/accounts                       → AccountsListPage
/accounts/new                   → AccountFormPage
/accounts/:id                   → AccountDetailPage
/accounts/:id/edit              → AccountFormPage
/more                           → MoreHubPage
/more/categories                → CategoriesPage
/more/tags                      → TagsPage
/more/contacts                  → ContactsPage
/more/contacts/:id              → ContactDetailPage
/more/projects                  → ProjectsListPage
/more/projects/new              → ProjectFormPage
/more/projects/:id              → ProjectDetailPage
/more/projects/:id/members      → ProjectMembersPage
/more/budgets                   → BudgetsListPage
/more/budgets/overview          → BudgetOverviewPage
/more/budgets/:id               → BudgetDetailPage
/more/saving-goals              → SavingGoalsListPage
/more/saving-goals/:id          → SavingGoalDetailPage
/more/scheduled                 → ScheduledListPage
/more/scheduled/:id             → ScheduledDetailPage
/more/settings                  → SettingsPage
/more/settings/profile          → ProfileEditPage
/more/settings/password         → ChangePasswordPage
/auth/login                     → LoginPage
/auth/register                  → RegisterPage
/invite/project/:code           → AcceptProjectInvitePage (deep link)
/invite/contact/:code           → AcceptContactInvitePage (deep link)
```

Deep-link handling: invite URLs open directly into the accept page; if user is not logged in, they're redirected to login then back.

### 4.4 Modal vs. full-page

- **Modals (bottom sheet on mobile, dialog on web):** quick-add transaction, resolve action picker, confirm delete, member invite code display
- **Full pages:** list views, detail views, form pages with more than 3 fields
- Long forms (transaction edit with splits) are full-page on mobile, centered dialog on web wide-screen

### 4.5 Nested navigation

Within a tab, pages push onto a tab-local stack (Navigator 2.0 `StatefulShellRoute` in `go_router`). Switching tabs preserves each tab's stack. Deep links override tab routing when opened externally.

## 5. State management

### 5.1 Bloc / Cubit per feature

Stack: **Cubit by default**, **Bloc** when an event-driven flow needs explicit events. Each feature owns its own Cubit/Bloc classes; UI consumes via `BlocBuilder` / `BlocConsumer` / `BlocListener`.

Layered architecture: **Cubit → Repository → DataSource (dio)**. Cubits don't talk to dio directly; they go through a Repository abstraction so Cubits stay testable with mocked Repositories.

```dart
// Account feature — list state with a Cubit
class AccountsCubit extends Cubit<AccountsState> {
  AccountsCubit(this._repo) : super(const AccountsState.initial());
  final AccountsRepository _repo;

  Future<void> load() async {
    emit(const AccountsState.loading());
    try {
      final accounts = await _repo.listAccounts();
      emit(AccountsState.loaded(accounts));
    } on ApiException catch (e) {
      emit(AccountsState.error(e));
    }
  }
}

// State as a sealed class (or freezed union)
sealed class AccountsState { ... }
class AccountsInitial extends AccountsState { ... }
class AccountsLoading extends AccountsState { ... }
class AccountsLoaded extends AccountsState { final List<Account> accounts; ... }
class AccountsError extends AccountsState { final ApiException error; ... }

// UI consumption
BlocBuilder<AccountsCubit, AccountsState>(
  builder: (context, state) => switch (state) {
    AccountsLoading() => const LoadingView(),
    AccountsError(:final error) => ErrorView(error: error, onRetry: () => context.read<AccountsCubit>().load()),
    AccountsLoaded(:final accounts) when accounts.isEmpty => const EmptyView(...),
    AccountsLoaded(:final accounts) => ListView(...),
    _ => const SizedBox.shrink(),
  },
);
```

**Convention:**

- One Cubit per logical state container (per feature, per page, or per scope as needed)
- States as **sealed classes** (Dart 3) or **freezed** unions; never untyped maps
- DI via **`BlocProvider`** at the feature/page root: `BlocProvider(create: (ctx) => AccountsCubit(ctx.read<AccountsRepository>()), child: ...)`
- Promote a Cubit to a **Bloc** when you need: explicit event types, throttling/debouncing events, or replayable history (rare in Phase 0/1)
- Repository injected via constructor (testable; can be mocked in `bloc_test`)

### 5.2 Repository pattern

Each feature has a Repository that's the only place that talks to dio:

```dart
class AccountsRepository {
  AccountsRepository(this._client);
  final ApiClient _client;

  Future<List<Account>> listAccounts() => _client.get('/v1/accounts').then(...);
  Future<Account> getAccount(String id) => _client.get('/v1/accounts/$id').then(...);
  Future<Account> createAccount(CreateAccountInput input) => _client.post('/v1/accounts', input).then(...);
  // etc.
}
```

Repositories are registered as singletons (or scoped to feature) via `RepositoryProvider` at app start; Cubits consume them.

### 5.3 API client (`dio`)

Single shared `Dio` instance wrapped in an `ApiClient` class. Interceptors:

1. **Auth interceptor** — attach `Authorization: Bearer <token>` from secure storage
2. **Refresh interceptor** (Phase 2+) — on 401, trade refresh token; retry request once
3. **Error interceptor** — map backend error envelope to typed `ApiException(code, message, details)`

`ApiClient` is provided once at app start via `RepositoryProvider`; all Repositories receive it via constructor.

### 5.4 Offline-first — Phase 2+ only

Phase 1 assumes online. Phase 2 adds `sqflite` cache with background sync (Cubits read from cache + emit fresh state when network returns). Phase 0/1 clients treat network errors as errors (with retry CTA in `ErrorView`).

### 5.5 Optimistic updates

Writes (create transaction, edit account) do NOT optimistically update the local state in Phase 1. Cubit waits for server confirmation, then emits new state. Prevents balance-drift bugs.

Phase 2+ may add optimistic updates for fast-feedback actions (like adding a tag to a transaction).

### 5.6 Testing pattern

Use `bloc_test` package:

```dart
blocTest<AccountsCubit, AccountsState>(
  'load() emits [loading, loaded] when api returns accounts',
  build: () => AccountsCubit(MockAccountsRepository()..mockListAccounts([account1, account2])),
  act: (cubit) => cubit.load(),
  expect: () => [const AccountsLoading(), AccountsLoaded([account1, account2])],
);
```

Repositories tested separately with mocked `dio`. Widgets tested with `BlocProvider.value` injecting a controlled Cubit.

## 6. Reusable widgets

### 6.1 State pattern widgets (Phase 0)

| Widget | Purpose | Props |
|---|---|---|
| `LoadingView` | Shown while async data loads | `skeleton: Widget?` — optional custom skeleton; default is a shimmer |
| `ErrorView` | Shown when async data fails | `error: Object`, `onRetry: VoidCallback?`; renders message from `ApiException` |
| `EmptyView` | Shown when data returns zero rows | `icon`, `title`, `message`, `cta: Widget?` |
| `OfflineBanner` | Top-of-screen banner when offline | Auto-shown by root MaterialApp wrapper |

### 6.2 Data display widgets

| Widget | Purpose |
|---|---|
| `TransactionRow` | Single transaction in a list (leading icon, middle text, trailing amount) |
| `AccountCard` | Account summary tile (name, type, balance, account color accent) |
| `CategoryChip` | Category pill with icon + color + name |
| `TagChip` | Tag pill (small, muted) |
| `MemberAvatar` | Contact or project member avatar (photo or icon fallback) |
| `DebtSummaryCard` | Home-screen card: "owed to me ฿X, I owe ฿Y" |
| `AmountText` | Formatted amount with correct currency symbol, tabular figures, color (expense/income/transfer) |
| `ProgressBar` | For budget utilization, saving goal progress — color-shifts at thresholds |

### 6.3 Input widgets

| Widget | Purpose |
|---|---|
| `AmountInput` | Numeric keypad-style input with currency prefix |
| `CategoryPicker` | Hierarchical picker (3-level tree); system categories hidden by default |
| `AccountPicker` | Dropdown / bottom sheet of user's accounts |
| `ContactPicker` | Autocomplete search; offers "create new contact" inline; for splits also offers free-text ad-hoc |
| `DatePicker` | Wraps Flutter's `showDatePicker` with user tz awareness |
| `SplitEditor` | Rows for each split, fixed/percent toggle, sum validator |

### 6.4 Interaction patterns

- **Pull-to-refresh** on all list pages
- **Swipe-to-delete** on transaction rows (with Undo snackbar — Phase 2 polish; Phase 1 confirms with dialog)
- **FAB** on Home / Transactions / Accounts for quick-add transaction
- **Long-press** for contextual actions (multi-select in Phase 2+)

## 7. Platform differences — mobile vs. web

| Aspect | Android | Flutter web |
|---|---|---|
| Navigation | Bottom nav + tab-local back stack | Sidebar (≥ 800 dp) or bottom nav (< 800 dp) |
| FAB | Always visible on relevant screens | Same, but right-aligned within centered content column |
| Modals | Bottom sheets | Centered dialogs (`useMaterial3` default) |
| Back button | System back (gesture / button) | Browser back + explicit back buttons in app bar |
| Keyboard | On-screen; form focus trap in bottom sheet | Hardware keyboard; tab-focus supported; Enter submits |
| URL | Not visible; deep links | URL reflects current route via `go_router` |
| Offline detection | `connectivity_plus` | Navigator online/offline events |
| Secure storage | `flutter_secure_storage` (Android KeyStore) | `shared_preferences` (IndexedDB) — acknowledged risk, mitigated by short tokens in Phase 2+ |
| Biometric unlock | Phase 3 feature (`local_auth`) | Not applicable |

## 8. Accessibility

- Flutter's built-in `Semantics` widgets; add labels where default isn't descriptive
- Color contrast: Material 3 tokens pass WCAG AA out of the box
- Text scaling: support `textScaleFactor` up to 1.5× (test layouts at 1.3×)
- Screen reader (TalkBack / VoiceOver / JAWS): all interactive widgets have `Semantics(label:)`
- Focus order: forward-declaration via `FocusTraversalGroup` on pages with multiple inputs
- Haptic feedback on key actions (save, delete, error) — `HapticFeedback.mediumImpact()`

## 9. Forms & validation

- `flutter_form_builder` for form state management
- Validators: required, min/max, regex, custom (e.g., `amount > 0`, `sum of splits = total`)
- Inline error display below each field
- Submit button disabled until form valid; enables on pristine-valid state
- Backend errors (`VALIDATION_ERROR` from API) map to field errors when the backend returns per-field details

## 10. Testing approach

- **Widget tests** — each reusable widget (TransactionRow, AmountInput, etc.) has a test verifying rendering + key interactions
- **Golden tests** — for layout-critical widgets (AccountCard, TransactionRow variants)
- **Integration tests** — core flows (register → login → add account → log transaction → view list) via `integration_test` package
- **Cubit / Bloc tests** — via `bloc_test` package; mock the Repository to control state transitions
- Phase 1 target: core flow integration tests pass; no enforced coverage percentage

## 11. Open questions

- **Brand color hex** — placeholder `#00A389`; pick actual before Phase 0 UI work starts
- **Custom font** — ship with Noto Sans Thai bundled for consistent rendering, or rely on system fonts? Size vs. consistency tradeoff; decide before Phase 0 build.
- **Icon library strategy** — Material Icons covers ~80%; custom SVGs for brand-specific (category illustrations, onboarding art) — Phase 2 polish.
- **Error taxonomy mapping** — how ApiException codes map to user-facing strings. Table to be built as each module's errors are documented.
- **Web-specific keyboard shortcuts** — Cmd/Ctrl+K for search, `n` for new transaction? Phase 2 polish.
- **Dark mode refinement** — account colors + category colors in dark mode might need brightness adjustment; test on real content before Phase 0 ships.

## 12. Status

- **Phase** — spec; Phase 0 implementation pending
- **Last updated** — 2026-04-26
- **Version** — 0.3 (stack documented as Bloc-only — `flutter_bloc` with Cubit-by-default + Repository pattern + `bloc_test`)
