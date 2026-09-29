# One-command deploy

## Setup (once, on your own machine)
1. Install GitHub CLI: https://cli.github.com
2. `gh auth login` — opens your browser, logs in securely.
   **Never paste a GitHub token into a chat with anyone, AI included** —
   this browser login is the safe way to authenticate.

## Run it
```bash
cd level-up
chmod +x scripts/deploy-and-build.sh
./scripts/deploy-and-build.sh          # creates repo "level-up"
# or: ./scripts/deploy-and-build.sh my-repo-name
```

This creates a public GitHub repo, pushes the project, triggers both the
Android and iOS workflows, waits for them, and downloads the results into
`./downloads/`:

- `downloads/android/LevelUp-debug-apk/app-debug.apk` — installs directly
- `downloads/ios/LevelUp-unsigned-ipa/LevelUp-unsigned.ipa` — needs
  signing via Sideloadly or AltStore (see `GITHUB_BUILD.md`)

Re-running the script after making code changes just pushes the update and
rebuilds — safe to run again anytime.
