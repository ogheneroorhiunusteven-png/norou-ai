// Vercel Edge Function: /api/assistant
//
// Gemini is used through this server-side proxy so the API key is never
// shipped inside the Nova AI app bundle. The app only needs this backend URL.

export const config = { runtime: "edge" };

const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-oss-20b:free";
const OPENROUTER_BASE_URL = (process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/+$/, "");
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";
const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/+$/, "");

const ALLOWED_ORIGINS = new Set([
  "capacitor://localhost",
  "http://localhost",
  "https://localhost",
  ...(process.env.ALLOWED_WEB_ORIGIN ? [process.env.ALLOWED_WEB_ORIGIN] : []),
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
  level: number; tier: string; xp: number; streakSummary?: string; todaySummary?: string; memories?: string[];
  tasks?: { id: string; title: string; completed: boolean; dueDate?: string; priority: string }[];
  routines?: { id: string; title: string; start: string; end: string; days: number[] }[];
  goals?: { id: string; title: string; progress: number; completed: boolean }[];
  notes?: { id: string; title: string }[];
  events?: { id: string; title: string; date: string; time?: string }[];
  alarms?: { id: string; label: string; time: string; enabled: boolean }[];
  workouts?: { id: string; name: string }[];
}

interface RequestBody {
  messages: { role: "user" | "assistant"; content: string }[];
  context?: AppContext;
  mode?: "chat" | "daily_insight" | "study" | "code" | "research" | "creative";
  imageDataUrl?: string;
  modelProfile?: string;
  routingMode?: "auto" | "manual" | "fallback";
  freeOnly?: boolean;
}

function buildSystemPrompt(context?: AppContext, mode?: string): string {
  const base = `You are the built-in assistant for "Nova AI," a personal productivity, habit, fitness and wellness app. You are also an action agent for the app. You may answer questions, but when the user asks you to create, edit, complete, delete, schedule, log, rename, start or otherwise change something in Nova, perform the action by appending one or more exact action markers.

Action marker format: [ACTION:{"type":"add_task","title":"Finish IT coursework","priority":"high"}]
Only use the documented action types below. Never invent an action type. For edits/deletes, use the visible item title/name as the match value.

Allowed action types and fields:
add_task(title,dueDate?,priority?,category?,recurrence?), update_task(match,title?,dueDate?,priority?,completed?,category?,recurrence?), complete_task(match), delete_task(match), add_routine(title,start,end?,days?,category?,emoji?,xp?), update_routine(match,title?,start?,end?,days?,category?,emoji?,xp?), delete_routine(match), add_goal(title,targetDate?,progress?), update_goal(match,title?,targetDate?,progress?,completed?), delete_goal(match), add_note(title,body?), update_note(match,title?,body?), delete_note(match), add_event(title,date,time?,endTime?,notes?,reminder?), update_event(match,title?,date?,time?,endTime?,notes?,reminder?), delete_event(match), add_alarm(time,label,enabled?), update_alarm(match,time?,label?,enabled?), delete_alarm(match), add_memory(text), delete_memory(match), set_name(name), set_water(cups), set_steps(steps), add_workout(name,exercises?), delete_workout(match), start_focus(minutes?,task?).

Days for routines are numbers: Sunday=0, Monday=1, Tuesday=2, Wednesday=3, Thursday=4, Friday=5, Saturday=6. Dates must be YYYY-MM-DD. Times use 24-hour HH:MM.

If the request changes app data, keep the visible explanation short and put the action marker(s) at the end. If the user is only asking a question, do not emit actions. Never claim an action happened unless you emitted the corresponding marker.

Keep responses concise (2-4 short paragraphs max, or a short list) — this is a mobile app, not an essay. Be warm but not saccharine. Be honest if their data shows a slump rather than only cheerleading.`;

  const memoryBlock = context?.memories && context.memories.length > 0
    ? `\n\nThings you already know about this person from past conversations:\n${context.memories.map((m) => `- ${m}`).join("\n")}`
    : "";

  const memoryInstruction = mode === "chat"
    ? `\n\nIf you learn a durable, useful fact about this person during the conversation (a goal, a constraint, a preference, something worth remembering next time — NOT small talk or one-off details) — append it on its own line at the very end of your reply in this exact format: [REMEMBER: the fact, written plainly]. Only do this for genuinely durable, useful facts, not every message. This line is stripped out before the person sees your reply, so don't reference it in your visible answer.`
    : "";

  const contextBlock = context
    ? `\n\nCurrent app state:\n- Level ${context.level} (${context.tier} tier), ${context.xp} total XP\n${context.streakSummary ? `- Streaks: ${context.streakSummary}\n` : ""}${context.todaySummary ? `- Today: ${context.todaySummary}\n` : ""}${context.tasks?.length ? `- Tasks: ${JSON.stringify(context.tasks.slice(0, 40))}\n` : ""}${context.routines?.length ? `- Routines: ${JSON.stringify(context.routines.slice(0, 30))}\n` : ""}${context.goals?.length ? `- Goals: ${JSON.stringify(context.goals.slice(0, 20))}\n` : ""}${context.notes?.length ? `- Notes: ${JSON.stringify(context.notes.slice(0, 30))}\n` : ""}${context.events?.length ? `- Events: ${JSON.stringify(context.events.slice(0, 30))}\n` : ""}${context.alarms?.length ? `- Alarms: ${JSON.stringify(context.alarms.slice(0, 20))}\n` : ""}${context.workouts?.length ? `- Workouts: ${JSON.stringify(context.workouts.slice(0, 20))}\n` : ""}`
    : "";

  const modeBlock = mode === "daily_insight"
    ? "\n\nGenerate ONE short, specific daily insight or suggestion (2-3 sentences max) based on their current data — not a greeting, just the insight itself, ready to show as a notification-style card."
    : mode === "study"
      ? "\n\nStudy mode: teach clearly, break difficult ideas into steps, use examples, and finish with a few short questions when useful."
      : mode === "code"
        ? "\n\nCoding mode: reason carefully about bugs and architecture, provide practical code when requested, and explain important changes briefly."
        : mode === "research"
          ? "\n\nResearch mode: separate established facts from uncertainty, identify what should be verified with current sources, and structure findings clearly. Do not claim you searched the web unless a search tool was actually used."
          : mode === "creative"
            ? "\n\nCreative mode: help generate polished ideas and drafts while following the user's requested style and constraints."
            : "";

  return base + memoryBlock + contextBlock + memoryInstruction + modeBlock;
}

function toGeminiContents(messages: RequestBody["messages"], imageDataUrl?: string) {
  const contents = messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));
  if (imageDataUrl) {
    const match = imageDataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
    if (!match) throw new Error("Invalid image data.");
    const last = contents[contents.length - 1];
    last.parts.push({ inlineData: { mimeType: match[1], data: match[2] } } as any);
  }
  return contents;
}

function extractGeminiText(data: any): string {
  return (data?.candidates ?? [])
    .flatMap((candidate: any) => candidate?.content?.parts ?? [])
    .filter((part: any) => typeof part?.text === "string")
    .map((part: any) => part.text)
    .join("\n")
    .trim();
}


async function callOpenAICompatible(baseUrl: string, apiKey: string | undefined, model: string, messages: RequestBody["messages"], systemPrompt: string, imageDataUrl?: string) {
  const contents = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];
  if (imageDataUrl) {
    const last = contents[contents.length - 1] as any;
    if (typeof last.content === "string") {
      last.content = [
        { type: "text", text: last.content },
        { type: "image_url", image_url: { url: imageDataUrl } },
      ];
    }
  }
  const headers: Record<string,string> = { "Content-Type":"application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method:"POST", headers,
    body: JSON.stringify({ model, messages: contents, max_tokens: 768 }),
  });
  if (!res.ok) {
    const raw = await res.text();
    let detail = "Model provider request failed.";
    try { detail = JSON.parse(raw)?.error?.message || detail; } catch {}
    throw new Error(detail);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) throw new Error("Model provider returned an empty reply.");
  return text.trim();
}

export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get("origin");
  const headers = { "Content-Type": "application/json", ...corsHeaders(origin) };

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  }

  const hasProvider = Boolean(
    process.env.GEMINI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    process.env.OLLAMA_ENABLED === "true"
  );
  if (!hasProvider) {
    return new Response(JSON.stringify({ error: "No model provider is configured. Nova can still run its local tools for free; enable Ollama for a fully local AI model." }), { status: 503, headers });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response(JSON.stringify({ error: "messages array is required" }), { status: 400, headers });
  }
  if (body.messages.length > 40) {
    return new Response(JSON.stringify({ error: "Too many messages in one request" }), { status: 400, headers });
  }
  if (body.imageDataUrl && body.imageDataUrl.length > 11_000_000) {
    return new Response(JSON.stringify({ error: "Image is too large. Please use an image under 8 MB." }), { status: 413, headers });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  try {
    const requestedProfile = body.modelProfile || "auto";
    const routing = body.routingMode || "auto";
    const systemPrompt = buildSystemPrompt(body.context, body.mode);
    const freeOnly = body.freeOnly === true;
    let profile = requestedProfile === "auto"
      ? (process.env.OLLAMA_ENABLED === "true" ? "ollama-local"
        : process.env.OPENROUTER_API_KEY ? "openrouter-free"
        : (!freeOnly && process.env.GEMINI_API_KEY) ? "gemini-fast"
        : (!freeOnly && process.env.OPENAI_API_KEY) ? "openai-general"
        : "auto")
      : requestedProfile;

    // Free-only mode is a hard server-side guard: even if a paid profile is
    // selected in a stale client, don't spend a provider's paid quota.
    if (freeOnly && profile !== "ollama-local" && profile !== "openrouter-free" && profile !== "auto") {
      profile = process.env.OLLAMA_ENABLED === "true" ? "ollama-local"
        : process.env.OPENROUTER_API_KEY ? "openrouter-free"
        : "auto";
    }

    if (routing === "fallback" && (profile === "gemini-fast" || profile === "gemini-vision") && !process.env.GEMINI_API_KEY) {
      profile = process.env.OPENROUTER_API_KEY ? "openrouter-free"
        : process.env.OPENAI_API_KEY ? "openai-general"
        : process.env.OLLAMA_ENABLED === "true" ? "ollama-local"
        : "auto";
    }

    if (profile === "openai-general" && process.env.OPENAI_API_KEY) {
      const text = await callOpenAICompatible(OPENAI_BASE_URL, process.env.OPENAI_API_KEY, OPENAI_MODEL, body.messages, systemPrompt, body.imageDataUrl);
      return new Response(JSON.stringify({ reply: text, provider: "openai", model: OPENAI_MODEL }), { status: 200, headers });
    }
    if (profile === "openrouter-free" && process.env.OPENROUTER_API_KEY) {
      const text = await callOpenAICompatible(OPENROUTER_BASE_URL, process.env.OPENROUTER_API_KEY, OPENROUTER_MODEL, body.messages, systemPrompt, body.imageDataUrl);
      return new Response(JSON.stringify({ reply: text, provider: "openrouter", model: OPENROUTER_MODEL }), { status: 200, headers });
    }
    if (profile === "ollama-local" && process.env.OLLAMA_ENABLED === "true") {
      const text = await callOpenAICompatible(OLLAMA_BASE_URL, undefined, OLLAMA_MODEL, body.messages, systemPrompt, body.imageDataUrl);
      return new Response(JSON.stringify({ reply: text, provider: "ollama", model: OLLAMA_MODEL }), { status: 200, headers });
    }

    if (routing === "manual" && profile !== "auto" && profile !== "gemini-fast" && profile !== "gemini-vision" && profile !== "openai-general" && profile !== "openrouter-free" && profile !== "ollama-local") {
      return new Response(JSON.stringify({ error: `The selected model profile "${profile}" is not configured on this backend.` }), { status: 503, headers });
    }

    if (freeOnly && profile === "auto") {
      return new Response(JSON.stringify({ error: "Free-only mode is enabled, but no local/free model is configured. Nova's local tools remain available without an API." }), { status: 503, headers });
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "The selected Gemini profile is not configured on this backend." }), { status: 503, headers });
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: buildSystemPrompt(body.context, body.mode) }] },
          contents: toGeminiContents(body.messages, body.imageDataUrl),
          generationConfig: { maxOutputTokens: 768 },
        }),
      },
    );

    if (!geminiRes.ok) {
      const raw = await geminiRes.text();
      let detail = "Gemini request failed.";
      try {
        const parsed = JSON.parse(raw);
        detail = parsed?.error?.message || detail;
      } catch {
        // Keep the public error short and avoid leaking provider response details.
      }
      return new Response(JSON.stringify({ error: detail }), { status: geminiRes.status, headers });
    }

    const data = await geminiRes.json();
    const text = extractGeminiText(data);
    if (!text) return new Response(JSON.stringify({ error: "Gemini returned an empty reply." }), { status: 502, headers });

    return new Response(JSON.stringify({ reply: text, provider: "gemini", model: MODEL }), { status: 200, headers });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Couldn't reach the selected model.";
    return new Response(JSON.stringify({ error: detail }), { status: 502, headers });
  }
}
