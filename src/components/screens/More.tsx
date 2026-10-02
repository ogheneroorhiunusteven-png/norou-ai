"use client";

import { useMemo, useState } from "react";
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
import { NorouOS } from "./more/NorouOS";
import { useStore } from "@/lib/store";
import { Card } from "../ui";

type Sub = "menu" | "norouos" | "assistant" | "calendar" | "memory" | "goals" | "tasks" | "notes" | "alarms" | "pomodoro" | "exercise" | "analytics" | "settings";
const ITEMS: { key: Sub; icon: string; label: string; desc: string; group: "core" | "tools" | "system" }[] = [
  { key: "norouos", icon: "✦", label: "Nova OS", desc: "AI control layer, planning & vision", group: "core" },
  { key: "assistant", icon: "◉", label: "AI Assistant", desc: "Talk through a problem or idea", group: "core" },
  { key: "memory", icon: "⌁", label: "Memory", desc: "What Nova can remember", group: "core" },
  { key: "goals", icon: "◎", label: "Goals", desc: "Longer-term direction", group: "tools" },
  { key: "tasks", icon: "✓", label: "Tasks", desc: "Things you need to get done", group: "tools" },
  { key: "calendar", icon: "▣", label: "Calendar", desc: "Events and dated reminders", group: "tools" },
  { key: "notes", icon: "≡", label: "Notes", desc: "Capture thoughts quickly", group: "tools" },
  { key: "pomodoro", icon: "◷", label: "Focus", desc: "Pomodoro focus timer", group: "tools" },
  { key: "exercise", icon: "⌁", label: "Exercise Plans", desc: "Your workout routines", group: "tools" },
  { key: "alarms", icon: "◌", label: "Alarms", desc: "Wake-up and reminders", group: "tools" },
  { key: "analytics", icon: "⌗", label: "Analytics", desc: "Progress and achievements", group: "system" },
  { key: "settings", icon: "⚙", label: "Settings", desc: "Profile, notifications & data", group: "system" },
];
const TITLES: Record<Sub, string> = { menu: "Hub", norouos: "Nova OS", assistant: "AI Assistant", calendar: "Calendar", memory: "Memory", goals: "Goals", tasks: "Tasks", notes: "Notes", alarms: "Alarms", pomodoro: "Focus", exercise: "Exercise Plans", analytics: "Analytics", settings: "Settings" };

export function More() {
  const { state } = useStore(); const [sub, setSub] = useState<Sub>("menu"); const [search, setSearch] = useState("");
  // Hooks must run before the early return below, otherwise opening a Hub item changes the hook count and crashes.
  const filteredItems = useMemo(() => { const q = search.trim().toLowerCase(); return q ? ITEMS.filter((it) => `${it.label} ${it.desc}`.toLowerCase().includes(q)) : ITEMS; }, [search]);
  if (sub !== "menu") return <div className="space-y-4 pb-4"><header className="flex items-center gap-3 pt-1"><button onClick={() => setSub("menu")} className="norou-hub-back">‹</button><div><div className="norou-eyebrow">NOVA HUB</div><h1 className="text-2xl font-black text-white">{TITLES[sub]}</h1></div></header>{sub === "norouos" && <NorouOS />}{sub === "assistant" && <Assistant />}{sub === "calendar" && <Calendar />}{sub === "memory" && <Memory />}{sub === "goals" && <Goals />}{sub === "tasks" && <Tasks />}{sub === "notes" && <Notes />}{sub === "alarms" && <Alarms />}{sub === "pomodoro" && <Pomodoro />}{sub === "exercise" && <ExercisePlans />}{sub === "analytics" && <Analytics />}{sub === "settings" && <Settings />}</div>;
  const name = state.profile.name || "there";
  return <div className="space-y-4 pb-4">
    <header className="norou-page-head pt-1"><div><div className="norou-eyebrow">NOVA HUB</div><h1>Hub</h1><p>Your control room, {name}. Everything else lives here.</p></div><div className="norou-hub-mark">✦</div></header>
    <Card className="norou-hub-hero p-5"><div className="norou-eyebrow">CONTROL ROOM</div><div className="flex items-end justify-between gap-4 mt-2"><div><strong>One place.</strong><p>Open Nova OS, talk to the assistant, manage memory, or jump into a tool.</p></div><div className="norou-hub-orbit">N</div></div><button onClick={() => setSub("norouos")} className="norou-small-action mt-4">Open Nova OS</button></Card>
    <div className="norou-hub-search"><span>⌕</span><input aria-label="Search Hub" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search Hub…" /></div>
    {(["core","tools","system"] as const).map((group) => { const groupItems = filteredItems.filter((x) => x.group === group); if (!groupItems.length) return null; return <section key={group}><div className="norou-eyebrow mb-2">{group.toUpperCase()}</div><div className="norou-hub-grid">{groupItems.map((it) => <HubItem key={it.key} item={it} onClick={() => setSub(it.key)} featured={group === "core"} />)}</div></section>; })}
    <Card className="norou-hub-footer p-4"><div className="font-black text-white">Nova OS</div><p className="text-[10px] text-neutral-600 mt-1">Your local-first workspace. AI, planning, memory and personal tools in one system.</p></Card>
  </div>;
}

function HubItem({ item, onClick, featured }: { item: (typeof ITEMS)[number]; onClick: () => void; featured?: boolean }) {
  return <button onClick={onClick} className={`norou-hub-item ${featured ? "featured" : ""}`}><span className="norou-hub-icon">{item.icon}</span><span className="min-w-0 flex-1"><strong>{item.label}</strong><small>{item.desc}</small></span><i>›</i></button>;
}
