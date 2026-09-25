// Vercel Edge Function: /api/assistant
//
// This is the ONLY place the Anthropic API key is ever used. The app
// (running on someone's phone) calls THIS endpoint, never Anthropic
// directly — that's what keeps the key from being extractable out of
// the app bundle.
//
// Deploy this folder to Vercel, set ANTHROPIC_API_KEY as an environment
// variable there (never in the app code), and point the app's Settings
// screen at the resulting https://your-project.vercel.app URL.

export const config = { runtime: "edge" };

const ANTHROPIC_VERSION = "2023-06-01";
// Claude Sonnet 5. If this backend is set up long after this code was
// written, double-check the current model string at
// https://docs.claude.com/en/docs/about-claude/models before deploying.
const MODEL = "claude-sonnet-5";

// Restrict which origins can call this. Capacitor apps on iOS/Android make
// requests from a "capacitor://localhost" or "http://localhost" origin
// depending on platform — both are allowed below. Add your own web origin
// here too if you ever host a web version.
const ALLOWED_ORIGINS = new Set([
  "capacitor://localhost",
  "http://localhost",
  "https://localhost",
]);

function corsHeaders(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "capacitor://localhost";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

interface AppContext {
  level: number;
  tier: string;
  xp: number;
  streakSummary?: string;
  todaySummary?: string;
  memories?: string[];
}

interface RequestBody {
  messages: { role: "user" | "assistant"; content: string }[];
  context?: AppContext;
  mode?: "chat" | "daily_insight";
}

function buildSystemPrompt(context?: AppContext, mode?: string): string {
  const base = `You are the built-in assistant for "Level Up," a personal habit and wellness app. You act as a supportive, direct personal advisor — not a generic chatbot. You know the person's current progress in the app and give specific, actionable suggestions grounded in that data, not generic self-help platitudes.

Keep responses concise (2-4 short paragraphs max, or a short list) — this is a mobile app, not an essay. Be warm but not saccharine. Be honest if their data shows a slump rather than only cheerleading.`;

  const memoryBlock =
    context?.memories && context.memories.length > 0
      ? `\n\nThings you already know about this person from past conversations:\n${context.memories.map((m) => `- ${m}`).join("\n")}`
      : "";

  const memoryInstruction =
    mode === "chat"
      ? `\n\nIf you learn a durable, useful fact about this person during the conversation (a goal, a constraint, a preference, something worth remembering next time — NOT small talk or one-off details) — append it on its own line at the very end of your reply in this exact format: [REMEMBER: the fact, written plainly]. Only do this for genuinely durable, useful facts, not every message. This line is stripped out before the person sees your reply, so don't reference it in your visible answer.`
      : "";

  const contextBlock = context
    ? `\n\nCurrent app state:\n- Level ${context.level} (${context.tier} tier), ${context.xp} total XP\n${context.streakSummary ? `- Streaks: ${context.streakSummary}\n` : ""}${context.todaySummary ? `- Today: ${context.todaySummary}\n` : ""}`
    : "";

  const modeBlock =
    mode === "daily_insight"
      ? "\n\nGenerate ONE short, specific daily insight or suggestion (2-3 sentences max) based on their current data — not a greeting, just the insight itself, ready to show as a notification-style card."
      : "";

  return base + memoryBlock + contextBlock + memoryInstruction + modeBlock;
}

export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Server misconfigured: ANTHROPIC_API_KEY not set" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
    });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
    });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response(JSON.stringify({ error: "messages array is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
    });
  }
  // Basic sanity cap so one runaway client can't rack up a huge bill in one call.
  if (body.messages.length > 40) {
    return new Response(JSON.stringify({ error: "Too many messages in one request" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
    });
  }

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 512,
        system: buildSystemPrompt(body.context, body.mode),
        messages: body.messages,
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      return new Response(JSON.stringify({ error: "Upstream error", detail: errText }), {
        status: anthropicRes.status,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }

    const data = await anthropicRes.json();
    const text = (data.content ?? [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("\n");

    return new Response(JSON.stringify({ reply: text }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Request failed", detail: String(err) }), {
      status: 502,
      headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
    });
  }
}
