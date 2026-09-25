"use client";

import { useEffect, useState } from "react";
import { StoreProvider, useStore } from "@/lib/store";
import { BottomNav, type Tab } from "./Nav";
import { Dashboard } from "./screens/Dashboard";
import { Health } from "./screens/Health";
import { Nutrition } from "./screens/Nutrition";
import { Schedule } from "./screens/Schedule";
import { More } from "./screens/More";
import { LevelUpOverlay, Toast } from "./Overlays";
import { NotificationRunner } from "./NotificationRunner";
import { initNative } from "@/lib/native";

function Shell() {
  const { ready } = useStore();
  const [tab, setTab] = useState<Tab>("dashboard");

  useEffect(() => {
    void initNative();
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-fadeIn">
          <div className="text-5xl mb-3">⭐</div>
          <div className="text-xl font-black text-[#a855f7]">Level Up</div>
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
          {tab === "schedule" && <Schedule />}
          {tab === "more" && <More />}
        </div>
      </main>
      <BottomNav active={tab} onChange={setTab} />
      <LevelUpOverlay />
      <Toast />
      <NotificationRunner />
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
