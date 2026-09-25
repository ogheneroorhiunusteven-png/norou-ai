"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { Note } from "@/lib/types";
import { Card, Modal, Field, inputClass, Button, EmptyState } from "../../ui";
import { formatTimestamp } from "@/lib/date";

export function Notes() {
  const { state, addNote, updateNote, deleteNote } = useStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [search, setSearch] = useState("");

  const openAdd = () => {
    setEditing(null);
    setTitle("");
    setBody("");
    setOpen(true);
  };
  const openEdit = (n: Note) => {
    setEditing(n);
    setTitle(n.title);
    setBody(n.body);
    setOpen(true);
  };
  const save = () => {
    if (!title.trim() && !body.trim()) return;
    if (editing) updateNote({ ...editing, title: title.trim() || "Untitled", body });
    else addNote(title.trim() || "Untitled", body);
    setOpen(false);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return state.notes;
    return state.notes.filter(
      (n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q),
    );
  }, [state.notes, search]);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={openAdd}>+ New Note</Button>
      </div>
      {state.notes.length > 0 && (
        <input
          className={inputClass}
          placeholder="Search notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}
      {state.notes.length === 0 ? (
        <Card>
          <EmptyState icon="📝" text="No notes yet. Capture a thought." />
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState icon="🔍" text="No notes match your search." />
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <Card key={n.id} className="p-4 cursor-pointer" onClick={() => openEdit(n)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-white truncate">{n.title}</div>
                  <p className="text-xs text-neutral-400 mt-1 line-clamp-2 whitespace-pre-wrap">{n.body || "No content"}</p>
                  <div className="text-[10px] text-neutral-500 mt-2">Updated {formatTimestamp(n.updatedAt)}</div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNote(n.id);
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

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit Note" : "New Note"}>
        <Field label="Title">
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </Field>
        <Field label="Body">
          <textarea className={`${inputClass} min-h-40 resize-y`} value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>
        <div className="flex gap-2 mt-2">
          <Button variant="ghost" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
          <Button className="flex-1" onClick={save}>Save</Button>
        </div>
      </Modal>
    </div>
  );
}
