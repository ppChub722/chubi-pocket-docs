# App map: every screen, sheet and picker (chubi-pocket-app)

_Made by Lead from the code on 2026-10-23 (branch wip/0.4.0-3): `lib/core/router/app_router.dart`, `lib/features/**/pages`, every `show…Sheet` / `…Picker`, and their callers._

**Use it as the checklist for any "scan the whole app" job.** Go row by row and tick each screen in each mode (view / edit / create, dark + light). A scan that only follows the bottom tabs misses the pushed pages, the sheets and the pickers below.

**Keep it current.** A new route, page, sheet or picker gets a row here in the same change, and so does a removed one.

Owner = the session working on that screen this round (STATUS → Team). — = nobody right now, so ask Lead.

## 1. Shell (on every tab)
| Piece | File | Owner | Notes |
|---|---|---|---|
| Bottom bar: แดชบอร์ด / รายการ / [บันทึก] / กระเป๋า / เพิ่มเติม | `app/shell/main_bottom_nav.dart` | — | The centre button opens quick create; its colour follows the page preset |
| Top bar: inbox (pending), bell (notifications), profile avatar | `app/shell/app_top_bar.dart` | Lead | The avatar shows the user's full icon, border included |
| Connection banner / offline | `app/connection_shell.dart` | — | Offline mode rules: decisions.md |
| **Quick create** sheet | `features/transactions/presentation/widgets/quick_create_sheet.dart` | Lead | Modes: **รายการ** (ผูกกับ tabs ส่วนตัว / แบ่ง / จ่ายแทน / อีเวนต์), **หนี้** (`debt_entry_form.dart`: จดหนี้ / จ่ายหนี้), **ออม** (`saving_entry_form.dart`) |
| Update required | `features/app_version/presentation/pages/update_required_page.dart` | — | Shown when MIN build > app build |
| Splash / boot error | `auth/.../splash_page.dart`, `app/boot_error_app.dart` | — | |

## 2. Routes → pages
| Route | Page (file under `lib/features/`) | Modes | Owner |
|---|---|---|---|
| `/auth/login`, `/auth/register` | `auth/.../login_page.dart`, `register_page.dart` | — | — |
| `/` | `home/.../home_page.dart` (dashboard) | view | — |
| `/browse?…` (child of `/`) | dashboard browse → `TransactionsListPage` filtered | view | — |
| `/transactions` | `transactions/.../transactions_list_page.dart` | list + filters (side sheet) | 7d (rows) |
| `/transactions/:id` | `transactions/.../transaction_detail_page.dart` | view / edit (same form as quick create) | — |
| `/accounts` | `accounts/.../accounts_page.dart` | list (grid / rows) | — |
| `/accounts/new`, `/accounts/:id`, `/accounts/:id/members` | `accounts/.../account_detail_page.dart` | create / view / edit / members tab | Lead (this round) |
| `/accounts/archived` | `accounts/.../archived_accounts_page.dart` | list | — |
| `/more` | `app/shell/more_page.dart` | menu | — |
| `/pending` | `pending/.../pending_page.dart` | list | 7d (rows) |
| `/pending/new` | `pending/.../pending_batch_add_page.dart` | batch add | — |
| `/notifications` | `notifications/.../notifications_inbox_page.dart` | list | 7d (rows) |
| `/notifications/settings`, `/settings/notifications` | `notifications/.../notification_settings_page.dart` | settings (two routes, one page) | — |
| `/settings` | `settings/.../settings_page.dart` | menu + profile card | — |
| `/settings/profile` | `settings/.../edit_profile_page.dart` | view / edit | Lead |
| `/settings/password` | `settings/.../change_password_page.dart` | form | — |
| `/archived` | `archived/presentation/archived_page.dart` (all archived items) | list | — |
| `/projects` | `projects/.../projects_page.dart` (events list) | list | event (ad) |
| `/projects/new`, `/projects/:id`, `/projects/:id/edit` | `projects/.../project_detail_page.dart` | create / view / edit | event (ad) |
| `/projects/:id/members` | `projects/.../project_members_page.dart` | members | event (ad) |
| `/contacts` | `contacts/.../contacts_page.dart` | list | 7d (rows) |
| `/contacts/new`, `/contacts/:id/edit` | `contacts/.../contact_form_page.dart` → `ContactDetailPage` in create / edit | create / edit | Lead |
| `/contacts/:id` | `contacts/.../contact_detail_page.dart` | view (business card hero) | Lead |
| `/budgets` | `budgets/.../budgets_list_page.dart` | list | — |
| `/budgets/new`, `/budgets/:id`, `/budgets/:id/edit` | `budgets/.../budget_detail_page.dart` | create / view / edit | — |
| `/recurring` (`?focus=due`) | `recurring/.../recurring_home_page.dart` | tabs ภาพรวม / ปฏิทิน / รายการ | 4c |
| `/recurring/new`, `/recurring/:id`, `/recurring/:id/settings` | `recurring/.../recurring_detail_page.dart` | create / view / edit | 4c |
| `/saving-goals` | `saving_goals/.../saving_goals_list_page.dart` | list | — |
| `/saving-goals/new`, `/saving-goals/:id`, `/saving-goals/:id/edit` | `saving_goals/.../saving_goal_detail_page.dart` | create / view / edit | — |
| `/saving-goals/spare` | same page, id `spare`: the **ยังไม่จัดสรร** pool | view | — (easy to miss) |
| `/personal-debts` | `personal_debts/.../personal_debts_page.dart` | list | หนี้ (28) |
| `/personal-debts/people/:key` | `personal_debts/.../debt_person_page.dart` | person page | หนี้ (28) |
| `/personal-debts/entries/:id`, `/personal-debts/:id` | `transactions/.../debt_entry_detail_page.dart` | view / edit | หนี้ (28) |
| `/categories` | `categories/.../categories_page.dart` | list | 7d (rows) |
| `/categories/new?type=…`, `/categories/:id` | `categories/.../category_detail_page.dart` | create / view / edit | — |
| `/tags` | `tags/.../tags_page.dart` | list + inline edit | 7d (rows) |
| `/dev/**` | `hub/` (UI kit hub; not for users) | hub | kit owners |

## 3. Sheets and dialogs (no route, so easy to miss)
| Sheet | File | Opened from |
|---|---|---|
| Entry sheet (one-off entry) | `showEntrySheet` | recurring occurrence actions, recurring item actions, quick create |
| Occurrence sheet | `showOccurrenceSheet` | recurring detail |
| Count sheet | `showCountSheet` | recurring detail |
| Edit scope choice ("this one / all") | `showEditScopeChoice` | recurring detail, recurring item actions |
| Linked prompt | `showLinkedPrompt` | recurring actions, recurring detail, tx detail |
| Recurrence (repeat) sheet | `showRecurrenceSheet` | budget detail, recurring detail, saving goal detail |
| Saving auto-save sheet | `showSavingAutoSaveSheet` | saving goal detail |
| Close goal dialog | `showCloseGoalDialog` | saving goal detail |
| Period sheet / period pill | `showPeriodSheet` | tx list period pill |
| Period limit sheet | `showPeriodLimitSheet` | budget detail |
| Scope prompt | `showScopePrompt` | budget detail |
| Tx filter (+ side sheet) | `showTxFilterSheet` / `showTxFilterSideSheet` | tx list |
| Adjust / set balance | `showAdjustBalanceSheet`, `showSetBalanceSheet` | wallet detail |
| Identifier kind | `showIdentifierKindSheet` | wallet detail (identifiers) |
| Icon maker | `showIconMakerSheet` | wallet / budget / category / contact detail, profile |
| Add member (+ form) | `showAddMemberSheet` | event detail, event members |
| Event tags manager | `showEventTagsManager` | event detail |
| Resolve / event resolve sheet | `showResolveSheet`, `showEventResolveSheet` | event bill tiles |
| Description picker | `showDescriptionPickerSheet` | event bill form |
| New tag name | `showNewTagNameSheet` | tag picker |
| Date / range / month / day-of-month pickers | `showAppDatePicker`, `showAppDateRangePicker`, `showMonthPicker`, `showDayOfMonthPicker` | many forms |
| Confirm dialog | `showConfirmDialog` | everywhere (delete / archive / discard) |
| Debt person picker (กับใคร) | `showDebtPersonPicker` | quick create debt mode, debt entry detail |
| **No caller found** (unused?) | `showSettleSheet` (`ui/domain/money/settle_sheet.dart`), `SavingMoveSheet` (`ui/domain/saving/saving_move_sheet.dart`) | Check before a cleanup |

## 4. Pickers (sheets with search; one PickerSheet core)
| Picker | File | Opened from |
|---|---|---|
| AccountPicker | `accounts/.../widgets/account_picker.dart` | quick create, budget scope, notification settings, event resolve, … |
| CategoryPicker | `categories/.../widgets/category_picker.dart` | quick create, budget scope, category detail (parent), event resolve |
| TagPicker | `tags/.../widgets/tag_picker.dart` | quick create, budget detail, events list / detail, recurring detail |
| ContactPicker (modes: contacts / debts / members) | `contacts/.../widgets/contact_picker.dart` | splits, wallet members, contact link, debt person page, quick create debt |
| SavingGoalPicker | `saving_goals/.../widgets/saving_goal_picker.dart` | quick create saving mode, goal detail |
| RecurringPicker | `recurring/.../widgets/recurring_picker.dart` | tx ผูกกับ "รายการประจำ" (recurring_link) |
| DebtEntryPicker | `personal_debts/.../widgets/debt_entry_picker.dart` | quick create จ่ายหนี้ → ปิดหนี้ |
| ItemPicker (generic) | `ui/organisms/item_picker.dart` | debt repay person, others |

## 5. Scan checklist per screen
For each row in 2–4: light + dark theme; Thai + English; text scale 1.0 and 1.3; empty / loading (skeleton) / error / offline; view → edit → save / cancel (discard prompt); long names / big amounts; archived item; shared wallet / linked contact.
