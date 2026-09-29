"use client";

import { useEffect, useState } from "react";
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

function Shell() {
  const { ready } = useStore();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    void initNative();
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((v) => !v);
      }
    };
    const openNorou = () => setCommandOpen(true);
    const navigateNorou = (event: Event) => { const tab = (event as CustomEvent<string>).detail as Tab; if (["dashboard","health","nutrition","schedule","money","more"].includes(tab)) setTab(tab); };
    const autopilotNorou = () => setCommandOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("norou:open", openNorou);
    window.addEventListener("norou:navigate", navigateNorou);
    window.addEventListener("norou:autopilot", autopilotNorou);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("norou:open", openNorou);
      window.removeEventListener("norou:navigate", navigateNorou);
      window.removeEventListener("norou:autopilot", autopilotNorou); };
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-fadeIn">
          <div className="text-5xl mb-3">⭐</div>
          <div className="text-xl font-black text-[#a855f7]">Norou AI</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell bg-black">
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
      <button aria-label="Open Norou Command Centre" onClick={() => setCommandOpen(true)} className="norou-mini-launch fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+78px)] z-50 active:scale-95 transition-transform"><span>✦</span></button>
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
      <Shell />
    </StoreProvider>
  );
}
