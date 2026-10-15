# Life Radar

A separate, dependency-free personal life companion. Existing projects are not modified.

Run `node serve.mjs` from this directory and open http://127.0.0.1:5186. Keep this port consistent: browser storage belongs to the origin. The app also works by opening index.html directly, but file-based storage behavior varies by browser.

Includes daily, weekly, monthly and yearly tasks; a start-now decision with a persistent focus timer; recurring check-ins; scheduled notes to self; period reviews; JSON export and validated restore. Start with your own entries; there is no invented personal data. Tasks do not automatically repeat. A radar check-in records the latest completion date, not a historical log. Future notes remain visible in Notes to self and appear on Today when their resurface date arrives.

Data is stored locally on the device. Clearing browser/app data removes it. Export backups regularly. No account or cloud synchronization is included. System fonts and all app files work offline. Dates use the device's local timezone.

## Android app

The Indigo Rose theme includes saved light/dark mode, bottom icon navigation, swipe between sections on empty space, and swipe entry actions. Swipe right to edit eligible entries; swipe left to open actions. Deletion always requires confirmation. The three-dot menu offers the same actions without gestures. Tasks, check-ins, notes and income are editable; expenses retain the Quick Capture-only editing rule. Large expense logs load 60 entries at a time.

Build on Windows with the Android 36 SDK/build tools and JDK 21: `powershell -ExecutionPolicy Bypass -File android/build.ps1 -SdkRoot 'C:\Users\ansh0\AppData\Local\Android\Sdk'`. Alternatively pass `-ToolsRoot` and `-AndroidJar` to use separately extracted official SDK archives. The output is `artifacts/LifeRadar-1.0.1.apk`, a personal sideload build signed with a locally generated key in ignored `android/signing`. Keep that key for future app updates. This is not a Play Store release. Minimum Android version: 8.0; target Android 16 / API 36. No native CPU libraries and no internet permission are used. Android System WebView should be current.

Version 1.0.1 updates the previous API 33 target to API 36, handles system bar/cutout/keyboard insets, and registers the modern Android back callback. It uses the same app ID and signing key with a higher version code, so it can update version 1.0.0 without clearing entries. This removes the obsolete target configuration; Play Protect may independently request a scan or apply its own reputation checks to sideloaded packages.

Transfer the APK to the OnePlus 13 and open it in Files, allowing installation from that source when Android asks. Local browser entries do not automatically transfer: export a browser backup and restore it in the app. Native backup export uses Android's file destination picker.

## Reminder notifications

Set an optional Reminder date and time in a task's capture/edit form. Grant notification permission when prompted. The bell button opens Android notification settings. Completing/deleting a task or clearing its reminder cancels the pending alarm; editing a task reschedules it. Pending reminders are restored after restart or app update. Reminders use battery-friendly inexact alarms, so Android/OxygenOS can delay them. Force-stopping the app disables alarms until it is opened again. If delivery is delayed, check Life Radar's notifications and background battery settings on the phone. This version supports one-time task reminders, not recurring check-in notifications.

Validation: `node smoke.mjs`; `node browser-test.mjs <absolute-path-to-playwright/index.mjs>` tests mobile forms, swipes, timer, notifications bridge, theme persistence, backup restore, narrow layout and a 1,000-entry ledger in isolated headless Edge. Real-device reminder delivery must be checked on the phone.

## Spending

Expenses recorded through Quick Capture can be edited; Add spending entries cannot. The origin is enforced in the edit and save handlers, and shown on the entry. Older records have no origin information and remain non-editable. The Quick Capture menu on other screens also offers Expense and Money I earned.

New expenses and income records store an automatic creation timestamp and an optional transaction time. Editing preserves creation time and records the latest edit time. Older records show that their original timestamp was not recorded rather than inventing one.

Add income records money earned with a source/description, amount, date, time and note. Period summaries show spent, earned and net (earned minus spent), which is not a bank balance. The calendar at the end of Spending is independent of the period filter, supports month navigation, shows each day's spending and an income indicator, and lists both kinds of entries when a day is selected. All records are included in backups; older backups remain supported.

Choose “＋ Add a category…” in the expense category selector to name your own category. It is saved with the expense, appears in future entries and category breakdowns, and is included in backups. Names are trimmed and matched without case sensitivity to avoid duplicates. Existing categories, including Other, remain available.

Open Spending in the main navigation to manually log an expense with a description, INR amount, date, category and optional note. View totals and category breakdowns for today, the current Monday–Sunday week, month or year, up to today. Amounts are stored as integer paise to keep totals exact. Expenses can be deleted and are included in backup export/restore. Backups from before Spending was added remain compatible. No bank connection or automatic transaction collection is used.
