# Norou AI updates

## Gemini backend
- Replaced the previous Anthropic backend with a server-side Google Gemini proxy.
- Default model: `gemini-3.8-flash`.
- API keys remain server-side in Vercel environment variables.
- Existing Offline Mode remains available when no backend is configured.
- Command Centre modes (Chat, Study, Code, Research, Creative) continue to route through the selected mode.

## v7 — Norou Autopilot & Agent Control
- Added universal agent command controls with permission centre.
- Added local agent history and undo snapshots.
- Added Autopilot planning and focus execution.
- Added explicit online/local AI status.
- Added hologram state language for listening/thinking/planning/executing/completion/offline.

## v8 — Agent reliability pass
- Fixed destructive-action permission routing so every `delete_*` action uses the `destructive` permission and asks first by default.
- Added a one-tap Undo Last Norou Change control to the command view.
- Removed stale Autopilot refresh state; the displayed plan now derives directly from current app state.
- Kept online/offline transparency and local permission controls.

### Verification note
The v8 source was checked from the complete v7 ZIP. A clean `npm ci` could not complete in this environment because the package install timed out, so a full Next.js/TypeScript build is not claimed as verified here. `tsc` consequently cannot run cleanly until dependencies are installed.

# Norou AI OS v9 — Model Hub & Multi-Provider Routing

- Added `src/lib/modelHub.ts` with Auto, Gemini, OpenAI-compatible, OpenRouter and Ollama profiles.
- Added server-side routing controls to the assistant request.
- Added Settings → Model Hub with Auto / Manual / Fallback routing.
- Added server-side OpenAI-compatible, OpenRouter and Ollama adapters. Provider keys never enter the app bundle.
- Kept local action execution and permissions unchanged; provider choice only changes how AI text is generated.
- Added safe provider discovery for Auto mode: Gemini → OpenRouter → OpenAI-compatible → Ollama when configured.
- Vision requests can use compatible multimodal providers when their backend is configured.
- Full `npm run typecheck` remains blocked in this environment because the supplied dependency tree is missing type-definition packages. A TypeScript transpile/syntax pass completed successfully across all 48 TS/TSX files.
