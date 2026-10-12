
## 2026-10-12 — compact hero bar = small hero card (0.3.1-9)
DONE · files: lib/ui/molecules/compact_hero_bar.dart (CompactHeroScope), test/shared/compact_hero_bar_test.dart · analyze clean on touched files; compact-hero tests pass (9)
root cause: CompactHeroBar already takes the hero's HeroStyle and draws it with HeroSurface (tint, border, glyph, pill radius), and every page (wallet, tx, event) already passes `style:`, but CompactHeroScope re-built the bar WITHOUT `style` → every page got the flat plain pill. Fix = one line: the scope forwards `bar.style`. One place, all detail pages (wallet, transaction, event; the hub scope demo) pick it up; height (44) and pinned placement unchanged.
test: the scope keeps the HeroStyle and the surface is tinted.
not changed: hub page molecules_bars_page already shows the bar variants with styles (they now render tinted inside the scope too).
Note: pages whose compact bar still looks flat after this pass no `style:` — none found (wallet/tx/event all pass it).

## 2026-10-12 — sheets/tiles split into ui organisms + wrappers (0.3.1-9)
DONE · analyze lib+test: 1 info (test/ui/skeleton_geometry_test.dart, not mine) · tests app+features+layering+app_input: 255 pass · hub_coverage: my pieces covered; still red only for others' pieces (CategoryPicker*/ContactPicker*/Settle*/TxFilter*/DescriptionPicker*/QuickCreateSheetShell)
- NEW ui organisms: ui/domain/projects/{event_resolve_sheet,add_member_sheet,project_member_avatar,member_pick_card}.dart, ui/domain/notifications/notification_tile.dart (NotificationTileView + NotificationRejectConfirm); all exported in ui.dart.
- Thin wrappers in features keep the old public API: showResolveSheet, showAddMemberSheet, MemberPickCard, NotificationTile; feature ProjectMemberAvatar class → helper memberAvatar(ProjectMember).
- Hub: lib/hub/pages/sheets_projects_page.dart + HubPage 'sheets-projects'; domain_others_page demos the avatar/pick card/tile view.
- Popovers: settings language row and event status chip now OptionMenuAnchor (highlight, no ✓); font + member picker stay sheets. Entity chips on the resolve sheet's account/category rows (DetailRow.pick valueChip).
- Skeletons: dropped my own skeleton args (event detail), notification settings uses DetailPageSkeleton.
deltas: resolve-sheet category chip has no icon/colour (Category has no colour/icon getter); Account/Categories cubits now load in the wrapper before the sheet opens.

## 2026-10-12 — profile card tint + profile detail page (0.3.1-9 blocker)
DONE · analyze lib+test: no issues · full suite: 533 pass, 1 fail = test/ui/hub_coverage_test (AuthPageBody, BrandHeader, LanguageThemeBar, OrDivider, SocialSignInButton — new ui pieces from another session's auth work, no hub page yet; not mine)
1. Tint: Settings profile card + profile page hero use accent = user.iconCode.tintFor(palette, avatarName: displayName) = the avatar's own colour (icon colour, else the initials colour AppAvatar.colorFor). Test test/features/settings/profile_tint_test.dart (tint == AppAvatar.colorFor for no-icon users; HeaderCard surface carries it); hub demo "Profile card (settings)" on domain/others. The top-right avatar (UserAvatar) is the same source; the green ring (current page) untouched.
2. Profile page (edit_profile_page.dart, route /settings/profile) = contact-style detail: opens in VIEW mode (✏️ / long-press edits, leave-edit prompt, pull-to-refresh in view), hero avatar · name · @username; ONE headless box: display name (inline) · username 🔒 · email (inline, "ไม่ได้ตั้ง" when empty, cannot be cleared once set → validator, 409 EMAIL_EXISTS → field error) · currency 🔒; headed section "บัญชี": Change password ›; DetailMeta from /users/me created_at/updated_at (User model now parses them). Settings keeps app settings only (Account section removed). New arb: profileTitle, profileEmailCannotClear.
notes: page title is "โปรไฟล์" (new key; the old editProfileTitle is still used by the avatar icon-maker sheet).

## Handoff 2026-10-13
Role: FE-D (events pages + pending/notifications/settings/auth/more). Everything asked for 0.3.1-9 is done and green at my last run (analyze lib+test clean, full suite ~555 pass).
Unfinished / open:
- Events redesign (0.3.1-10): only the PROPOSAL exists (ai/inbox/fe-events.md: tabs สรุป·รายการ·สมาชิก, 10 BE asks A1–A10, 6 kit pieces, 8 owner questions) — no owner answers yet, nothing built. 0.3.1-9 events work was standards-only (templates/kit, no redesign).
- Resolve-sheet category chip has no icon/colour (no getter on Category); unread dot / minor kit gaps flagged earlier (SelectionToolbar etc. were since added by FE-A).
- Global status-bar scrim (content shows under the clock on all pages) is a kit task for FE-A/FE-B, not done.
- contact_detail_page: _load catches only ApiException (parse errors hang the skeleton) + 10–25 s skeleton before the error state; a contact page test was added by another session — check it's green.
- "แก้ร่าง" sheet still prefills from account/category caches, not pending.resolved/form-options (transactions feature, FE-C's files).
Gotchas:
1. Change password is a PAGE (/settings/password, EditModeMixin + DetailPageBody, AppInput.card obscurable fields); the owner flipped sheet → section → page three times — don't redesign without a new owner order. Its entry row sits in the profile box right under the username.
2. Profile page (edit_profile_page.dart) is a contact-style detail page in VIEW mode; display name/email use DetailTextField (ui/molecules/detail_text_field.dart) — the ONE editable-value piece shared with contact_detail_page; email can't be cleared once set (validator), 409 EMAIL_EXISTS is a field error; hero tint = icon.tintFor(palette, avatarName).
3. Compact hero bar: CompactHeroScope must forward `style` to the bar (it used to drop it → flat pill everywhere).
4. Sheets rule: presentational organism in lib/ui/domain/* (no features/cubit/l10n) + thin wrapper in features/ (event resolve, add member, ProjectMemberAvatar, notification tile view). Hub entries/covers go in hub_registry.dart (hub_coverage test ratchets every ui.dart export).
5. Shell shell tricks: ListPageBody/DetailPageBody own the top-bar clearance (don't wrap in MediaQuery.removePadding), hub pages must not contain a ListView (smoke test puts them in a scroll view), heredocs with quotes in bash tool break — write files with the Write tool; Python is not installed (use node).
