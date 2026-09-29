"use client";

import React, { useEffect, useState } from "react";
import { StoreProvider, useStore } from "@/lib/store";
import { BottomNav, type Tab } from "./Nav";
import { Dashboard } from "./screens/Dashboard";
import { Health } from "./screens/Health";
import { Nutrition } from "./screens/Nutrition";
import { Schedule } from "./screens/Schedule";
import { More } from "./screens/More";
import { Money } from "./screens/Money";
import { LevelUpOverlay, Toast } from "./Overlays";
import { NotificationRunner } from "./NotificationRunner";
import { KeyboardInset } from "./KeyboardInset";
import { initNative } from "@/lib/native";
import { CommandCentre } from "./CommandCentre";

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: unknown) { console.error("Nova UI error", error); }
  render() {
    if (this.state.hasError) return <div className="min-h-screen bg-black px-6 flex items-center justify-center text-center"><div><div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-[#a855f7]/15 text-3xl">✦</div><h1 className="text-xl font-black text-white">Nova needs a quick refresh</h1><p className="mt-2 text-sm text-neutral-500">Your local data is stored separately. Reloading the interface should restore the workspace.</p><button className="mt-5 min-h-11 rounded-xl bg-[#a855f7] px-5 text-sm font-bold text-white" onClick={() => window.location.reload()}>Reload Nova</button></div></div>;
    return this.props.children;
  }
}

function Shell() {
  const { ready } = useStore();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [commandOpen, setCommandOpen] = useState(false);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);

  useEffect(() => {
    try { const saved = localStorage.getItem("norou_last_tab") as Tab | null; if (saved && ["dashboard","health","nutrition","schedule","money","more"].includes(saved)) setTab(saved); } catch {}
    void initNative();
    const syncOnline = () => setOnline(navigator.onLine);
    window.addEventListener("online", syncOnline);
    window.addEventListener("offline", syncOnline);
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((v) => !v);
      }
    };
    const openNova = () => setCommandOpen(true);
    const navigateNova = (event: Event) => { const tab = (event as CustomEvent<string>).detail as Tab; if (["dashboard","health","nutrition","schedule","money","more"].includes(tab)) setTab(tab); };
    const autopilotNova = () => setCommandOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("norou:open", openNova);
    window.addEventListener("norou:navigate", navigateNova);
    window.addEventListener("norou:autopilot", autopilotNova);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("norou:open", openNova);
      window.removeEventListener("norou:navigate", navigateNova);
      window.removeEventListener("norou:autopilot", autopilotNova);
      window.removeEventListener("online", syncOnline); window.removeEventListener("offline", syncOnline); };
  }, []);
  useEffect(() => { try { localStorage.setItem("norou_last_tab", tab); } catch {} }, [tab]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-fadeIn">
          <div className="nova-startup-mark" aria-hidden="true">N</div>
          <div className="text-xl font-black text-white">NOVA</div>
          <div className="mt-1 text-xs text-neutral-500">Your personal AI operating system</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell bg-black" data-network={online ? "online" : "offline"}>
      <main className="app-scroll">
        <div key={tab} className="mx-auto max-w-2xl px-4 pt-5 pb-28 animate-fadeIn">
          {tab === "dashboard" && <Dashboard />}
          {tab === "health" && <Health />}
          {tab === "nutrition" && <Nutrition />}
          {tab === "money" && <Money />}
          {tab === "schedule" && <Schedule />}
          {tab === "more" && <More />}
        </div>
      </main>
      <button aria-label="Open Nova Command Centre" onClick={() => setCommandOpen(true)} className="norou-mini-launch fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+78px)] z-50 active:scale-95 transition-transform"><span>✦</span></button>
      <div className="nova-network-pill" aria-live="polite">{online ? "● Online" : "● Offline · local mode"}</div>
      <BottomNav active={tab} onChange={setTab} />
      {commandOpen && <CommandCentre onClose={() => setCommandOpen(false)} />}
      <LevelUpOverlay />
      <Toast />
      <NotificationRunner />
      <KeyboardInset />
    </div>
  );
}

export function App() {
  return (
    <StoreProvider>
      <AppErrorBoundary>
        <Shell />
      </AppErrorBoundary>
    </StoreProvider>
  );
}
