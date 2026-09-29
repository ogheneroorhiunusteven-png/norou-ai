"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, Button } from "./ui";

export type ExerciseKey = "bench" | "squat" | "deadlift" | "pushup" | "row" | "lunge";
type View = "front" | "side" | "angle";

type Exercise = {
  key: ExerciseKey;
  name: string;
  primary: string;
  secondary: string;
  cue: string;
  steps: string[];
  commonMistake: string;
  phases: string[];
  arrow: string;
  muscles: string[];
};

const EXERCISES: Exercise[] = [
  { key: "bench", name: "Bench Press", primary: "Chest", secondary: "Triceps · Shoulders", cue: "Lower with control, keep your wrists stacked, then press smoothly.", steps: ["Set your shoulders back and keep your feet planted.", "Lower the weight toward the middle of your chest with control.", "Pause briefly without bouncing, then press back up.", "Stop if you lose control or feel sharp pain."], commonMistake: "Letting the elbows flare excessively or bouncing the weight off the chest.", phases: ["Set your position", "Lower slowly", "Press smoothly", "Reset"], arrow: "↓  ↑", muscles: ["Chest", "Triceps", "Front shoulders"] },
  { key: "squat", name: "Bodyweight Squat", primary: "Legs", secondary: "Glutes · Core", cue: "Sit your hips down and back, then stand by driving through your whole foot.", steps: ["Stand with feet around shoulder-width apart.", "Brace gently and send your hips down and back.", "Keep your knees tracking in the same direction as your toes.", "Stand tall without snapping your knees backward."], commonMistake: "Letting the knees collapse inward or losing balance through the feet.", phases: ["Stand tall", "Hips back", "Lower", "Drive up"], arrow: "↓  ↑", muscles: ["Quadriceps", "Glutes", "Core"] },
  { key: "deadlift", name: "Deadlift", primary: "Posterior chain", secondary: "Glutes · Hamstrings · Back", cue: "Keep the load close and move your hips back and forward while maintaining a neutral spine.", steps: ["Start with the load close to your legs.", "Hinge at the hips while keeping your back in a comfortable neutral position.", "Push the floor away and bring your hips through.", "Lower by hinging first rather than rounding down."], commonMistake: "Rounding the back or letting the load drift far away from the body.", phases: ["Set up", "Hinge", "Stand", "Hinge back"], arrow: "↘  ↗", muscles: ["Hamstrings", "Glutes", "Back"] },
  { key: "pushup", name: "Push-Up", primary: "Chest", secondary: "Triceps · Core · Shoulders", cue: "Keep your body moving as one unit and use a controlled range you can own.", steps: ["Place hands slightly wider than your shoulders.", "Brace your middle so your hips stay in line with your shoulders.", "Lower under control with elbows angled comfortably.", "Press the floor away to return to the start."], commonMistake: "Dropping the hips or rushing through the lowering phase.", phases: ["High plank", "Lower", "Press", "Reset"], arrow: "↓  ↑", muscles: ["Chest", "Triceps", "Core"] },
  { key: "row", name: "Dumbbell Row", primary: "Back", secondary: "Biceps · Rear shoulders", cue: "Pull toward your hip while keeping your torso steady.", steps: ["Support yourself in a stable hinged position.", "Let the arm reach without twisting your torso.", "Pull the weight toward your hip and squeeze gently.", "Lower slowly and repeat on the other side."], commonMistake: "Rotating the torso to lift a heavier weight instead of controlling the movement.", phases: ["Hinge", "Reach", "Pull", "Lower"], arrow: "↗  ↘", muscles: ["Upper back", "Biceps", "Rear shoulders"] },
  { key: "lunge", name: "Reverse Lunge", primary: "Legs", secondary: "Glutes · Core", cue: "Step back, lower under control, then push through the front foot to stand.", steps: ["Stand tall with your feet comfortable apart.", "Step one foot backward and lower both knees comfortably.", "Keep the front knee tracking with the front foot.", "Push through the front foot and return to standing."], commonMistake: "Taking a step so short that balance or knee tracking becomes difficult.", phases: ["Stand", "Step back", "Lower", "Drive up"], arrow: "↙  ↗", muscles: ["Quadriceps", "Glutes", "Core"] },
];

function speakExercise(exercise: Exercise) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const text = `${exercise.name}. ${exercise.cue} Step one: ${exercise.steps[0]} Step two: ${exercise.steps[1]} Step three: ${exercise.steps[2]} Step four: ${exercise.steps[3]}`;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.92;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

function BodyModel({ exercise, playing, view, speed, showMuscles, showArrows, phase }: { exercise: Exercise; playing: boolean; view: View; speed: number; showMuscles: boolean; showArrows: boolean; phase: number }) {
  return (
    <div className={`coach-3d coach-${exercise.key} coach-view-${view} ${playing ? "is-playing" : "is-paused"} ${showMuscles ? "show-muscles" : "hide-muscles"} ${showArrows ? "show-arrows" : "hide-arrows"}`} style={{ ["--coach-speed" as string]: speed }} aria-label={`Animated ${view} demonstration of ${exercise.name}`}>
      <div className="coach-perspective">
        <svg className="coach-body" viewBox="0 0 260 320" role="img" aria-hidden="true">
          <defs>
            <radialGradient id="skin" cx="35%" cy="30%"><stop offset="0" stopColor="#f2f2f2"/><stop offset="1" stopColor="#9a9a9a"/></radialGradient>
            <linearGradient id="suit" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#eeeeee"/><stop offset=".55" stopColor="#9c9c9c"/><stop offset="1" stopColor="#555"/></linearGradient>
          </defs>
          <g className="coach-shadow"><ellipse cx="130" cy="293" rx="76" ry="11" /></g>
          <g className="coach-equipment">
            <rect className="bench-surface" x="52" y="190" width="156" height="15" rx="7" />
            <path className="bench-leg" d="M72 203 L58 287 M188 203 L202 287 M58 287 H89 M171 287 H202" />
            <path className="rack" d="M34 66 V260 M226 66 V260 M27 74 H45 M215 74 H233 M27 115 H45 M215 115 H233" />
            <g className="bar"><rect x="24" y="61" width="212" height="5" rx="2"/><circle cx="33" cy="63.5" r="13"/><circle cx="227" cy="63.5" r="13"/></g>
          </g>
          <g className="coach-human">
            <circle className="head" cx="130" cy="54" r="24" />
            <path className="neck" d="M119 73 L141 73 L146 89 L114 89 Z" />
            <path className="torso" d="M103 84 Q130 72 157 84 L174 157 Q166 179 130 181 Q94 179 86 157 Z" />
            <path className="muscle chest" d="M91 105 Q110 90 129 105 Q130 127 111 130 Q95 125 91 105Z M131 105 Q150 90 169 105 Q165 125 149 130 Q130 127 131 105Z" />
            <path className="muscle back" d="M104 101 Q130 88 156 101 L151 144 Q130 155 109 144Z" />
            <path className="muscle core" d="M111 129 H149 L145 165 Q130 173 115 165Z" />
            <path className="arm arm-left" d="M101 91 Q86 96 78 117 L64 161 Q65 171 74 173 Q83 174 88 164 L105 130Z" />
            <path className="arm arm-right" d="M159 91 Q174 96 182 117 L196 161 Q195 171 186 173 Q177 174 172 164 L155 130Z" />
            <path className="muscle triceps" d="M174 116 L189 157 Q188 165 181 165 L170 129Z" />
            <path className="leg leg-left" d="M108 166 Q120 176 129 176 L127 236 L112 282 Q106 292 95 288 L91 280 L105 229Z" />
            <path className="leg leg-right" d="M132 176 Q141 176 152 166 L155 229 L169 280 Q166 292 155 288 L142 236Z" />
            <path className="muscle quads" d="M108 177 Q118 184 127 181 L123 228 L110 251 L104 229Z M133 181 Q142 184 152 177 L156 229 L150 251 L137 228Z" />
            <path className="foot" d="M91 279 Q103 278 113 284 L108 298 H78 Q77 286 91 279Z" />
            <path className="foot" d="M149 284 Q159 278 170 279 Q183 286 182 298 H152Z" />
          </g>
          <g className="coach-arrows"><path d="M207 126 C229 143 229 177 207 194"/><path d="M213 120 L205 129 L216 130"/><path d="M201 188 L209 197 L212 185"/></g>
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
  const exercise = useMemo(() => EXERCISES.find((x) => x.key === selected) ?? EXERCISES[0], [selected]);

  useEffect(() => {
    if (!playing) return;
    const cycle = Math.max(700, 1800 / speed);
    const timer = window.setInterval(() => {
      setRep((r) => r + 1);
      setPhase((p) => (p + 1) % exercise.phases.length);
    }, cycle);
    return () => window.clearInterval(timer);
  }, [playing, speed, exercise]);

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <div><p className="text-xs font-bold uppercase tracking-widest text-[#c99bf7]">Norou Exercise Coach</p><h2 className="text-2xl font-black text-white">Learn the movement</h2></div>
        {onClose && <Button variant="ghost" onClick={onClose}>Close</Button>}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="exercise-stage exercise-stage-pro">
          <div className="exercise-grid" />
          <div className="exercise-label">{playing ? "LIVE DEMONSTRATION" : "PAUSED"}</div>
          <BodyModel exercise={exercise} playing={playing} view={view} speed={speed} showMuscles={showMuscles} showArrows={showArrows} phase={phase} />
          <div className="exercise-view-switcher">
            {(["front", "angle", "side"] as View[]).map((v) => <button key={v} onClick={() => setView(v)} className={view === v ? "active" : ""}>{v}</button>)}
          </div>
          <button className="exercise-play" onClick={() => setPlaying((v) => !v)} aria-label={playing ? "Pause animation" : "Play animation"}>{playing ? "Ⅱ" : "▶"}</button>
        </div>
        <div className="coach-control-bar">
          <button onClick={() => setPlaying((v) => !v)}>{playing ? "Pause" : "Play"}</button>
          <button onClick={() => setSpeed((v) => v === 1 ? 0.5 : v === 0.5 ? 0.25 : 1)}>{speed}×</button>
          <button className={showMuscles ? "active" : ""} onClick={() => setShowMuscles((v) => !v)}>Muscles</button>
          <button className={showArrows ? "active" : ""} onClick={() => setShowArrows((v) => !v)}>Motion</button>
          <span className="coach-reps">REP <b>{rep}</b></span>
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-3"><div><h3 className="text-xl font-black text-white">{exercise.name}</h3><p className="mt-1 text-sm text-neutral-400">Primary: {exercise.primary}</p><p className="text-sm text-neutral-500">Secondary: {exercise.secondary}</p></div><button className="coach-voice" onClick={() => speakExercise(exercise)} aria-label="Hear exercise coaching">🔊</button></div>
          <div className="mt-4 flex flex-wrap gap-2">{exercise.muscles.map((m) => <span key={m} className="muscle-pill">{m}</span>)}</div>
          <div className="mt-4 rounded-2xl border border-[#a855f7]/20 bg-[#a855f7]/10 p-4"><div className="text-xs font-bold uppercase tracking-wider text-[#c99bf7]">Norou cue</div><p className="mt-1 text-sm leading-6 text-neutral-200">{exercise.cue}</p></div>
        </div>
      </Card>

      <div className="flex gap-2 overflow-x-auto pb-1">{EXERCISES.map((item) => <button key={item.key} onClick={() => { setSelected(item.key); setPlaying(true); setRep(0); setPhase(0); }} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition ${selected === item.key ? "border-[#a855f7] bg-[#a855f7]/15 text-[#d7b5fa]" : "border-white/10 bg-white/5 text-neutral-400"}`}>{item.name}</button>)}</div>

      <Card className="p-5">
        <div className="flex items-center justify-between"><h3 className="text-base font-black text-white">Movement phases</h3><span className="text-xs text-neutral-500">Follow the highlighted step</span></div>
        <div className="mt-4 grid grid-cols-4 gap-2">{exercise.phases.map((p, i) => <button key={p} onClick={() => { setPhase(i); setPlaying(false); }} className={`rounded-xl border p-3 text-left text-xs font-bold ${phase === i ? "border-[#a855f7] bg-[#a855f7]/15 text-[#e7d4fb]" : "border-white/10 bg-white/5 text-neutral-400"}`}><span className="block text-[10px] opacity-60">0{i + 1}</span>{p}</button>)}</div>
      </Card>

      <Card className="p-5"><div className="flex items-center justify-between"><h3 className="text-base font-black text-white">How to do it</h3><span className="text-xs text-neutral-500">Animated steps</span></div><ol className="mt-3 space-y-3">{exercise.steps.map((step, i) => <li key={step} className="flex gap-3 text-sm leading-6 text-neutral-300"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-black text-[#c99bf7]">{i + 1}</span><span>{step}</span></li>)}</ol><button onClick={() => speakExercise(exercise)} className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white">🔊 Hear Norou explain this exercise</button></Card>

      <Card className="border-amber-400/15 bg-amber-400/5 p-5"><div className="text-xs font-bold uppercase tracking-wider text-amber-300">Form & safety</div><p className="mt-1 text-sm leading-6 text-neutral-300">{exercise.commonMistake}</p><p className="mt-3 text-xs leading-5 text-neutral-500">Use a comfortable range and appropriate resistance. Stop if you feel sharp pain, dizziness, or anything unusual, and ask a qualified professional for help when needed.</p></Card>
    </div>
  );
}
