# What changed in this update

## Round 2 — JARVIS features brought into Level Up (tasks, calendar, memory)

**Tasks — fully upgraded**
Priority (high/medium/low), categories, tags, recurrence (daily/weekly/
monthly — completing a recurring task rolls it forward instead of just
checking it off forever), search, and filters. All local, no backend.

**Notes — search added**
Searches both title and body.

**Real Calendar (new)**
A proper month-view calendar with dated events — separate from the
existing recurring-weekly Schedule tab. Tap any day to see/add/edit events,
optional time + end time, notes, and a per-event reminder toggle that
schedules a real local notification. Genuinely local, no backend.

**AI Memory (new)**
The AI Assistant can now remember durable facts about you across
conversations — goals, preferences, constraints. During a chat, if it
learns something worth keeping, it saves it automatically (you'll never
see the raw mechanism — it's invisible in the reply). A new Memory screen
under More lets you view, manually add, delete individual facts, or clear
everything. These facts get fed into every future AI conversation and the
daily insight, so responses get more personalized over time. Still 100%
optional — everything else in the app works with zero memories saved.

**Two real bugs fixed in the process**
1. Adding required fields to the `Task` type would have crashed the app
   for anyone with existing saved tasks (old data missing the new fields).
   Added a proper migration layer.
2. Found a *pre-existing* bug from the previous update round: the `steps`
   field added to `HealthDay` wasn't being migrated for old saved health
   data — would've crashed the Health screen on existing installs. Fixed.

**Clarification on API requirements**
Only the AI Assistant needs an API key (your Anthropic key, held in the
Vercel backend). Tasks, Notes, the new Calendar, Memory, habits, health
tracking, the food scanner, and notifications are all 100% local and free
— no accounts, no keys, nothing to deploy for any of them.

## Scope changes from what was originally requested
Two items were explicitly dropped at your request:
- ❌ App locker / focus-mode blocking of other apps
- ❌ YouTube/TikTok video generation and auto-posting

For the record on why, if useful later: app-locking is technically
possible on iOS via Apple's Family Controls framework (same one Opal/
Freedom use), but requires Apple's approval for a special entitlement plus
real native Swift development — a project of its own, not a quick add.


## ✅ Done and verified (builds clean, real code — not stubs)

**Scrolling — fixed**
Found and fixed a real bug: an earlier iOS safe-area CSS change conflicted
with Tailwind's `min-h-screen`, silently clipping content. Scroll is now
scoped to a dedicated `.app-scroll` container; fixed elements (nav, modals)
sit outside it correctly.

**400 motivational quotes**
Original lines (not attributed to real people, so nothing's misquoted).
Rotates once per calendar day. Shows as a card on the Dashboard.

**Daily quote delivered every morning, before you open the app**
Schedules 14 real, individual notifications (not one repeating one) so the
quote is genuinely different each day, not frozen on whatever it was when
last synced. Refreshes automatically every time you open the app.

**Notification sound + vibration**
Every scheduled notification now plays sound; Android gets a proper
notification channel with a distinct vibration pattern.

**Step counter / calories burnt**
Real data from Apple Health / Google Health Connect via `capacitor-health`.
"Sync from Health" button added to the Health tab. Had to pin an older
plugin version (0.0.14) for compatibility with this project's Capacitor 6 —
upgrading to Capacitor 7+ later would unlock the more actively maintained
version.

**Food scanner**
Real barcode scanning (`@capacitor-mlkit/barcode-scanning`) + free nutrition
lookup via Open Food Facts (no API key needed). "📷 Scan Barcode" button in
the Log Meal screen pre-fills nutrition fields — always double-check against
the actual label, since it's a community database, not exhaustive.

**AI Assistant**
The real thing, not a mockup:
- `ai-backend/` — a small Vercel Edge Function that holds your Anthropic API
  key server-side (it genuinely cannot live inside the app safely). See
  `ai-backend/README.md` for the ~2 minute deploy.
- A real chat screen (More → AI Assistant) that sees your level, XP, and
  streaks as context.
- A "Today's Insight" card on the Dashboard — one AI tip per day, cached so
  it doesn't burn tokens on every app open.
- Settings → AI Assistant → paste your deployed backend URL.

**UI polish**
Haptic feedback on tab switches, smooth fade transition between screens.

**Required native permission strings added**
- iOS: camera usage description (scanner), Health share/update descriptions
- Android: `CAMERA` permission (the barcode plugin checks for this
  explicitly and won't work without it), and a `<queries>` block so the app
  can detect whether Health Connect is installed on Android 14+

## ❌ Removed
**App locker** — dropped per your request. For the record: this wasn't just
hard, it's something Apple doesn't allow third-party apps to do at all
(that capability is locked to approved parental-control apps only).

## ⚠️ Honest caveats — things I couldn't fully verify without a real device

- **Health Connect on Android**: I added the manifest `<queries>` block
  Google's docs require, but Health Connect's permission flow has some
  device/OS-version-specific quirks I can't test blind. If steps/calories
  sync doesn't work first try on Android, that's the most likely spot.
- **Barcode scanner UI**: the plugin opens its own native full-screen camera
  view — I haven't seen it render on an actual device from here.
- **AI backend**: code is correct and type-checked, but I haven't made a
  live call to it (that requires your actual API key, which I never have
  access to). Test it with a real message once deployed.

## Next step
Same as before: push this to your GitHub repo (or re-run
`scripts/deploy-and-build.sh`) to rebuild via GitHub Actions, then install
the fresh APK/IPA. Separately, deploy `ai-backend/` to Vercel and paste the
URL into Settings if you want the AI assistant live.
