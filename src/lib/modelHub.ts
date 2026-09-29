import { Preferences } from "@capacitor/preferences";

export type ModelProvider = "gemini" | "openai" | "openrouter" | "ollama";
export type ModelProfileId =
  | "auto"
  | "gemini-fast"
  | "gemini-vision"
  | "openai-general"
  | "openrouter-free"
  | "ollama-local";

export interface ModelProfile {
  id: ModelProfileId;
  name: string;
  provider: ModelProvider | "auto";
  model: string;
  description: string;
  capabilities: string[];
  requiresBackend: boolean;
  local?: boolean;
}

export const MODEL_PROFILES: ModelProfile[] = [
  { id:"auto", name:"Nova Auto", provider:"auto", model:"auto", description:"Chooses the configured model and falls back safely.", capabilities:["chat","actions","vision"], requiresBackend:false },
  { id:"gemini-fast", name:"Gemini Fast", provider:"gemini", model:"gemini-3.8-flash", description:"Fast general assistant with Nova actions.", capabilities:["chat","actions"], requiresBackend:true },
  { id:"gemini-vision", name:"Gemini Vision", provider:"gemini", model:"gemini-3.8-flash", description:"Best fit for image understanding when your backend supports it.", capabilities:["chat","actions","vision"], requiresBackend:true },
  { id:"openai-general", name:"OpenAI Compatible", provider:"openai", model:"env-configured", description:"Uses a server-side OpenAI-compatible endpoint.", capabilities:["chat","actions"], requiresBackend:true },
  { id:"openrouter-free", name:"OpenRouter", provider:"openrouter", model:"env-configured", description:"Routes through an OpenRouter-compatible server configuration.", capabilities:["chat","actions"], requiresBackend:true },
  { id:"ollama-local", name:"Ollama Local", provider:"ollama", model:"env-configured", description:"For a self-hosted Ollama model exposed to the Nova backend.", capabilities:["chat","actions"], requiresBackend:true, local:true },
];

const PROFILE_KEY = "norou:model_profile_v1";
const ROUTING_KEY = "norou:model_routing_v1";
const FREE_ONLY_KEY = "norou:free_only_v1";

export type RoutingMode = "auto" | "manual" | "fallback";

export async function getModelProfile(): Promise<ModelProfileId> {
  try {
    const res = await Preferences.get({ key: PROFILE_KEY });
    return (res.value as ModelProfileId) || "auto";
  } catch { return "auto"; }
}

export async function setModelProfile(id: ModelProfileId): Promise<void> {
  await Preferences.set({ key: PROFILE_KEY, value: id });
}

export async function getRoutingMode(): Promise<RoutingMode> {
  try {
    const res = await Preferences.get({ key: ROUTING_KEY });
    return (res.value as RoutingMode) || "auto";
  } catch { return "auto"; }
}

export async function setRoutingMode(mode: RoutingMode): Promise<void> {
  await Preferences.set({ key: ROUTING_KEY, value: mode });
}

/** Free-only mode prevents Nova from intentionally using paid cloud providers.
 * It is enabled by default. Local commands remain available without any API. */
export async function getFreeOnly(): Promise<boolean> {
  try {
    const res = await Preferences.get({ key: FREE_ONLY_KEY });
    return res.value === null ? true : res.value === "true";
  } catch { return true; }
}

export async function setFreeOnly(enabled: boolean): Promise<void> {
  await Preferences.set({ key: FREE_ONLY_KEY, value: String(enabled) });
}

export function getProfile(id: ModelProfileId): ModelProfile {
  return MODEL_PROFILES.find((p) => p.id === id) ?? MODEL_PROFILES[0];
}
