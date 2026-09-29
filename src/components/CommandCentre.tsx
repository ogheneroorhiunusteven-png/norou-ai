"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { getBackendUrl, sendChatMessage, type ChatMessage } from "@/lib/assistant";
import type { NorouAction } from "@/lib/actions";
import { autopilotPlan, categoryForAction, DEFAULT_PERMISSIONS, loadAgentHistory, loadPermissions, saveAgentHistory, savePermissions, type AgentHistoryEntry, type NorouPermission, type PermissionMap } from "@/lib/agent";
import { Button, Card } from "./ui";
import { NorouOrb } from "./NorouOrb";

type Mode = "chat" | "study" | "code" | "research" | "creative";
type Tab = "command" | "autopilot" | "history" | "permissions";
const modes: { id: Mode; icon: string; label: string; prompt: string }[] = [
  { id: "chat", icon: "🤖", label: "Chat", prompt: "Help me with this:" },
  { id: "study", icon: "📚", label: "Study", prompt: "Teach me this clearly and quiz me:" },
  { id: "code", icon: "💻", label: "Code", prompt: "Help me solve or improve this code:" },
  { id: "research", icon: "🔎", label: "Research", prompt: "Research and explain this topic:" },
  { id: "creative", icon: "✨", label: "Creative", prompt: "Help me create this:" },
];
const today = () => new Date().toISOString().slice(0, 10);
const findMatch = <T extends { id: string }>(items: T[], match: string, label: (x: T) => string) => { const q = match.trim().toLowerCase(); return items.find(x => label(x).toLowerCase() === q) ?? items.find(x => label(x).toLowerCase().includes(q)) ?? items.find(x => q.includes(label(x).toLowerCase())); };

export function CommandCentre({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const { state, showToast, replaceState } = store;
  const [tab, setTab] = useState<Tab>("command");
  const [mode, setMode] = useState<Mode>("chat");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [online, setOnline] = useState(true);
  const [permissions, setPermissions] = useState<PermissionMap>(DEFAULT_PERMISSIONS);
  const [history, setHistory] = useState<AgentHistoryEntry[]>([]);

  useEffect(() => { setPermissions(loadPermissions()); setHistory(loadAgentHistory()); setOnline(navigator.onLine); void getBackendUrl().then(v => setAiConfigured(!!v)); const on = () => setOnline(true); const off = () => setOnline(false); window.addEventListener("online", on); window.addEventListener("offline", off); return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); }; }, []);
  useEffect(() => { if (!listening) return; const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition; if (!SpeechRecognition) { setListening(false); showToast("Voice input isn't supported on this device/browser"); return; } const recognition = new SpeechRecognition(); recognition.lang = "en-GB"; recognition.interimResults = false; recognition.maxAlternatives = 1; recognition.onresult = (event: any) => setInput((event.results?.[0]?.[0]?.transcript ?? "").trim()); recognition.onerror = () => setListening(false); recognition.onend = () => setListening(false); recognition.start(); return () => { try { recognition.stop(); } catch {} }; }, [listening, showToast]);
  const speak = (text: string) => { if (typeof window === "undefined" || !("speechSynthesis" in window)) return; window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.rate = 1.02; window.speechSynthesis.speak(u); };

  const executeActions = (actions: NorouAction[], command: string) => {
    const blocked = actions.filter(a => permissions[categoryForAction(a.type)] === "deny");
    const needsApproval = actions.filter(a => permissions[categoryForAction(a.type)] === "ask");
    if (blocked.length) { showToast(`Blocked ${blocked.length} action${blocked.length === 1 ? "" : "s"} by permission settings`); return 0; }
    if (needsApproval.length && !window.confirm(`Norou wants to make ${needsApproval.length} change${needsApproval.length === 1 ? "" : "s"}. Allow this request?`)) { setResult("I didn't make those changes. You can change the permission level in Permission Centre."); return 0; }
    const before = structuredClone(state);
    let count = 0;
    for (const a of actions) {
      switch (a.type) {
        case "add_task": store.addTask({ title: a.title, dueDate: a.dueDate, completed: false, priority: a.priority ?? "medium", category: a.category ?? "Norou", tags: [], recurrence: a.recurrence ?? "none" }); count++; break;
        case "update_task": { const x=findMatch(state.tasks,a.match,t=>t.title); if(x){store.updateTask({...x,title:a.title??x.title,dueDate:a.dueDate??x.dueDate,priority:a.priority??x.priority,completed:a.completed??x.completed,category:a.category??x.category,recurrence:a.recurrence??x.recurrence});count++;} break; }
        case "complete_task": { const x=findMatch(state.tasks,a.match,t=>t.title); if(x&&!x.completed){store.toggleTask(x.id);count++;} break; }
        case "delete_task": { const x=findMatch(state.tasks,a.match,t=>t.title); if(x){store.deleteTask(x.id);count++;} break; }
        case "add_routine": store.addActivity({title:a.title,emoji:a.emoji??"⏰",start:a.start,end:a.end??a.start,xp:a.xp??10,days:a.days??[new Date().getDay() as any],category:a.category??"other"});count++;break;
        case "update_routine": {const x=findMatch(state.activities,a.match,t=>t.title);if(x){store.updateActivity({...x,title:a.title??x.title,start:a.start??x.start,end:a.end??x.end,days:a.days??x.days,category:a.category??x.category,emoji:a.emoji??x.emoji,xp:a.xp??x.xp});count++;}break;}
        case "delete_routine": {const x=findMatch(state.activities,a.match,t=>t.title);if(x){store.deleteActivity(x.id);count++;}break;}
        case "add_goal": store.addGoal({title:a.title,targetDate:a.targetDate,completed:false,progress:a.progress??0});count++;break;
        case "update_goal": {const x=findMatch(state.goals,a.match,g=>g.title);if(x){store.updateGoal({...x,title:a.title??x.title,targetDate:a.targetDate??x.targetDate,progress:a.progress??x.progress,completed:a.completed??x.completed});count++;}break;}
        case "delete_goal": {const x=findMatch(state.goals,a.match,g=>g.title);if(x){store.deleteGoal(x.id);count++;}break;}
        case "add_note": store.addNote(a.title,a.body??"");count++;break;
        case "update_note": {const x=findMatch(state.notes,a.match,n=>n.title);if(x){store.updateNote({...x,title:a.title??x.title,body:a.body??x.body});count++;}break;}
        case "delete_note": {const x=findMatch(state.notes,a.match,n=>n.title);if(x){store.deleteNote(x.id);count++;}break;}
        case "add_event": store.addCalendarEvent({title:a.title,date:a.date||today(),time:a.time,endTime:a.endTime,notes:a.notes,reminder:a.reminder??false});count++;break;
        case "update_event": {const x=findMatch(state.calendarEvents,a.match,e=>e.title);if(x){store.updateCalendarEvent({...x,title:a.title??x.title,date:a.date??x.date,time:a.time??x.time,endTime:a.endTime??x.endTime,notes:a.notes??x.notes,reminder:a.reminder??x.reminder});count++;}break;}
        case "delete_event": {const x=findMatch(state.calendarEvents,a.match,e=>e.title);if(x){store.deleteCalendarEvent(x.id);count++;}break;}
        case "add_alarm": store.addAlarm({time:a.time,label:a.label,enabled:a.enabled??true});count++;break;
        case "update_alarm": {const x=findMatch(state.alarms,a.match,z=>z.label);if(x){store.updateAlarm({...x,time:a.time??x.time,label:a.label??x.label,enabled:a.enabled??x.enabled});count++;}break;}
        case "delete_alarm": {const x=findMatch(state.alarms,a.match,z=>z.label);if(x){store.deleteAlarm(x.id);count++;}break;}
        case "add_memory": store.addMemory(a.text,"ai");count++;break;
        case "delete_memory": {const x=findMatch(state.memories,a.match,m=>m.text);if(x){store.deleteMemory(x.id);count++;}break;}
        case "set_name": store.setName(a.name);count++;break;
        case "set_water": store.setWater(a.cups);count++;break;
        case "set_steps": store.setSteps(a.steps);count++;break;
        case "add_workout": store.addWorkout({name:a.name,exercises:(a.exercises??[]).map((e,i)=>({id:`ai-${Date.now()}-${i}`,...e}))});count++;break;
        case "delete_workout": {const x=findMatch(state.workouts,a.match,w=>w.name);if(x){store.deleteWorkout(x.id);count++;}break;}
        case "start_focus": window.dispatchEvent(new CustomEvent("norou:focus",{detail:{minutes:a.minutes??25,task:a.task}}));count++;break;
      }
    }
    if (count) { const entry:AgentHistoryEntry={id:Date.now().toString(36),at:new Date().toISOString(),command,summary:`${count} Norou change${count===1?"":"s"}`,before}; const next=[entry,...history].slice(0,20); setHistory(next); saveAgentHistory(next); showToast(`Norou changed ${count} item${count===1?"":"s"} ✓`); }
    return count;
  };

  const ask = async () => { const value=input.trim(); if(!value||busy)return; setBusy(true);setResult(null);try{const m=modes.find(x=>x.id===mode)!;const messages:ChatMessage[]=[{role:"user",content:mode==="chat"?value:`${m.prompt}\n\n${value}`}];const reply=await sendChatMessage(messages,state,mode);const changed=executeActions(reply.actions,value);const visible=changed?`${reply.text}\n\n✓ I updated Norou for you.`:reply.text;setResult(visible);speak(visible);}catch(e){setResult(e instanceof Error?e.message:"Norou couldn't complete that request.");}finally{setBusy(false);}};
  const quick=(action:string)=>{if(action==="task")setInput("Add a task called ");if(action==="note")setInput("Create a note called ");if(action==="plan")setInput("Build me a realistic plan for today using my current schedule, tasks and goals.");if(action==="focus")setInput("Start a 25 minute focus session.");};
  const runAutopilot=(taskId?:string)=>{
    if (taskId) {
      const task = state.tasks.find(t=>t.id===taskId);
      window.dispatchEvent(new CustomEvent("norou:focus",{detail:{minutes:45,task:task?.title ?? "Autopilot focus"}}));
      showToast("Autopilot block started ✓");
      return;
    }
    window.dispatchEvent(new CustomEvent("norou:autopilot",{detail:{blocks:plan.map(b=>({minutes:b.duration,task:b.taskId?state.tasks.find(t=>t.id===b.taskId)?.title:b.title}))}}));
    showToast(`Autopilot queued ${plan.length} focus block${plan.length===1?"":"s"} ✓`);
  };
  const undo=(entry:AgentHistoryEntry)=>{replaceState(entry.before);const next=history.filter(h=>h.id!==entry.id);setHistory(next);saveAgentHistory(next);showToast("Last Norou change undone ✓");};
  const setPermission=(key:string,value:NorouPermission)=>{const next={...permissions,[key]:value};setPermissions(next);savePermissions(next);};
  const plan=useMemo(()=>autopilotPlan(state),[state]);
  const lastHistory = history[0];

  return <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center p-3" onClick={onClose}>
    <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#111111] shadow-2xl overflow-hidden animate-slideUp" onClick={e=>e.stopPropagation()}>
      <div className="norou-command-hero"><NorouOrb size="compact" active={busy||listening} state={busy?"thinking":listening?"listening":"idle"}/><div><div className="text-lg font-black text-white">Norou</div><div className="text-xs text-neutral-500">{aiConfigured&&online?"AI + local tools":"Local mode · local tools active"}</div></div><button onClick={onClose} className="h-9 w-9 rounded-xl bg-white/5 text-neutral-300">×</button></div>
      <div className="px-4 pt-3 border-b border-white/10 flex gap-2 overflow-x-auto">{([['command','Command'],['autopilot','Autopilot'],['history','History'],['permissions','Permissions']] as [Tab,string][]).map(([id,label])=><button key={id} onClick={()=>setTab(id)} className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${tab===id?'bg-[#a855f7]/15 text-white':'text-neutral-500'}`}>{label}</button>)}</div>
      <div className="p-4 space-y-4 max-h-[82dvh] overflow-y-auto">
        {lastHistory&&tab==="command"&&<button onClick={()=>undo(lastHistory)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left text-xs text-neutral-300 hover:bg-white/[0.06]">↶ Undo last Norou change · {lastHistory.summary}</button>}
        {tab==="command"&&<>
          <div className="grid grid-cols-5 gap-2">{modes.map(m=><button key={m.id} onClick={()=>setMode(m.id)} className={`rounded-2xl p-2.5 text-center border transition ${mode===m.id?'border-[#a855f7]/60 bg-[#a855f7]/15':'border-white/5 bg-[#1d1d1d]'}`}><div className="text-xl">{m.icon}</div><div className="text-[10px] font-bold text-white mt-1">{m.label}</div></button>)}</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><button onClick={()=>quick('plan')} className="rounded-2xl bg-white/5 p-3 text-left"><div>📅</div><div className="text-xs font-bold text-white mt-1">Plan my day</div></button><button onClick={()=>quick('task')} className="rounded-2xl bg-white/5 p-3 text-left"><div>✅</div><div className="text-xs font-bold text-white mt-1">Add task</div></button><button onClick={()=>quick('note')} className="rounded-2xl bg-white/5 p-3 text-left"><div>📝</div><div className="text-xs font-bold text-white mt-1">New note</div></button><button onClick={()=>quick('focus')} className="rounded-2xl bg-white/5 p-3 text-left"><div>🎯</div><div className="text-xs font-bold text-white mt-1">Focus now</div></button></div>
          <Card className="p-3"><textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&(e.metaKey||e.ctrlKey))void ask();}} placeholder="Try: Add a routine called Gym at 4pm on Monday, Wednesday and Friday" className="w-full min-h-24 resize-none bg-transparent text-sm text-white outline-none"/><div className="flex items-center justify-between gap-2 pt-2"><button onClick={()=>setListening(true)} className={`rounded-xl px-3 py-2 text-sm ${listening?'bg-red-500/20 text-red-300':'bg-white/5 text-neutral-300'}`}>{listening?'● Listening…':'🎙 Voice'}</button><Button onClick={ask} disabled={busy||!input.trim()}>{busy?'Thinking…':'Ask Norou →'}</Button></div></Card>
          {result&&<Card className="p-4 border-[#a855f7]/20"><div className="flex items-center justify-between mb-2"><span className="text-xs font-bold uppercase tracking-wider text-[#a855f7]">Norou</span><button onClick={()=>speak(result)} className="text-xs text-neutral-400">🔊 Speak</button></div><p className="whitespace-pre-wrap text-sm leading-6 text-neutral-100">{result}</p></Card>}
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3 text-xs text-neutral-500">Norou can control local data through explicit tools. Online AI is used only when configured and connected; offline mode never pretends it searched or called AI.</div>
        </>}
        {tab==="autopilot"&&<>
          <Card className="p-4 border-[#a855f7]/20"><div className="flex items-center justify-between"><div><div className="text-lg font-black text-white">Norou Autopilot</div><div className="text-xs text-neutral-500 mt-1">A realistic plan built from your open tasks. You approve the actions by starting them.</div></div><button onClick={()=>setTab("autopilot")} className="rounded-xl bg-white/5 px-3 py-2 text-xs text-neutral-300">Refresh</button></div></Card>
          <div className="space-y-2">{plan.map((b,i)=><div key={b.id} className="rounded-2xl border border-white/5 bg-white/[0.03] p-3 flex items-center gap-3"><div className="text-xs font-black text-[#a855f7] w-12">{b.time}</div><div className="flex-1"><div className="text-sm font-bold text-white">{b.title}</div><div className="text-[11px] text-neutral-500">{b.duration} min focus block</div></div><button onClick={()=>runAutopilot(b.taskId)} className="rounded-xl bg-[#a855f7]/15 px-3 py-2 text-xs font-bold text-white">Start</button></div>)}</div>
          <Button onClick={()=>runAutopilot(plan[0]?.taskId)}>▶ Start Autopilot</Button>
        </>}
        {tab==="history"&&<>
          <div><div className="text-lg font-black text-white">Norou Activity</div><div className="text-xs text-neutral-500">Every AI change has a local snapshot so you can undo it.</div></div>
          {!history.length?<Card className="p-5 text-sm text-neutral-500">No agent changes yet.</Card>:history.map(h=><Card key={h.id} className="p-3"><div className="flex items-center gap-3"><div className="flex-1"><div className="text-sm font-bold text-white">{h.summary}</div><div className="text-[11px] text-neutral-500">{new Date(h.at).toLocaleString()} · “{h.command}”</div></div><button onClick={()=>undo(h)} className="rounded-xl bg-white/5 px-3 py-2 text-xs text-neutral-300">Undo</button></div></Card>)}
        </>}
        {tab==="permissions"&&<>
          <div><div className="text-lg font-black text-white">Permission Centre</div><div className="text-xs text-neutral-500">Control what Norou may change without asking.</div></div>
          {Object.keys(DEFAULT_PERMISSIONS).map(key=><div key={key} className="rounded-2xl border border-white/5 bg-white/[0.03] p-3 flex items-center justify-between gap-3"><div><div className="text-sm font-bold text-white capitalize">{key}</div><div className="text-[11px] text-neutral-500">{key==='destructive'?'Deletes and other irreversible changes.':'Changes to this part of Norou.'}</div></div><select value={permissions[key]??'ask'} onChange={e=>setPermission(key,e.target.value as NorouPermission)} className="rounded-xl bg-black/30 border border-white/10 px-2 py-2 text-xs text-white"><option value="allow">Allow</option><option value="ask">Ask first</option><option value="deny">Block</option></select></div>)}
        </>}
      </div>
    </div>
  </div>;
}
