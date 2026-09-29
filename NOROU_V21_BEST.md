# Norou v21 — Product Polish Release

This release is a broad usability pass focused on making Norou easier and safer to use day-to-day while preserving the original dark/purple identity.

## Product improvements
- Command Centre now keeps an in-session conversation thread instead of replacing the previous response.
- Voice chat has an explicit on/off state and a Stop Voice control.
- Speech playback reports and clears its speaking state reliably.
- Command Centre retains the latest screen across launches on the same device.
- A top-level UI error boundary gives the user a recoverable reload screen instead of a blank app if a component crashes.
- Buttons, links, selects, and important controls use touch-friendly minimum targets and visible keyboard focus.
- Reduced-motion preferences are respected globally.
- Small-phone Command Centre layout now scrolls horizontally for the five AI modes instead of squeezing them.
- New Norou app icon is included in web, iOS, and Android assets.
- Existing Free/Local mode, permissions, undo/history, Money, Fuel, Wellness, Plan, Hub, and Exercise Coach features are preserved.

## Verification
- All 48 TS/TSX source files were syntax-transpiled successfully with TypeScript's transpileModule.
- A full typecheck could not complete because the dependency installation timed out and left an incomplete node_modules tree; no new type errors were observed in the changed files.
- Production build is not claimed without a complete dependency install.
