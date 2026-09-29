# Norou AI — Free Gemini Backend

This folder is the small server-side proxy used by Norou AI. It keeps your Gemini API key out of the iOS/Android/web app bundle.

## 1. Get a Gemini API key

Create one in Google AI Studio:

https://aistudio.google.com/app/apikey

Google's current Gemini API documentation says new accounts start on the Free Tier, subject to the model's free rate limits. The current `gemini-3.8-flash` model has free-tier input/output pricing listed by Google. Limits can change, so check Google's pricing/quota page if you hit a limit.

## 2. Deploy this backend

The backend is designed for Vercel's free hosting tier for personal-scale use.

```bash
cd ai-backend
npx vercel
```

Then in Vercel → Project → Settings → Environment Variables add:

- `GEMINI_API_KEY` = your Google AI Studio key
- `GEMINI_MODEL` = `gemini-3.8-flash` (optional; this is the default)
- `ALLOWED_WEB_ORIGIN` = your web app origin (optional)

Redeploy after adding the environment variable:

```bash
npx vercel --prod
```

Copy the Vercel deployment URL, for example:

`https://your-norou-ai-backend.vercel.app`

## 3. Connect Norou AI

Open Norou AI → Settings → AI Assistant → Backend URL and paste the Vercel URL.

Save it. Norou will use Gemini when the backend is available and keep its existing Offline Mode when no backend is configured or when you choose not to use AI.

## Security

- Never put `GEMINI_API_KEY` in the Next.js/Capacitor app code.
- Never prefix the key with `NEXT_PUBLIC_`.
- The key belongs only in Vercel Environment Variables.
- The app sends requests to `/api/assistant`; only the backend talks to Google.

## Current model

The backend defaults to `gemini-3.8-flash`, a current stable Gemini model. Change `GEMINI_MODEL` in Vercel if you want to switch models later.

## Gemini 3.8 Flash setup

Set these server-side environment variables in your deployment platform:

- `GEMINI_API_KEY` — your Google AI Studio API key
- `GEMINI_MODEL` — optional; defaults to `gemini-3.8-flash`

Never prefix the key with `NEXT_PUBLIC_` and never put it in the mobile app bundle. The API key is sent to Gemini only by this server-side route.
