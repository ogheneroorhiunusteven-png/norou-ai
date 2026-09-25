"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import type { WorkoutPlan, Exercise } from "@/lib/types";
import { Card, Modal, Field, inputClass, Button, EmptyState } from "../../ui";

function newExercise(): Exercise {
  return { id: Math.random().toString(36).slice(2, 8), name: "", sets: "", reps: "" };
}

export function ExercisePlans() {
  const { state, addWorkout, updateWorkout, deleteWorkout } = useStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WorkoutPlan | null>(null);
  const [name, setName] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([newExercise()]);

  const openAdd = () => {
    setEditing(null);
    setName("");
    setExercises([newExercise()]);
    setOpen(true);
  };
  const openEdit = (w: WorkoutPlan) => {
    setEditing(w);
    setName(w.name);
    setExercises(w.exercises.length ? w.exercises.map((e) => ({ ...e })) : [newExercise()]);
    setOpen(true);
  };
  const save = () => {
    if (!name.trim()) return;
    const cleaned = exercises.filter((e) => e.name.trim()).map((e) => ({ ...e, name: e.name.trim() }));
    if (editing) updateWorkout({ ...editing, name: name.trim(), exercises: cleaned });
    else addWorkout({ name: name.trim(), exercises: cleaned });
    setOpen(false);
  };

  const updateEx = (id: string, patch: Partial<Exercise>) => {
    setExercises((list) => list.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={openAdd}>+ New Workout</Button>
      </div>
      {state.workouts.length === 0 ? (
        <Card>
          <EmptyState icon="🏋️" text="No workout plans yet." />
        </Card>
      ) : (
        state.workouts.map((w) => (
          <Card key={w.id} className="p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="font-bold text-white">{w.name}</div>
              <div className="flex shrink-0 gap-1">
                <button onClick={() => openEdit(w)} className="h-8 w-8 rounded-lg text-neutral-400 hover:bg-white/10 flex items-center justify-center">✏️</button>
                <button onClick={() => deleteWorkout(w.id)} className="h-8 w-8 rounded-lg text-red-400 hover:bg-red-500/10 flex items-center justify-center">🗑️</button>
              </div>
            </div>
            {w.exercises.length === 0 ? (
              <p className="text-xs text-neutral-500">No exercises added.</p>
            ) : (
              <ul className="space-y-1.5">
                {w.exercises.map((e) => (
                  <li key={e.id} className="flex items-center justify-between text-sm">
                    <span className="text-neutral-200">{e.name}</span>
                    {(e.sets || e.reps) && (
                      <span className="text-xs text-neutral-400">
                        {e.sets || "-"} × {e.reps || "-"}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit Workout" : "New Workout"}>
        <Field label="Workout name">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">Exercises</div>
        <div className="space-y-2 mb-3">
          {exercises.map((e) => (
            <div key={e.id} className="grid grid-cols-[1fr_54px_54px_32px] gap-2 items-center">
              <input className={inputClass} placeholder="Exercise" value={e.name} onChange={(ev) => updateEx(e.id, { name: ev.target.value })} />
              <input className={`${inputClass} text-center`} placeholder="Sets" value={e.sets} onChange={(ev) => updateEx(e.id, { sets: ev.target.value })} />
              <input className={`${inputClass} text-center`} placeholder="Reps" value={e.reps} onChange={(ev) => updateEx(e.id, { reps: ev.target.value })} />
              <button
                onClick={() => setExercises((l) => (l.length > 1 ? l.filter((x) => x.id !== e.id) : l))}
                className="h-9 w-8 rounded-lg text-red-400 hover:bg-red-500/10 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <Button variant="ghost" className="w-full mb-3" onClick={() => setExercises((l) => [...l, newExercise()])}>
          + Add exercise
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
          <Button className="flex-1" onClick={save}>Save</Button>
        </div>
      </Modal>
    </div>
  );
}
