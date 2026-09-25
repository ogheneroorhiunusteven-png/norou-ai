"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import type { NotificationSettings } from "@/lib/types";
import { Card, Modal, Field, inputClass, Button, SectionTitle } from "../../ui";
import { requestPermission, cancelAll, isNative } from "@/lib/notifications";
import { getBackendUrl, setBackendUrl } from "@/lib/assistant";
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
  { key: "morningPlan", label: "Morning plan", desc: "A summary of your day" },
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

  useEffect(() => {
    void getBackendUrl().then((url) => setBackendUrlState(url ?? ""));
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
          ? "Permission denied. Enable it in iOS Settings > Level Up."
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
            ? "Notifications are scheduled with your device and will arrive even when Level Up is closed. Changes to your schedule re-sync automatically."
            : "Web browsers cannot reliably deliver scheduled notifications when the app is closed. Level Up shows browser notifications for activity starts while this tab is open. Install the iOS app for notifications that work in the background."}
        </p>
      </Card>

      {/* AI Assistant */}
      <Card className="p-5">
        <SectionTitle>AI Assistant</SectionTitle>
        <p className="text-xs text-neutral-400 mb-3">
          Paste your deployed backend URL here (see <code className="text-neutral-300">ai-backend/README.md</code> in the
          project for setup). Your API key lives only on that backend — never in this app.
        </p>
        <Field label="Backend URL">
          <input
            className={inputClass}
            placeholder="https://your-project.vercel.app"
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

      {/* About */}
      <Card className="p-5">
        <SectionTitle>About</SectionTitle>
        <div className="flex items-center gap-3">
          <div className="text-3xl">⭐</div>
          <div>
            <div className="text-lg font-black text-white">Level Up</div>
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
