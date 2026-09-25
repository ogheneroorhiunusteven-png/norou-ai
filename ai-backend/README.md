# Level Up AI Backend

A single endpoint (`/api/assistant`) that sits between the app and Anthropic's
API. This exists for one reason: **your API key can't live inside the app.**
Anyone could extract it from the installed app and run up charges on your
account. This backend holds the key instead — only this server ever talks to
Anthropic directly.

## Deploy it (free, ~2 minutes)

1. Get an Anthropic API key from **console.anthropic.com** (this is the
   pay-as-you-go Console account — separate from your claude.ai login).
2. Go to **vercel.com**, sign up (free tier is enough for personal use).
3. Push just this `ai-backend` folder to its own GitHub repo, OR use the
   Vercel CLI directly from here:
   ```bash
   cd ai-backend
   npx vercel
   ```
   Follow the prompts (link/create a project, accept defaults).
4. In the Vercel dashboard for this project: **Settings → Environment
   Variables** → add:
   - Key: `ANTHROPIC_API_KEY`
   - Value: your key from step 1
5. Redeploy (`npx vercel --prod`, or push again) so the env var takes effect.
6. Copy the deployment URL Vercel gives you, e.g.
   `https://level-up-ai-xyz.vercel.app`.

## Connect the app to it

Open the app → Settings → AI Assistant → paste that URL in. The app will
call `<your-url>/api/assistant` from then on.

## Cost

You're billed by Anthropic directly for tokens used, pay-as-you-go — Vercel's
free tier covers the hosting itself for personal-scale usage. A typical
short chat exchange or daily insight costs a small fraction of a cent.
Check usage/spending at console.anthropic.com anytime.

## Security notes

- The key only ever exists as a Vercel environment variable, never in the
  app's code or bundle.
- CORS is restricted to Capacitor's app origins (`capacitor://localhost`,
  `localhost`) — a random website can't call your endpoint and spend your
  budget. If you ever add a web version of the app, add its real origin to
  the `ALLOWED_ORIGINS` list in `api/assistant.ts`.
- There's a basic per-request message-count cap as a sanity check against
  a malfunctioning client, but no rate limiting beyond that. For a personal
  app this is normally fine; if you're worried about abuse, Vercel's own
  dashboard shows you real-time invocation counts so you'd notice anything
  unusual quickly.
