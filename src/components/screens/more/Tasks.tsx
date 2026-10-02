"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Card, Modal, Field, inputClass, Button, EmptyState } from "../../ui";
import { formatDateShort } from "@/lib/date";
import type { TaskPriority, TaskRecurrence } from "@/lib/types";

const PRIORITY_META: Record<TaskPriority, { label: string; color: string; dot: string }> = {
  high: { label: "High", color: "text-red-400", dot: "bg-red-500" },
  medium: { label: "Medium", color: "text-amber-400", dot: "bg-amber-500" },
  low: { label: "Low", color: "text-neutral-400", dot: "bg-neutral-500" },
};

const RECURRENCE_LABEL: Record<TaskRecurrence, string> = {
  none: "One-time",
  daily: "Repeats daily",
  weekly: "Repeats weekly",
  monthly: "Repeats monthly",
};

const emptyForm = {
  title: "",
  dueDate: "",
  priority: "medium" as TaskPriority,
  category: "",
  tags: "",
  recurrence: "none" as TaskRecurrence,
};

export function Tasks() {
  const { state, addTask, toggleTask, deleteTask } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"all" | TaskPriority>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const categories = useMemo(
    () => Array.from(new Set(state.tasks.map((t) => t.category).filter((c): c is string => !!c))).sort(),
    [state.tasks],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.tasks.filter((t) => {
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (q && !t.title.toLowerCase().includes(q) && !t.tags.some((tag) => tag.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [state.tasks, search, priorityFilter, categoryFilter]);

  const active = filtered.filter((t) => !t.completed);
  const done = filtered.filter((t) => t.completed);

  const save = () => {
    if (!form.title.trim()) return;
    addTask({
      title: form.title.trim(),
      dueDate: form.dueDate || undefined,
      completed: false,
      priority: form.priority,
      category: form.category.trim() || undefined,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      recurrence: form.recurrence,
    });
    setForm(emptyForm);
    setOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>+ New Task</Button>
      </div>

      {/* Search + filters */}
      {state.tasks.length > 0 && (
        <div className="space-y-2">
          <input
            className={inputClass}
            placeholder="Search tasks or tags…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(["all", "high", "medium", "low"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border transition-all ${
                  priorityFilter === p
                    ? "bg-[#a855f7] border-[#a855f7] text-white"
                    : "border-white/15 text-neutral-400"
                }`}
              >
                {p === "all" ? "All priorities" : PRIORITY_META[p].label}
              </button>
            ))}
            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border border-white/15 text-neutral-400 bg-transparent"
              >
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      {state.tasks.length === 0 ? (
        <Card>
          <EmptyState icon="✅" text="No tasks yet. Add something to get done." />
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState icon="🔍" text="No tasks match your search/filters." />
        </Card>
      ) : (
        <div className="space-y-2">
          {[...active, ...done].map((t) => (
            <Card key={t.id} className="p-3.5">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleTask(t.id)}
                  aria-label={t.completed ? "Mark task as not done" : "Mark task as done"}
                  className={`h-6 w-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${
                    t.completed ? "bg-[#a855f7] border-[#a855f7]" : "border-white/25 hover:border-[#a855f7]"
                  }`}
                >
                  {t.completed && <span className="text-[13px] text-white">✓</span>}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${PRIORITY_META[t.priority].dot}`} />
                    <div className={`text-sm font-medium truncate ${t.completed ? "text-neutral-500 line-through" : "text-white"}`}>
                      {t.title}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[11px] text-neutral-400">
                    {t.dueDate && <span>Due {formatDateShort(t.dueDate)}</span>}
                    {t.category && <span className="text-[#c99bf7]">#{t.category}</span>}
                    {t.recurrence !== "none" && <span>🔁 {RECURRENCE_LABEL[t.recurrence]}</span>}
                    {t.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-white/5 px-1.5 py-0.5">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => deleteTask(t.id)}
                  className="h-8 w-8 rounded-lg text-red-400 hover:bg-red-500/10 flex items-center justify-center shrink-0"
                >
                  🗑️
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New Task">
        <Field label="Title">
          <input
            className={inputClass}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            autoFocus
          />
        </Field>
        <Field label="Due date (optional)">
          <input
            type="date"
            className={inputClass}
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          />
        </Field>
        <Field label="Priority">
          <div className="flex gap-2">
            {(["low", "medium", "high"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setForm({ ...form, priority: p })}
                className={`flex-1 rounded-xl py-2 text-sm font-semibold border transition-all ${
                  form.priority === p ? "bg-[#a855f7] border-[#a855f7] text-white" : "border-white/15 text-neutral-400"
                }`}
              >
                {PRIORITY_META[p].label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Category (optional)">
          <input
            className={inputClass}
            placeholder="e.g. Work, Personal"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
        </Field>
        <Field label="Tags (comma separated, optional)">
          <input
            className={inputClass}
            placeholder="e.g. urgent, calls"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
          />
        </Field>
        <Field label="Repeat">
          <select
            className={inputClass}
            value={form.recurrence}
            onChange={(e) => setForm({ ...form, recurrence: e.target.value as TaskRecurrence })}
          >
            <option value="none">One-time</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </Field>
        <div className="flex gap-2 mt-2">
          <Button variant="ghost" className="flex-1" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={save}>
            Add
          </Button>
        </div>
      </Modal>
    </div>
  );
}
