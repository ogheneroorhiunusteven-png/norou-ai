"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import type { Goal } from "@/lib/types";
import { Card, Modal, Field, inputClass, Button, EmptyState, ProgressBar } from "../../ui";
import { formatDateShort } from "@/lib/date";

export function Goals() {
  const { state, addGoal, updateGoal, deleteGoal } = useStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [title, setTitle] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [progress, setProgress] = useState(0);

  const openAdd = () => {
    setEditing(null);
    setTitle("");
    setTargetDate("");
    setProgress(0);
    setOpen(true);
  };
  const openEdit = (g: Goal) => {
    setEditing(g);
    setTitle(g.title);
    setTargetDate(g.targetDate ?? "");
    setProgress(g.progress);
    setOpen(true);
  };
  const save = () => {
    if (!title.trim()) return;
    if (editing) {
      updateGoal({ ...editing, title: title.trim(), targetDate: targetDate || undefined, progress, completed: progress >= 100 });
    } else {
      addGoal({ title: title.trim(), targetDate: targetDate || undefined, progress, completed: progress >= 100 });
    }
    setOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={openAdd}>+ New Goal</Button>
      </div>
      {state.goals.length === 0 ? (
        <Card>
          <EmptyState icon="🎯" text="No goals yet. Set one to aim for." />
        </Card>
      ) : (
        state.goals.map((g) => (
          <Card key={g.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className={`font-semibold ${g.completed ? "text-neutral-500 line-through" : "text-white"}`}>{g.title}</div>
                {g.targetDate && <div className="text-xs text-neutral-400 mt-0.5">🗓️ {formatDateShort(g.targetDate)}</div>}
              </div>
              <div className="flex shrink-0 gap-1">
                <button onClick={() => openEdit(g)} className="h-8 w-8 rounded-lg text-neutral-400 hover:bg-white/10 flex items-center justify-center">✏️</button>
                <button onClick={() => deleteGoal(g.id)} className="h-8 w-8 rounded-lg text-red-400 hover:bg-red-500/10 flex items-center justify-center">🗑️</button>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <ProgressBar value={g.progress} className="flex-1" />
              <span className="text-xs font-bold text-[#c99bf7] w-9 text-right">{g.progress}%</span>
            </div>
          </Card>
        ))
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit Goal" : "New Goal"}>
        <Field label="Title">
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </Field>
        <Field label="Target date (optional)">
          <input type="date" className={inputClass} value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        </Field>
        <Field label={`Progress: ${progress}%`}>
          <input type="range" min={0} max={100} step={5} value={progress} onChange={(e) => setProgress(parseInt(e.target.value, 10))} className="w-full accent-[#a855f7]" />
        </Field>
        <div className="flex gap-2 mt-2">
          <Button variant="ghost" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
          <Button className="flex-1" onClick={save}>Save</Button>
        </div>
      </Modal>
    </div>
  );
}
