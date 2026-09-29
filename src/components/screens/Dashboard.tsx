"use client";

import { useEffect, useMemo, useState } from "react";
import { getDailyInsight } from "@/lib/assistant";
import { useStore } from "@/lib/store";
import { greeting, nowMinutes, minutesOf, dayIndexOf, formatTimeRange, humanMinutes } from "@/lib/date";
import { activitiesForDay, dayProgress } from "@/lib/logic";
import { levelInfo } from "@/lib/xp";
import { Card, ProgressBar, SectionTitle } from "../ui";
import { quoteForDate } from "@/lib/quotes";
import { NorouOrb } from "../NorouOrb";

export function Dashboard() {
  const { state, getHealthDay } = useStore();
  const [now, setNow] = useState(() => new Date());
  const [insight, setInsight] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    void getDailyInsight(state).then(setInsight);
    // Daily insight intentionally refreshes on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const day = dayIndexOf(now);
  const acts = activitiesForDay(state, day);
  const dp = dayProgress(state, now);
  const cur = nowMinutes(now);
  const current = acts.find((a) => cur >= minutesOf(a.start) && cur < minutesOf(a.end));
  const next = acts.filter((a) => minutesOf(a.start) > cur).sort((a, b) => minutesOf(a.start) - minutesOf(b.start))[0];
  const minsToNext = next ? minutesOf(next.start) - cur : 0;
  const progressPct = dp.total ? Math.round((dp.completed / dp.total) * 100) : 0;
  const li = levelInfo(state.xp);
  const health = getHealthDay();
  const openTasks = state.tasks.filter((t) => !t.completed);
  const activeGoals = state.goals.filter((g) => !g.completed);

  const dayLabel = useMemo(() => now.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }), [now]);

  const openNorou = () => window.dispatchEvent(new CustomEvent("norou:open"));
  const go = (tab: string) => window.dispatchEvent(new CustomEvent("norou:navigate", { detail: tab }));

  return (
    <div className="norou-home space-y-5">
      <header className="norou-page-head">
        <div>
          <div className="norou-eyebrow">{dayLabel}</div>
          <h1>{greeting(now)}, {state.profile.name}</h1>
          <p>Your day, organised by Norou.</p>
        </div>
        <button className="norou-avatar" onClick={() => go("more")} aria-label="Open Norou Hub">{state.profile.name?.slice(0, 1).toUpperCase() || "N"}</button>
      </header>

      <section className="norou-command-bar" onClick={openNorou} role="button" tabIndex={0}>
        <div className="norou-command-icon">✦</div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-white">Ask Norou anything…</div>
          <div className="text-xs text-neutral-500 truncate">“Plan my afternoon” · “Add a task” · “Start focus”</div>
        </div>
        <kbd>⌘K</kbd>
      </section>

      <section className="norou-ai-card">
        <div className="norou-ai-glow" />
        <div className="norou-ai-copy">
          <span className="norou-live-pill"><i /> NOROU ACTIVE</span>
          <h2>Ready when you are.</h2>
          <p>Plan, focus, remember and act — without leaving your workspace.</p>
          <div className="norou-ai-actions">
            <button onClick={openNorou}>Talk to Norou</button>
            <button onClick={() => window.dispatchEvent(new CustomEvent("norou:autopilot"))}>Run Autopilot</button>
          </div>
        </div>
        <NorouOrb size="hero" onClick={openNorou} />
      </section>

      <section className="norou-bento-grid">
        <button className="norou-bento norou-bento-primary" onClick={() => go("schedule")}>
          <span className="norou-bento-label">TODAY</span>
          <strong>{progressPct}%</strong>
          <span>{dp.completed} of {dp.total} activities complete</span>
          <ProgressBar value={progressPct} />
        </button>
        <button className="norou-bento" onClick={() => go("more")}>
          <span className="norou-bento-icon">✓</span>
          <strong>{openTasks.length}</strong>
          <span>open tasks</span>
        </button>
        <button className="norou-bento" onClick={() => go("more")}>
          <span className="norou-bento-icon">◎</span>
          <strong>{activeGoals.length}</strong>
          <span>active goals</span>
        </button>
        <button className="norou-bento" onClick={() => go("health")}>
          <span className="norou-bento-icon">⌁</span>
          <strong>{health.steps.toLocaleString()}</strong>
          <span>steps today</span>
        </button>
      </section>

      <section>
        <SectionTitle action={<button className="norou-link" onClick={() => go("schedule")}>View plan →</button>}>Your next move</SectionTitle>
        <Card className="norou-next-card p-5">
          {current ? (
            <div className="flex items-center gap-4">
              <div className="norou-now-ring"><span>{current.emoji}</span></div>
              <div className="flex-1 min-w-0"><div className="norou-eyebrow text-[#c99bf7]">IN PROGRESS</div><div className="text-lg font-black text-white truncate">{current.title}</div><div className="text-xs text-neutral-500">{formatTimeRange(current.start, current.end)}</div></div>
              <button className="norou-small-action" onClick={openNorou}>Ask</button>
            </div>
          ) : next ? (
            <div className="flex items-center gap-4">
              <div className="norou-now-ring"><span>{next.emoji}</span></div>
              <div className="flex-1 min-w-0"><div className="norou-eyebrow">UP NEXT</div><div className="text-lg font-black text-white truncate">{next.title}</div><div className="text-xs text-neutral-500">{formatTimeRange(next.start, next.end)} · in {humanMinutes(minsToNext)}</div></div>
              <button className="norou-small-action" onClick={openNorou}>Start</button>
            </div>
          ) : (
            <div className="text-center py-2"><div className="text-lg font-black text-white">Open space.</div><p className="text-sm text-neutral-500 mt-1">Nothing else is scheduled today. Let Norou plan the next block.</p><button className="norou-small-action mt-4" onClick={openNorou}>Plan it</button></div>
          )}
        </Card>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <button className="norou-quick" onClick={openNorou}><span>+</span><div><strong>Quick action</strong><small>Change your day</small></div></button>
        <button className="norou-quick" onClick={() => go("health")}><span>+</span><div><strong>Log health</strong><small>Water, mood, steps</small></div></button>
        <button className="norou-quick" onClick={() => go("money")}><span>£</span><div><strong>Open Money</strong><small>Budget this month</small></div></button>
        <button className="norou-quick" onClick={() => go("nutrition")}><span>◌</span><div><strong>Log food</strong><small>Fuel & nutrition</small></div></button>
      </section>

      {insight && <Card className="norou-insight p-5"><div className="norou-eyebrow">NOROU INSIGHT</div><p>{insight}</p></Card>}

      <Card className="norou-quote p-5"><div className="norou-eyebrow">MOMENTUM</div><p>“{quoteForDate(now)}”</p><div className="mt-4 flex items-end justify-between"><div><div className="text-2xl font-black text-white">Level {li.level}</div><div className="text-xs text-neutral-500">{li.xpRemaining} XP to the next level</div></div><div className="text-right text-xs font-bold text-[#c99bf7]">{state.xp.toLocaleString()} XP</div></div><div className="mt-3"><ProgressBar value={li.progress * 100} /></div></Card>
    </div>
  );
}
