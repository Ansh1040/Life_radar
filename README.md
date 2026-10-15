# Life Radar

A separate, dependency-free personal life companion. Existing projects are not modified.

Run `node serve.mjs` from this directory and open http://127.0.0.1:5186. Keep this port consistent: browser storage belongs to the origin. The app also works by opening index.html directly, but file-based storage behavior varies by browser.

Includes daily, weekly, monthly and yearly tasks; a start-now decision with a persistent focus timer; recurring check-ins; scheduled notes to self; period reviews; JSON export and validated restore. Start with your own entries; there is no invented personal data. Tasks do not automatically repeat. A radar check-in records the latest completion date, not a historical log. Future notes remain visible in Notes to self and appear on Today when their resurface date arrives.

Data is stored only in this browser's localStorage. Clearing browser data removes it. Export backups regularly. No account, cloud synchronization, background notifications or Android APK is included in this first version. System fonts work offline; optional Google Fonts need connectivity on their first load. Dates use the device's local timezone.

## Spending

Choose “＋ Add a category…” in the expense category selector to name your own category. It is saved with the expense, appears in future entries and category breakdowns, and is included in backups. Names are trimmed and matched without case sensitivity to avoid duplicates. Existing categories, including Other, remain available.

Open Spending in the main navigation to manually log an expense with a description, INR amount, date, category and optional note. View totals and category breakdowns for today, the current Monday–Sunday week, month or year, up to today. Amounts are stored as integer paise to keep totals exact. Expenses can be deleted and are included in backup export/restore. Backups from before Spending was added remain compatible. No bank connection or automatic transaction collection is used.
