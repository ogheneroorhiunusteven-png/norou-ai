"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, Button } from "./ui";

export type ExerciseKey = "bench" | "squat" | "deadlift" | "pushup" | "row" | "lunge";
type View = "front" | "side" | "angle";

type Target = { name: string; role: "Primary" | "Secondary" | "Stabilizer"; zone: string };
type Exercise = {
  key: ExerciseKey;
  name: string;
  category: string;
  primary: Target[];
  cue: string;
  steps: string[];
  commonMistake: string;
  phases: string[];
  arrow: string;
  reps: string;
  form: string[];
};

// Targets are based on the standard biomechanics of each movement; exact activation varies with technique, grip, stance and load.
const EXERCISES: Exercise[] = [
  { key: "bench", name: "Bench Press (Barbell)", category: "Chest", primary: [{name:"Pectoralis major",role:"Primary",zone:"chest"},{name:"Triceps brachii",role:"Secondary",zone:"triceps"},{name:"Anterior deltoid",role:"Secondary",zone:"shoulders"}], cue: "Lower the bar with control toward the mid-to-lower chest, then press while keeping your wrists stacked over your forearms.", steps: ["Set your upper back on the bench and plant both feet firmly.", "Grip the bar evenly and lower it under control toward the mid-to-lower chest.", "Keep your forearms close to vertical and press the bar back up without bouncing.", "Re-rack only after the bar is stable and controlled."], commonMistake: "Letting the wrists fold back, bouncing the bar, or losing stable shoulder-blade position.", phases: ["Set position", "Lower", "Press", "Rack"], arrow: "↓  ↑", reps: "8–12 reps", form: ["Keep shoulder blades retracted and stable.", "Keep wrists stacked over elbows.", "Use a spotter or safety arms for challenging loads."] },
  { key: "squat", name: "Squat (Bodyweight)", category: "Legs", primary: [{name:"Quadriceps",role:"Primary",zone:"quads"},{name:"Gluteus maximus",role:"Primary",zone:"glutes"},{name:"Adductor magnus",role:"Secondary",zone:"inner-thigh"},{name:"Hamstrings",role:"Secondary",zone:"hamstrings"}], cue: "Descend by bending the hips and knees together, keep the knees tracking with the toes, then stand by pushing through the whole foot.", steps: ["Stand with feet at a comfortable width and toes slightly turned out if natural.", "Brace gently and bend the hips and knees together while keeping the torso controlled.", "Descend only as far as you can keep balance, foot pressure and knee tracking.", "Drive through the whole foot to return to standing."], commonMistake: "Knees collapsing inward, heels lifting, or chasing depth at the expense of control.", phases: ["Stand", "Descend", "Bottom", "Stand"], arrow: "↓  ↑", reps: "8–12 reps", form: ["Keep the knees tracking in the same direction as the toes.", "Keep the whole foot connected to the floor.", "Use a comfortable depth you can control."] },
  { key: "deadlift", name: "Deadlift (Barbell)", category: "Posterior Chain", primary: [{name:"Gluteus maximus",role:"Primary",zone:"glutes"},{name:"Hamstrings",role:"Primary",zone:"hamstrings"},{name:"Erector spinae",role:"Secondary",zone:"lower-back"},{name:"Latissimus dorsi",role:"Stabilizer",zone:"lats"}], cue: "Hinge at the hips with the bar close to your legs, brace your trunk, then stand by extending the hips and knees together.", steps: ["Set the bar over the middle of your feet and bring your shins close without forcing them forward.", "Hinge at the hips and take the bar with a stable grip while keeping your spine neutral.", "Push the floor away and keep the bar close as your hips and knees extend.", "Finish tall without leaning back, then hinge to lower the bar."], commonMistake: "Letting the bar drift away from the legs or rounding the back under load.", phases: ["Set up", "Hinge", "Stand", "Lower"], arrow: "↘  ↗", reps: "6–10 reps", form: ["Keep the bar close to the body.", "Brace before each rep.", "Stop the set if you cannot maintain your controlled position."] },
  { key: "pushup", name: "Push-Up", category: "Chest", primary: [{name:"Pectoralis major",role:"Primary",zone:"chest"},{name:"Triceps brachii",role:"Secondary",zone:"triceps"},{name:"Anterior deltoid",role:"Secondary",zone:"shoulders"},{name:"Serratus anterior",role:"Stabilizer",zone:"ribs"}], cue: "Keep your body in one controlled line and lower your chest between your hands before pressing the floor away.", steps: ["Place hands slightly wider than shoulder width and set a stable plank.", "Brace your trunk and lower your chest with elbows angled comfortably from your sides.", "Keep hips and shoulders moving together as you descend.", "Press the floor away and return to the starting position."], commonMistake: "Letting the hips sag or pike, or rushing through the lowering phase.", phases: ["Plank", "Lower", "Bottom", "Press"], arrow: "↓  ↑", reps: "8–15 reps", form: ["Keep head, ribs and pelvis aligned.", "Use a range you can control.", "Regress to an elevated surface if needed."] },
  { key: "row", name: "Dumbbell Row", category: "Back", primary: [{name:"Latissimus dorsi",role:"Primary",zone:"lats"},{name:"Rhomboids / mid trapezius",role:"Secondary",zone:"mid-back"},{name:"Posterior deltoid",role:"Secondary",zone:"rear-shoulder"},{name:"Biceps brachii",role:"Stabilizer",zone:"biceps"}], cue: "Hold a stable hinge and pull the dumbbell toward your hip without rotating your torso.", steps: ["Support yourself in a stable hinge with your spine neutral.", "Let the working arm reach without twisting your trunk.", "Pull the elbow toward your hip and pause briefly at the top.", "Lower the dumbbell slowly and repeat on the other side."], commonMistake: "Rotating the torso or shrugging to move a heavier weight.", phases: ["Hinge", "Reach", "Pull", "Lower"], arrow: "↗  ↘", reps: "8–12 / side", form: ["Keep hips and shoulders square.", "Pull with the elbow rather than curling the dumbbell.", "Use a load that allows a steady torso."] },
  { key: "lunge", name: "Reverse Lunge", category: "Legs", primary: [{name:"Quadriceps",role:"Primary",zone:"quads"},{name:"Gluteus maximus",role:"Primary",zone:"glutes"},{name:"Hamstrings",role:"Secondary",zone:"hamstrings"},{name:"Adductors",role:"Stabilizer",zone:"inner-thigh"}], cue: "Step back far enough to keep the front foot stable, lower under control, then drive through the front foot.", steps: ["Stand tall with feet comfortably apart.", "Step one foot backward and lower both knees while keeping the front foot planted.", "Keep the front knee tracking with the front toes and torso controlled.", "Push through the front foot to return to standing."], commonMistake: "Taking an unstable step, letting the front knee collapse inward, or dropping too quickly.", phases: ["Stand", "Step back", "Lower", "Drive up"], arrow: "↙  ↗", reps: "8–12 / leg", form: ["Keep the front foot fully planted.", "Control the descent.", "Use support if balance is limiting your technique."] },
];

function speakExercise(exercise: Exercise) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const text = `${exercise.name}. ${exercise.cue} ${exercise.steps.join(" ")}`;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.92;
  window.speechSynthesis.speak(utterance);
}

function BodyModel({ exercise, playing, view, showMuscles, showArrows, phase }: { exercise: Exercise; playing: boolean; view: View; showMuscles: boolean; showArrows: boolean; phase: number }) {
  const activeZone = exercise.primary[Math.min(phase === 1 || phase === 2 ? 0 : 0, exercise.primary.length - 1)].zone;
  return (
    <div className={`coach-3d coach-${exercise.key} coach-view-${view} ${playing ? "is-playing" : "is-paused"} ${showMuscles ? "show-muscles" : "hide-muscles"}`} aria-label={`Animated ${exercise.name} demonstration with highlighted target muscles`}>
      <div className="coach-perspective">
        <svg className="coach-body" viewBox="0 0 260 320" role="img" aria-hidden="true">
          <defs><radialGradient id="skin" cx="35%" cy="30%"><stop offset="0" stopColor="#f4f4f4"/><stop offset="1" stopColor="#8c8c92"/></radialGradient><linearGradient id="suit" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#eee"/><stop offset=".6" stopColor="#9b9b9f"/><stop offset="1" stopColor="#505058"/></linearGradient></defs>
          <ellipse className="coach-shadow" cx="130" cy="294" rx="78" ry="10" />
          {(exercise.key === "bench") && <g className="coach-equipment"><rect x="48" y="188" width="164" height="16" rx="7"/><path d="M70 203L57 288M190 203L203 288M57 288H90M170 288H203"/><path d="M34 64V260M226 64V260M27 72H45M215 72H233M27 114H45M215 114H233"/><g className="bar"><rect x="22" y="60" width="216" height="6" rx="3"/><circle cx="32" cy="63" r="14"/><circle cx="228" cy="63" r="14"/></g></g>}
          {(exercise.key === "squat") && <g className="coach-equipment squat-rack"><path d="M48 38V268M212 38V268M40 48H56M204 48H220M40 92H56M204 92H220"/><g className="bar"><rect x="34" y="73" width="192" height="6" rx="3"/><circle cx="43" cy="76" r="13"/><circle cx="217" cy="76" r="13"/></g></g>}
          {(exercise.key === "deadlift") && <g className="coach-equipment floor-bar"><rect x="22" y="267" width="216" height="6" rx="3"/><circle cx="40" cy="270" r="22"/><circle cx="220" cy="270" r="22"/></g>}
          <g className="coach-human">
            <circle className="head" cx="130" cy="54" r="23"/><path className="neck" d="M119 73H141L146 89H114Z"/><path className="torso" d="M103 84Q130 72 157 84L174 157Q166 179 130 181Q94 179 86 157Z"/>
            <path className={`muscle chest ${activeZone === "chest" ? "target-active" : ""}`} d="M91 105Q110 90 129 105Q130 127 111 130Q95 125 91 105ZM131 105Q150 90 169 105Q165 125 149 130Q130 127 131 105Z"/>
            <path className={`muscle back ${activeZone === "lats" || activeZone === "mid-back" || activeZone === "lower-back" ? "target-active" : ""}`} d="M103 101Q130 88 157 101L151 146Q130 156 109 146Z"/>
            <path className={`muscle core ${activeZone === "ribs" ? "target-active" : ""}`} d="M111 129H149L145 165Q130 173 115 165Z"/>
            <path className={`muscle shoulders ${activeZone === "shoulders" || activeZone === "rear-shoulder" ? "target-active" : ""}`} d="M90 91Q104 83 112 95L106 117Q94 116 88 104Z M150 95Q158 83 171 91L173 104Q166 116 154 117Z"/>
            <path className={`muscle biceps ${activeZone === "biceps" ? "target-active" : ""}`} d="M78 117L91 122L82 157Q75 165 69 158Z M169 122L182 117L191 158Q185 165 178 157Z"/>
            <path className={`muscle triceps ${activeZone === "triceps" ? "target-active" : ""}`} d="M91 118L104 129L91 166Q84 171 80 162Z M156 129L169 118L180 162Q176 171 169 166Z"/>
            <path className={`leg leg-left ${activeZone === "quads" ? "target-active" : ""}`} d="M108 166Q120 176 129 176L127 236L112 282Q106 292 95 288L91 280L105 229Z"/>
            <path className={`leg leg-right ${activeZone === "quads" ? "target-active" : ""}`} d="M132 176Q141 176 152 166L155 229L169 280Q166 292 155 288L142 236Z"/>
            <path className={`muscle glutes ${activeZone === "glutes" ? "target-active" : ""}`} d="M96 159Q130 150 164 159L157 190Q130 200 103 190Z"/>
            <path className={`muscle hamstrings ${activeZone === "hamstrings" ? "target-active" : ""}`} d="M104 190L126 188L123 231L110 255L101 230Z M134 188L156 190L159 230L150 255L137 231Z"/>
            <path className="foot" d="M91 279Q103 278 113 284L108 298H78Q77 286 91 279Z"/><path className="foot" d="M149 284Q159 278 170 279Q183 286 182 298H152Z"/>
          </g>
          {showArrows && <g className="coach-arrows"><path d={exercise.key === "row" ? "M205 180C228 150 228 118 205 100" : exercise.key === "deadlift" ? "M202 214C228 194 228 158 205 139" : "M205 126C229 145 229 179 207 196"}/><path d="M212 120L204 130L216 130"/><path d="M201 189L210 198L212 186"/></g>}
        </svg>
      </div>
      <div className="movement-chip"><span>{exercise.phases[phase]}</span><strong>{exercise.arrow}</strong></div>
    </div>
  );
}

export function ExerciseCoach({ onClose }: { onClose?: () => void }) {
  const [selected, setSelected] = useState<ExerciseKey>("bench");
  const [playing, setPlaying] = useState(true);
  const [view, setView] = useState<View>("angle");
  const [speed, setSpeed] = useState(1);
  const [showMuscles, setShowMuscles] = useState(true);
  const [showArrows, setShowArrows] = useState(true);
  const [rep, setRep] = useState(0);
  const [phase, setPhase] = useState(0);
  const [tab, setTab] = useState<"summary" | "howto">("summary");
  const exercise = useMemo(() => EXERCISES.find((x) => x.key === selected) ?? EXERCISES[0], [selected]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setPhase((p) => { const next = (p + 1) % exercise.phases.length; if (next === 0) setRep((r) => r + 1); return next; }), Math.max(500, 1800 / speed));
    return () => window.clearInterval(timer);
  }, [playing, speed, exercise]);

  const select = (key: ExerciseKey) => { setSelected(key); setPlaying(true); setRep(0); setPhase(0); setTab("summary"); };

  return (
    <div className="exercise-coach-screen space-y-0 pb-8">
      <div className="flex items-center justify-between px-1 pb-3"><div><p className="text-xs font-bold uppercase tracking-widest text-[#c99bf7]">Nova Exercise Coach</p><h2 className="text-2xl font-black text-white">Train with clear form cues</h2></div>{onClose && <Button variant="ghost" onClick={onClose}>Close</Button>}</div>
      <div className="exercise-detail-shell overflow-hidden rounded-[24px] border border-white/10 bg-black">
        <div className="exercise-reference-stage">
          <div className="exercise-reference-status">{playing ? "LIVE DEMONSTRATION" : "PAUSED"}</div>
          <BodyModel exercise={exercise} playing={playing} view={view} showMuscles={showMuscles} showArrows={showArrows} phase={phase}/>
          <button className="exercise-reference-pause" onClick={() => setPlaying((v) => !v)}>{playing ? "Ⅱ" : "▶"}</button>
          <div className="exercise-reference-views">{(["front","angle","side"] as View[]).map(v => <button key={v} onClick={() => setView(v)} className={view===v?"active":""}>{v}</button>)}</div>
        </div>
        <div className="exercise-reference-info">
          <div className="flex items-start justify-between gap-4"><div><h1 className="text-[24px] font-black tracking-tight text-white sm:text-[30px]">{exercise.name}</h1><p className="mt-1 text-sm text-neutral-400">Primary: {exercise.primary.filter(t=>t.role==="Primary").map(t=>t.name).join(" · ")}</p><p className="text-sm text-neutral-500">Secondary: {exercise.primary.filter(t=>t.role==="Secondary").map(t=>t.name).join(" · ")}</p></div><button className="coach-voice" onClick={() => speakExercise(exercise)} aria-label="Hear Nova explain">🔊</button></div>
          <div className="exercise-tabs"><button onClick={()=>setTab("summary")} className={tab==="summary"?"active":""}>Summary</button><button onClick={()=>setTab("howto")} className={tab==="howto"?"active":""}>How to</button></div>
          {tab === "summary" ? <>
            <div className="exercise-target-panel"><div className="exercise-section-label">Target muscles</div><div className="target-list">{exercise.primary.map(t=><div key={t.name} className="target-row"><span className={`target-dot ${t.role.toLowerCase()}`}/><div><b>{t.role}: {t.name}</b><small>{t.zone.replaceAll("-"," ")}</small></div></div>)}</div></div>
            <div className="exercise-form-panel"><div className="exercise-section-label">Form cues</div>{exercise.form.map(f=><div key={f} className="form-check">✓ <span>{f}</span></div>)}</div>
          </> : <div className="exercise-howto-panel"><div className="exercise-section-label">How to perform</div>{exercise.steps.map((s,i)=><div key={s} className={`howto-step ${phase===i?"current":""}`} onClick={()=>{setPhase(i);setPlaying(false)}}><span>{i+1}</span><p>{s}</p></div>)}</div>}
          <div className="exercise-control-row"><button onClick={()=>setPlaying(v=>!v)}>{playing?"Pause":"Play"}</button><button onClick={()=>setSpeed(v=>v===1?0.5:v===0.5?0.25:1)}>{speed}×</button><button className={showMuscles?"active":""} onClick={()=>setShowMuscles(v=>!v)}>Muscles</button><button className={showArrows?"active":""} onClick={()=>setShowArrows(v=>!v)}>Motion</button><span>REP <b>{rep}</b></span></div>
          <p className="exercise-safety-note">Use an appropriate resistance and a controlled range. Nova can demonstrate technique, but it cannot guarantee injury prevention. Stop for sharp pain, dizziness or unusual symptoms and ask a qualified professional when needed.</p>
        </div>
      </div>
      <div className="exercise-library-strip"><div className="text-[10px] font-black uppercase tracking-[.18em] text-neutral-500">Exercise library</div><div className="exercise-library-row">{EXERCISES.map(item=><button key={item.key} onClick={()=>select(item.key)} className={selected===item.key?"active":""}><span>{item.name}</span><small>{item.category}</small></button>)}</div></div>
    </div>
  );
}
