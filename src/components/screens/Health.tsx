"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { isHealthAvailable, requestHealthPermission, getTodayStats } from "@/lib/health-native";
import { Card, ProgressBar, Modal, Field, inputClass, Button, SectionTitle } from "../ui";
import type { MoodValue } from "@/lib/types";

const MOODS: { value: MoodValue; emoji: string; label: string }[] = [
  { value: 0, emoji: "😫", label: "Rough" },
  { value: 1, emoji: "😕", label: "Meh" },
  { value: 2, emoji: "😐", label: "OK" },
  { value: 3, emoji: "🙂", label: "Good" },
  { value: 4, emoji: "😁", label: "Great" },
];

export function Health() {
  const { state, getHealthDay, setWater, setCaloriesBurned, setSteps, setMood, setRestingHeartRate } = useStore();
  const hd = getHealthDay();
  const goals = state.healthGoals;

  const [editing, setEditing] = useState<null | "hr" | "water" | "cal">(null);
  const [val, setVal] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const syncFromHealth = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const available = await isHealthAvailable();
      if (!available) {
        setSyncMsg("Health data isn't available on this device.");
        return;
      }
      await requestHealthPermission();
      const stats = await getTodayStats();
      if (!stats) {
        setSyncMsg("Couldn't read health data — check permissions in Settings.");
        return;
      }
      setSteps(stats.steps);
      setCaloriesBurned(stats.activeCalories);
      setSyncMsg(`Synced: ${stats.steps} steps, ${stats.activeCalories} kcal`);
    } finally {
      setSyncing(false);
    }
  };

  const openEdit = (type: "hr" | "water" | "cal") => {
    setEditing(type);
    setVal(type === "hr" ? String(goals.restingHeartRate) : type === "water" ? String(hd.water) : String(hd.caloriesBurned));
  };

  const save = () => {
    const n = parseInt(val, 10);
    if (!Number.isNaN(n)) {
      if (editing === "hr") setRestingHeartRate(n);
      if (editing === "water") setWater(n);
      if (editing === "cal") setCaloriesBurned(n);
    }
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      <header className="pt-1">
        <h1 className="text-2xl font-black text-white">Health</h1>
        <p className="text-sm text-neutral-400">Your wellness at a glance</p>
      </header>

      {/* Heart rate */}
      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-4xl font-black text-white">
              ❤️ {goals.restingHeartRate}
              <span className="text-lg text-neutral-500 font-semibold"> BPM</span>
            </div>
            <p className="mt-1 text-xs text-neutral-400">Resting HR</p>
          </div>
          <EditBtn onClick={() => openEdit("hr")} />
        </div>
      </Card>

      {/* Water */}
      <Card className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-3xl font-black text-white">
              💧 {hd.water}
              <span className="text-lg text-neutral-500 font-semibold"> cups</span>
            </div>
            <p className="mt-1 text-xs text-neutral-400">{goals.waterGoal} cups goal</p>
          </div>
          <EditBtn onClick={() => openEdit("water")} />
        </div>
        <ProgressBar value={(hd.water / goals.waterGoal) * 100} />
        {/* tappable circles */}
        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold text-neutral-400">
            {hd.water}/{goals.waterGoal} cups
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: goals.waterGoal }).map((_, i) => {
              const filled = i < hd.water;
              return (
                <button
                  key={i}
                  onClick={() => setWater(filled && i + 1 === hd.water ? i : i + 1)}
                  className={`h-9 w-9 rounded-full border-2 flex items-center justify-center text-lg transition-all active:scale-90 ${
                    filled ? "bg-[#a855f7]/20 border-[#a855f7] text-[#c99bf7]" : "border-white/15 text-neutral-600"
                  }`}
                  aria-label={`Set water to ${i + 1}`}
                >
                  {filled ? "●" : "○"}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Steps */}
      <Card className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-3xl font-black text-white">
              👣 {hd.steps.toLocaleString()}
            </div>
            <p className="mt-1 text-xs text-neutral-400">10,000 steps goal</p>
          </div>
        </div>
        <ProgressBar value={(hd.steps / 10000) * 100} />
      </Card>

      {/* Sync from device Health app */}
      <button
        onClick={syncFromHealth}
        disabled={syncing}
        className="w-full rounded-xl border border-[#a855f7]/30 bg-[#a855f7]/10 px-4 py-3 text-sm font-semibold text-[#c99bf7] active:scale-95 transition-all disabled:opacity-50"
      >
        {syncing ? "Syncing…" : "🔄 Sync steps & calories from Health"}
      </button>
      {syncMsg && <p className="text-xs text-center text-neutral-400 -mt-2">{syncMsg}</p>}

      {/* Calories burned */}
      <Card className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-3xl font-black text-white">
              🔥 {hd.caloriesBurned}
              <span className="text-lg text-neutral-500 font-semibold"> kcal</span>
            </div>
            <p className="mt-1 text-xs text-neutral-400">{goals.caloriesGoal} kcal goal</p>
          </div>
          <EditBtn onClick={() => openEdit("cal")} />
        </div>
        <ProgressBar value={(hd.caloriesBurned / goals.caloriesGoal) * 100} />
      </Card>

      {/* Mood */}
      <Card className="p-5">
        <SectionTitle>Today&apos;s Mood</SectionTitle>
        <div className="flex justify-between gap-1.5">
          {MOODS.map((m) => {
            const selected = hd.mood === m.value;
            return (
              <button
                key={m.value}
                onClick={() => setMood(m.value)}
                className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-3 transition-all active:scale-95 ${
                  selected ? "bg-[#a855f7]/20 border border-[#a855f7]" : "bg-white/5 border border-transparent"
                }`}
              >
                <span className="text-2xl">{m.emoji}</span>
                <span className={`text-[10px] font-semibold ${selected ? "text-[#c99bf7]" : "text-neutral-400"}`}>
                  {m.label}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "hr" ? "Resting Heart Rate" : editing === "water" ? "Water (cups)" : "Calories Burned"}
      >
        <Field label="Value">
          <input
            type="number"
            className={inputClass}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            autoFocus
            inputMode="numeric"
          />
        </Field>
        <div className="flex gap-2 mt-2">
          <Button variant="ghost" className="flex-1" onClick={() => setEditing(null)}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={save}>
            Save
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function EditBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="h-9 w-9 rounded-xl bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white flex items-center justify-center"
      aria-label="Edit"
    >
      ✏️
    </button>
  );
}
