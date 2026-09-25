"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Card, Field, inputClass, Button, EmptyState } from "../../ui";
import { formatTimestamp } from "@/lib/date";

export function Memory() {
  const { state, addMemory, deleteMemory, clearMemories, showToast } = useStore();
  const [text, setText] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  const save = () => {
    if (!text.trim()) return;
    addMemory(text, "user");
    setText("");
  };

  return (
    <div className="space-y-3">
      <Card className="p-4">
        <p className="text-xs text-neutral-400 leading-relaxed">
          These are the facts your AI Assistant remembers about you across conversations — goals, preferences, anything
          worth it not forgetting. It saves new ones automatically during chats when something durable comes up, or you
          can add one directly here.
        </p>
      </Card>

      <Field label="Add a fact manually">
        <div className="flex gap-2">
          <input
            className={inputClass}
            placeholder="e.g. I'm training for a half marathon in May"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
          />
          <Button onClick={save} disabled={!text.trim()}>
            Add
          </Button>
        </div>
      </Field>

      {state.memories.length === 0 ? (
        <Card>
          <EmptyState icon="🧠" text="Nothing remembered yet. Chat with the assistant or add a fact above." />
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {state.memories
              .slice()
              .reverse()
              .map((m) => (
                <Card key={m.id} className="p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white">{m.text}</p>
                      <p className="text-[11px] text-neutral-500 mt-1">
                        {m.source === "ai" ? "🤖 From a chat" : "✍️ Added manually"} · {formatTimestamp(m.createdAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteMemory(m.id)}
                      className="h-8 w-8 rounded-lg text-red-400 hover:bg-red-500/10 flex items-center justify-center shrink-0"
                    >
                      🗑️
                    </button>
                  </div>
                </Card>
              ))}
          </div>

          {confirmClear ? (
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setConfirmClear(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-500/20 text-red-400 border border-red-500/30"
                onClick={() => {
                  clearMemories();
                  setConfirmClear(false);
                  showToast("Memory cleared");
                }}
              >
                Confirm clear all
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              className="w-full text-center text-xs text-red-400/80 py-2"
            >
              Clear all memory
            </button>
          )}
        </>
      )}
    </div>
  );
}
