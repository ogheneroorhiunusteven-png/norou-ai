"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { CalendarEvent } from "@/lib/types";
import { dateKey } from "@/lib/date";
import { Card, Modal, Field, inputClass, Button, EmptyState } from "../../ui";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

const emptyForm = { title: "", time: "", endTime: "", notes: "", reminder: false };

/** Days to render for a month grid, including the leading/trailing days
 *  from adjacent months needed to fill complete weeks. */
function buildMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const startOffset = first.getDay(); // 0 = Sunday
  const gridStart = new Date(year, month, 1 - startOffset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

export function Calendar() {
  const { state, addCalendarEvent, updateCalendarEvent, deleteCalendarEvent } = useStore();
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(dateKey(today));
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState(emptyForm);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const e of state.calendarEvents) {
      (map[e.date] ??= []).push(e);
    }
    for (const list of Object.values(map)) {
      list.sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99"));
    }
    return map;
  }, [state.calendarEvents]);

  const grid = useMemo(() => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const selectedEvents = eventsByDate[selectedDate] ?? [];
  const todayKey = dateKey(today);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };
  const openEdit = (e: CalendarEvent) => {
    setEditing(e);
    setForm({ title: e.title, time: e.time ?? "", endTime: e.endTime ?? "", notes: e.notes ?? "", reminder: e.reminder });
    setOpen(true);
  };

  const save = () => {
    if (!form.title.trim()) return;
    const payload = {
      title: form.title.trim(),
      date: selectedDate,
      time: form.time || undefined,
      endTime: form.endTime || undefined,
      notes: form.notes.trim() || undefined,
      reminder: form.reminder && !!form.time, // reminders need a time to fire at
    };
    if (editing) updateCalendarEvent({ ...editing, ...payload });
    else addCalendarEvent(payload);
    setOpen(false);
  };

  return (
    <div className="space-y-3">
      {/* Month header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          className="h-9 w-9 rounded-lg border border-white/10 flex items-center justify-center text-neutral-300"
        >
          ‹
        </button>
        <div className="text-sm font-bold text-white">
          {MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}
        </div>
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          className="h-9 w-9 rounded-lg border border-white/10 flex items-center justify-center text-neutral-300"
        >
          ›
        </button>
      </div>

      {/* Month grid */}
      <Card className="p-3">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAY_LABELS.map((w, i) => (
            <div key={i} className="text-center text-[10px] font-bold text-neutral-500 py-1">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map((d, i) => {
            const key = dateKey(d);
            const inMonth = d.getMonth() === cursor.getMonth();
            const hasEvents = !!eventsByDate[key]?.length;
            const isSelected = key === selectedDate;
            const isToday = key === todayKey;
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(key)}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-semibold transition-all relative ${
                  isSelected
                    ? "bg-[#a855f7] text-white"
                    : isToday
                      ? "border border-[#a855f7]/50 text-white"
                      : inMonth
                        ? "text-neutral-300 hover:bg-white/5"
                        : "text-neutral-700"
                }`}
              >
                {d.getDate()}
                {hasEvents && !isSelected && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-[#a855f7]" />}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Selected day agenda */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-white">
          {new Date(selectedDate + "T00:00:00").toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </div>
        <Button onClick={openAdd}>+ Event</Button>
      </div>

      {selectedEvents.length === 0 ? (
        <Card>
          <EmptyState icon="📅" text="No events on this day." />
        </Card>
      ) : (
        <div className="space-y-2">
          {selectedEvents.map((e) => (
            <Card key={e.id} className="p-3.5 cursor-pointer" onClick={() => openEdit(e)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-white truncate">{e.title}</div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    {e.time ? `${e.time}${e.endTime ? `–${e.endTime}` : ""}` : "All day"}
                    {e.reminder && " · 🔔"}
                  </div>
                  {e.notes && <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{e.notes}</p>}
                </div>
                <button
                  onClick={(ev) => {
                    ev.stopPropagation();
                    deleteCalendarEvent(e.id);
                  }}
                  className="h-8 w-8 rounded-lg text-red-400 hover:bg-red-500/10 flex items-center justify-center shrink-0"
                >
                  🗑️
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit Event" : "New Event"}>
        <Field label="Title">
          <input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
        </Field>
        <Field label="Time (optional — leave blank for all-day)">
          <input type="time" className={inputClass} value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
        </Field>
        <Field label="End time (optional)">
          <input type="time" className={inputClass} value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
        </Field>
        <Field label="Notes (optional)">
          <textarea
            className={`${inputClass} min-h-20 resize-y`}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm text-neutral-300 mb-2">
          <input
            type="checkbox"
            checked={form.reminder}
            onChange={(e) => setForm({ ...form, reminder: e.target.checked })}
            disabled={!form.time}
          />
          Remind me {!form.time && <span className="text-neutral-500">(needs a time above)</span>}
        </label>
        <div className="flex gap-2 mt-2">
          <Button variant="ghost" className="flex-1" onClick={() => setOpen(false)}>
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
