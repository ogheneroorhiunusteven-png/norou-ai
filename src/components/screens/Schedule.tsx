"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import type { Activity, DayIndex, ActivityCategory } from "@/lib/types";
import { activitiesForDay } from "@/lib/logic";
import { DAY_LABELS, dayIndexOf, minutesOf } from "@/lib/date";
import { ActivityRow } from "../ActivityRow";
import { Card, Modal, Field, inputClass, Button, EmptyState } from "../ui";

// build a date object for a given weekday in the current week
function dateForDay(day: DayIndex): Date {
  const d = new Date();
  const diff = day - d.getDay();
  d.setDate(d.getDate() + diff);
  return d;
}

const CATEGORIES: { value: ActivityCategory; label: string }[] = [
  { value: "wake", label: "Wake" },
  { value: "meal", label: "Meal" },
  { value: "study", label: "Study" },
  { value: "research", label: "Research" },
  { value: "coursework", label: "Coursework" },
  { value: "gym", label: "Gym" },
  { value: "college", label: "College" },
  { value: "project", label: "Personal Project" },
  { value: "prayer", label: "Prayer / Personal" },
  { value: "prep", label: "Preparation" },
  { value: "free", label: "Free time" },
  { value: "other", label: "Other" },
];

const emptyForm = {
  title: "",
  emoji: "📌",
  start: "09:00",
  end: "10:00",
  xp: "",
  category: "other" as ActivityCategory,
  days: [] as DayIndex[],
  topic: "",
  notes: "",
  findings: "",
};

export function Schedule() {
  const { state, addActivity, updateActivity, deleteActivity } = useStore();
  const [selectedDay, setSelectedDay] = useState<DayIndex>(dayIndexOf());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Activity | null>(null);

  const date = dateForDay(selectedDay);
  const acts = activitiesForDay(state, selectedDay);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, days: [selectedDay] });
    setError("");
    setOpen(true);
  };

  const openEdit = (a: Activity) => {
    setEditing(a);
    setForm({
      title: a.title,
      emoji: a.emoji,
      start: a.start,
      end: a.end,
      xp: a.xp ? String(a.xp) : "",
      category: a.category,
      days: [...a.days],
      topic: a.topic ?? "",
      notes: a.notes ?? "",
      findings: a.findings ?? "",
    });
    setError("");
    setOpen(true);
  };

  const toggleDay = (d: DayIndex) => {
    setForm((f) => ({
      ...f,
      days: f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d].sort((a, b) => a - b),
    }));
  };

  const save = () => {
    if (!form.title.trim()) {
      setError("Please enter a title.");
      return;
    }
    if (form.days.length === 0) {
      setError("Select at least one day.");
      return;
    }
    if (minutesOf(form.end) < minutesOf(form.start)) {
      setError("End time must be after start time.");
      return;
    }
    const xpNum = form.xp.trim() === "" ? 0 : parseInt(form.xp, 10);
    if (Number.isNaN(xpNum) || xpNum < 0) {
      setError("XP must be a non-negative number.");
      return;
    }
    const isResearch = form.category === "research";
    const payload = {
      title: form.title.trim(),
      emoji: form.emoji || "📌",
      start: form.start,
      end: form.end,
      xp: xpNum,
      category: form.category,
      days: form.days,
      ...(isResearch
        ? { topic: form.topic.trim() || undefined, notes: form.notes.trim() || undefined, findings: form.findings.trim() || undefined }
        : {}),
    };
    if (editing) updateActivity({ ...payload, id: editing.id });
    else addActivity(payload);
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-2xl font-black text-white">Schedule</h1>
          <p className="text-sm text-neutral-400">Your weekly plan</p>
        </div>
        <button
          onClick={openAdd}
          className="h-10 w-10 rounded-full bg-[#a855f7] text-white text-xl font-bold flex items-center justify-center active:scale-90 transition-transform"
          aria-label="Add activity"
        >
          +
        </button>
      </header>

      {/* Day selector */}
      <div className="flex gap-1.5">
        {DAY_LABELS.map((label, i) => {
          const d = i as DayIndex;
          const active = selectedDay === d;
          const isToday = dayIndexOf() === d;
          return (
            <button
              key={label}
              onClick={() => setSelectedDay(d)}
              className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all ${
                active ? "bg-[#a855f7] text-white" : "bg-[#2a2a2a] text-neutral-400 hover:text-white"
              }`}
            >
              {label}
              {isToday && <span className={`block text-[8px] ${active ? "text-white/80" : "text-[#a855f7]"}`}>today</span>}
            </button>
          );
        })}
      </div>

      {/* Activities */}
      <div className="space-y-2">
        {acts.length === 0 ? (
          <Card>
            <EmptyState icon="📅" text="No activities for this day. Tap + to add one." />
          </Card>
        ) : (
          acts.map((a) => (
            <ActivityRow key={a.id} activity={a} date={date} showActions onEdit={openEdit} onDelete={(x) => setConfirmDelete(x)} />
          ))
        )}
      </div>

      {/* Add/Edit modal */}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit Activity" : "Add Activity"}>
        <div className="grid grid-cols-[64px_1fr] gap-3">
          <Field label="Emoji">
            <input className={`${inputClass} text-center`} value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} maxLength={4} />
          </Field>
          <Field label="Title">
            <input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start time">
            <input type="time" className={inputClass} value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
          </Field>
          <Field label="End time">
            <input type="time" className={inputClass} value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="XP (blank = free time)">
            <input type="number" inputMode="numeric" className={inputClass} value={form.xp} placeholder="0" onChange={(e) => setForm({ ...form, xp: e.target.value })} />
          </Field>
          <Field label="Category">
            <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ActivityCategory })}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Days of week">
          <div className="flex gap-1.5">
            {DAY_LABELS.map((label, i) => {
              const d = i as DayIndex;
              const on = form.days.includes(d);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={`flex-1 rounded-lg py-2 text-[11px] font-bold ${on ? "bg-[#a855f7] text-white" : "bg-[#2a2a2a] text-neutral-400"}`}
                >
                  {label[0]}
                </button>
              );
            })}
          </div>
        </Field>

        {form.category === "research" && (
          <div className="rounded-xl bg-[#a855f7]/5 border border-[#a855f7]/20 p-3 mb-3">
            <p className="text-xs font-semibold text-[#c99bf7] mb-2">🔎 Research details (optional)</p>
            <Field label="Topic">
              <input className={inputClass} value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
            </Field>
            <Field label="Notes">
              <textarea className={`${inputClass} min-h-16 resize-y`} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
            <Field label="Key findings">
              <textarea className={`${inputClass} min-h-16 resize-y`} value={form.findings} onChange={(e) => setForm({ ...form, findings: e.target.value })} />
            </Field>
          </div>
        )}

        {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
        <div className="flex gap-2 mt-1">
          <Button variant="ghost" className="flex-1" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={save}>
            {editing ? "Save" : "Add"}
          </Button>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={confirmDelete !== null} onClose={() => setConfirmDelete(null)} title="Delete activity?">
        <p className="text-sm text-neutral-300 mb-4">
          Delete <span className="font-semibold text-white">{confirmDelete?.title}</span>? This cannot be undone.
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => setConfirmDelete(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => {
              if (confirmDelete) deleteActivity(confirmDelete.id);
              setConfirmDelete(null);
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
