"use client";

import { useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { sendChatMessage, sendVisionMessage } from "@/lib/assistant";
import { levelInfo } from "@/lib/xp";
import { dayProgress, meaningfulProgress } from "@/lib/logic";
import { dateKey } from "@/lib/date";
import { Card, Button, ProgressBar, SectionTitle, inputClass } from "../../ui";
import { NorouOrb } from "../../NorouOrb";

const SKILLS = [
  { icon: "💻", name: "Coding", cats: ["project", "coursework"], color: "Code" },
  { icon: "📚", name: "Education", cats: ["study", "research", "college"], color: "Learn" },
  { icon: "💪", name: "Fitness", cats: ["gym"], color: "Health" },
  { icon: "🧠", name: "Discipline", cats: ["prep", "other"], color: "Habits" },
  { icon: "☁️", name: "Cloud", cats: ["project", "research"], color: "Cloud" },
] as const;

const PERMISSION_DEFAULTS = [
  ["calendar", "Read calendar", "read"],
  ["notes", "Read notes", "read"],
  ["tasks", "Read and update tasks", "suggest"],
  ["notifications", "Suggest notifications", "suggest"],
  ["external", "External actions", "ask"],
] as const;

type PermissionLevel = "off" | "read" | "suggest" | "ask";
type HoloState = "idle" | "thinking" | "planning" | "searching" | "speaking" | "offline";

function permissionStore(): Record<string, PermissionLevel> {
  if (typeof window === "undefined") return Object.fromEntries(PERMISSION_DEFAULTS.map(([id, , level]) => [id, level]));
  try {
    const saved = JSON.parse(localStorage.getItem("norou:permissions") || "null");
    return { ...Object.fromEntries(PERMISSION_DEFAULTS.map(([id, , level]) => [id, level])), ...(saved || {}) };
  } catch { return Object.fromEntries(PERMISSION_DEFAULTS.map(([id, , level]) => [id, level])); }
}

export function NorouOS() {
  const { state, addTask, addGoal, addNote, toggleTask, showToast } = useStore();
  const [busy, setBusy] = useState(false);
  const [visionBusy, setVisionBusy] = useState(false);
  const [goalText, setGoalText] = useState("");
  const [breakdownText, setBreakdownText] = useState("");
  const [visionPrompt, setVisionPrompt] = useState("Explain what you see and highlight anything important.");
  const [visionResult, setVisionResult] = useState<string | null>(null);
  const [plannerResult, setPlannerResult] = useState<string | null>(null);
  const [tutorInput, setTutorInput] = useState("");
  const [tutorResult, setTutorResult] = useState<string | null>(null);
  const [autopilot, setAutopilot] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [holoState, setHoloState] = useState<HoloState>("idle");
  const [permissions, setPermissions] = useState<Record<string, PermissionLevel>>(permissionStore);
  const fileRef = useRef<HTMLInputElement>(null);

  const li = levelInfo(state.xp);
  const dp = dayProgress(state);
  const mp = meaningfulProgress(state);
  const openTasks = state.tasks.filter((t) => !t.completed);
  const highPriority = openTasks.filter((t) => t.priority === "high").length;
  const weekAnalytics = Object.values(state.analytics).slice(-7);
  const weekCompletion = weekAnalytics.length ? Math.round(weekAnalytics.reduce((s, d) => s + d.completionPct, 0) / weekAnalytics.length) : mp.pct;

  const nextActions = useMemo(() => {
    return [...openTasks].sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority])).slice(0, 3);
  }, [openTasks]);

  const context = useMemo(() => {
    const today = dateKey();
    const events = state.calendarEvents.filter((e) => e.date === today);
    const notes = state.notes.slice().sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3);
    const goal = state.goals.find((g) => !g.completed);
    return { today, events, notes, goal };
  }, [state]);

  const setStatus = (status: HoloState) => {
    setHoloState(status);
    if (status !== "idle") window.setTimeout(() => setHoloState("idle"), 1800);
  };

  const buildPlan = async () => {
    if (busy) return;
    setBusy(true); setStatus("planning");
    try {
      const prompt = `Build my plan for today using my scheduled activities, open tasks and goals. Give me 4-6 concrete next actions in time order. Keep it realistic and concise.`;
      const reply = await sendChatMessage([{ role: "user", content: prompt }], state, "chat");
      setPlannerResult(reply.text);
    } catch (e) { setPlannerResult(e instanceof Error ? e.message : "Planner unavailable."); }
    finally { setBusy(false); }
  };

  const runAutopilot = () => {
    if (autopilot) return;
    setAutopilot(true); setStatus("planning");
    const priority = [...openTasks].sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority])).slice(0, 3);
    if (!priority.length) {
      addTask({ title: "Plan tomorrow with Nova", dueDate: context.today, completed: false, priority: "medium", category: "Autopilot", tags: ["norou-autopilot"], recurrence: "none" });
    } else {
      priority.forEach((task, i) => {
        if (i === 0) showToast(`Autopilot selected: ${task.title}`);
      });
    }
    setPlannerResult(`AUTOPILOT READY\n\n${priority.length ? priority.map((t, i) => `${i + 1}. ${t.title}`).join("\n") : "1. Plan tomorrow with Nova"}\n\nNova will keep consequential actions behind confirmation.`);
    window.setTimeout(() => setAutopilot(false), 900);
  };

  const breakdown = () => {
    const title = breakdownText.trim(); if (!title) return;
    const steps = title.toLowerCase().includes("coursework") || title.toLowerCase().includes("assignment")
      ? ["Read the brief and list the requirements", "Gather the information or sources", "Complete the first section", "Complete the remaining sections", "Review, proofread and submit"]
      : title.toLowerCase().includes("study") || title.toLowerCase().includes("learn")
        ? ["Choose the exact topic", "Collect or review your core material", "Study one focused section", "Test yourself without notes", "Review weak areas"]
        : ["Define the finished outcome", "Gather what you need", "Do the first concrete piece", "Finish the remaining pieces", "Review and mark it complete"];
    steps.forEach((step) => addTask({ title: step, dueDate: undefined, completed: false, priority: "medium", category: title.slice(0, 24), tags: ["norou-breakdown"], recurrence: "none" }));
    showToast(`${steps.length} subtasks added ✓`); setBreakdownText("");
  };

  const createGoal = () => {
    const title = goalText.trim(); if (!title) return;
    addGoal({ title, targetDate: undefined, completed: false, progress: 0 });
    showToast("Goal created ✓"); setGoalText("");
  };

  const tutor = async () => {
    const value = tutorInput.trim(); if (!value || busy) return;
    setBusy(true); setStatus("thinking");
    try {
      const reply = await sendChatMessage([{ role: "user", content: `You are Nova Tutor. Teach this clearly, then give me 3 questions to check understanding. Do not simply give an answer if this is homework.\n\n${value}` }], state, "study");
      setTutorResult(reply.text);
    } catch (e) { setTutorResult(e instanceof Error ? e.message : "Tutor unavailable."); }
    finally { setBusy(false); }
  };

  const onImage = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { showToast("Choose an image file"); return; }
    if (file.size > 8 * 1024 * 1024) { showToast("Image is too large (max 8 MB)"); return; }
    const reader = new FileReader(); reader.onload = () => setImageUrl(typeof reader.result === "string" ? reader.result : null); reader.readAsDataURL(file);
  };

  const analyseImage = async () => {
    if (!imageUrl || visionBusy) return;
    setVisionBusy(true); setVisionResult(null); setStatus("searching");
    try { const reply = await sendVisionMessage(imageUrl, visionPrompt.trim() || "Explain this image.", state); setVisionResult(reply.text); }
    catch (e) { setVisionResult(e instanceof Error ? e.message : "Vision analysis failed."); }
    finally { setVisionBusy(false); }
  };

  const savePermission = (id: string, value: PermissionLevel) => {
    const next = { ...permissions, [id]: value }; setPermissions(next);
    try { localStorage.setItem("norou:permissions", JSON.stringify(next)); } catch {}
  };

  const statusText: Record<HoloState, string> = { idle: "NOVA ONLINE", thinking: "THINKING", planning: "PLANNING", searching: "SEARCHING", speaking: "SPEAKING", offline: "OFFLINE MODE" };
  const memoryCount = state.memories.length;
  const todayKey = dateKey();
  const momentum = Math.min(100, Math.round((weekCompletion * 0.65) + (Math.min(state.streak.current, 14) / 14) * 35));
  const activeGoal = state.goals.find(g => !g.completed);
  const recoveryNeeded = openTasks.length >= 4 || weekCompletion < 55;
  const proactive = useMemo(() => {
    const suggestions: string[] = [];
    if (highPriority) suggestions.push(`You have ${highPriority} high-priority task${highPriority === 1 ? "" : "s"} open.`);
    if (activeGoal && activeGoal.progress < 50) suggestions.push(`Your goal “${activeGoal.title}” is at ${activeGoal.progress}%.`);
    if (context.events.length === 0) suggestions.push("There are no calendar events today, so Nova can help you use the open time deliberately.");
    if (!suggestions.length) suggestions.push("Your current plan is clear. Nova can help you choose the next useful action.");
    return suggestions.slice(0, 2);
  }, [highPriority, activeGoal, context.events.length]);

  return (
    <div className="space-y-4">
      <Card className="norou-os-hero p-5">
        <div className="flex items-center gap-4">
          <NorouOrb size="compact" active={holoState !== "idle"} onClick={() => window.dispatchEvent(new CustomEvent("norou:open"))} />
          <div className="min-w-0 flex-1"><div className="text-[10px] font-black tracking-[.25em] text-[#b88cff]">{statusText[holoState]}</div><h2 className="text-2xl font-black text-white mt-1">Nova OS</h2><p className="text-xs text-neutral-400 mt-1">Your context-aware personal AI operating layer.</p></div>
          <div className="text-right"><div className="text-xl font-black text-white">Lv {li.level}</div><div className="text-[10px] text-neutral-500">{state.xp} XP</div></div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-5"><div className="rounded-2xl bg-black/25 p-3"><div className="text-lg font-black text-white">🔥 {state.streak.current}</div><div className="text-[9px] text-neutral-500">STREAK</div></div><div className="rounded-2xl bg-black/25 p-3"><div className="text-lg font-black text-white">{memoryCount}</div><div className="text-[9px] text-neutral-500">MEMORIES</div></div><div className="rounded-2xl bg-black/25 p-3"><div className="text-lg font-black text-white">{weekCompletion}%</div><div className="text-[9px] text-neutral-500">WEEK</div></div></div>
      </Card>

      <Card className="p-5">
        <SectionTitle>🔮 Proactive Brain</SectionTitle>
        <p className="text-xs text-neutral-500 mb-3">Nova watches your local context and surfaces useful next steps without silently changing anything.</p>
        <div className="space-y-2">{proactive.map((item) => <div key={item} className="rounded-2xl bg-[#a855f7]/10 border border-[#a855f7]/15 p-3 text-sm text-neutral-200">{item}</div>)}</div>
      </Card>

      <Card className="p-5">
        <SectionTitle>🔥 Momentum</SectionTitle>
        <div className="flex items-end justify-between mb-2"><div><div className="text-4xl font-black text-white">{momentum}</div><div className="text-xs text-neutral-500">momentum score</div></div><div className="text-right text-xs text-neutral-500">Based on consistency, progress and streaks</div></div>
        <ProgressBar value={momentum} />
      </Card>

      <Card className="p-5">
        <SectionTitle>🧠 Context Engine</SectionTitle>
        <p className="text-xs text-neutral-500 mb-3">Nova connects what is happening now instead of treating every feature as a separate app.</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white/5 p-3"><div className="text-[10px] uppercase text-neutral-500">Today</div><div className="text-sm font-bold text-white mt-1">{context.events.length} calendar event{context.events.length === 1 ? "" : "s"}</div></div>
          <div className="rounded-xl bg-white/5 p-3"><div className="text-[10px] uppercase text-neutral-500">Focus</div><div className="text-sm font-bold text-white mt-1">{nextActions[0]?.title || "Nothing urgent"}</div></div>
          <div className="rounded-xl bg-white/5 p-3"><div className="text-[10px] uppercase text-neutral-500">Goal</div><div className="text-sm font-bold text-white mt-1">{context.goal?.title || "No active goal"}</div></div>
          <div className="rounded-xl bg-white/5 p-3"><div className="text-[10px] uppercase text-neutral-500">Recent note</div><div className="text-sm font-bold text-white mt-1">{context.notes[0]?.title || "No recent note"}</div></div>
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle>📋 Weekly Review</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-white/5 p-3"><div className="text-xl font-black text-white">{weekCompletion}%</div><div className="text-[10px] text-neutral-500">completion</div></div>
          <div className="rounded-xl bg-white/5 p-3"><div className="text-xl font-black text-white">{state.xp}</div><div className="text-[10px] text-neutral-500">XP total</div></div>
          <div className="rounded-xl bg-white/5 p-3"><div className="text-xl font-black text-white">{state.streak.current}</div><div className="text-[10px] text-neutral-500">streak</div></div>
        </div>
        <div className="mt-3 text-xs leading-5 text-neutral-400">This week's review combines your recorded analytics, tasks and streak data. Use Autopilot to turn the review into a concrete next plan.</div>
      </Card>

      <Card className="p-5">
        <SectionTitle>🧭 Mission Mode</SectionTitle>
        {activeGoal ? <><div className="flex items-center justify-between"><div className="text-sm font-bold text-white">{activeGoal.title}</div><div className="text-xs text-neutral-500">{activeGoal.progress}%</div></div><ProgressBar value={activeGoal.progress} /><div className="mt-3 text-xs text-neutral-500">{openTasks.length ? `${Math.min(5, openTasks.length)} open tasks can become mission objectives.` : "Create tasks to turn this goal into a mission."}</div></> : <p className="text-sm text-neutral-500">Create a goal and Nova will use it as your active mission.</p>}
      </Card>

      <Card className="p-5">
        <SectionTitle>🛟 Recovery Mode</SectionTitle>
        {recoveryNeeded ? <><p className="text-sm text-neutral-300">You have a heavier workload or lower recent completion. Recovery Mode focuses on the smallest useful next step.</p><Button className="w-full mt-3" onClick={() => { const target = nextActions[0]; if (target) { showToast(`Recovery focus: ${target.title}`); window.dispatchEvent(new CustomEvent("norou:focus", { detail: { minutes: 15, task: target.title } })); } else { showToast("Nothing needs recovery right now."); } }}>Start 15-minute recovery →</Button></> : <p className="text-sm text-emerald-300">✓ No recovery warning right now. Keep your current pace.</p>}
      </Card>

      <Card className="p-5" id="norou-autopilot">
        <SectionTitle>🤖 Autopilot</SectionTitle>
        <p className="text-xs text-neutral-500 mb-3">Builds a suggested sequence from your current tasks and goals. Nova never performs consequential external actions silently.</p>
        <Button className="w-full" onClick={runAutopilot} disabled={autopilot}>{autopilot ? "Preparing Autopilot…" : "Start Autopilot →"}</Button>
        {plannerResult && <div className="mt-4 rounded-2xl bg-white/5 p-4 text-sm leading-6 text-neutral-200 whitespace-pre-wrap">{plannerResult}</div>}
      </Card>

      <Card className="p-5">
        <SectionTitle>⚡ Today Command</SectionTitle>
        <div className="flex items-end justify-between gap-4 mb-2"><div><div className="text-4xl font-black text-[#a855f7]">{mp.pct}%</div><div className="text-xs text-neutral-500">meaningful progress today</div></div><div className="text-right text-xs text-neutral-400">{dp.completed}/{dp.total} activities<br/>{openTasks.length} open tasks</div></div>
        <ProgressBar value={mp.pct} />
        <div className="grid grid-cols-2 gap-2 mt-4"><Button onClick={buildPlan} disabled={busy}>{busy ? "Planning…" : "📅 Build my day"}</Button><Button variant="ghost" onClick={() => nextActions[0] && toggleTask(nextActions[0].id)}>✓ Complete next</Button></div>
      </Card>

      <Card className="p-5"><SectionTitle>🎯 Recommended next actions</SectionTitle>{nextActions.length === 0 ? <p className="text-sm text-neutral-500">No open tasks. Add a task or create a goal.</p> : <div className="space-y-2">{nextActions.map((t, i) => <div key={t.id} className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3"><span className="h-7 w-7 rounded-full bg-[#a855f7]/15 text-[#c99bf7] flex items-center justify-center text-xs font-black">{i + 1}</span><div className="min-w-0 flex-1"><div className="text-sm font-semibold text-white truncate">{t.title}</div><div className="text-[11px] text-neutral-500">{t.priority} priority</div></div></div>)}</div>}{highPriority > 0 && <div className="mt-3 text-xs text-[#fbbf24]">⚠️ {highPriority} high-priority task{highPriority === 1 ? "" : "s"} need attention.</div>}</Card>

      <Card className="p-5"><SectionTitle>🧩 Auto Task Breakdown</SectionTitle><p className="text-xs text-neutral-500 mb-3">Turn a large outcome into small local tasks.</p><input className={inputClass} value={breakdownText} onChange={(e) => setBreakdownText(e.target.value)} placeholder="e.g. Finish my IT coursework" /><Button className="w-full mt-2" onClick={breakdown} disabled={!breakdownText.trim()}>Break into tasks →</Button></Card>

      <Card className="p-5"><SectionTitle>🎯 Goal Command</SectionTitle><input className={inputClass} value={goalText} onChange={(e) => setGoalText(e.target.value)} placeholder="e.g. Become a cloud engineer" /><Button className="w-full mt-2" onClick={createGoal} disabled={!goalText.trim()}>Create goal →</Button></Card>

      <Card className="p-5"><SectionTitle>🌳 Skill Tree</SectionTitle><p className="text-xs text-neutral-500 mb-3">Skills grow from activity, learning and completed work.</p><div className="space-y-3">{SKILLS.map((skill) => { const activityCount = state.activities.filter((a) => skill.cats.includes(a.category as never)).length; const completed = state.tasks.filter((t) => t.completed && (t.category || "").toLowerCase().includes(skill.name.toLowerCase().split(" ")[0])).length; const value = Math.min(100, activityCount * 10 + completed * 15 + (skill.name === "Discipline" ? state.streak.current * 3 : 0)); return <div key={skill.name}><div className="flex justify-between text-xs mb-1"><span className="font-bold text-white">{skill.icon} {skill.name}</span><span className="text-neutral-500">{value}%</span></div><ProgressBar value={value}/><div className="text-[10px] text-neutral-600 mt-1">{skill.color} pathway · {activityCount + completed} signals</div></div>; })}</div></Card>

      <Card className="p-5"><SectionTitle>🎓 Nova Tutor</SectionTitle><p className="text-xs text-neutral-500 mb-3">Learn concepts, work through problems and test your understanding.</p><textarea className={`${inputClass} min-h-24 resize-none`} value={tutorInput} onChange={(e) => setTutorInput(e.target.value)} placeholder="What do you want to learn?"/><Button className="w-full mt-2" onClick={tutor} disabled={!tutorInput.trim() || busy}>{busy ? "Teaching…" : "Teach me →"}</Button>{tutorResult && <div className="mt-4 rounded-2xl bg-white/5 p-4 text-sm leading-6 text-neutral-200 whitespace-pre-wrap">{tutorResult}</div>}</Card>

      <Card className="p-5"><SectionTitle>🕸️ Personal Knowledge Graph</SectionTitle><p className="text-xs text-neutral-500 mb-3">A live view of how your information connects.</p><div className="flex flex-wrap gap-2">{[`${state.goals.length} Goals`, `${state.tasks.length} Tasks`, `${state.notes.length} Notes`, `${state.memories.length} Memories`, `${state.calendarEvents.length} Events`, `${state.workouts.length} Workouts`].map((x) => <span key={x} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-neutral-300">{x}</span>)}</div><div className="mt-3 rounded-2xl bg-black/20 p-4 text-xs leading-6 text-neutral-400">Goals connect to tasks. Tasks connect to calendar time. Notes and memories provide context. XP and analytics measure progress across the graph.</div></Card>

      <Card className="p-5"><SectionTitle>⚡ Quick Actions</SectionTitle><div className="grid grid-cols-2 gap-2"><Button variant="ghost" onClick={() => document.getElementById("norou-autopilot")?.scrollIntoView({behavior:"smooth"})}>🤖 Autopilot</Button><Button variant="ghost" onClick={() => setTutorInput("Teach me the most important thing I should learn for my current goals.")}>🎓 Tutor</Button><Button variant="ghost" onClick={() => { addNote("Nova quick note", ""); showToast("Note created ✓"); }}>📝 New note</Button><Button variant="ghost" onClick={() => { addTask({ title: "Focus session", dueDate: todayKey, completed: false, priority: "medium", category: "Focus", tags: ["quick-action"], recurrence: "none" }); showToast("Focus task added ✓"); }}>🎯 Focus task</Button></div></Card>

      <Card className="p-5"><SectionTitle>🔐 Permission Centre</SectionTitle><p className="text-xs text-neutral-500 mb-3">Control how much autonomy each Nova tool has. External actions remain confirmation-based.</p><div className="space-y-2">{PERMISSION_DEFAULTS.map(([id, label]) => <div key={id} className="flex items-center gap-3 rounded-xl bg-white/5 p-3"><div className="flex-1"><div className="text-sm font-semibold text-white">{label}</div><div className="text-[10px] text-neutral-500">{id}</div></div><select value={permissions[id]} onChange={(e) => savePermission(id, e.target.value as PermissionLevel)} className="rounded-lg bg-[#222] border border-white/10 px-2 py-2 text-xs text-white"><option value="off">Off</option><option value="read">Read</option><option value="suggest">Suggest</option><option value="ask">Ask first</option></select></div>)}</div></Card>

      <Card className="p-5"><SectionTitle>📊 Personal Analytics</SectionTitle><div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-white/5 p-3"><div className="text-2xl font-black text-white">{weekCompletion}%</div><div className="text-[11px] text-neutral-500">7-day completion</div></div><div className="rounded-xl bg-white/5 p-3"><div className="text-2xl font-black text-white">{state.xp}</div><div className="text-[11px] text-neutral-500">lifetime XP</div></div></div></Card>

      <Card className="p-5"><SectionTitle>👁️ Vision Mode</SectionTitle><p className="text-xs text-neutral-500 mb-3">Upload an image and ask Nova to explain it.</p><input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onImage(e.target.files?.[0])}/><button onClick={() => fileRef.current?.click()} className="w-full rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center text-sm text-neutral-300">{imageUrl ? "Change image" : "📷 Choose an image"}</button>{imageUrl && <img src={imageUrl} alt="Selected for Nova vision analysis" className="mt-3 max-h-56 w-full rounded-2xl object-contain bg-black"/>}<textarea className={`${inputClass} mt-3 min-h-20 resize-none`} value={visionPrompt} onChange={(e) => setVisionPrompt(e.target.value)}/><Button className="w-full mt-2" onClick={analyseImage} disabled={!imageUrl || visionBusy}>{visionBusy ? "Analysing…" : "Analyse with Nova →"}</Button>{visionResult && <div className="mt-4 rounded-2xl bg-white/5 p-4 text-sm leading-6 text-neutral-200 whitespace-pre-wrap">{visionResult}</div>}</Card>
    </div>
  );
}
