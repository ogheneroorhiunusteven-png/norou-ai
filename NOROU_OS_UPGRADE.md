# Norou OS Upgrade

This upgrade builds on the existing Norou AI app instead of replacing it.

## Added
- **Norou OS hub** under More → Norou OS.
- **Today Command** with an AI-assisted daily plan using current Norou context.
- **Recommended next actions** based on open-task priority.
- **Auto Task Breakdown** that turns large coursework/study/project outcomes into local tasks.
- **Goal Command** for quickly creating tracked goals.
- **Personal Analytics** summary for recent completion and lifetime XP.
- **Vision Mode** with image selection, preview, prompt and Gemini-backed analysis.
- Vision requests are sent only when the user presses Analyse and only to the configured backend.
- Existing local Memory, Tasks, Notes, Calendar, XP, streaks, analytics and notifications remain the source of truth.

## Existing capabilities retained
- Voice input/output in Command Centre.
- Chat, Study, Code, Research and Creative modes.
- Offline fallback that does not pretend to have performed web research.
- Local persistence through the existing storage layer.
- Capacitor iOS/Android project structure.

## Backend change
`ai-backend/api/assistant.ts` now accepts an optional `imageDataUrl` and sends it as Gemini inline image data. The existing text-only assistant flow is unchanged.

## Verification note
The source was audited after the changes. A full `npm run typecheck` / `npm run build` could not be completed in this environment because the uploaded project did not contain a usable installed dependency tree and dependency installation timed out. No claim of a successful production build is made.
