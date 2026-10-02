import { V3, X, Y, Z, add, sub, mul, norm, lerp, rad, ease, profile, jointAngle, perp, dist, len, dot } from "./math";
import { Spec, Pose, DIM, LegSpec, ArmSpec, SIDE, assemble } from "./rig";
import { Prim, M, barbell, dumbbell, bench, rack, pullupRig, cableTower, cable, cyl, box } from "./shapes";
import type { Roles } from "./body";

export type ExerciseKey = "bench" | "squat" | "deadlift" | "overhead" | "pullup" | "row" | "lunge" | "curl" | "pushdown" | "lateral" | "bridge" | "plank";
export type TargetRole = "Primary" | "Secondary" | "Tertiary";

/** One segment of the rep loop. The model eases from the previous progress value to `to`. */
export interface Seg { name: string; dur: number; to: number; cue: string }
export interface Built { spec: Spec; props: (pose: Pose) => Prim[]; track: (pose: Pose) => V3 }
export interface Watch { label: string; read: (p: Pose) => number; unit?: string }

export interface Exercise {
  key: ExerciseKey; name: string; category: string; sets: string; reps: string; isHold?: boolean;
  targets: { name: string; role: TargetRole; zone: string }[];
  roles: Roles;
  segs: Seg[];
  steps: string[]; form: string[]; mistake: string;
  /** Progress d in [0,1] -> body + equipment. `rep` lets alternating-side movements swap sides. */
  build(d: number, rep: number): Built;
  watch: Watch[];
  cam: { target: V3; radius: number; yaw: number; pitch: number };
}

// ------------------------------------------------------------------ helpers
const A = ({ x, y, z }: { x: number; y: number; z: number }): V3 => [x, y, z];
const R = rad;
/** Flat foot on the floor at (x, z) with the toes turned out by `toeDeg`. Knee tracks along the foot. */
function stand(sg: number, x: number, z: number, toeDeg = 12, y = DIM.ankleH): LegSpec {
  const t = R(toeDeg);
  const f: V3 = [sg * Math.sin(t), 0, Math.cos(t)];
  return { ankle: [sg * x, y, z], pole: [f[0], 0.05, f[2]], foot: f };
}
const hang = (sg: number): ArmSpec => ({ pole: [sg * 0.3, -0.3, -1] });
const sideNames = [0, 1] as const;
void sideNames; void A; void lerp; void cyl; void box; void X; void Z; void perp;

const mid = (a: V3, b: V3): V3 => mul(add(a, b), 0.5);
const avg2 = (f: (i: number) => number) => (f(0) + f(1)) / 2;
const kneeAng = (p: Pose) => avg2((i) => jointAngle(p.hip[i], p.knee[i], p.ankle[i]));
const hipAng = (p: Pose) => avg2((i) => jointAngle(p.sc, p.hip[i], p.knee[i]));
const elbowAng = (p: Pose) => avg2((i) => jointAngle(p.shoulder[i], p.elbow[i], p.wrist[i]));
/** Angle of the trunk from vertical (standing) or from horizontal (lying), in degrees. */
const trunkLean = (p: Pose) => Math.abs((Math.atan2(Math.abs(p.a[2]), p.a[1]) * 180) / Math.PI);
const KNEE: Watch = { label: "Knee", read: kneeAng, unit: "°" };
const HIP: Watch = { label: "Hip", read: hipAng, unit: "°" };
const ELBOW: Watch = { label: "Elbow", read: elbowAng, unit: "°" };
const TRUNK: Watch = { label: "Trunk lean", read: trunkLean, unit: "°" };

const floorProps = (): Prim[] => [];

/** Z of the front surface of the legs at height y, modelling each segment as a capsule so it varies continuously. */
function legFrontZ(p: Pose, y: number): number {
  let best = -9;
  for (let i = 0; i < 2; i++) {
    const segs: [V3, V3, number][] = [[p.hip[i], p.knee[i], 0.105], [p.knee[i], p.ankle[i], 0.058]];
    for (const [a, b, r] of segs) {
      const lo = Math.min(a[1], b[1]), hi = Math.max(a[1], b[1]);
      let z: number;
      if (y >= lo && y <= hi) {
        const t = (y - a[1]) / ((b[1] - a[1]) || 1e-6);
        z = a[2] + (b[2] - a[2]) * t + r;
      } else {
        const end = y < lo ? (a[1] < b[1] ? a : b) : (a[1] > b[1] ? a : b);
        const dy = Math.abs(y - end[1]);
        if (dy >= r) continue;
        z = end[2] + Math.sqrt(r * r - dy * dy);
      }
      best = Math.max(best, z);
    }
  }
  return best;
}

// ------------------------------------------------------------------ BENCH PRESS
const BENCH_TOP = 0.45;
const bench_: Exercise = {
  key: "bench", name: "Bench Press (Barbell)", category: "Chest", sets: "3–4 sets", reps: "8–12 reps",
  targets: [{ name: "Chest", role: "Primary", zone: "pectoralis major" }, { name: "Triceps", role: "Secondary", zone: "triceps brachii" }, { name: "Shoulders", role: "Tertiary", zone: "anterior deltoid" }],
  roles: { Chest: "P", "Upper Chest": "P", Triceps: "S", Shoulders: "T" },
  segs: [
    { name: "Set", dur: 1.1, to: 0, cue: "Eyes under the bar, shoulder blades pinched down and back, feet flat, bar over the shoulders with straight arms." },
    { name: "Lower", dur: 2.2, to: 1, cue: "Lower under control to the lower chest. Forearms stay vertical, elbows about 45–60° from your sides." },
    { name: "Press", dur: 1.6, to: 0, cue: "Press up and slightly back toward the shoulders. Feet push into the floor, glutes stay on the bench." },
    { name: "Lockout", dur: 0.9, to: 0, cue: "Arms straight with the bar over the shoulders. Re-rack only when the bar is stable." },
  ],
  steps: ["Lie with eyes under the bar, feet flat and shoulder blades pulled back and down.", "Grip just wider than shoulders, unrack and hold the bar over your shoulders.", "Lower to the lower chest with forearms vertical, elbows 45–60° from your sides.", "Press back up, feet driving, head and glutes staying on the bench, then re-rack."],
  form: ["Shoulder blades pinched and glutes on the bench.", "Wrists stacked over elbows, forearms vertical at the bottom.", "Use a spotter or safety arms for challenging loads."],
  mistake: "Bouncing the bar off the chest, flaring the elbows to 90°, or lifting the hips off the bench.",
  watch: [ELBOW, { label: "Knee", read: kneeAng, unit: "°" }],
  cam: { target: [0, 0.75, -0.15], radius: 1.75, yaw: -0.85, pitch: 0.28 },
  build(d) {
    const sh = [0, 0.56, 0] as V3;
    const barY = lerp(1.165, 0.725, d), barZ = lerp(-0.47, -0.4, d);
    const gx = 0.33;
    const leg = (sg: number): LegSpec => ({ ankle: [sg * 0.3, 0.09, 0.4], pole: [sg * 0.3, 0.75, 0.3], foot: [0, 0, 1] });
    const arm = (sg: number): ArmSpec => ({ grip: [sg * gx, barY, barZ], pole: [sg * 0.75, -0.55, 0.4] });
    const spec: Spec = { tau: -Math.PI / 2, pelvis: sh, legs: [leg(1), leg(-1)], arms: [arm(1), arm(-1)], headCenter: [0, 0.56, -0.68] };
    return {
      spec,
      props: () => [...bench(0, -0.8, 0.3, BENCH_TOP), ...rack(-0.62, 1.12, 1.45), ...barbell([0, barY, barZ])],
      track: () => [0, barY, barZ],
    };
  },
};

// ------------------------------------------------------------------ SQUAT
const squat_: Exercise = {
  key: "squat", name: "Squat (Barbell)", category: "Legs", sets: "3–4 sets", reps: "8–12 reps",
  targets: [{ name: "Quadriceps", role: "Primary", zone: "quadriceps" }, { name: "Glutes", role: "Secondary", zone: "gluteus maximus" }, { name: "Hamstrings", role: "Tertiary", zone: "hamstrings" }],
  roles: { Quadriceps: "P", Glutes: "S", Hamstrings: "T" },
  segs: [
    { name: "Stand", dur: 1.0, to: 0, cue: "Bar on the upper back, feet shoulder-width with toes slightly out. Big breath, brace your trunk." },
    { name: "Descend", dur: 2.2, to: 1, cue: "Sit down and back, knees travelling out over the toes. Chest up, spine neutral, whole foot on the floor." },
    { name: "Bottom", dur: 0.7, to: 1, cue: "Thighs about parallel (only as deep as you can keep your back neutral). Knees stay in line with the toes." },
    { name: "Drive up", dur: 1.7, to: 0, cue: "Push the floor away through the whole foot. Hips and shoulders rise together." },
  ],
  steps: ["Set the bar on your upper back, step back and set a shoulder-width stance, toes slightly out.", "Breathe in, brace, then sit down and back while the knees track over the toes.", "Descend to about parallel while keeping the whole foot down and the spine neutral.", "Drive through the whole foot and stand tall without leaning back."],
  form: ["Knees track in line with the toes.", "Whole foot stays on the floor, heels down.", "Chest up, back flat, bar over mid-foot."],
  mistake: "Knees caving in, heels lifting, or rounding the lower back at the bottom.",
  watch: [KNEE, HIP, TRUNK],
  cam: { target: [0, 0.85, 0], radius: 1.7, yaw: -0.8, pitch: 0.12 },
  build(d) {
    const tau = R(lerp(4, 38, d));
    const a: V3 = [0, Math.cos(tau), Math.sin(tau)], f: V3 = [0, -Math.sin(tau), Math.cos(tau)];
    const py = lerp(0.95, 0.55, d);
    const barMid = (pel: V3) => add(add(pel, mul(a, 0.5)), mul(f, -0.09));
    // Place the pelvis so the bar sits over mid-foot (z = 0.05) at every instant.
    const pz = 0.05 - (barMid([0, py, 0])[2]);
    const pelvis: V3 = [0, py, pz];
    const bar = barMid(pelvis);
    const legs: [LegSpec, LegSpec] = [stand(1, 0.19, 0, 18), stand(-1, 0.19, 0, 18)];
    const arm = (sg: number): ArmSpec => ({ grip: [sg * 0.3, bar[1], bar[2]], pole: [sg * 0.2, -0.7, -1] });
    return {
      spec: { tau, pelvis, legs, arms: [arm(1), arm(-1)], headFollow: 0.3 },
      props: () => [...rack(-0.28, 1.4, 1.75), ...barbell(bar)],
      track: () => bar,
    };
  },
};

// ------------------------------------------------------------------ DEADLIFT
const deadlift_: Exercise = {
  key: "deadlift", name: "Deadlift (Barbell)", category: "Back", sets: "3–4 sets", reps: "6–10 reps",
  targets: [{ name: "Lower Back", role: "Primary", zone: "erector spinae" }, { name: "Hamstrings", role: "Secondary", zone: "hamstrings" }, { name: "Glutes", role: "Tertiary", zone: "gluteus maximus" }],
  roles: { "Lower Back": "P", Hamstrings: "S", Glutes: "T" },
  segs: [
    { name: "Set up", dur: 1.4, to: 0, cue: "Bar over mid-foot and touching the shins. Hips back, chest up, arms straight, lats tight. Brace before you pull." },
    { name: "Pull", dur: 2.0, to: 1, cue: "Push the floor away. Bar stays in contact with your legs; hips and shoulders rise together, back stays flat." },
    { name: "Lockout", dur: 0.9, to: 1, cue: "Stand tall: hips and knees locked, glutes squeezed. Don't lean back." },
    { name: "Lower", dur: 2.0, to: 0, cue: "Hinge hips back first, then bend the knees once the bar passes them. Control it to the floor; keep the back flat." },
  ],
  steps: ["Stand with the bar over mid-foot, feet hip-width, and hinge down to grip just outside your legs.", "Straighten your arms, drop the hips, lift the chest and brace so the back is flat.", "Push the floor away, keeping the bar against your legs, until you stand tall.", "Lower by hinging the hips back first, then bending the knees, keeping the bar close."],
  form: ["Bar stays over mid-foot and close to the legs.", "Back stays flat (neutral) throughout.", "Brace before every rep; stop the set if your form breaks down."],
  mistake: "Rounding the back, letting the bar drift forward, or yanking the bar off the floor.",
  watch: [KNEE, HIP, TRUNK],
  cam: { target: [0, 0.8, 0], radius: 1.65, yaw: -1.0, pitch: 0.1 },
  build(d) {
    // Hips and torso follow a fixed hinge-to-stand path; the bar rides along the shins, knees and
    // thighs (it can never pass through them) and the arms stay long and straight.
    const barY = lerp(0.225, 0.82, d);
    const tau = R(profile(d, [[0, 50], [0.5, 47], [0.78, 24], [1, 0]]));
    const a: V3 = [0, Math.cos(tau), Math.sin(tau)];
    const nomZ = lerp(0.07, 0.09, ease(d));
    const legs: [LegSpec, LegSpec] = [stand(1, 0.15, -0.05, 10), stand(-1, 0.15, -0.05, 10)];
    const armsFor = (bz: number): [ArmSpec, ArmSpec] => [1, -1].map((sg) => ({ grip: [sg * 0.26, barY, bz] as V3, pole: [sg * 0.5, 0, -0.6] as V3 })) as [ArmSpec, ArmSpec];
    // Two passes: find where the bar rides against the legs, then set the shoulder height so the arms hang long and straight.
    let drop = 0.6, barZ = nomZ, pelvis: V3 = [0, 0, 0];
    for (let pass = 0; pass < 3; pass++) {
      pelvis = [0, barY + drop - a[1] * DIM.TS, nomZ - a[2] * DIM.TS];
      const probe = assemble({ tau, pelvis, legs, arms: armsFor(nomZ), headFollow: 0.75 });
      let front = -9;
      for (let dy = -0.05; dy <= 0.0501; dy += 0.025) front = Math.max(front, legFrontZ(probe, barY + dy));
      barZ = Math.max(nomZ, front + 0.0145 + 0.008);
      const off = barZ - nomZ;
      drop = Math.sqrt(Math.max(0.3, 0.622 * 0.622 - off * off));
    }
    return { spec: { tau, pelvis, legs, arms: armsFor(barZ), headFollow: 0.75 }, props: () => barbell([0, barY, barZ]), track: () => [0, barY, barZ] };
  },
};

// ------------------------------------------------------------------ OVERHEAD PRESS
const overhead_: Exercise = {
  key: "overhead", name: "Overhead Press (Barbell)", category: "Shoulders", sets: "3–4 sets", reps: "8–12 reps",
  targets: [{ name: "Shoulders", role: "Primary", zone: "deltoids" }, { name: "Triceps", role: "Secondary", zone: "triceps" }, { name: "Upper Chest", role: "Tertiary", zone: "clavicular pectoralis" }],
  roles: { Shoulders: "P", Triceps: "S", "Upper Chest": "T" },
  segs: [
    { name: "Set", dur: 1.1, to: 0, cue: "Bar rests on the front shoulders, grip just outside the shoulders, elbows slightly in front of the bar. Squeeze glutes, brace the trunk." },
    { name: "Press", dur: 1.9, to: 1, cue: "Press the bar straight up. Move your head back just enough for the bar to clear your face, ribs stay down." },
    { name: "Lockout", dur: 0.9, to: 1, cue: "Arms straight, bar over the middle of the foot, head pushed through. Don't lean back." },
    { name: "Lower", dur: 2.0, to: 0, cue: "Lower under control back to the front shoulders, still keeping the trunk braced." },
  ],
  steps: ["Hold the bar on your front shoulders, grip just outside the shoulders, feet hip-width.", "Squeeze glutes and brace so ribs and pelvis stay stacked.", "Press straight up, letting your head move back then through as the bar passes.", "Lock out over mid-foot, then lower back to the shoulders under control."],
  form: ["Ribs down, glutes tight, no leaning back.", "Bar path is vertical, ending over mid-foot.", "Use a load you can control through the full range."],
  mistake: "Leaning back to push the bar (overarching the lower back).",
  watch: [ELBOW, TRUNK],
  cam: { target: [0, 1.15, 0], radius: 1.95, yaw: -0.75, pitch: 0.08 },
  build(d) {
    const pelvis: V3 = [0, 0.955, -0.02];
    const barY = lerp(1.455, 2.05, d);
    const barZ = lerp(0.1, 0.0, ease(clampU((d - 0.45) / 0.55)));
    const headBack = profile(d, [[0, 0], [0.15, 1], [0.45, 1], [0.8, 0], [1, 0]]);
    const legs: [LegSpec, LegSpec] = [stand(1, 0.13, 0, 8), stand(-1, 0.13, 0, 8)];
    const arm = (sg: number): ArmSpec => ({ grip: [sg * 0.24, barY, barZ], pole: [sg * 0.1, -1, 0.35 - d * 1.3] });
    return {
      spec: { tau: 0, pelvis, legs, arms: [arm(1), arm(-1)], headFollow: 0, headOffset: [0, 0, -0.055 * headBack] },
      props: () => [...rack(-0.3, 1.4, 1.75), ...barbell([0, barY, barZ])],
      track: () => [0, barY, barZ],
    };
  },
};
function clampU(x: number) { return Math.min(1, Math.max(0, x)); }

// ------------------------------------------------------------------ PULL UP
const BAR_Y = 2.3;
const pullup_: Exercise = {
  key: "pullup", name: "Pull Up", category: "Back", sets: "3–4 sets", reps: "8–12 reps",
  targets: [{ name: "Lats", role: "Primary", zone: "latissimus dorsi" }, { name: "Biceps", role: "Secondary", zone: "biceps brachii" }, { name: "Rhomboids", role: "Tertiary", zone: "rhomboids / mid-back" }],
  roles: { Lats: "P", Biceps: "S", Rhomboids: "T" },
  segs: [
    { name: "Hang", dur: 1.2, to: 0, cue: "Overhand grip a little wider than shoulders. Hang with straight arms, shoulders pulled down away from the ears, core tight." },
    { name: "Pull", dur: 1.9, to: 1, cue: "Drive the elbows down toward your hips. Chest rises to the bar; no kipping or swinging." },
    { name: "Top", dur: 0.8, to: 1, cue: "Chin clears the bar with the chest up. Shoulders stay down, don't crane the neck." },
    { name: "Lower", dur: 2.2, to: 0, cue: "Lower slowly to a full hang, don't drop. Re-set the shoulders before the next rep." },
  ],
  steps: ["Grip the bar overhand, a little wider than the shoulders, and hang with straight arms.", "Pull the shoulders down, brace your core and keep the legs still.", "Drive the elbows down so the chin clears the bar without craning the neck.", "Lower slowly to a full hang under control; use assistance if you cannot control the lowering."],
  form: ["Active shoulders: pulled down, away from the ears.", "No swinging, kipping or jumping.", "Use assistance (band or machine) until you can lower under control."],
  mistake: "Swinging, partial reps, or craning the neck to get the chin over.",
  watch: [ELBOW, TRUNK],
  cam: { target: [0, 1.6, -0.1], radius: 1.55, yaw: -0.7, pitch: 0.05 },
  build(d) {
    const e = d;
    const shY = lerp(BAR_Y - 0.625, BAR_Y - 0.045, e), shZ = lerp(0.0, -0.09, e);
    const tau = R(lerp(0, -17, e));
    const a: V3 = [0, Math.cos(tau), Math.sin(tau)];
    const pelvis: V3 = [0, shY - a[1] * DIM.TS, shZ - a[2] * DIM.TS];
    const kneeBend = lerp(0.18, 0.3, e);
    const leg = (sg: number): LegSpec => ({ ankle: [sg * 0.07, pelvis[1] - 0.72, pelvis[2] - kneeBend - 0.2], pole: [0, 0, 1], foot: [0, -0.7, 0.7] });
    const arm = (sg: number): ArmSpec => ({ grip: [sg * 0.3, BAR_Y, 0], pole: [sg * 0.3, -1, 0.15 + 0.2 * e] });
    return {
      spec: { tau, pelvis, legs: [leg(1), leg(-1)], arms: [arm(1), arm(-1)], headFollow: lerp(0.4, 1.6, e), headOffset: [0, 0.01 * e, 0.06 * e] },
      props: () => pullupRig(BAR_Y, 0),
      track: (p) => mid(p.shoulder[0], p.shoulder[1]),
    };
  },
};

// ------------------------------------------------------------------ DUMBBELL ROW
const row_: Exercise = {
  key: "row", name: "Dumbbell Row", category: "Back", sets: "3–4 sets", reps: "8–12 reps (each side)", 
  targets: [{ name: "Lats", role: "Primary", zone: "latissimus dorsi" }, { name: "Mid Back", role: "Secondary", zone: "rhomboids / trapezius" }, { name: "Biceps", role: "Tertiary", zone: "biceps brachii" }],
  roles: { Lats: "P", "Mid Back": "S", Rhomboids: "S", Biceps: "T" },
  segs: [
    { name: "Hinge", dur: 1.1, to: 0, cue: "One hand and knee on the bench, back flat and nearly parallel to the floor, neck in line with the spine." },
    { name: "Reach", dur: 0.9, to: 0, cue: "Let the dumbbell hang under the shoulder with a long arm. Hips and shoulders stay square." },
    { name: "Pull", dur: 1.5, to: 1, cue: "Drive the elbow up and back toward your hip. Squeeze the shoulder blade, no twisting." },
    { name: "Lower", dur: 1.8, to: 0, cue: "Lower slowly until the arm is straight again. Keep the back flat and hips level." },
  ],
  steps: ["Place one hand and the same-side knee on the bench; other foot flat on the floor.", "Hinge until the back is nearly flat and parallel, neck in line with the spine.", "Pull the elbow up and back toward the hip without twisting the torso.", "Lower slowly to a straight arm; finish all reps, then switch sides."],
  form: ["Back flat; hips and shoulders square to the floor.", "Pull with the elbow toward the hip, don't curl the weight.", "Choose a load that lets you keep the torso still."],
  mistake: "Rotating the torso or shrugging to swing the weight up.",
  watch: [ELBOW, TRUNK],
  cam: { target: [0, 0.75, 0.05], radius: 1.5, yaw: 1.2, pitch: 0.15 },
  build(d, rep) {
    // The working arm alternates every rep; the geometry below is for the +x arm, mirrored for -x.
    const m = 1; // working arm is always the +x (right) arm; repeat on the other side after the set
    void rep;
    const tau = R(76);
    const a: V3 = [0, Math.cos(tau), Math.sin(tau)];
    const pelvis: V3 = [0, 0.93, -0.05];
    const sc = add(pelvis, mul(a, DIM.TS));
    const work = (sg: number) => sg === m;
    const benchX = -m * 0.13;
    const legSupport = (sg: number): LegSpec => ({ ankle: [sg * 0.09, 0.53, -0.5], pole: [0, -1, 0.8], foot: [0, 0.1, -1] });
    const legFloor = (sg: number): LegSpec => stand(sg, 0.24, -0.02, 10);
    const grip = (sg: number): V3 => {
      const sh: V3 = [sg * DIM.shW, sc[1], sc[2]];
      if (!work(sg)) return [sg * 0.19, 0.5, sh[2] + 0.04];
      return [lerp(sh[0], sh[0] + 0.02, d), lerp(sh[1] - 0.59, 0.73, d), lerp(sh[2] + 0.0, sh[2] - 0.29, d)];
    };
    const arm = (sg: number): ArmSpec => ({ grip: grip(sg), pole: work(sg) ? [sg * 0.3, 0.8, -0.9] : [sg * 1, 0, -0.3] });
    const legs: [LegSpec, LegSpec] = [m === 1 ? legFloor(1) : legSupport(1), m === 1 ? legSupport(-1) : legFloor(-1)];
    return {
      spec: { tau, pelvis, legs, arms: [arm(1), arm(-1)], headFollow: 0.85 },
      props: (p) => {
        const i = m === 1 ? 0 : 1;
        const c = add(p.wrist[i], mul(sub(p.hand[i], p.wrist[i]), 0.55));
        return [...bench(benchX, -0.62, 0.72, BENCH_TOP), ...dumbbell(c, "z")];
      },
      track: (p) => p.wrist[m === 1 ? 0 : 1],
    };
  },
};

// ------------------------------------------------------------------ LUNGE (reverse lunge, alternating legs)
const lunge_: Exercise = {
  key: "lunge", name: "Lunge (Dumbbell)", category: "Legs", sets: "3–4 sets", reps: "8–12 reps (each side)",
  targets: [{ name: "Quadriceps", role: "Primary", zone: "quadriceps" }, { name: "Glutes", role: "Secondary", zone: "gluteus maximus" }, { name: "Hamstrings", role: "Tertiary", zone: "hamstrings" }],
  roles: { Quadriceps: "P", Glutes: "S", Hamstrings: "T" },
  segs: [
    { name: "Stand", dur: 1.0, to: 0, cue: "Stand tall with a dumbbell in each hand, feet hip-width, ribs down, shoulders back." },
    { name: "Step back", dur: 1.0, to: 0.35, cue: "Take a long controlled step back, landing on the ball of the rear foot. Torso stays upright." },
    { name: "Lower", dur: 1.6, to: 1, cue: "Drop straight down: front knee over the ankle, front shin close to vertical, rear knee hovers just above the floor." },
    { name: "Drive up", dur: 1.6, to: 0, cue: "Push through the whole front foot to stand, then bring the rear foot back in. Alternate legs each rep." },
  ],
  steps: ["Stand tall holding a dumbbell in each hand, feet hip-width apart.", "Step one foot back, landing on the ball of the foot, torso upright.", "Lower straight down until the front thigh is about parallel; rear knee hovers just above the floor.", "Push through the front foot to stand, bring the foot in and alternate legs."],
  form: ["Front knee tracks in line with the toes, front heel stays down.", "Torso upright; avoid leaning forward.", "Use a wall or rail for support until your balance is steady."],
  mistake: "A short step with the knee shooting far past the toes, or letting the front knee cave in.",
  watch: [KNEE, TRUNK],
  cam: { target: [0, 0.75, -0.3], radius: 1.65, yaw: -1.15, pitch: 0.1 },
  build(d, rep) {
    const m = rep % 2 === 0 ? 1 : -1; // m = side that steps back
    const fwdSide = -m;
    const step = clampU(d / 0.35);     // 0..1 foot travels back
    const low = clampU((d - 0.35) / 0.65); // 0..1 lowering
    const tau = R(lerp(2, 6, low));
    const py = lerp(lerp(0.955, 0.9, ease(step)), 0.57, ease(low));
    const stride = lerp(0, 0.6, ease(step)) + 0.18 * ease(low);
    const arc = Math.sin(Math.PI * step) * 0.14;
    const rearY = lerp(DIM.ankleH, 0.2, ease(step)) + arc * 0.5;
    const pitch = R(lerp(0, 55, ease(step)));
    const rearLeg: LegSpec = { ankle: [m * 0.11, rearY, -stride], pole: [0, -1, 0.8 * low], foot: [0, -Math.sin(pitch), Math.cos(pitch)] };
    const frontLeg = stand(fwdSide, 0.11, 0, 6);
    // The pelvis rides between the feet as the rear foot travels back.
    const pz = lerp(0, -0.18, ease(step)) + lerp(0, -0.13, ease(low));
    const pelvis: V3 = [0, py, pz];
    const a: V3 = [0, Math.cos(tau), Math.sin(tau)];
    const scp = add(pelvis, mul(a, DIM.TS));
    const hand = (sg: number): V3 => [sg * (DIM.shW + 0.07), scp[1] - 0.6, scp[2]];
    const armS = (sg: number): ArmSpec => ({ grip: hand(sg), pole: [sg * 0.3, -0.3, -1] });
    const legs: [LegSpec, LegSpec] = m === 1 ? [rearLeg, frontLeg] : [frontLeg, rearLeg];
    return {
      spec: { tau, pelvis, legs, arms: [armS(1), armS(-1)], headFollow: 0.3 },
      props: (p) => [0, 1].flatMap((i) => dumbbell(add(p.wrist[i], mul(sub(p.hand[i], p.wrist[i]), 0.55)), "z")),
      track: (p) => p.pelvis,
    };
  },
};

// ------------------------------------------------------------------ BICEP CURL
const curl_: Exercise = {
  key: "curl", name: "Bicep Curl (Dumbbell)", category: "Arms", sets: "3–4 sets", reps: "8–12 reps",
  targets: [{ name: "Biceps", role: "Primary", zone: "biceps brachii" }, { name: "Forearms", role: "Secondary", zone: "brachioradialis / forearm flexors" }, { name: "Shoulders", role: "Tertiary", zone: "anterior deltoid" }],
  roles: { Biceps: "P", Brachialis: "P", Forearms: "S", Shoulders: "T" },
  segs: [
    { name: "Start", dur: 1.0, to: 0, cue: "Stand tall, dumbbells at your sides, palms forward, elbows pinned to your ribs, shoulders back." },
    { name: "Curl", dur: 1.5, to: 1, cue: "Curl up by bending only at the elbows. Upper arms stay still; no swinging or leaning." },
    { name: "Top", dur: 0.7, to: 1, cue: "Squeeze the biceps at the top. Elbows still at your sides, wrists straight." },
    { name: "Lower", dur: 2.0, to: 0, cue: "Lower slowly (about 2 seconds) to straight arms without letting the shoulders roll forward." },
  ],
  steps: ["Stand tall with a dumbbell in each hand, palms facing forward.", "Pin your elbows to your sides and keep your shoulders back.", "Curl the weights up by bending only at the elbows.", "Lower slowly to straight arms without swinging."],
  form: ["Elbows stay at your sides, upper arms still.", "Torso upright, no leaning back or swinging.", "Pick a load you can lower smoothly."],
  mistake: "Swinging the body, or letting the elbows drift forward to cheat the weight up.",
  watch: [ELBOW, TRUNK],
  cam: { target: [0, 1.1, 0.1], radius: 1.45, yaw: -0.55, pitch: 0.08 },
  build(d) {
    const pelvis: V3 = [0, 0.955, 0];
    const sc: V3 = [0, 0.955 + DIM.TS, 0];
    const legs: [LegSpec, LegSpec] = [stand(1, 0.14, 0, 8), stand(-1, 0.14, 0, 8)];
    const flex = R(lerp(5, 148, d));
    const arm = (sg: number): ArmSpec => {
      const sh: V3 = [sg * DIM.shW, sc[1], sc[2]];
      const elbow = add(sh, mul(norm([sg * 0.02, -1, 0.04]), DIM.uarm));
      const dir: V3 = norm([0, -Math.cos(flex), Math.sin(flex)]);
      const wrist = add(elbow, mul(dir, DIM.farm));
      return { elbow, wrist, pole: [0, -0.3, -1] };
    };
    return {
      spec: { tau: 0, pelvis, legs, arms: [arm(1), arm(-1)], headFollow: 0 },
      props: (p) => [0, 1].flatMap((i) => dumbbell(add(p.wrist[i], mul(sub(p.hand[i], p.wrist[i]), 0.55)), "x")),
      track: (p) => mid(p.wrist[0], p.wrist[1]),
    };
  },
};

// ------------------------------------------------------------------ TRICEP PUSHDOWN
const pushdown_: Exercise = {
  key: "pushdown", name: "Tricep Pushdown (Cable)", category: "Arms", sets: "3–4 sets", reps: "8–12 reps",
  targets: [{ name: "Triceps", role: "Primary", zone: "triceps brachii" }, { name: "Forearms", role: "Secondary", zone: "forearm muscles" }, { name: "Shoulders", role: "Tertiary", zone: "shoulder stabilizers" }],
  roles: { Triceps: "P", Forearms: "S", Shoulders: "T" },
  segs: [
    { name: "Set", dur: 1.0, to: 0, cue: "Stand close to the stack, slight forward hinge, elbows pinned at your sides, forearms about parallel to the floor." },
    { name: "Press", dur: 1.4, to: 1, cue: "Push the bar down by straightening the elbows only. Upper arms stay glued to your sides." },
    { name: "Lockout", dur: 0.7, to: 1, cue: "Straighten the arms fully and squeeze the triceps, with the wrists straight and the torso still." },
    { name: "Return", dur: 1.9, to: 0, cue: "Let the bar rise under control until the forearms are about parallel again. Don't let the stack pull the elbows forward." },
  ],
  steps: ["Stand facing the cable with a slight hinge forward, holding the bar with an overhand grip.", "Pin your elbows to your sides; start with the forearms about parallel to the floor.", "Press the bar down by straightening the elbows without moving your upper arms.", "Return slowly until the forearms are parallel again, keeping the elbows pinned."],
  form: ["Upper arms stay pinned to the sides.", "No swinging or using body weight to push down.", "Use a resistance you can control through the full range."],
  mistake: "Flaring or lifting the elbows and leaning over the bar to force the weight down.",
  watch: [ELBOW, TRUNK],
  cam: { target: [0, 1.05, 0.2], radius: 1.7, yaw: -1.1, pitch: 0.1 },
  build(d) {
    const tau = R(10);
    const a: V3 = [0, Math.cos(tau), Math.sin(tau)];
    const pelvis: V3 = [0, 0.955, -0.07];
    const sc = add(pelvis, mul(a, DIM.TS));
    const legs: [LegSpec, LegSpec] = [stand(1, 0.15, 0, 8), stand(-1, 0.15, 0, 8)];
    const alpha = R(lerp(-8, 90, d));
    const arm = (sg: number): ArmSpec => {
      const sh: V3 = [sg * DIM.shW, sc[1], sc[2]];
      const elbow = add(sh, [sg * 0.03, -DIM.uarm, -0.04]);
      const dir: V3 = norm([0, -Math.sin(alpha), Math.cos(alpha)]);
      return { elbow, wrist: add(elbow, mul(dir, DIM.farm)), pole: [0, -0.2, -1] };
    };
    return {
      spec: { tau, pelvis, legs, arms: [arm(1), arm(-1)], headFollow: 0.4 },
      props: (p) => {
        const h = mid(p.hand[0], p.hand[1]);
        const top: V3 = [0, 2.05, 0.62];
        return [...cableTower(0.62, 2.0), cable(top, h), cyl([-0.24, h[1], h[2]], [0.24, h[1], h[2]], 0.014, M.steel), cyl([-0.26, h[1], h[2]], [-0.2, h[1], h[2]], 0.02, M.rubber), cyl([0.2, h[1], h[2]], [0.26, h[1], h[2]], 0.02, M.rubber)];
      },
      track: (p) => mid(p.hand[0], p.hand[1]),
    };
  },
};

// ------------------------------------------------------------------ LATERAL RAISE
const lateral_: Exercise = {
  key: "lateral", name: "Shoulder Lateral Raise (Dumbbell)", category: "Shoulders", sets: "3–4 sets", reps: "10–15 reps",
  targets: [{ name: "Shoulders", role: "Primary", zone: "lateral deltoid" }, { name: "Upper Traps", role: "Secondary", zone: "upper trapezius" }, { name: "Triceps", role: "Tertiary", zone: "triceps" }],
  roles: { Shoulders: "P", "Upper Traps": "S", Triceps: "T" },
  segs: [
    { name: "Start", dur: 1.0, to: 0, cue: "Stand tall, slight bend in the knees and elbows, dumbbells at your sides, shoulders down and relaxed." },
    { name: "Raise", dur: 1.5, to: 1, cue: "Lift the elbows out and slightly forward of the body, leading with the elbows. No shrugging." },
    { name: "Top", dur: 0.6, to: 1, cue: "Stop at about shoulder height. Wrists stay below the elbows; the torso stays still." },
    { name: "Lower", dur: 2.0, to: 0, cue: "Lower slowly (about 2 seconds) back to your sides. Keep the tension and don't swing." },
  ],
  steps: ["Stand tall with a dumbbell in each hand and a soft bend in the elbows.", "Raise the arms out to the sides, leading with the elbows.", "Stop at about shoulder height; don't shrug or swing.", "Lower slowly with control."],
  form: ["Soft elbows, slight forward lean of the arms (about 20°).", "Raise to shoulder height only; no shrugging.", "Light weight and strict form beat heavy weight and swinging."],
  mistake: "Using momentum or shrugging the shoulders toward the ears.",
  watch: [{ label: "Arm raise", read: (p) => (Math.acos(Math.max(-1, Math.min(1, dot(norm(sub(p.elbow[0], p.shoulder[0])), mul(p.a, -1))))) * 180) / Math.PI, unit: "°" }, TRUNK],
  cam: { target: [0, 1.05, 0.1], radius: 1.7, yaw: -0.5, pitch: 0.06 },
  build(d) {
    const tau = R(6);
    const a: V3 = [0, Math.cos(tau), Math.sin(tau)];
    const pelvis: V3 = [0, 0.945, -0.03];
    const sc = add(pelvis, mul(a, DIM.TS));
    const legs: [LegSpec, LegSpec] = [stand(1, 0.14, 0, 8), stand(-1, 0.14, 0, 8)];
    const beta = R(lerp(4, 88, d)), gam = R(20);
    const arm = (sg: number): ArmSpec => {
      const sh: V3 = [sg * DIM.shW, sc[1], sc[2]];
      const dir: V3 = norm([sg * Math.sin(beta) * Math.cos(gam), -Math.cos(beta), Math.sin(beta) * Math.sin(gam) + 0.02]);
      const elbow = add(sh, mul(dir, DIM.uarm));
      const dn = norm(perp(norm([0, -0.857, 0.514]), dir));
      const fd = norm(add(mul(dir, Math.cos(R(16))), mul(dn, Math.sin(R(16)))));
      return { elbow, wrist: add(elbow, mul(fd, DIM.farm)), pole: [0, -0.5, -1] };
    };
    return {
      spec: { tau, pelvis, legs, arms: [arm(1), arm(-1)], headFollow: 0.3 },
      props: (p) => [0, 1].flatMap((i) => dumbbell(add(p.wrist[i], mul(sub(p.hand[i], p.wrist[i]), 0.55)), "z")),
      track: (p) => mid(p.wrist[0], p.wrist[1]),
    };
  },
};

// ------------------------------------------------------------------ GLUTE BRIDGE
const bridge_: Exercise = {
  key: "bridge", name: "Glute Bridge (Barbell)", category: "Glutes", sets: "3–4 sets", reps: "10–15 reps",
  targets: [{ name: "Glutes", role: "Primary", zone: "gluteus maximus" }, { name: "Hamstrings", role: "Secondary", zone: "hamstrings" }, { name: "Lower Back", role: "Tertiary", zone: "lumbar stabilizers" }],
  roles: { Glutes: "P", Hamstrings: "S", "Lower Back": "T" },
  segs: [
    { name: "Set", dur: 1.1, to: 0, cue: "Lie with your upper back on the floor, bar padded across the hip crease, feet flat about hip-width, knees bent." },
    { name: "Lift", dur: 1.5, to: 1, cue: "Drive through your whole foot, tuck the ribs down and lift your hips by squeezing the glutes." },
    { name: "Top", dur: 0.8, to: 1, cue: "Stop when shoulders, hips and knees form a straight line. Don't arch the lower back past that." },
    { name: "Lower", dur: 1.8, to: 0, cue: "Lower the hips under control, keeping the glutes engaged. Don't drop the bar." },
  ],
  steps: ["Lie on your back with the bar padded across your hips, knees bent, feet flat.", "Brace your trunk and tuck the ribs down.", "Drive through your feet to lift the hips until shoulders, hips and knees form a straight line.", "Lower slowly under control."],
  form: ["Ribs down, no overarching of the lower back.", "Shoulders–hips–knees in a straight line at the top.", "Pad the bar and start light."],
  mistake: "Arching the lower back at the top instead of squeezing the glutes.",
  watch: [{ label: "Hip", read: (p) => jointAngle(p.sc, p.hip[0], p.knee[0]), unit: "°" }, KNEE],
  cam: { target: [0, 0.3, 0.45], radius: 1.35, yaw: -1.25, pitch: 0.12 },
  build(d) {
    const th = R(lerp(4, 28, d));
    const tau = -Math.PI / 2 - th;
    const sc: V3 = [0, 0.14, 0];
    const a: V3 = [0, Math.cos(tau), Math.sin(tau)], f: V3 = [0, -Math.sin(tau), Math.cos(tau)];
    const pelvis: V3 = sub(sc, mul(a, DIM.TS));
    const leg = (sg: number): LegSpec => ({ ankle: [sg * 0.17, 0.09, 0.95], pole: [sg * 0.1, 1, 0.1], foot: [sg * 0.12, 0, 1] });
    const barC = add(pelvis, mul(f, 0.115));
    const arm = (sg: number): ArmSpec => ({ grip: [sg * 0.3, barC[1], barC[2]], pole: [sg * 0.3, 1, 0] });
    const neck = add(pelvis, mul(a, DIM.TN));
    return {
      spec: { tau, pelvis, legs: [leg(1), leg(-1)], arms: [arm(1), arm(-1)], headCenter: [0, 0.105, neck[2] - 0.13] },
      props: () => [...barbell(barC), cyl([-0.16, barC[1], barC[2]], [0.16, barC[1], barC[2]], 0.04, M.purple)],
      track: () => barC,
    };
  },
};

// ------------------------------------------------------------------ PLANK
const plank_: Exercise = {
  key: "plank", name: "Plank", category: "Core", sets: "3–4 sets", reps: "30–60 sec", isHold: true,
  targets: [{ name: "Abs", role: "Primary", zone: "rectus abdominis" }, { name: "Obliques", role: "Secondary", zone: "internal / external obliques" }, { name: "Lower Back", role: "Tertiary", zone: "lumbar stabilizers" }],
  roles: { Abs: "P", Obliques: "S", "Lower Back": "T" },
  segs: [
    { name: "Set", dur: 1.4, to: 0, cue: "Forearms on the floor, elbows directly under the shoulders, toes tucked, legs straight." },
    { name: "Brace", dur: 1.2, to: 0, cue: "Squeeze glutes, pull the ribs down and brace as if about to be poked in the stomach. Straight line from head to heels." },
    { name: "Hold", dur: 2.4, to: 1, cue: "Hold the line: hips level (not sagging or piking), neck neutral, gaze at the floor between the hands. Keep breathing." },
    { name: "Reset", dur: 1.0, to: 0, cue: "Drop your knees to the floor to rest before your form breaks down." },
  ],
  steps: ["Place your forearms on the floor with the elbows directly under the shoulders.", "Extend your legs back onto your toes, glutes squeezed and ribs pulled down.", "Hold a straight line from head to heels, hips level, breathing steadily.", "Rest on your knees before your hips sag or pike."],
  form: ["Elbows under shoulders, straight line head to heels.", "Hips level — no sagging and no piking.", "Stop the set when you can't hold the line."],
  mistake: "Letting the hips sag or pike up as fatigue builds.",
  watch: [{ label: "Body line", read: (p) => jointAngle(p.sc, p.pelvis, p.ankle[0]), unit: "°" }, TRUNK],
  cam: { target: [0, 0.3, -0.6], radius: 1.35, yaw: -1.25, pitch: 0.18 },
  build(d) {
    const breathe = Math.sin(d * Math.PI) * 0.004;
    const sc: V3 = [0, 0.36 + breathe, 0];
    const theta = Math.asin((0.36 - 0.19) / (DIM.TS + DIM.thigh + DIM.shank));
    const tau = Math.PI / 2 - theta;
    const a: V3 = [0, Math.cos(tau), Math.sin(tau)];
    const pelvis: V3 = sub(sc, mul(a, DIM.TS));
    const lg = DIM.thigh + DIM.shank;
    const foot: V3 = [0, -Math.cos(theta), Math.sin(theta)];
    const leg = (sg: number): LegSpec => ({ ankle: add([sg * 0.1, 0, 0], sub(pelvis, mul(a, lg - 0.0005))) as V3, pole: [0, 1, 0], foot });
    const arm = (sg: number): ArmSpec => {
      const e: V3 = [sg * 0.17, 0.06, 0];
      return { elbow: [e[0], e[1], e[2]], wrist: [e[0] - sg * 0.04, e[1], 0.26], pole: [0, 1, -1] };
    };
    void len; void dot; void dist;
    return {
      spec: { tau, pelvis, legs: [leg(1), leg(-1)], arms: [arm(1), arm(-1)], headFollow: 1.0 },
      props: () => [box([0, 0.012, -0.55], [0.35, 0.012, 0.95], M.mat)],
      track: (p) => p.pelvis,
    };
  },
};
void floorProps; void SIDE; void Y;

export const EXERCISES: Exercise[] = [bench_, squat_, deadlift_, overhead_, pullup_, row_, lunge_, curl_, pushdown_, lateral_, bridge_, plank_];
export const EX_BY_KEY = Object.fromEntries(EXERCISES.map((e) => [e.key, e])) as Record<ExerciseKey, Exercise>;

/** Total loop time in seconds at 1× speed. */
export const loopTime = (e: Exercise) => e.segs.reduce((s, g) => s + g.dur, 0);

/** Maps a time within the loop to progress d, the active segment index, and fraction through that segment. */
export function sample(e: Exercise, t: number): { d: number; seg: number; frac: number } {
  const T = loopTime(e);
  let tt = ((t % T) + T) % T;
  let from = e.segs[e.segs.length - 1].to;
  for (let i = 0; i < e.segs.length; i++) {
    const g = e.segs[i];
    if (tt <= g.dur) { const fr = tt / g.dur; return { d: lerp(from, g.to, ease(fr)), seg: i, frac: fr }; }
    tt -= g.dur; from = g.to;
  }
  return { d: 0, seg: 0, frac: 0 };
}
/** Time (seconds into the loop) at which segment `i` has just finished. */
export function segEnd(e: Exercise, i: number): number { let t = 0; for (let k = 0; k <= i; k++) t += e.segs[k].dur; return t - 1e-4; }
export function segStart(e: Exercise, i: number): number { let t = 0; for (let k = 0; k < i; k++) t += e.segs[k].dur; return t; }
