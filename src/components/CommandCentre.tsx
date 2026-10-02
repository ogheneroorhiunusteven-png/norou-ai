"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { getBackendUrl, sendChatMessage, type ChatMessage } from "@/lib/assistant";
import type { NorouAction } from "@/lib/actions";
import { autopilotPlan, categoryForAction, DEFAULT_PERMISSIONS, loadAgentHistory, loadPermissions, saveAgentHistory, savePermissions, type AgentHistoryEntry, type NorouPermission, type PermissionMap } from "@/lib/agent";
import { Button, Card } from "./ui";
import { NorouOrb } from "./NorouOrb";

type Mode = "chat" | "study" | "code" | "research" | "creative";
type Tab = "command" | "autopilot" | "history" | "permissions";
type ChatTurn = { id: string; role: "user" | "assistant"; text: string; mode: Mode; at: number };
const modes: { id: Mode; icon: string; label: string; prompt: string; description: string; placeholder: string; quick: { label: string; icon: string; value: string }[] }[] = [
  { id: "chat", icon: "🤖", label: "Chat", prompt: "Help me with this:", description: "Your everyday Nova workspace for questions, planning and local actions.", placeholder: "Ask Nova anything…", quick: [{label:"Plan my day",icon:"📅",value:"plan"},{label:"Add task",icon:"✅",value:"task"},{label:"New note",icon:"📝",value:"note"},{label:"Focus now",icon:"🎯",value:"focus"}] },
  { id: "study", icon: "📚", label: "Study", prompt: "Teach me this clearly and quiz me:", description: "Learn in focused steps, then test yourself instead of just reading answers.", placeholder: "What are you studying?", quick: [{label:"Explain a topic",icon:"💡",value:"study-explain"},{label:"Quiz me",icon:"🧠",value:"study-quiz"},{label:"Make a study plan",icon:"📅",value:"study-plan"},{label:"Focus session",icon:"⏱",value:"focus"}] },
  { id: "code", icon: "💻", label: "Code", prompt: "Help me solve or improve this code:", description: "A coding-focused workspace for debugging, architecture and implementation.", placeholder: "Paste code or describe what you're building…", quick: [{label:"Debug this",icon:"🐛",value:"code-debug"},{label:"Explain code",icon:"📖",value:"code-explain"},{label:"Plan a feature",icon:"🧩",value:"code-plan"},{label:"Review code",icon:"🔍",value:"code-review"}] },
  { id: "research", icon: "🔎", label: "Research", prompt: "Research and explain this topic:", description: "Research mode prioritises evidence, sources and clear separation between facts and interpretation.", placeholder: "What should Nova research?", quick: [{label:"Research a topic",icon:"🔎",value:"research-topic"},{label:"Compare things",icon:"⚖️",value:"research-compare"},{label:"Find sources",icon:"📚",value:"research-sources"},{label:"Summarise",icon:"📝",value:"research-summary"}] },
  { id: "creative", icon: "✨", label: "Creative", prompt: "Help me create this:", description: "A creative workspace for ideas, concepts, writing and turning rough thoughts into plans.", placeholder: "What do you want to create?", quick: [{label:"Brainstorm",icon:"💡",value:"creative-brainstorm"},{label:"Write",icon:"✍️",value:"creative-write"},{label:"Build an idea",icon:"🧩",value:"creative-idea"},{label:"Name it",icon:"🏷️",value:"creative-name"}] },
];
const today = () => new Date().toISOString().slice(0, 10);
const findMatch = <T extends { id: string }>(items: T[], match: string, label: (x: T) => string) => { const q = match.trim().toLowerCase(); return items.find(x => label(x).toLowerCase() === q) ?? items.find(x => label(x).toLowerCase().includes(q)) ?? items.find(x => q.includes(label(x).toLowerCase())); };

export function CommandCentre({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const { state, showToast, replaceState } = store;
  const [tab, setTab] = useState<Tab>("command");
  const [mode, setMode] = useState<Mode>("chat");
  const activeMode = modes.find(x => x.id === mode) ?? modes[0];
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceChat, setVoiceChat] = useState(false);
  const recognitionRef = useRef<any>(null);
  const voiceChatRef = useRef(false);
  const voiceTranscriptRef = useRef("");
  const [result, setResult] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ChatTurn[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [online, setOnline] = useState(true);
  const [permissions, setPermissions] = useState<PermissionMap>(DEFAULT_PERMISSIONS);
  const [history, setHistory] = useState<AgentHistoryEntry[]>([]);

  useEffect(() => { setPermissions(loadPermissions()); setHistory(loadAgentHistory()); setOnline(navigator.onLine); void getBackendUrl().then(v => setAiConfigured(!!v)); const on = () => setOnline(true); const off = () => setOnline(false); window.addEventListener("online", on); window.addEventListener("offline", off); return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); }; }, []);
  useEffect(() => {
    if (!input) return;
    const vv = window.visualViewport;
    const sync = () => {
      if (!vv) return;
      const keyboard = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty("--visual-keyboard-inset", `${keyboard}px`);
    };
    sync();
    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync);
    return () => { vv?.removeEventListener("resize", sync); vv?.removeEventListener("scroll", sync); };
  }, [input]);
  useEffect(() => { voiceChatRef.current = voiceChat; }, [voiceChat]);
  useEffect(() => () => { try { recognitionRef.current?.abort?.(); } catch {} recognitionRef.current = null; if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel(); }, []);
  const startVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { showToast("Voice input is not available in this app build. You can still type normally."); return; }
    try { recognitionRef.current?.abort?.(); } catch {}
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "en-GB";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => { voiceTranscriptRef.current = ""; setListening(true); };
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results ?? []).map((r: any) => r?.[0]?.transcript ?? "").join(" ").trim();
      if (transcript) { voiceTranscriptRef.current = transcript; setInput(transcript); }
    };
    recognition.onerror = (event: any) => {
      setListening(false);
      recognitionRef.current = null;
      if (event?.error !== "aborted" && event?.error !== "no-speech") showToast(`Voice input error: ${event.error ?? "unknown"}`);
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      const spoken = voiceTranscriptRef.current.trim();
      if (voiceChatRef.current && spoken) setTimeout(() => { void ask(spoken); }, 60);
    };
    try { recognition.start(); } catch { setListening(false); recognitionRef.current = null; showToast("Nova could not start the microphone. Try tapping Voice again."); }
  };
  const speak = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) { showToast("Voice playback is not available on this device."); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.02;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  };
  const stopSpeaking = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  const executeActions = (actions: NorouAction[], command: string) => {
    const blocked = actions.filter(a => permissions[categoryForAction(a.type)] === "deny");
    const needsApproval = actions.filter(a => permissions[categoryForAction(a.type)] === "ask");
    if (blocked.length) { showToast(`Blocked ${blocked.length} action${blocked.length === 1 ? "" : "s"} by permission settings`); return 0; }
    if (needsApproval.length && !window.confirm(`Nova wants to make ${needsApproval.length} change${needsApproval.length === 1 ? "" : "s"}. Allow this request?`)) { setResult("I didn't make those changes. You can change the permission level in Permission Centre."); return 0; }
    const before = structuredClone(state);
    let count = 0;
    for (const a of actions) {
      switch (a.type) {
        case "add_task": store.addTask({ title: a.title, dueDate: a.dueDate, completed: false, priority: a.priority ?? "medium", category: a.category ?? "Nova", tags: [], recurrence: a.recurrence ?? "none" }); count++; break;
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
    if (count) { const entry:AgentHistoryEntry={id:Date.now().toString(36),at:new Date().toISOString(),command,summary:`${count} Nova change${count===1?"":"s"}`,before}; const next=[entry,...history].slice(0,20); setHistory(next); saveAgentHistory(next); showToast(`Nova changed ${count} item${count===1?"":"s"} ✓`); }
    return count;
  };

  const ask = async (spokenText?: string) => {
    const value=(spokenText ?? input).trim();
    if(!value||busy)return;
    setBusy(true);
    setResult(null);
    const currentMode = modes.find(x=>x.id===mode)!;
    const userTurn: ChatTurn = { id: `${Date.now()}-u`, role: "user", text: value, mode, at: Date.now() };
    setConversation(prev => [...prev, userTurn]);
    setInput("");
    try {
      const context: ChatMessage[] = conversation.slice(-6).map(t => ({ role: t.role === "assistant" ? "assistant" : "user", content: t.text }));
      const messages:ChatMessage[]=[...context,{role:"user",content:mode==="chat"?value:`${currentMode.prompt}\n\n${value}`}];
      const reply=await sendChatMessage(messages,state,mode);
      const changed=executeActions(reply.actions,value);
      const visible=changed?`${reply.text}\n\n✓ I updated Nova for you.`:reply.text;
      setResult(visible);
      setConversation(prev => [...prev, { id: `${Date.now()}-a`, role: "assistant", text: visible, mode, at: Date.now() }]);
      if (voiceChatRef.current) speak(visible);
    } catch(e) {
      const message=e instanceof Error?e.message:"Nova couldn't complete that request.";
      setResult(message);
      setConversation(prev => [...prev, { id: `${Date.now()}-e`, role: "assistant", text: message, mode, at: Date.now() }]);
    } finally { setBusy(false); }
  };
  const quick=(action:string)=>{
    if(action==="task")setInput("Add a task called ");
    if(action==="note")setInput("Create a note called ");
    if(action==="plan")setInput("Build me a realistic plan for today using my current schedule, tasks and goals.");
    if(action==="focus")setInput("Start a 25 minute focus session.");
    const prompts: Record<string,string> = {
      "study-explain":"Explain this topic simply, step by step: ","study-quiz":"Quiz me on this topic without giving me the answers: ","study-plan":"Build me a focused study plan for: ",
      "code-debug":"Help me debug this code:\n\n","code-explain":"Explain what this code does:\n\n","code-plan":"Plan the implementation of this feature: ","code-review":"Review this code for bugs and improvements:\n\n",
      "research-topic":"Research and explain this topic with reliable sources: ","research-compare":"Compare these two things using evidence: ","research-sources":"Find useful sources for researching: ","research-summary":"Summarise this research clearly: ",
      "creative-brainstorm":"Brainstorm ideas for: ","creative-write":"Help me write: ","creative-idea":"Develop this idea into a concrete concept: ","creative-name":"Give me name ideas for: "
    };
    if(prompts[action]) setInput(prompts[action]);
  };
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
  const undo=(entry:AgentHistoryEntry)=>{replaceState(entry.before);const next=history.filter(h=>h.id!==entry.id);setHistory(next);saveAgentHistory(next);showToast("Last Nova change undone ✓");};
  const setPermission=(key:string,value:NorouPermission)=>{const next={...permissions,[key]:value};setPermissions(next);savePermissions(next);};
  const plan=useMemo(()=>autopilotPlan(state),[state]);
  const lastHistory = history[0];

  return <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center p-3" onClick={onClose}>
    <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#111111] shadow-2xl overflow-hidden animate-slideUp" onClick={e=>e.stopPropagation()}>
      <div className="norou-command-hero"><NorouOrb size="compact" active={busy||listening} state={busy?"thinking":listening?"listening":"idle"}/><div><div className="text-lg font-black text-white">Nova</div><div className="text-xs text-neutral-500">{aiConfigured&&online?"AI + local tools":"Local mode · local tools active"}</div></div><button onClick={onClose} className="h-9 w-9 rounded-xl bg-white/5 text-neutral-300">×</button></div>
      <div className="px-4 pt-3 border-b border-white/10 flex gap-2 overflow-x-auto">{([['command','Command'],['autopilot','Autopilot'],['history','History'],['permissions','Permissions']] as [Tab,string][]).map(([id,label])=><button key={id} onClick={()=>setTab(id)} className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${tab===id?'bg-[#a855f7]/15 text-white':'text-neutral-500'}`}>{label}</button>)}</div>
      <div className="norou-command-scroll p-4 space-y-4 overflow-y-auto" style={{maxHeight:"calc(100dvh - var(--keyboard-inset, 0px) - var(--visual-keyboard-inset, 0px) - 12px)", paddingBottom:"calc(1rem + var(--keyboard-inset, 0px) + var(--visual-keyboard-inset, 0px))"}}>
        {lastHistory&&tab==="command"&&<button onClick={()=>undo(lastHistory)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left text-xs text-neutral-300 hover:bg-white/[0.06]">↶ Undo last Nova change · {lastHistory.summary}</button>}
        {tab==="command"&&<>
          <div className="norou-mode-rail">{modes.map(m=><button key={m.id} onClick={()=>{setMode(m.id);setInput("");setResult(null);}} className={`norou-mode-button rounded-2xl p-2.5 text-center border transition-all ${mode===m.id?'border-[#a855f7]/70 bg-[#a855f7]/15 shadow-[0_0_24px_rgba(168,85,247,.12)] scale-[1.01]':'border-white/5 bg-[#1d1d1d] hover:bg-white/[0.06]'}`}><div className="text-xl">{m.icon}</div><div className="text-[10px] font-bold text-white mt-1">{m.label}</div></button>)}</div>
          <div className="rounded-2xl border border-[#a855f7]/20 bg-gradient-to-r from-[#a855f7]/10 to-white/[0.02] p-4"><div className="flex items-start gap-3"><div className="h-10 w-10 shrink-0 rounded-xl bg-[#a855f7]/15 flex items-center justify-center text-xl">{activeMode.icon}</div><div className="min-w-0"><div className="text-sm font-black text-white">{activeMode.label} mode</div><div className="text-xs leading-5 text-neutral-400 mt-1">{activeMode.description}</div></div><span className="ml-auto rounded-full bg-[#a855f7]/10 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-[#c084fc]">Active</span></div></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{activeMode.quick.map(q=><button key={q.value} onClick={()=>quick(q.value)} className="rounded-2xl bg-white/5 p-3 text-left transition hover:bg-white/[0.08]"><div>{q.icon}</div><div className="text-xs font-bold text-white mt-1">{q.label}</div></button>)}</div>
          <Card className="p-3 norou-input-card"><div className="mb-2 text-[10px] font-black uppercase tracking-wider text-[#a855f7]">{activeMode.label} workspace</div><textarea value={input} onChange={e=>setInput(e.target.value)} onFocus={e=>setTimeout(()=>e.currentTarget.scrollIntoView({block:"center",behavior:"smooth"}),120)} onKeyDown={e=>{if(e.key==='Enter'&&(e.metaKey||e.ctrlKey))void ask();}} placeholder={activeMode.placeholder} spellCheck={false} autoCorrect="off" autoCapitalize="sentences" className="norou-command-input w-full min-h-28 resize-none rounded-xl bg-[#202024] border border-white/10 px-3 py-3 text-[16px] leading-6 text-white caret-[#c084fc] outline-none focus:border-[#a855f7]/60"/><div className="flex items-center justify-between gap-2 pt-3"><button type="button" aria-pressed={voiceChat} aria-label={voiceChat ? "Turn voice chat off" : "Turn voice chat on"} onClick={()=>{
              if(listening){try{recognitionRef.current?.stop?.();}catch{} setListening(false);}
              if(voiceChat){setVoiceChat(false); stopSpeaking();}
              else {setVoiceChat(true); startVoice();}
            }} className={`norou-touch-target rounded-xl px-3 py-2 text-sm ${listening?'bg-red-500/20 text-red-300':voiceChat?'bg-[#a855f7]/20 text-[#d8b4fe]':'bg-white/5 text-neutral-300'}`}>{listening?'● Listening…':voiceChat?'🎙 Voice chat on':'🎙 Voice'}</button><Button onClick={() => ask()} disabled={busy||!input.trim()} className="norou-touch-target">{busy?'Thinking…':activeMode.label==='Research'?'Research →':activeMode.label==='Study'?'Start →':activeMode.label==='Code'?'Run →':activeMode.label==='Creative'?'Create →':'Ask Nova →'}</Button></div></Card>
          {conversation.length>0&&<div className="space-y-3" aria-live="polite">
            <div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Conversation</span><div className="flex items-center gap-2">{speaking&&<button onClick={stopSpeaking} className="norou-touch-target rounded-lg bg-white/5 px-2 text-[11px] text-neutral-300">■ Stop voice</button>}<button onClick={()=>{stopSpeaking();setConversation([]);setResult(null);}} className="norou-touch-target rounded-lg bg-white/5 px-2 text-[11px] text-neutral-400">Clear</button></div></div>
            {conversation.slice(-8).map(turn=><div key={turn.id} className={`rounded-2xl border p-3 ${turn.role==='user'?'ml-7 border-white/5 bg-white/[0.035]':'mr-2 border-[#a855f7]/15 bg-[#a855f7]/[0.06]'}`}>
              <div className="mb-1 flex items-center justify-between gap-2"><span className={`text-[10px] font-black uppercase tracking-wider ${turn.role==='user'?'text-neutral-500':'text-[#c084fc]'}`}>{turn.role==='user'?'You':'Nova'}</span>{turn.role==='assistant'&&<button aria-label="Speak this response" onClick={()=>speak(turn.text)} className="norou-touch-target rounded-lg px-2 text-xs text-neutral-400">🔊</button>}</div>
              <p className="whitespace-pre-wrap text-sm leading-6 text-neutral-100">{turn.text}</p>
            </div>)}
          </div>}
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3 text-xs text-neutral-500">Nova can control local data through explicit tools. Online AI is used only when configured and connected; offline mode never pretends it searched or called AI.</div>
        </>}
        {tab==="autopilot"&&<>
          <Card className="p-4 border-[#a855f7]/20"><div className="flex items-center justify-between"><div><div className="text-lg font-black text-white">Nova Autopilot</div><div className="text-xs text-neutral-500 mt-1">A realistic plan built from your open tasks. You approve the actions by starting them.</div></div><button onClick={()=>setTab("autopilot")} className="rounded-xl bg-white/5 px-3 py-2 text-xs text-neutral-300">Refresh</button></div></Card>
          <div className="space-y-2">{plan.map((b,i)=><div key={b.id} className="rounded-2xl border border-white/5 bg-white/[0.03] p-3 flex items-center gap-3"><div className="text-xs font-black text-[#a855f7] w-12">{b.time}</div><div className="flex-1"><div className="text-sm font-bold text-white">{b.title}</div><div className="text-[11px] text-neutral-500">{b.duration} min focus block</div></div><button onClick={()=>runAutopilot(b.taskId)} className="rounded-xl bg-[#a855f7]/15 px-3 py-2 text-xs font-bold text-white">Start</button></div>)}</div>
          <Button onClick={()=>runAutopilot(plan[0]?.taskId)}>▶ Start Autopilot</Button>
        </>}
        {tab==="history"&&<>
          <div><div className="text-lg font-black text-white">Nova Activity</div><div className="text-xs text-neutral-500">Every AI change has a local snapshot so you can undo it.</div></div>
          {!history.length?<Card className="p-5 text-sm text-neutral-500">No agent changes yet.</Card>:history.map(h=><Card key={h.id} className="p-3"><div className="flex items-center gap-3"><div className="flex-1"><div className="text-sm font-bold text-white">{h.summary}</div><div className="text-[11px] text-neutral-500">{new Date(h.at).toLocaleString()} · “{h.command}”</div></div><button onClick={()=>undo(h)} className="rounded-xl bg-white/5 px-3 py-2 text-xs text-neutral-300">Undo</button></div></Card>)}
        </>}
        {tab==="permissions"&&<>
          <div><div className="text-lg font-black text-white">Permission Centre</div><div className="text-xs text-neutral-500">Control what Nova may change without asking.</div></div>
          {Object.keys(DEFAULT_PERMISSIONS).map(key=><div key={key} className="rounded-2xl border border-white/5 bg-white/[0.03] p-3 flex items-center justify-between gap-3"><div><div className="text-sm font-bold text-white capitalize">{key}</div><div className="text-[11px] text-neutral-500">{key==='destructive'?'Deletes and other irreversible changes.':'Changes to this part of Nova.'}</div></div><select value={permissions[key]??'ask'} onChange={e=>setPermission(key,e.target.value as NorouPermission)} className="rounded-xl bg-black/30 border border-white/10 px-2 py-2 text-xs text-white"><option value="allow">Allow</option><option value="ask">Ask first</option><option value="deny">Block</option></select></div>)}
        </>}
      </div>
    </div>
  </div>;
}
