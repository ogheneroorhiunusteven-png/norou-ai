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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            // switch mode
            setMode((m) => {
              const nextMode = m === "work" ? "break" : "work";
              if (m === "work") setSessions((s) => s + 1);
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
