import { Preferences } from "@capacitor/preferences";
import type { AppState } from "./types";
import { levelInfo } from "./xp";
import { dayProgress } from "./logic";
import { extractActions, parseLocalCommand, type NorouAction } from "./actions";
import { getFreeOnly, getModelProfile, getRoutingMode } from "./modelHub";

const BACKEND_URL_KEY = "assistant_backend_url";

export async function getBackendUrl(): Promise<string | null> {
  try {
    const res = await Preferences.get({ key: BACKEND_URL_KEY });
    return res.value || null;
  } catch {
    return null;
  }
}

export async function setBackendUrl(url: string): Promise<void> {
  const trimmed = url.trim().replace(/\/+$/, ""); // strip trailing slash
  await Preferences.set({ key: BACKEND_URL_KEY, value: trimmed });
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function buildContext(state: AppState) {
  const li = levelInfo(state.xp);
  const dp = dayProgress(state);
  return {
    level: li.level,
    tier: "N/A", // no tier system in this build
    xp: state.xp,
    streakSummary: `current ${state.streak.current}-day streak, longest ${state.streak.longest} days`,
    todaySummary: `${dp.completed}/${dp.total} scheduled activities completed so far today`,
    memories: state.memories.map((m) => m.text),
    tasks: state.tasks.slice(0, 40).map(t => ({ id: t.id, title: t.title, completed: t.completed, dueDate: t.dueDate, priority: t.priority })),
    routines: state.activities.slice(0, 30).map(a => ({ id: a.id, title: a.title, start: a.start, end: a.end, days: a.days })),
    goals: state.goals.slice(0, 20).map(g => ({ id: g.id, title: g.title, progress: g.progress, completed: g.completed })),
    notes: state.notes.slice(0, 30).map(n => ({ id: n.id, title: n.title })),
    events: state.calendarEvents.slice(0, 30).map(e => ({ id: e.id, title: e.title, date: e.date, time: e.time })),
    alarms: state.alarms.slice(0, 20).map(a => ({ id: a.id, label: a.label, time: a.time, enabled: a.enabled })),
    workouts: state.workouts.slice(0, 20).map(w => ({ id: w.id, name: w.name })),
  };
}

/** Errors are thrown with a human-readable message — callers should catch and display them. */
async function callBackend(messages: ChatMessage[], state: AppState, mode: "chat" | "daily_insight" | "study" | "code" | "research" | "creative" = "chat"): Promise<string> {
  const url = await getBackendUrl();
  if (!url) {
    throw new Error("No AI backend configured. Add your backend URL in Settings → AI Assistant.");
  }

  let res: Response;
  try {
    res = await fetch(`${url}/api/assistant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, context: buildContext(state), mode, modelProfile: await getModelProfile(), routingMode: await getRoutingMode(), freeOnly: await getFreeOnly() }),
    });
  } catch {
    throw new Error("Couldn't reach the AI backend. Check the URL in Settings and your connection.");
  }

  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j.error ? `: ${j.error}` : "";
    } catch {
      /* ignore */
    }
    throw new Error(`AI backend returned an error${detail}`);
  }

  const data = await res.json();
  if (!data.reply) throw new Error("AI backend returned an empty reply.");
  return data.reply as string;
}

export interface ChatReply {
  text: string;
  newMemories: string[];
  actions: NorouAction[];
}

const REMEMBER_PATTERN = /\[REMEMBER:\s*([^\]]+)\]/gi;

/** Pulls out any [REMEMBER: ...] markers the model included (per the system
 *  prompt's instructions) and returns the display text separately from the
 *  facts to persist. The marker syntax is never shown to the user. */
function extractMemories(raw: string): ChatReply {
  const actionResult = extractActions(raw);
  const newMemories: string[] = [];
  const text = actionResult.text.replace(REMEMBER_PATTERN, (_, fact: string) => {
    newMemories.push(fact.trim());
    return "";
  }).trim();
  return { text, newMemories, actions: actionResult.actions };
}

export type AssistantMode = "chat" | "study" | "code" | "research" | "creative";

/** Local fallback used when no AI backend/API is configured. It deliberately stays
 * deterministic and never pretends that it performed web research or called an AI model. */
function localReply(message: string, state: AppState, mode: AssistantMode): ChatReply {
  const text = message.trim();
  const lower = text.toLowerCase();
  const li = levelInfo(state.xp);
  const dp = dayProgress(state);
  const openTasks = state.tasks.filter((t) => !t.completed);
  if (/^(hi|hello|hey|yo|hiya)\b/.test(lower)) {
    return { text: `Hey${state.profile.name ? ` ${state.profile.name}` : ""}. I'm Nova's offline mode. I can still help you organise tasks, notes and your day without an API key.`, newMemories: [], actions: [] };
  }
  if (lower.includes('status') || lower.includes('progress') || lower.includes('level')) {
    return { text: `You're level ${li.level} with ${state.xp} XP. Today you've completed ${dp.completed}/${dp.total} scheduled activities, and you have ${openTasks.length} open task${openTasks.length === 1 ? '' : 's'}.`, newMemories: [], actions: [] };
  }
  if (lower.includes('plan my day') || lower.includes('plan my') || lower.includes('what should i do')) {
    const next = openTasks.slice(0, 3).map((t, i) => `${i + 1}. ${t.title}`).join('\n');
    return { text: `Offline plan\n\n1. Finish your highest-priority scheduled activity.\n2. ${next || 'Choose one important task from your goals.'}\n3. Take a short break, then continue with the next task.\n\nI can create the structure locally, but AI-generated planning needs an API connection.`, newMemories: [], actions: [] };
  }
  if (lower.includes('focus') || lower.includes('pomodoro')) {
    return { text: `Focus session\n\n25 minutes: work on ${openTasks[0]?.title || 'your most important task'}.\n5 minutes: take a break.\nThen decide whether to repeat or move to the next task.`, newMemories: [], actions: [] };
  }
  if (mode === 'study') return { text: `Study mode is available offline. Pick one specific topic and work on it for 25 minutes, then test yourself without looking at your notes. Connect an AI backend when you want Nova to explain or quiz you dynamically.`, newMemories: [], actions: [] };
  if (mode === 'code') return { text: `Coding mode is available offline for project organisation, but code generation and debugging require an AI backend. You can still use Nova's notes, tasks and focus tools without one.`, newMemories: [], actions: [] };
  if (mode === 'research') return { text: `Research mode needs an internet/search provider to verify current information. Offline mode won't invent sources or pretend it searched the web.`, newMemories: [], actions: [] };
  if (mode === 'creative') return { text: `Creative mode is available offline for organising ideas. Connect an AI backend when you want Nova to generate substantial creative content.`, newMemories: [], actions: [] };
  return { text: `I'm running in offline mode, so I don't have an AI model connected right now. I can still help with your local Nova data, tasks, notes, focus sessions and progress. Add a backend URL in Settings → AI Assistant to enable full AI responses.`, newMemories: [], actions: [] };
}


export async function sendVisionMessage(imageDataUrl: string, prompt: string, state: AppState): Promise<ChatReply> {
  const url = await getBackendUrl();
  if (!url) {
    throw new Error("Vision Mode needs an AI backend. Add your backend URL in Settings → AI Assistant.");
  }
  if (!imageDataUrl.startsWith("data:image/")) throw new Error("Unsupported image format.");
  const res = await fetch(`${url}/api/assistant`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: prompt || "Explain this image." }],
      context: buildContext(state),
      mode: "chat",
      modelProfile: await getModelProfile(),
      routingMode: await getRoutingMode(),
      freeOnly: await getFreeOnly(),
      imageDataUrl,
    }),
  });
  if (!res.ok) {
    let detail = "";
    try { const j = await res.json(); detail = j.error ? `: ${j.error}` : ""; } catch {}
    throw new Error(`Vision backend returned an error${detail}`);
  }
  const data = await res.json();
  if (!data.reply) throw new Error("Vision backend returned an empty reply.");
  return extractMemories(data.reply);
}

export async function sendChatMessage(
  history: ChatMessage[],
  state: AppState,
  mode: AssistantMode = "chat",
): Promise<ChatReply> {
  const latest = history[history.length - 1]?.content ?? "";
  const localCommand = mode === "chat" ? parseLocalCommand(latest, state) : null;
  if (localCommand) return { text: localCommand.reply, newMemories: [], actions: localCommand.actions };
  const url = await getBackendUrl();
  const freeOnly = await getFreeOnly();
  const selectedProfile = await getModelProfile();
  if (!url || (freeOnly && selectedProfile !== "ollama-local" && selectedProfile !== "openrouter-free" && selectedProfile !== "auto")) {
    return localReply(latest, state, mode);
  }
  try {
    const raw = await callBackend(history, state, mode);
    return extractMemories(raw);
  } catch (error) {
    const routing = await getRoutingMode();
    // Auto/fallback should degrade gracefully instead of making the local
    // agent unusable when a configured provider is offline or rate-limited.
    if (routing === "auto" || routing === "fallback") {
      const fallback = localReply(latest, state, mode);
      return {
        ...fallback,
        text: `${fallback.text}\n\nI couldn't reach the configured AI provider, so I stayed in local mode.`,
      };
    }
    throw error;
  }
}

const DAILY_INSIGHT_CACHE_KEY = "assistant_daily_insight";

/** One AI-generated insight per calendar day, cached so reopening the app
 *  doesn't re-spend tokens on the same day. */
export async function getDailyInsight(state: AppState): Promise<string | null> {
  const todayKey = new Date().toDateString();
  try {
    const cached = await Preferences.get({ key: DAILY_INSIGHT_CACHE_KEY });
    if (cached.value) {
      const parsed = JSON.parse(cached.value) as { date: string; text: string };
      if (parsed.date === todayKey) return parsed.text;
    }
  } catch {
    /* ignore, fall through to regenerate */
  }

  const url = await getBackendUrl();
  if (!url) return null; // no backend configured — caller should just hide the card

  try {
    const text = await callBackend(
      [{ role: "user", content: "Give me today's insight." }],
      state,
      "daily_insight",
    );
    await Preferences.set({
      key: DAILY_INSIGHT_CACHE_KEY,
      value: JSON.stringify({ date: todayKey, text }),
    });
    return text;
  } catch {
    return null; // fail silently for the passive dashboard card — chat screen shows real errors
  }
}
