"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import type { NotificationSettings } from "@/lib/types";
import { Card, Modal, Field, inputClass, Button, SectionTitle } from "../../ui";
import { requestPermission, cancelAll, isNative } from "@/lib/notifications";
import { getBackendUrl, setBackendUrl } from "@/lib/assistant";
import { MODEL_PROFILES, getFreeOnly, getModelProfile, getRoutingMode, setFreeOnly, setModelProfile, setRoutingMode, type ModelProfileId, type RoutingMode } from "@/lib/modelHub";
import { useEffect } from "react";

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? "bg-[#a855f7]" : "bg-white/15"}`}
      aria-label="Toggle"
    >
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

const NOTIF_ROWS: { key: keyof NotificationSettings; label: string; desc: string }[] = [
  { key: "scheduledStarts", label: "Scheduled activity starts", desc: "Alert when an activity begins" },
  { key: "completionFeedback", label: "Completion feedback", desc: "Celebrate finished activities" },
  { key: "morningPlan", label: "Wake-up quote", desc: "A daily quote plus a summary of your day" },
  { key: "upcomingActivities", label: "Upcoming activities", desc: "Heads up before activities start" },
  { key: "eveningWrapUp", label: "Evening wrap-up", desc: "Reflect on your day" },
];

export function Settings() {
  const { state, setName, updateNotifications, clearAll, showToast } = useStore();
  const [nameOpen, setNameOpen] = useState(false);
  const [nameVal, setNameVal] = useState(state.profile.name);
  const [clearOpen, setClearOpen] = useState(false);
  const [backendUrl, setBackendUrlState] = useState("");
  const [savingUrl, setSavingUrl] = useState(false);
  const [modelProfile, setModelProfileState] = useState<ModelProfileId>("auto");
  const [routingMode, setRoutingModeState] = useState<RoutingMode>("auto");
  const [freeOnly, setFreeOnlyState] = useState(false);

  useEffect(() => {
    void getBackendUrl().then((url) => setBackendUrlState(url ?? ""));
    void getModelProfile().then(setModelProfileState);
    void getRoutingMode().then(setRoutingModeState);
    void getFreeOnly().then(setFreeOnlyState);
  }, []);

  const saveBackendUrl = async () => {
    setSavingUrl(true);
    try {
      await setBackendUrl(backendUrl);
      showToast(backendUrl ? "AI backend saved" : "AI backend cleared");
    } finally {
      setSavingUrl(false);
    }
  };

  const n = state.notifications;

  const requestNotifPermission = async (enable: boolean) => {
    if (!enable) {
      updateNotifications({ enabled: false });
      await cancelAll();
      showToast("Notifications turned off");
      return;
    }
    const granted = await requestPermission();
    if (granted) {
      updateNotifications({ enabled: true });
      showToast(isNative() ? "Notifications enabled" : "Browser notifications enabled");
    } else {
      updateNotifications({ enabled: false });
      showToast(
        isNative()
          ? "Permission denied. Enable it in iOS Settings > Nova AI."
          : "Permission denied by browser"
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Profile */}
      <Card className="p-5">
        <SectionTitle>Profile</SectionTitle>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-neutral-400">Name</div>
            <div className="text-lg font-bold text-white">{state.profile.name}</div>
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              setNameVal(state.profile.name);
              setNameOpen(true);
            }}
          >
            Edit
          </Button>
        </div>
      </Card>

      {/* Notifications */}
      <Card className="p-5">
        <SectionTitle>Notifications</SectionTitle>
        <div className="flex items-center justify-between py-2">
          <div className="pr-3">
            <div className="text-sm font-semibold text-white">Enable Notifications</div>
            <div className="text-xs text-neutral-400">{isNative() ? "Requires device permission" : "Requires browser permission"}</div>
          </div>
          <Toggle on={n.enabled} onChange={() => requestNotifPermission(!n.enabled)} />
        </div>
        <div className="h-px bg-white/5 my-1" />
        {NOTIF_ROWS.map((row) => (
          <div key={row.key} className="flex items-center justify-between py-2.5">
            <div className="pr-3">
              <div className={`text-sm font-medium ${n.enabled ? "text-white" : "text-neutral-500"}`}>{row.label}</div>
              <div className="text-xs text-neutral-500">{row.desc}</div>
            </div>
            <Toggle on={n[row.key]} onChange={() => updateNotifications({ [row.key]: !n[row.key] })} />
          </div>
        ))}
        <p className="mt-2 text-[11px] text-neutral-500 leading-relaxed">
          {isNative()
            ? "Notifications are scheduled with your device and will arrive even when Nova AI is closed. Changes to your schedule re-sync automatically."
            : "Web browsers cannot reliably deliver scheduled notifications when the app is closed. Nova AI shows browser notifications for activity starts while this tab is open. Install the iOS app for notifications that work in the background."}
        </p>
      </Card>

      {/* AI Assistant */}
      <Card className="p-5">
        <SectionTitle>AI Assistant</SectionTitle>
        <p className="text-xs text-neutral-400 mb-3">
          Optional: connect the optional Gemini AI backend for full AI chat, coding, study and research. Without one, Nova automatically uses Offline Mode for local assistant features. Your Gemini API key lives only on the backend — never in this app.
        </p>
        <Field label="Backend URL">
          <input
            className={inputClass}
            placeholder="https://your-norou-ai-backend.vercel.app (optional)"
            value={backendUrl}
            onChange={(e) => setBackendUrlState(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
          />
        </Field>
        <Button className="w-full mt-1" onClick={saveBackendUrl} disabled={savingUrl}>
          {savingUrl ? "Saving…" : "Save"}
        </Button>
      </Card>


      {/* Model Hub */}
      <Card className="p-5">
        <SectionTitle>🧠 Model Hub</SectionTitle>
        <p className="text-xs text-neutral-400 mb-3">
          Choose how Nova routes AI work. Provider credentials stay on your server; this app never stores provider API keys.
        </p>
        <Field label="Model profile">
          <select
            className={inputClass}
            value={modelProfile}
            onChange={async (e) => {
              const value = e.target.value as ModelProfileId;
              setModelProfileState(value);
              await setModelProfile(value);
              showToast("Model profile updated");
            }}
          >
            {MODEL_PROFILES.map((profile) => (
              <option key={profile.id} value={profile.id}>{profile.name} — {profile.description}</option>
            ))}
          </select>
        </Field>
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3 mb-3">
          <div className="pr-3">
            <div className="text-sm font-semibold text-white">🆓 Free-only mode</div>
            <div className="text-[11px] text-neutral-400">Blocks paid cloud providers. Off by default so Gemini can respond.</div>
          </div>
          <Toggle on={freeOnly} onChange={async () => {
            const next = !freeOnly;
            setFreeOnlyState(next);
            await setFreeOnly(next);
            showToast(next ? "Free-only mode enabled" : "Paid providers allowed");
          }} />
        </div>

        {freeOnly && (
          <div className="rounded-xl border border-[#a855f7]/20 bg-[#a855f7]/5 p-3 mb-3 text-[11px] text-neutral-300 leading-relaxed">
            Nova will not intentionally use Gemini/OpenAI paid API routes while this is on. Local tools always work without an API key. For full local AI, connect Ollama. Free cloud models can still have provider rate limits.
          </div>
        )}
        <Field label="Routing">
          <select
            className={inputClass}
            value={routingMode}
            onChange={async (e) => {
              const value = e.target.value as RoutingMode;
              setRoutingModeState(value);
              await setRoutingMode(value);
              showToast("Routing mode updated");
            }}
          >
            <option value="auto">Auto — choose an available provider</option>
            <option value="manual">Manual — use the selected profile only</option>
            <option value="fallback">Fallback — try another configured provider if needed</option>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-2 mt-3">
          {MODEL_PROFILES.slice(1).map((profile) => (
            <div key={profile.id} className="rounded-xl bg-white/5 border border-white/5 p-3">
              <div className="text-sm font-bold text-white">{profile.name}</div>
              <div className="text-[10px] text-neutral-500 mt-1">{profile.capabilities.join(" · ")}</div>
              <div className="text-[10px] text-[#b88cff] mt-2">{profile.local ? "Self-hosted" : "Server routed"}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-neutral-500">
          Gemini, OpenAI-compatible, OpenRouter and Ollama profiles are supported by the backend when their server-side environment variables are configured. “Auto” safely falls back to local Nova tools if no provider is available.
        </p>
      </Card>

      {/* About */}
      <Card className="p-5">
        <SectionTitle>About</SectionTitle>
        <div className="flex items-center gap-3">
          <div className="text-3xl">⭐</div>
          <div>
            <div className="text-lg font-black text-white">Nova AI</div>
            <div className="text-xs text-neutral-400">Version 1.0.0</div>
            <div className="text-xs text-[#c99bf7] mt-1">Turn your routine into progress.</div>
          </div>
        </div>
      </Card>

      {/* Data */}
      <Card className="p-5 border-red-500/20">
        <SectionTitle>Data</SectionTitle>
        <p className="text-xs text-neutral-400 mb-3">This permanently deletes all your local data and resets the app.</p>
        <Button variant="danger" className="w-full" onClick={() => setClearOpen(true)}>
          Clear All Data
        </Button>
      </Card>

      <Modal open={nameOpen} onClose={() => setNameOpen(false)} title="Edit Name">
        <Field label="Your name">
          <input className={inputClass} value={nameVal} onChange={(e) => setNameVal(e.target.value)} autoFocus />
        </Field>
        <div className="flex gap-2 mt-2">
          <Button variant="ghost" className="flex-1" onClick={() => setNameOpen(false)}>Cancel</Button>
          <Button
            className="flex-1"
            onClick={() => {
              setName(nameVal);
              setNameOpen(false);
            }}
          >
            Save
          </Button>
        </div>
      </Modal>

      <Modal open={clearOpen} onClose={() => setClearOpen(false)} title="Clear all data?">
        <p className="text-sm text-neutral-300 mb-4">
          This will erase your XP, level, schedule changes, meals, tasks, notes and everything else. This cannot be undone.
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => setClearOpen(false)}>Cancel</Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => {
              clearAll();
              setClearOpen(false);
            }}
          >
            Clear Everything
          </Button>
        </div>
      </Modal>
    </div>
  );
}
