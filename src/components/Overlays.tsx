"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

export function LevelUpOverlay() {
  const { levelUpEvent, clearLevelUpEvent } = useStore();

  useEffect(() => {
    if (!levelUpEvent) return;
    const t = setTimeout(clearLevelUpEvent, 2800);
    return () => clearTimeout(t);
  }, [levelUpEvent, clearLevelUpEvent]);

  if (!levelUpEvent) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={clearLevelUpEvent}
    >
      <div className="animate-levelPop text-center px-8">
        <div className="text-6xl mb-4">⭐</div>
        <div className="text-4xl font-black tracking-tight text-[#a855f7] drop-shadow-[0_0_20px_rgba(168,85,247,0.6)]">
          LEVEL UP!
        </div>
        <div className="mt-4 text-2xl font-bold text-white">Level {levelUpEvent.newLevel}</div>
        <div className="mt-1 text-sm text-neutral-400">⚡ {levelUpEvent.totalXp.toLocaleString()} XP total</div>
      </div>
    </div>
  );
}

export function Toast() {
  const { toast } = useStore();
  if (!toast) return null;
  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-24 sm:bottom-8 z-[55] animate-slideUp">
      <div className="rounded-full bg-[#2a2a2a] border border-[#a855f7]/40 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-black/50">
        {toast}
      </div>
    </div>
  );
}
