"use client";

import { useStore } from "@/lib/store";
import { levelInfo } from "@/lib/xp";
import { ProgressBar } from "./ui";

export function LevelCard() {
  const { state } = useStore();
  const li = levelInfo(state.xp);
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#2a2a2a] to-[#1f1a24] border border-[#a855f7]/20 p-5">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">⭐ Level</div>
          <div className="text-4xl font-black leading-none text-white mt-1">{li.level}</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-[#a855f7]">⚡ {state.xp.toLocaleString()}</div>
          <div className="text-[11px] text-neutral-400">total XP</div>
        </div>
      </div>
      <div className="mt-4">
        <ProgressBar value={li.progress * 100} />
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-neutral-400">
          <span>
            {li.xpIntoLevel} / {li.xpForThisLevel} XP
          </span>
          <span>
            {li.xpRemaining} XP to Level {li.level + 1}
          </span>
        </div>
      </div>
    </div>
  );
}
