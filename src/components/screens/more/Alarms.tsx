"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Card, Modal, Field, inputClass, Button, EmptyState } from "../../ui";

export function Alarms() {
  const { state, addAlarm, toggleAlarm, deleteAlarm } = useStore();
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState("07:00");
  const [label, setLabel] = useState("");

  const save = () => {
    addAlarm({ time, label: label.trim() || "Alarm", enabled: true });
    setLabel("");
    setTime("07:00");
    setOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>+ New Alarm</Button>
      </div>
      {state.alarms.length === 0 ? (
        <Card>
          <EmptyState icon="⏰" text="No alarms set." />
        </Card>
      ) : (
        <div className="space-y-2">
          {state.alarms.map((a) => (
            <Card key={a.id} className="p-4 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className={`text-2xl font-black ${a.enabled ? "text-white" : "text-neutral-600"}`}>{a.time}</div>
                <div className="text-xs text-neutral-400 truncate">{a.label}</div>
              </div>
              <button
                onClick={() => toggleAlarm(a.id)}
                className={`relative h-7 w-12 rounded-full transition-colors ${a.enabled ? "bg-[#a855f7]" : "bg-white/15"}`}
                aria-label="Toggle alarm"
              >
                <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all ${a.enabled ? "left-[22px]" : "left-0.5"}`} />
              </button>
              <button onClick={() => deleteAlarm(a.id)} className="h-8 w-8 rounded-lg text-red-400 hover:bg-red-500/10 flex items-center justify-center">🗑️</button>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New Alarm">
        <Field label="Time">
          <input type="time" className={inputClass} value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
        <Field label="Label">
          <input className={inputClass} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Wake up" />
        </Field>
        <div className="flex gap-2 mt-2">
          <Button variant="ghost" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
          <Button className="flex-1" onClick={save}>Add</Button>
        </div>
      </Modal>
      <p className="text-[11px] text-neutral-500 text-center px-4">
        Note: alarms are saved locally. Web browsers cannot reliably trigger sound alarms in the background.
      </p>
    </div>
  );
}
