import type { AppState, ActivityCategory, DayIndex, TaskPriority, TaskRecurrence } from './types';

export type NorouAction =
  | { type: 'add_task'; title: string; dueDate?: string; priority?: TaskPriority; category?: string; recurrence?: TaskRecurrence }
  | { type: 'update_task'; match: string; title?: string; dueDate?: string; priority?: TaskPriority; completed?: boolean; category?: string; recurrence?: TaskRecurrence }
  | { type: 'complete_task'; match: string }
  | { type: 'delete_task'; match: string }
  | { type: 'add_routine'; title: string; start: string; end?: string; days?: DayIndex[]; category?: ActivityCategory; emoji?: string; xp?: number }
  | { type: 'update_routine'; match: string; title?: string; start?: string; end?: string; days?: DayIndex[]; category?: ActivityCategory; emoji?: string; xp?: number }
  | { type: 'delete_routine'; match: string }
  | { type: 'add_goal'; title: string; targetDate?: string; progress?: number }
  | { type: 'update_goal'; match: string; title?: string; targetDate?: string; progress?: number; completed?: boolean }
  | { type: 'delete_goal'; match: string }
  | { type: 'add_note'; title: string; body?: string }
  | { type: 'update_note'; match: string; title?: string; body?: string }
  | { type: 'delete_note'; match: string }
  | { type: 'add_event'; title: string; date: string; time?: string; endTime?: string; notes?: string; reminder?: boolean }
  | { type: 'update_event'; match: string; title?: string; date?: string; time?: string; endTime?: string; notes?: string; reminder?: boolean }
  | { type: 'delete_event'; match: string }
  | { type: 'add_alarm'; time: string; label: string; enabled?: boolean }
  | { type: 'update_alarm'; match: string; time?: string; label?: string; enabled?: boolean }
  | { type: 'delete_alarm'; match: string }
  | { type: 'add_memory'; text: string }
  | { type: 'delete_memory'; match: string }
  | { type: 'set_name'; name: string }
  | { type: 'set_water'; cups: number }
  | { type: 'set_steps'; steps: number }
  | { type: 'add_workout'; name: string; exercises?: { name: string; sets?: string; reps?: string }[] }
  | { type: 'delete_workout'; match: string }
  | { type: 'start_focus'; minutes?: number; task?: string };

export interface ParsedCommand {
  actions: NorouAction[];
  reply: string;
}

const dayMap: Record<string, DayIndex> = { sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, wednesday: 3, wed: 3, thursday: 4, thu: 4, friday: 5, fri: 5, saturday: 6, sat: 6 };

function daysFromText(value: string): DayIndex[] | undefined {
  const found = Object.entries(dayMap).filter(([name]) => new RegExp(`\\b${name}\\b`, 'i').test(value)).map(([, day]) => day);
  return found.length ? [...new Set(found)] : undefined;
}

function timeFromText(value: string): string | undefined {
  const m = value.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (!m) return undefined;
  let h = Number(m[1]); const min = Number(m[2] ?? 0); const ap = m[3]?.toLowerCase();
  if (ap === 'pm' && h < 12) h += 12; if (ap === 'am' && h === 12) h = 0;
  if (h > 23 || min > 59) return undefined;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function stripCommandPhrases(value: string, patterns: RegExp[]): string {
  let s = value;
  for (const p of patterns) s = s.replace(p, ' ');
  return s.replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '').replace(/[.?!]+$/, '').trim();
}

function matchAfter(value: string, regex: RegExp): string | null {
  const m = value.match(regex); return m?.[1]?.trim() || null;
}

/** Deterministic local command parser. It intentionally handles common commands without pretending an AI call happened. */
export function parseLocalCommand(input: string, state: AppState): ParsedCommand | null {
  const raw = input.trim(); const lower = raw.toLowerCase();
  if (!raw) return null;

  if (/^(add|create|make)\s+(a\s+)?(routine|routine slot|schedule)/i.test(raw)) {
    const title = matchAfter(raw, /(?:routine|routine slot|schedule)\s+(?:called|named)?\s*(.+?)(?=\s+(?:at|from)\s+\d|$)/i) || stripCommandPhrases(raw, [/^(?:add|create|make)\s+(?:a\s+)?(?:routine|routine slot|schedule)\s*/i]);
    const start = timeFromText(raw) ?? '09:00';
    const endMatch = raw.match(/(?:to|until|[-–])\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
    const end = endMatch ? timeFromText(endMatch[1]) : undefined;
    const days = daysFromText(raw);
    if (!title) return null;
    return { actions: [{ type: 'add_routine', title, start, end: end ?? start, days: days ?? [new Date().getDay() as DayIndex] }], reply: `Added the ${title} routine${start ? ` at ${start}` : ''}.` };
  }

  const addTask = matchAfter(raw, /^(?:add|create)\s+(?:a\s+)?task\s+(.+)$/i);
  if (addTask) {
    const dueDate = addTask.match(/\b(?:due|on)\s+(\d{4}-\d{2}-\d{2})\b/i)?.[1];
    const priority = /\bhigh\b/i.test(addTask) ? 'high' : /\blow\b/i.test(addTask) ? 'low' : 'medium';
    const title = stripCommandPhrases(addTask, [/\s+(?:due|on)\s+\d{4}-\d{2}-\d{2}/i, /\s+\b(?:high|low|medium)\s+priority\b/i]);
    return { actions: [{ type: 'add_task', title, dueDate, priority }], reply: `Added task: ${title}.` };
  }

  const complete = matchAfter(raw, /^(?:complete|finish|mark)\s+(?:task\s+)?(.+)$/i);
  if (complete && /(task|finish|complete)/i.test(raw)) return { actions: [{ type: 'complete_task', match: complete }], reply: `I'll mark “${complete}” complete.` };

  const deleteTask = matchAfter(raw, /^(?:delete|remove)\s+(?:task\s+)?(.+)$/i);
  if (deleteTask && state.tasks.some(t => t.title.toLowerCase().includes(deleteTask.toLowerCase()))) return { actions: [{ type: 'delete_task', match: deleteTask }], reply: `Removed the task matching “${deleteTask}”.` };

  const goal = matchAfter(raw, /^(?:add|create)\s+(?:a\s+)?goal\s+(.+)$/i);
  if (goal) return { actions: [{ type: 'add_goal', title: goal }], reply: `Added goal: ${goal}.` };

  const note = matchAfter(raw, /^(?:add|create|save)\s+(?:a\s+)?note\s+(.+)$/i);
  if (note) return { actions: [{ type: 'add_note', title: note }], reply: `Created a note called “${note}”.` };

  const memory = matchAfter(raw, /^(?:remember|save this)\s*:?[ ]*(.+)$/i);
  if (memory) return { actions: [{ type: 'add_memory', text: memory }], reply: `I'll remember that.` };

  const name = matchAfter(raw, /^(?:call me|set my name to)\s+(.+)$/i);
  if (name) return { actions: [{ type: 'set_name', name }], reply: `Got it — I'll use ${name}.` };

  const water = raw.match(/^(?:set|log|add)\s+(?:my\s+)?water\s+(?:to\s+)?(\d+)\s*(?:cups?)?$/i);
  if (water) return { actions: [{ type: 'set_water', cups: Number(water[1]) }], reply: `Water updated to ${water[1]} cups.` };

  const steps = raw.match(/^(?:set|log)\s+(?:my\s+)?steps\s+(?:to\s+)?([\d,]+)$/i);
  if (steps) return { actions: [{ type: 'set_steps', steps: Number(steps[1].replace(/,/g, '')) }], reply: `Steps updated.` };

  const event = matchAfter(raw, /^(?:add|create|schedule)\s+(?:a\s+)?(?:calendar\s+)?event\s+(.+)$/i);
  if (event) {
    const date = event.match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1] ?? new Date().toISOString().slice(0,10);
    const time = timeFromText(event);
    const title = stripCommandPhrases(event, [/\b20\d{2}-\d{2}-\d{2}\b/, /\bat\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?/i]);
    if (title) return { actions: [{ type: 'add_event', title, date, time }], reply: `Scheduled “${title}”${time ? ` at ${time}` : ''}.` };
  }

  const alarm = raw.match(/^(?:set|add|create)\s+(?:an?\s+)?alarm\s+(?:for\s+)?(.+?)\s+(?:called|labelled|labeled)\s+(.+)$/i);
  if (alarm) {
    const time = timeFromText(alarm[1]);
    if (time) return { actions: [{ type: 'add_alarm', time, label: alarm[2].trim(), enabled: true }], reply: `Alarm set for ${time}.` };
  }

  const deleteNote = matchAfter(raw, /^(?:delete|remove)\s+(?:the\s+)?note\s+(.+)$/i);
  if (deleteNote && state.notes.some(n => n.title.toLowerCase().includes(deleteNote.toLowerCase()))) return { actions: [{ type: 'delete_note', match: deleteNote }], reply: `Removed the note matching “${deleteNote}”.` };

  const deleteGoal = matchAfter(raw, /^(?:delete|remove)\s+(?:the\s+)?goal\s+(.+)$/i);
  if (deleteGoal && state.goals.some(g => g.title.toLowerCase().includes(deleteGoal.toLowerCase()))) return { actions: [{ type: 'delete_goal', match: deleteGoal }], reply: `Removed the goal matching “${deleteGoal}”.` };

  if (/^(?:start|begin)\s+(?:a\s+)?focus/i.test(lower)) {
    const minutes = Number(raw.match(/(\d+)\s*(?:min|minutes?)/i)?.[1] ?? 25);
    return { actions: [{ type: 'start_focus', minutes }], reply: `Starting a ${minutes}-minute focus session.` };
  }

  return null;
}

export function extractActions(raw: string): { text: string; actions: NorouAction[] } {
  const actions: NorouAction[] = [];
  let output = "";
  let cursor = 0;
  while (cursor < raw.length) {
    const marker = raw.indexOf('[ACTION:', cursor);
    if (marker < 0) { output += raw.slice(cursor); break; }
    output += raw.slice(cursor, marker);
    const start = raw.indexOf('{', marker + 8);
    if (start < 0) { output += raw.slice(marker); break; }
    let depth = 0; let inString = false; let escaped = false; let end = -1;
    for (let i = start; i < raw.length; i++) {
      const ch = raw[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') { inString = true; continue; }
      if (ch === '{') depth++;
      if (ch === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end < 0) { output += raw.slice(marker); break; }
    try {
      const parsed = JSON.parse(raw.slice(start, end + 1));
      if (parsed?.type) actions.push(parsed as NorouAction);
      cursor = raw[end + 1] === ']' ? end + 2 : end + 1;
    } catch {
      output += raw.slice(marker, end + 1);
      cursor = end + 1;
    }
  }
  return { text: output.replace(/\n{3,}/g, '\n\n').trim(), actions };
}
