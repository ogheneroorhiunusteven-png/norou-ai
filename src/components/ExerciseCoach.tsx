"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "./ui";
import { CoachGL } from "@/lib/coach3d/gl";
import { assemble } from "@/lib/coach3d/rig";
import { buildBody, type Roles } from "@/lib/coach3d/body";
import { M, cyl, sphere, type Prim } from "@/lib/coach3d/shapes";
import { EXERCISES, EX_BY_KEY, loopTime, sample, segEnd, segStart, type Exercise, type ExerciseKey, type TargetRole } from "@/lib/coach3d/exercises";
import type { V3 } from "@/lib/coach3d/math";

export type { ExerciseKey };
type CoachView = "front" | "angle" | "side";
const FOV = 0.6;
const YAW: Record<CoachView, (e: Exercise) => number> = { front: () => 0.12, angle: (e) => e.cam.yaw, side: (e) => (e.cam.yaw >= 0 ? Math.PI / 2 : -Math.PI / 2) };
const ROLE_COLOR: Record<TargetRole, string> = { Primary: "#b068ff", Secondary: "#8c52e8", Tertiary: "#c9bdf0" };

function speakExercise(e: Exercise) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(`${e.name}. ${e.steps.join(" ")}`);
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

/** Front/back anatomy maps (like the Targets thumbnails in the reference sheet). Rendered once per exercise. */
let mapGL: CoachGL | null = null;
function renderTargetMaps(roles: Roles): [string, string] | null {
  try {
    if (typeof document === "undefined") return null;
    const cv = document.createElement("canvas");
    cv.width = 180; cv.height = 300;
    mapGL = new CoachGL(cv);
    const leg = (sg: number) => ({ ankle: [sg * 0.13, 0.09, 0] as V3, pole: [0, 0.1, 1] as V3, foot: [sg * 0.2, 0, 1] as V3 });
    const arm = (sg: number) => ({ grip: [sg * 0.33, 0.78, 0.0] as V3, pole: [0, -0.3, -1] as V3 });
    const pose = assemble({ tau: 0, pelvis: [0, 0.955, 0], legs: [leg(1), leg(-1)], arms: [arm(1), arm(-1)], headFollow: 0 });
    const prims: Prim[] = buildBody(pose, roles, true);
    const out: string[] = [];
    for (const yaw of [0, Math.PI]) {
      mapGL.resize(180, 300, 1);
      mapGL.render(prims, { target: [0, 0.92, 0], dist: 4.1, yaw, pitch: 0.02, fov: 0.5 });
      out.push(cv.toDataURL("image/png"));
    }
    mapGL.dispose(); mapGL = null;
    return [out[0], out[1]];
  } catch { return null; }
}

interface Snap { t: number; d: number; seg: number; frac: number; rep: number; angles: number[] }

export function ExerciseCoach({ onClose }: { onClose?: () => void }) {
  const [selected, setSelected] = useState<ExerciseKey>("bench");
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [showTargets, setShowTargets] = useState(true);
  const [showPath, setShowPath] = useState(true);
  const [view, setView] = useState<CoachView>("angle");
  const [tab, setTab] = useState<"summary" | "howto">("summary");
  const [noGL, setNoGL] = useState(false);
  const [snap, setSnap] = useState<Snap>({ t: 0, d: 0, seg: 0, frac: 0, rep: 0, angles: [] });
  const [maps, setMaps] = useState<[string, string] | null>(null);

  const ex = EX_BY_KEY[selected];
  const T = useMemo(() => loopTime(ex), [ex]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<CoachGL | null>(null);
  const live = useRef({ t: 0, selected, playing, speed, showTargets, showPath, view, yawOff: 0, pitchOff: 0 });
  live.current.selected = selected; live.current.playing = playing; live.current.speed = speed;
  live.current.showTargets = showTargets; live.current.showPath = showPath; live.current.view = view;
  const pathCache = useRef<{ key: string; pts: V3[] }>({ key: "", pts: [] });

  // WebGL setup (falls back to the reference photo if the device can't do WebGL)
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    try { glRef.current = new CoachGL(cv); setNoGL(false); } catch { glRef.current = null; setNoGL(true); }
  }, []);

  // Target anatomy thumbnails
  useEffect(() => { setMaps(renderTargetMaps(ex.roles)); }, [ex]);

  // Animation loop
  useEffect(() => {
    let raf = 0, last = performance.now(), lastUi = 0;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) setPlaying(false);
    const frame = (now: number) => {
      const L = live.current;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const e = EX_BY_KEY[L.selected];
      if (L.playing) L.t += dt * L.speed;
      const Tt = loopTime(e);
      const { d, seg, frac } = sample(e, L.t);
      const rep = Math.floor(L.t / Tt);
      const b = e.build(d, rep);
      const pose = assemble(b.spec);
      const gl = glRef.current, cv = canvasRef.current, stage = stageRef.current;
      if (gl && cv && stage) {
        const w = stage.clientWidth, h = stage.clientHeight;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        gl.resize(w, h, dpr);
        const prims: Prim[] = [cyl([e.cam.target[0], -0.004, e.cam.target[2]], [e.cam.target[0], 0, e.cam.target[2]], 0.95, M.floor)];
        prims.push(...buildBody(pose, e.roles, L.showTargets), ...b.props(pose));
        if (L.showPath) {
          const ck = `${e.key}:${rep % 2}`;
          if (pathCache.current.key !== ck) {
            const pts: V3[] = [];
            for (let i = 0; i <= 40; i++) { const bb = e.build(i / 40, rep); pts.push(bb.track(assemble(bb.spec))); }
            pathCache.current = { key: ck, pts };
          }
          for (const p of pathCache.current.pts) prims.push(sphere(p, 0.011, M.purple));
          prims.push(sphere(b.track(pose), 0.026, M.purple));
        }
        const asp = w / h;
        const vf = Math.min(FOV, 2 * Math.atan(Math.tan(FOV / 2) * asp));
        const dist = (e.cam.radius * 0.86) / Math.sin(vf / 2);
        gl.render(prims, { target: e.cam.target, dist, yaw: YAW[L.view](e) + L.yawOff, pitch: Math.max(-0.2, Math.min(1.2, (L.view === "side" ? 0.08 : e.cam.pitch) + L.pitchOff)), fov: FOV });
      }
      if (now - lastUi > 90) {
        lastUi = now;
        setSnap({ t: L.t % Tt, d, seg, frac, rep, angles: e.watch.map((w) => w.read(pose)) });
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Drag to orbit
  const drag = useRef<{ x: number; y: number } | null>(null);
  const onDown = (ev: React.PointerEvent) => { drag.current = { x: ev.clientX, y: ev.clientY }; (ev.currentTarget as HTMLElement).setPointerCapture?.(ev.pointerId); };
  const onMove = (ev: React.PointerEvent) => {
    if (!drag.current) return;
    live.current.yawOff -= (ev.clientX - drag.current.x) * 0.012;
    live.current.pitchOff += (ev.clientY - drag.current.y) * 0.006;
    drag.current = { x: ev.clientX, y: ev.clientY };
  };
  const onUp = () => { drag.current = null; };

  const select = useCallback((key: ExerciseKey) => {
    live.current.t = 0; live.current.yawOff = 0; live.current.pitchOff = 0;
    pathCache.current = { key: "", pts: [] };
    setSelected(key); setPlaying(true); setTab("summary"); setView("angle");
  }, []);
  const goSeg = (i: number) => {
    const n = ex.segs.length, k = ((i % n) + n) % n;
    live.current.t = segEnd(ex, k); live.current.playing = false; setPlaying(false);
  };
  const stepSeg = (delta: number) => goSeg(snap.seg + delta);
  const scrub = (v: number) => { live.current.t = v * T; live.current.playing = false; setPlaying(false); };
  const resetView = () => { live.current.yawOff = 0; live.current.pitchOff = 0; };
  const setViewMode = (v: CoachView) => { setView(v); resetView(); };
  const cycleSpeed = () => setSpeed((v) => (v === 1 ? 0.75 : v === 0.75 ? 0.5 : 1));

  const byRole = (r: TargetRole) => ex.targets.filter((t) => t.role === r).map((t) => t.name).join(" · ");
  const seg = ex.segs[snap.seg] ?? ex.segs[0];
  const mm = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return (
    <div className="cc-root pb-8">
      <div className="cc-head">
        <div><p className="cc-eyebrow">Nova Exercise Coach</p><h2>Perfect form. Maximum results.</h2></div>
        {onClose && <Button variant="ghost" onClick={onClose}>Close</Button>}
      </div>

      <div className="cc-card">
        <div className="cc-stage" ref={stageRef}>
          {noGL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="cc-fallback" src={`/exercise-models/${ex.key}.jpg`} alt={`${ex.name} reference`} />
          ) : (
            <canvas ref={canvasRef} className="cc-canvas" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} aria-label={`${ex.name} 3D demonstration. Drag to rotate.`} />
          )}
          <div className="cc-status"><span className={playing ? "on" : ""}>{playing ? "LIVE" : "PAUSED"}</span><b>{seg.name}</b></div>
          <div className="cc-count">{ex.isHold ? <><small>HOLD</small><b>{mm(snap.rep * T + snap.t)}</b></> : <><small>REP</small><b>{snap.rep}</b></>}</div>
          <button type="button" className="cc-fab" onClick={() => setPlaying((v) => !v)} aria-label={playing ? "Pause demonstration" : "Play demonstration"}>{playing ? "Ⅱ" : "▶"}</button>
          {noGL && <div className="cc-nogl">3D view isn’t supported on this device, showing the reference image instead.</div>}
          <div className="cc-hint">Drag to rotate</div>
        </div>

        <div className="cc-scrub">
          <button type="button" onClick={() => stepSeg(-1)} aria-label="Previous phase">‹</button>
          <input type="range" min={0} max={1000} value={Math.round((snap.t / T) * 1000)} onChange={(e) => scrub(Number(e.target.value) / 1000)} aria-label="Scrub through the rep" />
          <button type="button" onClick={() => stepSeg(1)} aria-label="Next phase">›</button>
        </div>
        <div className="cc-rail" role="tablist" aria-label="Movement phases">
          {ex.segs.map((s, i) => <button type="button" role="tab" aria-selected={snap.seg === i} key={s.name + i} className={snap.seg === i ? "active" : ""} onClick={() => goSeg(i)}><i />{s.name}</button>)}
        </div>

        <div className="cc-controls">
          <button type="button" onClick={() => setPlaying((v) => !v)}>{playing ? "Pause" : "Play"}</button>
          <button type="button" onClick={cycleSpeed} aria-label="Change playback speed">Speed {speed}×</button>
          <button type="button" className={showTargets ? "active" : ""} aria-pressed={showTargets} onClick={() => setShowTargets((v) => !v)}>Targets</button>
          <button type="button" className={showPath ? "active" : ""} aria-pressed={showPath} onClick={() => setShowPath((v) => !v)}>Path</button>
          {(["front", "angle", "side"] as CoachView[]).map((v) => <button type="button" key={v} className={view === v ? "active" : ""} aria-pressed={view === v} onClick={() => setViewMode(v)}>{v[0].toUpperCase() + v.slice(1)}</button>)}
          <button type="button" onClick={resetView}>Reset view</button>
        </div>

        <div className="cc-cuebox" aria-live="polite"><small>{seg.name}</small><p>{seg.cue}</p></div>

        <div className="cc-angles">
          {ex.watch.map((w, i) => <div key={w.label}><small>{w.label}</small><b>{snap.angles[i] !== undefined ? Math.round(snap.angles[i]) : "–"}{w.unit ?? ""}</b></div>)}
        </div>
      </div>

      <div className="cc-card cc-info">
        <div className="cc-titlerow">
          <div><h1>{ex.name}</h1><span className="cc-cat">{ex.category}</span></div>
          <button type="button" className="cc-voice" onClick={() => speakExercise(ex)} aria-label="Hear Nova explain this exercise">🔊</button>
        </div>
        <div className="cc-pills"><span>{ex.sets}</span><span>{ex.reps}</span></div>

        <div className="cc-targets">
          <div className="cc-maps">
            {maps ? <>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={maps[0]} alt="Front view of targeted muscles" /><img src={maps[1]} alt="Back view of targeted muscles" /></> : <div className="cc-map-empty">Target map unavailable</div>}
          </div>
          <ul>
            {(["Primary", "Secondary", "Tertiary"] as TargetRole[]).map((r) => <li key={r}><i style={{ background: ROLE_COLOR[r] }} /><span><b>{r}:</b> {byRole(r)}</span></li>)}
          </ul>
        </div>

        <div className="cc-tabs"><button type="button" className={tab === "summary" ? "active" : ""} onClick={() => setTab("summary")}>Summary</button><button type="button" className={tab === "howto" ? "active" : ""} onClick={() => setTab("howto")}>How to</button></div>
        {tab === "summary" ? (
          <div className="cc-list">
            <h3>Form cues</h3>
            {ex.form.map((f) => <p key={f}><span>✓</span>{f}</p>)}
            <h3>Common mistake</h3>
            <p className="warn"><span>!</span>{ex.mistake}</p>
          </div>
        ) : (
          <div className="cc-list">
            <h3>How to perform</h3>
            {ex.steps.map((s, i) => <button type="button" key={s} className={`cc-step ${snap.seg === i ? "current" : ""}`} onClick={() => goSeg(i)}><span>{i + 1}</span><p>{s}</p></button>)}
          </div>
        )}
        <div className="cc-safety"><b>Before you copy this</b><p>This is a guide built from standard coaching technique, not a measurement of your body. It can’t see your mobility, load, balance or equipment, and following it can’t guarantee you won’t get hurt. Start light, use a spotter or safety arms for heavy lifts, keep the movement controlled, and stop if anything hurts. A qualified coach can check your form in person.</p></div>
      </div>

      <div className="cc-library">
        <div className="cc-eyebrow">Exercise library</div>
        <div className="cc-libgrid">
          {EXERCISES.map((item) => <button type="button" key={item.key} className={selected === item.key ? "active" : ""} onClick={() => select(item.key)}><span>{item.name}</span><small>{item.category}</small></button>)}
        </div>
      </div>
    </div>
  );
}
