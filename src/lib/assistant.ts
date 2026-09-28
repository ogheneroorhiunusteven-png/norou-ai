import { Preferences } from "@capacitor/preferences";
import type { AppState } from "./types";
import { levelInfo } from "./xp";
import { dayProgress } from "./logic";

const BACKEND_URL_KEY = "assistant_backend_url";
const DEFAULT_BACKEND_URL = "https://ai-backend-rust-omega.vercel.app";

export async function getBackendUrl(): Promise<string | null> {
  try {
    const res = await Preferences.get({ key: BACKEND_URL_KEY });
    return res.value || DEFAULT_BACKEND_URL;
  } catch {
    return DEFAULT_BACKEND_URL;
  }
}

export async function setBackendUrl(url: string): Promise<void> {
  const trimmed = url.trim().replace(/\/+$/, "");
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
    tier: "N/A",
    xp: state.xp,
    streakSummary: `current ${state.streak.current}-day streak, longest ${state.streak.longest} days`,
    todaySummary: `${dp.completed}/${dp.total} scheduled activities completed so far today`,
    memories: state.memories.map((m) => m.text),
  };
}

async function callBackend(
  messages: ChatMessage[],
  state: AppState,
  mode: "chat" | "daily_insight" = "chat",
): Promise<string> {
  const url = await getBackendUrl();

  if (!url) {
    throw new Error(
      "No AI backend configured. Add your backend URL in Settings → AI Assistant.",
    );
  }

  let res: Response;

  try {
    res = await fetch(`${url}/api/assistant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
        context: buildContext(state),
        mode,
      }),
    });
  } catch {
    throw new Error(
      "Couldn't reach the AI backend. Check the URL in Settings and your connection.",
    );
  }

  if (!res.ok) {
    let detail = "";

    try {
      const j = await res.json();
      detail = j.error ? `: ${j.error}` : "";
    } catch {
      // Ignore response parsing errors.
    }

    throw new Error(`AI backend returned an error${detail}`);
  }

  const data = await res.json();

  if (!data.reply) {
    throw new Error("AI backend returned an empty reply.");
  }

  return data.reply as string;
}

export interface ChatReply {
  text: string;
  newMemories: string[];
}

const REMEMBER_PATTERN = /\[REMEMBER:\s*([^\]]+)\]/gi;

function extractMemories(raw: string): ChatReply {
  const newMemories: string[] = [];

  const text = raw
    .replace(REMEMBER_PATTERN, (_, fact: string) => {
      newMemories.push(fact.trim());
      return "";
    })
    .trim();

  return {
    text,
    newMemories,
  };
}

export async function sendChatMessage(
  history: ChatMessage[],
  state: AppState,
): Promise<ChatReply> {
  const raw = await callBackend(history, state, "chat");
  return extractMemories(raw);
}

const DAILY_INSIGHT_CACHE_KEY = "assistant_daily_insight";

export async function getDailyInsight(
  state: AppState,
): Promise<string | null> {
  const todayKey = new Date().toDateString();

  try {
    const cached = await Preferences.get({
      key: DAILY_INSIGHT_CACHE_KEY,
    });

    if (cached.value) {
      const parsed = JSON.parse(cached.value) as {
        date: string;
        text: string;
      };

      if (parsed.date === todayKey) {
        return parsed.text;
      }
    }
  } catch {
    // Ignore cache errors and regenerate.
  }

  const url = await getBackendUrl();

  if (!url) {
    return null;
  }

  try {
    const text = await callBackend(
      [
        {
          role: "user",
          content: "Give me today's insight.",
        },
      ],
      state,
      "daily_insight",
    );

    await Preferences.set({
      key: DAILY_INSIGHT_CACHE_KEY,
      value: JSON.stringify({
        date: todayKey,
        text,
      }),
    });

    return text;
  } catch {
    return null;
  }
}