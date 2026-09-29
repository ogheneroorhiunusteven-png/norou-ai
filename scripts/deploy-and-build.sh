#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Level Up — one-shot GitHub deploy + build + download
#
# What this does:
#   1. Creates a GitHub repo (public, so Actions is free/unlimited)
#   2. Pushes this project to it
#   3. Triggers both the Android and iOS build workflows
#   4. Waits for them to finish
#   5. Downloads the resulting APK and unsigned IPA into ./downloads
#
# What you need first (one-time, on YOUR machine — never share these
# with anyone, including in chat with an AI):
#   - GitHub CLI installed: https://cli.github.com
#   - Run:  gh auth login       (opens your browser, no token to paste)
# ============================================================

REPO_NAME="${1:-norou-ai}"

command -v gh >/dev/null 2>&1 || {
  echo "GitHub CLI not found. Install it first: https://cli.github.com"
  exit 1
}

gh auth status >/dev/null 2>&1 || {
  echo "Not logged in. Run: gh auth login"
  exit 1
}

echo "==> Initializing git repo (if not already)"
if [ ! -d .git ]; then
  git init -q
  git branch -M main
fi
git add -A
git commit -q -m "Level Up" --allow-empty

echo "==> Creating GitHub repo: $REPO_NAME (public, so Actions is free)"
if ! gh repo view "$REPO_NAME" >/dev/null 2>&1; then
  gh repo create "$REPO_NAME" --public --source=. --remote=origin --push
else
  echo "Repo already exists, just pushing."
  git remote add origin "$(gh repo view "$REPO_NAME" --json url -q .url).git" 2>/dev/null || true
  git push -u origin main
fi

echo "==> Triggering Android build"
gh workflow run android-build.yml --repo "$(gh repo view --json nameWithOwner -q .nameWithOwner)"

echo "==> Triggering iOS build (unsigned IPA)"
gh workflow run ios-build.yml --repo "$(gh repo view --json nameWithOwner -q .nameWithOwner)"

echo "==> Waiting a few seconds for the runs to register..."
sleep 10

REPO_SLUG="$(gh repo view --json nameWithOwner -q .nameWithOwner)"

echo "==> Watching Android build (this will take a few minutes)"
ANDROID_RUN_ID=$(gh run list --repo "$REPO_SLUG" --workflow=android-build.yml --limit 1 --json databaseId -q '.[0].databaseId')
gh run watch "$ANDROID_RUN_ID" --repo "$REPO_SLUG" --exit-status || echo "Android build failed — check the Actions tab."

echo "==> Watching iOS build (macOS runners are slower, ~5-10 min)"
IOS_RUN_ID=$(gh run list --repo "$REPO_SLUG" --workflow=ios-build.yml --limit 1 --json databaseId -q '.[0].databaseId')
gh run watch "$IOS_RUN_ID" --repo "$REPO_SLUG" --exit-status || echo "iOS build failed — check the Actions tab."

mkdir -p downloads
echo "==> Downloading artifacts into ./downloads"
gh run download "$ANDROID_RUN_ID" --repo "$REPO_SLUG" --dir downloads/android || true
gh run download "$IOS_RUN_ID" --repo "$REPO_SLUG" --dir downloads/ios || true

echo ""
echo "Done. Check ./downloads for:"
echo "  downloads/android/LevelUp-debug-apk/app-debug.apk   <- install directly, no signing needed"
echo "  downloads/ios/LevelUp-unsigned-ipa/LevelUp-unsigned.ipa   <- sign with Sideloadly or AltStore"
