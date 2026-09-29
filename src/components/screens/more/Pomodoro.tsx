"use client";

import { useEffect, useRef, useState } from "react";
import { Card, Button } from "../../ui";

const WORK = 25 * 60;
const BREAK = 5 * 60;

export function Pomodoro() {
  const [mode, setMode] = useState<"work" | "break">("work");
  const [remaining, setRemaining] = useState(WORK);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [queue, setQueue] = useState<{ minutes: number; task?: string }[]>([]);
  const [currentTask, setCurrentTask] = useState<string | undefined>();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const onNovaFocus = (event: Event) => {
      const detail = (event as CustomEvent<{ minutes?: number; task?: string }>).detail;
      const minutes = Math.max(1, Math.min(180, Math.round(detail?.minutes ?? 25)));
      setQueue([]);
      setCurrentTask(detail?.task);
      setMode("work");
      setRemaining(minutes * 60);
      setRunning(true);
    };
    const onAutopilot = (event: Event) => {
      const detail = (event as CustomEvent<{ blocks?: { minutes?: number; task?: string }[] }>).detail;
      const blocks = (detail?.blocks ?? []).map((b) => ({ minutes: Math.max(1, Math.min(180, Math.round(b.minutes ?? 25))), task: b.task }));
      if (!blocks.length) return;
      const [first, ...rest] = blocks;
      setQueue(rest);
      setCurrentTask(first.task);
      setMode("work");
      setRemaining(first.minutes * 60);
      setRunning(true);
    };
    window.addEventListener("norou:focus", onNovaFocus);
    window.addEventListener("norou:autopilot", onAutopilot);
    return () => { window.removeEventListener("norou:focus", onNovaFocus); window.removeEventListener("norou:autopilot", onAutopilot); };
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            if (mode === "work") {
              setSessions((s) => s + 1);
              if (queue.length) {
                const [next, ...rest] = queue;
                setQueue(rest);
                setCurrentTask(next.task);
                setMode("work");
                setRemaining(next.minutes * 60);
                return 0;
              }
            }
            setMode((m) => {
              const nextMode = m === "work" ? "break" : "work";
              setRemaining(nextMode === "work" ? WORK : BREAK);
              return nextMode;
            });
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const reset = () => {
    setRunning(false);
    setMode("work");
    setRemaining(WORK);
  };

  const total = mode === "work" ? WORK : BREAK;
  const progress = ((total - remaining) / total) * 100;
  const mins = String(Math.floor(remaining / 60)).padStart(2, "0");
  const secs = String(remaining % 60).padStart(2, "0");

  const R = 120;
  const C = 2 * Math.PI * R;

  return (
    <div className="space-y-4">
      <Card className="p-6 flex flex-col items-center">
        {currentTask && <div className="mb-3 max-w-xs text-center text-xs text-neutral-400">Working on: <span className="text-white font-semibold">{currentTask}</span></div>}
        {queue.length > 0 && <div className="mb-3 rounded-xl bg-[#a855f7]/10 px-3 py-2 text-[11px] text-[#d8b4fe]">Autopilot queue: {queue.length} block{queue.length === 1 ? "" : "s"} remaining</div>}
        <div className={`mb-4 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide ${mode === "work" ? "bg-[#a855f7]/20 text-[#c99bf7]" : "bg-emerald-500/20 text-emerald-300"}`}>
          {mode === "work" ? "🎯 Focus" : "☕ Break"}
        </div>
        <div className="relative flex items-center justify-center">
          <svg width="280" height="280" className="-rotate-90">
            <circle cx="140" cy="140" r={R} fill="none" stroke="#ffffff14" strokeWidth="12" />
            <circle
              cx="140"
              cy="140"
              r={R}
              fill="none"
              stroke={mode === "work" ? "#a855f7" : "#10b981"}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C - (progress / 100) * C}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute text-center">
            <div className="text-5xl font-black tabular-nums text-white">
              {mins}:{secs}
            </div>
            <div className="text-xs text-neutral-400 mt-1">Sessions: {sessions}</div>
          </div>
        </div>
        <div className="mt-6 flex gap-2 w-full max-w-xs">
          {!running ? (
            <Button className="flex-1" onClick={() => setRunning(true)}>
              ▶ Start
            </Button>
          ) : (
            <Button variant="ghost" className="flex-1" onClick={() => setRunning(false)}>
              ⏸ Pause
            </Button>
          )}
          <Button variant="ghost" className="flex-1" onClick={reset}>
            ↺ Reset
          </Button>
        </div>
      </Card>
      <p className="text-center text-xs text-neutral-500">25 min focus · 5 min break. Timer runs while the app is open.</p>
    </div>
  );
}
