# Building Level Up with GitHub Actions (no Mac required)

GitHub gives you free **macOS runners**, which means GitHub can run Xcode
for you and hand back a built app. This is the only way to produce an iOS
build without owning or renting a Mac.

Two workflows are included:

| Workflow | Output | Needs Apple account? |
|---|---|---|
| `.github/workflows/ios-build.yml` | `LevelUp-unsigned.ipa` | No (signing happens later, on your PC) |
| `.github/workflows/android-build.yml` | `app-debug.apk` | No — installs directly |

---

## Step 1 — Push this project to GitHub

```bash
cd level-up
git init
git add .
git commit -m "Level Up app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/norou-ai.git
git push -u origin main
```

> **Make the repo public if you can.** GitHub Actions is **completely free
> and unlimited on public repos**. On private repos you get 2,000 free
> minutes/month, but macOS runners burn those at a **10x multiplier** — so
> 2,000 minutes becomes effectively ~200 minutes of iOS builds. Each iOS
> build takes roughly 5–10 minutes, so a private repo gives you about
> 20–40 iOS builds per month. Android builds run on Linux at 1x, so
> they're much cheaper either way.

## Step 2 — Run the build

The workflows run automatically on every push to `main`. To run one
manually:

1. Go to your repo on GitHub → **Actions** tab
2. Pick **Build iOS IPA (unsigned)** (or the Android one) in the sidebar
3. Click **Run workflow** → **Run workflow**
4. Wait for the green checkmark (~5–10 min for iOS, ~3–5 min for Android)

## Step 3 — Download the result

Click the finished workflow run → scroll to **Artifacts** at the bottom →
download `LevelUp-unsigned-ipa` (or `LevelUp-debug-apk`). It arrives as a
`.zip`; unzip it to get the actual `.ipa` / `.apk`.

---

## Step 4 (iOS only) — Sign and install the IPA

The IPA from CI is **unsigned**, so iOS won't install it as-is. You sign
it on your own computer with your free Apple ID. This takes about five
minutes.

### Option A — Sideloadly (Windows or Mac, easiest)
1. Download from [sideloadly.io](https://sideloadly.io)
2. Plug your iPhone in via USB
3. Drag the `.ipa` into Sideloadly
4. Enter your Apple ID (a free one works)
5. Click **Start**
6. On the phone: **Settings → General → VPN & Device Management** → trust
   your developer certificate

### Option B — AltStore
[altstore.io](https://altstore.io) — installs an on-device app store that
can also **auto-refresh** your apps, which solves the expiry problem below
as long as your computer is on the same Wi-Fi.

### The 7-day expiry
Apps signed with a **free Apple ID expire after 7 days** and must be
re-signed. This is an Apple restriction, not something the build process
can avoid. Your options:
- Re-run Sideloadly once a week (takes a minute)
- Use AltStore's auto-refresh
- Pay the **$99/year Apple Developer Program** for 1-year signing,
  TestFlight, and App Store distribution

---

## Why Android is the easier path

The Android workflow produces a **debug-signed APK** that installs
directly with no signing step, no Apple ID, and **no expiry**. If you just
want the app on a phone to use and show people, start there.

To install: copy the `.apk` to your phone, tap it, and allow "install from
unknown sources" when prompted.

---

## If the iOS build fails

The most common causes, in order:

1. **Scheme name mismatch.** Capacitor names the scheme `App` by default.
   The workflow logs `xcodebuild -list` before building — check the
   scheme name in that output and update the `-scheme` flag if it differs.
2. **CocoaPods failure.** Usually a transient network issue; re-run the
   workflow.
3. **Xcode version drift.** `macos-14` ships a specific Xcode. If Apple's
   tooling moves on, try switching `runs-on:` to `macos-15`.
4. **Capacitor plugin needs a permission entry.** Local notifications may
   need `NSUserNotificationsUsageDescription` in `ios/App/App/Info.plist`.
   If you hit this, commit the `ios/` folder (run `npx cap add ios` locally
   or let CI generate it once and copy it out) so you can edit the plist
   directly.

Note that these workflows are written correctly but haven't been executed
against real runners from here, so budget a little time for a first-run
fix or two — that's normal for any CI setup.
