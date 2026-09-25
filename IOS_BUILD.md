# Level Up — Building the iOS App (.ipa)

Your Next.js app has been converted into a **Capacitor** project. Capacitor
wraps the web app in a real native iOS shell, so it installs and behaves
like a normal App Store app.

## What was changed

| Change | Why |
|---|---|
| `next.config.ts` → `output: "export"` | Produces a static `./out` folder that gets bundled into the native app. A native app has no Node server to run. |
| Deleted `src/db/`, `src/app/api/`, `drizzle.config.json` | Leftover Replit Postgres template scaffolding. Your app never used it — all data lives in `localStorage`. Removing it is what makes static export possible. |
| Removed `pg` + `drizzle-orm` deps | Same reason as above. |
| Added `capacitor.config.ts` | Defines the app name, bundle ID, and iOS settings. |
| Added Capacitor plugins | `local-notifications` (your Settings screen's notification toggles can now fire real iOS notifications), `haptics`, `status-bar`, `app`, `preferences`. |
| `viewportFit: "cover"` + safe-area CSS | Keeps content clear of the notch / Dynamic Island and home indicator. |
| Native-feel CSS | Disables text selection, long-press callouts, and rubber-band scrolling. |

---

## What you need to actually produce an .ipa

**This part cannot be done on Linux, Windows, or Replit.** Apple's build
and signing toolchain is macOS-only. You need:

1. **A Mac** with **Xcode** installed (free from the Mac App Store).
2. **CocoaPods**: `sudo gem install cocoapods`
3. **An Apple ID.**
   - **Free Apple ID** — can build and install onto *your own* iPhone,
     but the app expires after **7 days** and must be reinstalled.
     Fine for personal use and testing.
   - **Apple Developer Program ($99/year)** — required for a
     non-expiring build, TestFlight, or App Store release.

### No Mac? Use GitHub Actions
**See `GITHUB_BUILD.md`** — this repo includes ready-made workflows that
build the app on GitHub's free macOS runners. That's the recommended path
if you don't own a Mac.

Other options:
- **Cloud Mac rental** — MacStadium, MacinCloud, or Scaleway offer
  hourly/monthly macOS machines you can remote into.
- **Codemagic / Bitrise** — alternative CI services with free tiers.
- **Borrow a Mac** for an hour — genuinely enough time for a first build.

---

## Build steps (on a Mac)

```bash
# 1. Install dependencies
npm install

# 2. Add the native iOS project (only needed once)
npx cap add ios

# 3. Build the web app and copy it into the native project
npm run ios:sync

# 4. Open in Xcode
npm run ios:open
```

Then in Xcode:

1. Select the **App** target → **Signing & Capabilities** tab.
2. Check **Automatically manage signing**.
3. Under **Team**, select your Apple ID (add it via
   Xcode → Settings → Accounts if it's not listed).
4. Change the **Bundle Identifier** to something globally unique —
   e.g. `com.yourname.levelup`. Also update `appId` in
   `capacitor.config.ts` to match.

### To run on your own iPhone
Plug the phone in, select it as the run destination, press **▶︎ Run**.
On the phone: Settings → General → VPN & Device Management → trust your
developer certificate.

### To produce an actual .ipa file
1. Set the run destination to **Any iOS Device (arm64)**.
2. Menu: **Product → Archive**.
3. When the Organizer opens: **Distribute App**.
   - **TestFlight & App Store** → for release or beta testers.
   - **Ad Hoc** / **Development** → exports a `.ipa` file to disk for
     devices registered to your account.
   - **Custom → Export** → also gives you a `.ipa` on disk.

---

## After any code change

Re-run the sync so the native project picks up your changes:

```bash
npm run ios:sync
```

Then rebuild in Xcode. You do **not** need to run `npx cap add ios` again.

---

## Recommended next steps

**App icon & splash screen** — Capacitor apps ship with placeholder
assets. Generate real ones:

```bash
npm install -D @capacitor/assets
# Put a 1024x1024 icon.png and 2732x2732 splash.png in ./assets
npx capacitor-assets generate --ios
```

**Consider migrating storage** — `localStorage` works inside the iOS web
view, but iOS can clear it under storage pressure. `@capacitor/preferences`
(already installed) writes to native storage instead and is safer for
long-term data. Your `src/lib/storage.ts` is small and well-isolated, so
this is a contained change.

---

## Android — already set up, and free

The `android/` folder is already generated and ready. Android needs no Mac
and no paid developer account, so this is the fastest way to get the app
onto a real phone:

```bash
npm install
npm run android:sync
npx cap open android    # opens Android Studio
```

Then in Android Studio: **Build → Build Bundle(s)/APK(s) → Build APK(s)**.
Copy the resulting `.apk` to your phone and install it (you'll need to
allow "install from unknown sources").

To run directly on a plugged-in phone, just press ▶︎ Run.
