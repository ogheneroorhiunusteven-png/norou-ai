"use client";

import { useStore } from "@/lib/store";
import { Card, ProgressBar, SectionTitle } from "../../ui";
import { dayProgress, meaningfulProgress, weeklyCategoryCount, completedTasksToday } from "@/lib/logic";
import { dateKey } from "@/lib/date";

function guidance(pct: number, total: number): string {
  if (total === 0) return "No meaningful activities scheduled today. Rest is part of the plan.";
  if (pct >= 100) return "👑 Full day complete. Excellent work.";
  if (pct >= 66) return "🔥 Strong day. Keep the momentum going.";
  if (pct >= 33) return "You're making progress. Finish one more important task.";
  return "No reset is required. Choose one manageable action and let that be today's win.";
}

const CHALLENGES = [
  { icon: "🏋️", label: "Training Week", category: "gym", target: 4, unit: "workouts" },
  { icon: "📚", label: "Study Week", categories: ["study", "coursework"], target: 5, unit: "study sessions" },
  { icon: "🔎", label: "Research Week", category: "research", target: 2, unit: "research sessions" },
  { icon: "💻", label: "Builder Week", categories: ["project", "coursework"], target: 2, unit: "personal project sessions" },
] as const;

export function Analytics() {
  const { state } = useStore();
  const dp = dayProgress(state);
  const mp = meaningfulProgress(state);
  const tasksToday = completedTasksToday(state);

  // Quests = today's xp-bearing activities
  const quests = dp.xpActivities;
  const todayKey = dateKey();
  const questsDone = quests.filter((q) => state.completions[todayKey]?.[q.id]).length;
  const bonusAwarded = !!state.questBonus[todayKey];

  return (
    <div className="space-y-4">
      {/* Today */}
      <Card className="p-5">
        <SectionTitle>Today</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-3xl font-black text-white">{dp.completed}</div>
            <div className="text-xs text-neutral-400">activities</div>
          </div>
          <div>
            <div className="text-3xl font-black text-white">{tasksToday}</div>
            <div className="text-xs text-neutral-400">tasks done</div>
          </div>
        </div>
      </Card>

      {/* Score */}
      <Card className="p-5">
        <SectionTitle>Score</SectionTitle>
        <div className="flex items-end gap-3 mb-2">
          <div className="text-5xl font-black text-[#a855f7]">{mp.pct}%</div>
          <div className="text-sm text-neutral-400 pb-2">
            {mp.completed}/{mp.total} meaningful activities complete
          </div>
        </div>
        <ProgressBar value={mp.pct} />
        <p className="mt-3 text-sm text-neutral-300 leading-relaxed">{guidance(mp.pct, mp.total)}</p>
      </Card>

      {/* Quests */}
      <Card className="p-5">
        <SectionTitle>Daily Quests</SectionTitle>
        <div className="text-xs text-neutral-400 mb-3">
          {questsDone}/{quests.length} quests complete {bonusAwarded && "· 🎁 +50 XP bonus earned"}
        </div>
        {quests.length === 0 ? (
          <p className="text-sm text-neutral-500">No XP quests today.</p>
        ) : (
          <div className="space-y-2">
            {quests.map((q) => {
              const done = !!state.completions[todayKey]?.[q.id];
              return (
                <div key={q.id} className="flex items-center gap-2.5 text-sm">
                  <span className={`h-5 w-5 rounded-md border flex items-center justify-center text-[11px] ${done ? "bg-[#a855f7] border-[#a855f7] text-white" : "border-white/25 text-transparent"}`}>✓</span>
                  <span className="text-lg">{q.emoji}</span>
                  <span className={done ? "text-neutral-500 line-through" : "text-neutral-200"}>{q.title}</span>
                  <span className="ml-auto text-xs font-bold text-[#c99bf7]">+{q.xp}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Weekly Challenges */}
      <Card className="p-5">
        <SectionTitle>Weekly Challenges</SectionTitle>
        <div className="space-y-4">
          {CHALLENGES.map((ch) => {
            const cats = "categories" in ch ? ch.categories : [ch.category];
            const count = cats.reduce((sum, c) => sum + weeklyCategoryCount(state, c), 0);
            const pct = Math.min(100, (count / ch.target) * 100);
            return (
              <div key={ch.label}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="font-semibold text-white">
                    {ch.icon} {ch.label}
                  </span>
                  <span className="text-xs text-neutral-400">
                    {count}/{ch.target} {ch.unit}
                  </span>
                </div>
                <ProgressBar value={pct} />
              </div>
            );
          })}
        </div>
      </Card>

      {/* Streaks */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-5 text-center">
          <div className="text-4xl font-black text-white">🔥 {state.streak.current}</div>
          <div className="text-xs text-neutral-400 mt-1">Current Streak</div>
        </Card>
        <Card className="p-5 text-center">
          <div className="text-4xl font-black text-white">🏆 {state.streak.longest}</div>
          <div className="text-xs text-neutral-400 mt-1">Longest Streak</div>
        </Card>
      </div>

      {/* Achievements */}
      <Card className="p-5">
        <SectionTitle>Achievements</SectionTitle>
        <div className="grid grid-cols-2 gap-2.5">
          {state.achievements.map((a) => {
            const unlocked = !!a.unlockedAt;
            return (
              <div
                key={a.id}
                className={`rounded-xl p-3 border ${unlocked ? "bg-[#a855f7]/10 border-[#a855f7]/30" : "bg-white/[0.03] border-white/5"}`}
              >
                <div className={`text-2xl mb-1 ${unlocked ? "" : "opacity-30 grayscale"}`}>{a.emoji}</div>
                <div className={`text-sm font-bold ${unlocked ? "text-white" : "text-neutral-500"}`}>{a.title}</div>
                <div className="text-[11px] text-neutral-500 mt-0.5 leading-tight">{a.description}</div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
