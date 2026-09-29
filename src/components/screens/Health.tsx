"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { isHealthAvailable, requestHealthPermission, getTodayStats } from "@/lib/health-native";
import { Card, ProgressBar, Modal, Field, inputClass, Button } from "../ui";
import type { MoodValue } from "@/lib/types";
import { ExerciseCoach } from "../ExerciseCoach";

const MOODS: { value: MoodValue; emoji: string; label: string }[] = [{ value: 0, emoji: "😫", label: "Rough" }, { value: 1, emoji: "😕", label: "Meh" }, { value: 2, emoji: "😐", label: "OK" }, { value: 3, emoji: "🙂", label: "Good" }, { value: 4, emoji: "😁", label: "Great" }];

export function Health() {
  const { state, getHealthDay, setWater, setCaloriesBurned, setSteps, setMood, setRestingHeartRate } = useStore();
  const hd = getHealthDay(); const goals = state.healthGoals;
  const [editing, setEditing] = useState<null | "hr" | "water" | "cal">(null); const [val, setVal] = useState(""); const [syncing, setSyncing] = useState(false); const [exerciseCoach, setExerciseCoach] = useState(false); const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const waterPct = goals.waterGoal ? Math.min(100, hd.water / goals.waterGoal * 100) : 0; const stepsPct = Math.min(100, hd.steps / 10000 * 100); const calPct = goals.caloriesGoal ? Math.min(100, hd.caloriesBurned / goals.caloriesGoal * 100) : 0;

  const syncFromHealth = async () => { setSyncing(true); setSyncMsg(null); try { if (!(await isHealthAvailable())) return setSyncMsg("Health data isn't available on this device."); await requestHealthPermission(); const stats = await getTodayStats(); if (!stats) return setSyncMsg("Couldn't read health data — check permissions in Settings."); setSteps(stats.steps); setCaloriesBurned(stats.activeCalories); setSyncMsg(`Synced: ${stats.steps} steps, ${stats.activeCalories} kcal`); } finally { setSyncing(false); } };
  const openEdit = (type: "hr" | "water" | "cal") => { setEditing(type); setVal(type === "hr" ? String(goals.restingHeartRate) : type === "water" ? String(hd.water) : String(hd.caloriesBurned)); };
  const save = () => { const n = parseInt(val, 10); if (!Number.isNaN(n)) { if (editing === "hr") setRestingHeartRate(n); if (editing === "water") setWater(n); if (editing === "cal") setCaloriesBurned(n); } setEditing(null); };

  return <div className="space-y-4 pb-4">
    <header className="norou-page-head pt-1"><div><div className="norou-eyebrow">NOVA WELLNESS</div><h1>Wellness</h1><p>Your daily health signals, movement and recovery tools.</p></div><button className="norou-money-add" onClick={() => setExerciseCoach(true)}>Exercise →</button></header>

    <Card className="norou-wellness-hero p-5"><div className="norou-eyebrow">TODAY&apos;S MOMENTUM</div><div className="flex items-end justify-between gap-4 mt-2"><div><strong className="norou-wellness-number">{hd.steps.toLocaleString()}</strong><div className="text-xs text-neutral-500 mt-1">steps logged today</div></div><div className="norou-wellness-orbit"><span>⌁</span></div></div><div className="mt-5 h-2 rounded-full bg-white/7 overflow-hidden"><div className="h-full rounded-full bg-[#a855f7]" style={{ width: `${stepsPct}%` }} /></div><div className="mt-2 flex justify-between text-[9px] font-bold text-neutral-600"><span>{Math.round(stepsPct)}% of movement goal</span><span>10,000 steps</span></div></Card>

    <section className="norou-wellness-grid">
      <Card className="p-4"><span className="norou-wellness-kicker">WATER</span><strong>{hd.water}</strong><small>/ {goals.waterGoal} cups</small><div className="mt-3 h-1.5 rounded-full bg-white/7 overflow-hidden"><div className="h-full rounded-full bg-[#a855f7]" style={{ width: `${waterPct}%` }} /></div><button onClick={() => openEdit("water")} className="norou-wellness-link">Update</button></Card>
      <Card className="p-4"><span className="norou-wellness-kicker">RESTING HR</span><strong>{goals.restingHeartRate}</strong><small>BPM</small><div className="norou-wellness-mini">Daily signal</div><button onClick={() => openEdit("hr")} className="norou-wellness-link">Update</button></Card>
      <Card className="p-4"><span className="norou-wellness-kicker">ACTIVE</span><strong>{hd.caloriesBurned}</strong><small>kcal</small><div className="mt-3 h-1.5 rounded-full bg-white/7 overflow-hidden"><div className="h-full rounded-full bg-[#c99bf7]" style={{ width: `${calPct}%` }} /></div><button onClick={() => openEdit("cal")} className="norou-wellness-link">Update</button></Card>
    </section>

    <Card className="norou-wellness-coach p-4"><div className="flex items-center gap-3"><div className="norou-wellness-coach-icon">✦</div><div className="flex-1"><div className="font-black text-white">Exercise Coach</div><div className="text-[10px] text-neutral-500 mt-1">Guided movement demos, phases and form cues.</div></div><button onClick={() => setExerciseCoach(true)} className="norou-small-action">Open</button></div></Card>
    <button onClick={syncFromHealth} disabled={syncing} className="w-full rounded-2xl border border-[#a855f7]/20 bg-[#a855f7]/7 px-4 py-3 text-xs font-bold text-[#c99bf7] disabled:opacity-50">{syncing ? "Syncing device health…" : "↻ Sync from device Health"}</button>
    {syncMsg && <p className="text-[10px] text-center text-neutral-500">{syncMsg}</p>}

    <Card className="p-4"><div className="norou-eyebrow">CHECK-IN</div><div className="flex items-center justify-between gap-3 mt-2"><div><div className="font-black text-white">How are you feeling?</div><div className="text-[10px] text-neutral-600 mt-1">A simple daily check-in for your own record.</div></div></div><div className="flex gap-1.5 mt-4">{MOODS.map((m) => <button key={m.value} onClick={() => setMood(m.value)} className={`flex-1 rounded-xl py-3 border transition ${hd.mood === m.value ? "border-[#a855f7] bg-[#a855f7]/12" : "border-white/5 bg-white/[.025]"}`}><span className="text-xl">{m.emoji}</span><span className="block text-[8px] font-bold text-neutral-500 mt-1">{m.label}</span></button>)}</div></Card>

    {exerciseCoach && <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/95 px-4 pt-5 pb-10 backdrop-blur-md"><div className="mx-auto max-w-2xl"><ExerciseCoach onClose={() => setExerciseCoach(false)} /></div></div>}
    <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "hr" ? "Resting heart rate" : editing === "water" ? "Water (cups)" : "Active calories"}><Field label="Value"><input type="number" className={inputClass} value={val} onChange={(e) => setVal(e.target.value)} autoFocus /></Field><div className="flex gap-2 mt-2"><Button variant="ghost" className="flex-1" onClick={() => setEditing(null)}>Cancel</Button><Button className="flex-1" onClick={save}>Save</Button></div></Modal>
  </div>;
}
