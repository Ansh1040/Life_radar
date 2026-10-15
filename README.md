# Life Radar

A separate, dependency-free personal life companion. Existing projects are not modified.

Run `node serve.mjs` from this directory and open http://127.0.0.1:5186. Keep this port consistent: browser storage belongs to the origin. The app also works by opening index.html directly, but file-based storage behavior varies by browser.

Includes daily, weekly, monthly and yearly tasks; a start-now decision with a persistent focus timer; recurring check-ins; scheduled notes to self; period reviews; JSON export and validated restore. Start with your own entries; there is no invented personal data. Tasks do not automatically repeat. A radar check-in records the latest completion date, not a historical log. Future notes remain visible in Notes to self and appear on Today when their resurface date arrives.

Data is stored only in this browser's localStorage. Clearing browser data removes it. Export backups regularly. No account, cloud synchronization, background notifications or Android APK is included in this first version. System fonts work offline; optional Google Fonts need connectivity on their first load. Dates use the device's local timezone.
