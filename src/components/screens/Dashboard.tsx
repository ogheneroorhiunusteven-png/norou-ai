"use client";

import { useEffect, useState } from "react";
import { getDailyInsight } from "@/lib/assistant";
import { useStore } from "@/lib/store";
import { greeting, nowMinutes, minutesOf, dayIndexOf, formatTimeRange, humanMinutes } from "@/lib/date";
import { activitiesForDay, dayProgress } from "@/lib/logic";
import { LevelCard } from "../LevelCard";
import { ActivityRow } from "../ActivityRow";
import { Card, ProgressBar, SectionTitle } from "../ui";
import { quoteForDate } from "@/lib/quotes";

export function Dashboard() {
  const { state } = useStore();
  const [now, setNow] = useState<Date>(new Date());
  const [insight, setInsight] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    // Silently no-ops if no AI backend is configured — see lib/assistant.ts
    void getDailyInsight(state).then(setInsight);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const day = dayIndexOf(now);
  const acts = activitiesForDay(state, day);
  const dp = dayProgress(state, now);
  const cur = nowMinutes(now);

  const current = acts.find((a) => cur >= minutesOf(a.start) && cur < minutesOf(a.end));
  const upcoming = acts.filter((a) => minutesOf(a.start) > cur).sort((x, y) => minutesOf(x.start) - minutesOf(y.start));
  const next = upcoming[0];
  const minsToNext = next ? minutesOf(next.start) - cur : 0;

  const progressPct = dp.total > 0 ? Math.round((dp.completed / dp.total) * 100) : 0;

  return (
    <div className="space-y-4">
      <header className="pt-1">
        <p className="text-sm text-neutral-400">{greeting(now)},</p>
        <h1 className="text-2xl font-black text-white">{state.profile.name} 👋</h1>
      </header>

      <LevelCard />

      {insight && (
        <Card className="p-5 bg-gradient-to-br from-blue-500/15 to-blue-500/5 border-blue-500/20">
          <div className="flex items-start gap-3">
            <span className="text-xl">🤖</span>
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-blue-400 mb-1">Today's Insight</div>
              <p className="text-sm text-neutral-200 leading-relaxed">{insight}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Daily quote — same one shown all day, matches the morning notification */}
      <Card className="p-5 bg-gradient-to-br from-[#a855f7]/20 to-[#8b5cf6]/5 border-[#a855f7]/20">
        <div className="flex items-start gap-3">
          <span className="text-xl">⚡</span>
          <p className="text-sm italic text-neutral-200 leading-relaxed">&ldquo;{quoteForDate(now)}&rdquo;</p>
        </div>
      </Card>

      {/* Today's progress */}
      <Card className="p-5">
        <SectionTitle>Today&apos;s Progress</SectionTitle>
        <div className="flex items-end justify-between mb-2">
          <div className="text-3xl font-black text-white">
            {dp.completed}
            <span className="text-neutral-500 text-xl">/{dp.total}</span>
          </div>
          <div className="text-sm font-semibold text-[#a855f7]">{progressPct}%</div>
        </div>
        <ProgressBar value={progressPct} />
        <p className="mt-2 text-xs text-neutral-400">activities complete</p>
      </Card>

      {/* Current activity */}
      <Card className="p-5">
        {current ? (
          <>
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wide text-red-400">Now</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{current.emoji}</span>
              <div>
                <div className="text-lg font-bold text-white">{current.title}</div>
                <div className="text-sm text-neutral-400">{formatTimeRange(current.start, current.end)}</div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-2">
            <div className="text-3xl mb-1">🌙</div>
            <p className="text-sm text-neutral-400">Nothing scheduled right now. Enjoy the moment.</p>
          </div>
        )}
      </Card>

      {/* Next activity */}
      {next && (
        <Card className="p-5 border-[#a855f7]/20">
          <div className="text-xs font-bold uppercase tracking-wide text-[#a855f7] mb-2">Next Up</div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{next.emoji}</span>
            <div className="flex-1">
              <div className="font-bold text-white">{next.title}</div>
              <div className="text-xs text-neutral-400">{formatTimeRange(next.start, next.end)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-neutral-400">Starts in</div>
              <div className="text-sm font-semibold text-white">{humanMinutes(minsToNext)}</div>
            </div>
          </div>
        </Card>
      )}

      {/* Today's schedule */}
      <section>
        <SectionTitle>Today&apos;s Schedule</SectionTitle>
        <div className="space-y-2">
          {acts.length === 0 ? (
            <Card className="p-5 text-center text-sm text-neutral-500">No activities scheduled today.</Card>
          ) : (
            acts.map((a) => <ActivityRow key={a.id} activity={a} date={now} />)
          )}
        </div>
      </section>
    </div>
  );
}
