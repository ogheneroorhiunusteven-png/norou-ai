"use client";

import { useState } from "react";
import { Goals } from "./more/Goals";
import { Tasks } from "./more/Tasks";
import { Notes } from "./more/Notes";
import { Alarms } from "./more/Alarms";
import { Pomodoro } from "./more/Pomodoro";
import { ExercisePlans } from "./more/ExercisePlans";
import { Analytics } from "./more/Analytics";
import { Settings } from "./more/Settings";
import { Assistant } from "./more/Assistant";
import { Calendar } from "./more/Calendar";
import { Memory } from "./more/Memory";

type Sub =
  | "menu"
  | "assistant"
  | "calendar"
  | "memory"
  | "goals"
  | "tasks"
  | "notes"
  | "alarms"
  | "pomodoro"
  | "exercise"
  | "analytics"
  | "settings";

const ITEMS: { key: Sub; icon: string; label: string; desc: string }[] = [
  { key: "assistant", icon: "🤖", label: "AI Assistant", desc: "Your personal advisor" },
  { key: "calendar", icon: "📅", label: "Calendar", desc: "Dated events & reminders" },
  { key: "memory", icon: "🧠", label: "Memory", desc: "What the AI remembers about you" },
  { key: "goals", icon: "🎯", label: "Plans & Goals", desc: "Set and track your goals" },
  { key: "tasks", icon: "✅", label: "Tasks", desc: "Your to-do list" },
  { key: "notes", icon: "📝", label: "Notes", desc: "Capture your thoughts" },
  { key: "alarms", icon: "⏰", label: "Alarms", desc: "Wake-up and reminders" },
  { key: "pomodoro", icon: "🍅", label: "Pomodoro", desc: "Focus timer" },
  { key: "exercise", icon: "🏋️", label: "Exercise Plans", desc: "Your workout routines" },
  { key: "analytics", icon: "📊", label: "Analytics", desc: "Progress, quests & achievements" },
  { key: "settings", icon: "⚙️", label: "Settings", desc: "Profile, notifications & data" },
];

const TITLES: Record<Sub, string> = {
  menu: "More",
  assistant: "AI Assistant",
  calendar: "Calendar",
  memory: "Memory",
  goals: "Plans & Goals",
  tasks: "Tasks",
  notes: "Notes",
  alarms: "Alarms",
  pomodoro: "Pomodoro",
  exercise: "Exercise Plans",
  analytics: "Analytics",
  settings: "Settings",
};

export function More() {
  const [sub, setSub] = useState<Sub>("menu");

  if (sub === "menu") {
    return (
      <div className="space-y-4">
        <header className="pt-1">
          <h1 className="text-2xl font-black text-white">More</h1>
          <p className="text-sm text-neutral-400">Everything else</p>
        </header>
        <div className="grid grid-cols-1 gap-2.5">
          {ITEMS.map((it) => (
            <button
              key={it.key}
              onClick={() => setSub(it.key)}
              className="flex items-center gap-3.5 rounded-2xl bg-[#2a2a2a] border border-white/5 p-4 text-left active:scale-[0.99] transition-transform hover:border-[#a855f7]/30"
            >
              <span className="text-2xl">{it.icon}</span>
              <div className="flex-1">
                <div className="font-semibold text-white">{it.label}</div>
                <div className="text-xs text-neutral-400">{it.desc}</div>
              </div>
              <span className="text-neutral-500">›</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3 pt-1">
        <button
          onClick={() => setSub("menu")}
          className="h-9 w-9 rounded-xl bg-white/5 text-white hover:bg-white/10 flex items-center justify-center"
          aria-label="Back"
        >
          ‹
        </button>
        <h1 className="text-2xl font-black text-white">{TITLES[sub]}</h1>
      </header>
      {sub === "assistant" && <Assistant />}
      {sub === "calendar" && <Calendar />}
      {sub === "memory" && <Memory />}
      {sub === "goals" && <Goals />}
      {sub === "tasks" && <Tasks />}
      {sub === "notes" && <Notes />}
      {sub === "alarms" && <Alarms />}
      {sub === "pomodoro" && <Pomodoro />}
      {sub === "exercise" && <ExercisePlans />}
      {sub === "analytics" && <Analytics />}
      {sub === "settings" && <Settings />}
    </div>
  );
}
