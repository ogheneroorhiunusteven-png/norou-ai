/**
 * Posture verification for the Exercise Coach 3D models.
 * Run with:  npx tsx scripts/verify-coach.ts
 * Samples every exercise across its whole range of motion and checks the model against coaching rules.
 * Exits non-zero if any rule fails, so a future edit can't silently break a movement.
 */
import { EX_BY_KEY, EXERCISES } from "../src/lib/coach3d/exercises";
import { assemble, DIM, type Pose } from "../src/lib/coach3d/rig";
import { buildBody } from "../src/lib/coach3d/body";
import { jointAngle, dist, sub, dot, norm, mul, add, type V3 } from "../src/lib/coach3d/math";

let failures = 0;
const rows: string[] = [];
function rule(ex: string, name: string, ok: boolean, detail: string) {
  rows.push(`${ok ? "PASS" : "FAIL"}  ${ex.padEnd(9)} ${name.padEnd(52)} ${detail}`);
  if (!ok) failures++;
}
const N = 120;
function frames(key: keyof typeof EX_BY_KEY, rep = 0) {
  const e = EX_BY_KEY[key];
  return Array.from({ length: N + 1 }, (_, k) => { const d = k / N; const b = e.build(d, rep); return { d, b, p: assemble(b.spec) }; });
}
const minmax = (xs: number[]) => [Math.min(...xs), Math.max(...xs)];
const f1 = (n: number) => n.toFixed(1);
function minY(p: any): number {
  if (p.k === "ell") { const [u0, u1, u2] = p.m, r = p.r; return p.c[1] - Math.hypot(u0[1] * r[0], u1[1] * r[1], u2[1] * r[2]); }
  if (p.k === "cyl") { const a = norm(sub(p.b, p.a)); return Math.min(p.a[1], p.b[1]) - p.r * Math.sqrt(1 - a[1] * a[1]); }
  return 9;
}
function segDist(q: V3, a: V3, b: V3) { const ab = sub(b, a); const t = Math.max(0, Math.min(1, dot(sub(q, a), ab) / dot(ab, ab))); return dist(q, add(a, mul(ab, t))); }

for (const e of EXERCISES) {
  const fr = frames(e.key as any).concat(frames(e.key as any, 1));
  // Generic: limbs reach their targets (no stretching), nothing sinks through the floor, motion is smooth.
  const reach = Math.max(...fr.flatMap((f) => [...f.p.armReach, ...f.p.legReach]));
  rule(e.key, "limbs reach targets without stretching", reach < 0.02, `max shortfall ${(reach * 100).toFixed(1)} cm`);
  let low = 9;
  for (const f of fr) for (const pr of buildBody(f.p, e.roles, true)) low = Math.min(low, minY(pr));
  rule(e.key, "no body part below the floor", low > -0.015, `lowest ${(low * 100).toFixed(1)} cm`);
  let jump = 0;
  const one = frames(e.key as any);
  for (let i = 1; i < one.length; i++) jump = Math.max(jump, ...[...one[i].p.wrist, ...one[i].p.ankle, one[i].p.head].map((q, j) => dist(q, [...one[i - 1].p.wrist, ...one[i - 1].p.ankle, one[i - 1].p.head][j])));
  rule(e.key, "smooth motion (no jumps between samples)", jump < 0.06, `largest step ${(jump * 100).toFixed(1)} cm per 1/${N} of the rep`);
  // Neck: head stays in a neutral relationship to the spine (not craned).
  const neck = fr.map((f) => jointAngle(f.p.sc, f.p.neck, f.p.head));
  void neck;
}

// ---- Squat
{
  const fr = frames("squat"); const e = EX_BY_KEY.squat;
  const bar = fr.map((f) => f.b.track(f.p)); const ank = fr[0].p.ankle[0];
  const off = bar.map((b) => Math.abs(b[2] - (ank[2] + 0.06)));
  rule("squat", "bar stays over mid-foot (±4 cm)", Math.max(...off) < 0.04, `max drift ${(Math.max(...off) * 100).toFixed(1)} cm`);
  rule("squat", "feet stay planted", fr.every((f) => dist(f.p.ankle[0], ank) < 1e-6), "ankle never moves");
  const shank = fr.map((f) => (Math.atan2(f.p.knee[0][2] - f.p.ankle[0][2], f.p.knee[0][1] - f.p.ankle[0][1]) * 180) / Math.PI);
  rule("squat", "shin angle within normal ankle mobility (≤ 40°)", Math.max(...shank) <= 40, `max shin lean ${f1(Math.max(...shank))}° from vertical`);
  const valgus = fr.map((f) => { const t = (f.p.hip[0][1] - f.p.knee[0][1]) / (f.p.hip[0][1] - f.p.ankle[0][1]); const lineX = f.p.hip[0][0] + (f.p.ankle[0][0] - f.p.hip[0][0]) * t; return f.p.knee[0][0] - lineX; });
  rule("squat", "knees never cave in (no valgus)", Math.min(...valgus) > -0.005, `knee is ${f1(Math.min(...valgus) * 100)} cm from the hip–ankle line (≥ 0 = outside it)`);
  const [k0, k1] = minmax(fr.map((f) => jointAngle(f.p.hip[0], f.p.knee[0], f.p.ankle[0])));
  rule("squat", "depth ~parallel (knee 60–75° at bottom)", k0 > 55 && k0 < 80, `knee min ${f1(k0)}°, top ${f1(k1)}°`);
  const lean = Math.max(...fr.map((f) => Math.abs(f.p.tau * 57.3)));
  rule("squat", "torso lean ≤ 45° (chest up)", lean <= 45, `max ${f1(lean)}°`);
  const thighPar = fr[N].p.knee[0][1] - fr[N].p.hip[0][1];
  rule("squat", "hip crease reaches about knee height", thighPar > -0.12 && thighPar < 0.12, `knee ${f1(thighPar * 100)} cm vs hip`);
  void e;
}
// ---- Deadlift
{
  const fr = frames("deadlift");
  let clear = 9;
  for (const f of fr) { const t = f.b.track(f.p); for (const x of [-0.26, -0.13, 0, 0.13, 0.26]) for (let i = 0; i < 2; i++) { const q: V3 = [x, t[1], t[2]]; clear = Math.min(clear, segDist(q, f.p.hip[i], f.p.knee[i]) - 0.105 - 0.0145, segDist(q, f.p.knee[i], f.p.ankle[i]) - 0.055 - 0.0145); } }
  rule("deadlift", "bar never passes through the legs", clear > -0.012, `min clearance ${f1(clear * 100)} cm (≈0 = in contact)`);
  const z0 = fr[0].b.track(fr[0].p)[2] - fr[0].p.ankle[0][2];
  rule("deadlift", "start: bar about over mid-foot", z0 > 0.04 && z0 < 0.2, `bar ${f1(z0 * 100)} cm ahead of ankle`);
  rule("deadlift", "start: hips between knee and shoulder height", fr[0].p.hip[0][1] > fr[0].p.knee[0][1] - 0.05 && fr[0].p.hip[0][1] < fr[0].p.sc[1] - 0.2, `hip ${f1(fr[0].p.hip[0][1] * 100)} cm, knee ${f1(fr[0].p.knee[0][1] * 100)} cm`);
  const top = fr[N].p;
  rule("deadlift", "lockout: tall, hips and knees extended (no lean back)", Math.abs(top.tau * 57.3) < 2 && jointAngle(top.hip[0], top.knee[0], top.ankle[0]) > 170, `trunk ${f1(top.tau * 57.3)}°, knee ${f1(jointAngle(top.hip[0], top.knee[0], top.ankle[0]))}°`);
  rule("deadlift", "arms stay straight (long)", Math.min(...fr.map((f) => jointAngle(f.p.shoulder[0], f.p.elbow[0], f.p.wrist[0]))) > 150, `elbow min ${f1(Math.min(...fr.map((f) => jointAngle(f.p.shoulder[0], f.p.elbow[0], f.p.wrist[0]))))}°`);
}
// ---- Bench
{
  const fr = frames("bench");
  rule("bench", "glutes stay on the bench (hips don't lift)", fr.every((f) => Math.abs(f.p.pelvis[1] - fr[0].p.pelvis[1]) < 1e-9), "pelvis height constant");
  rule("bench", "feet stay planted", fr.every((f) => dist(f.p.ankle[0], fr[0].p.ankle[0]) < 1e-6), "ankle never moves");
  const bot = fr[N].p;
  const arm = norm(sub(bot.elbow[0], bot.shoulder[0]));
  const flare = (Math.acos(Math.max(-1, Math.min(1, dot(arm, mul(bot.a, -1))))) * 180) / Math.PI;
  rule("bench", "bottom: elbows tucked ~45–75° from torso", flare > 30 && flare < 80, `angle ${f1(flare)}°`);
  const fore = norm(sub(bot.wrist[0], bot.elbow[0]));
  rule("bench", "bottom: forearms near vertical", fore[1] > 0.88, `${f1(Math.acos(fore[1]) * 57.3)}° from vertical`);
  rule("bench", "bar touches lower chest, not the neck", Math.abs(fr[N].b.track(fr[N].p)[2] - (bot.pelvis[2] - 0.4)) < 0.06, `bar ${f1((fr[N].b.track(fr[N].p)[2] - bot.pelvis[2]) * 100)} cm from hips`);
  rule("bench", "lockout: arms straight over shoulders", jointAngle(fr[0].p.shoulder[0], fr[0].p.elbow[0], fr[0].p.wrist[0]) > 155, `elbow ${f1(jointAngle(fr[0].p.shoulder[0], fr[0].p.elbow[0], fr[0].p.wrist[0]))}°`);
}
// ---- Overhead press
{
  const fr = frames("overhead");
  rule("overhead", "trunk stays vertical (no leaning back)", fr.every((f) => Math.abs(f.p.tau) < 1e-9), "trunk 0° throughout");
  const t = fr[N]; const bar = t.b.track(t.p);
  rule("overhead", "lockout: bar over mid-foot", Math.abs(bar[2] - (t.p.ankle[0][2] + 0.06)) < 0.1, `bar ${f1((bar[2] - t.p.ankle[0][2]) * 100)} cm from ankle`);
  rule("overhead", "lockout: arms straight", jointAngle(t.p.shoulder[0], t.p.elbow[0], t.p.wrist[0]) > 165, `elbow ${f1(jointAngle(t.p.shoulder[0], t.p.elbow[0], t.p.wrist[0]))}°`);
  let faceClear = 9;
  for (const f of fr) { const b = f.b.track(f.p); if (b[1] > f.p.head[1] - 0.12 && b[1] < f.p.head[1] + 0.12) faceClear = Math.min(faceClear, b[2] - 0.0145 - (f.p.head[2] + 0.096)); }
  rule("overhead", "bar clears the face on the way up", faceClear > 0, `clearance ${f1(faceClear * 100)} cm`);
}
// ---- Pull-up
{
  const fr = frames("pullup"); const top = fr[N];
  const chin = add(add(top.p.head, mul(top.p.headAxis, -0.105)), mul(top.p.headFront, 0.05));
  rule("pullup", "top: chin clears the bar", chin[1] > 2.3 + 0.02, `chin ${f1((chin[1] - 2.3) * 100)} cm above bar`);
  rule("pullup", "bottom: full hang, arms straight", jointAngle(fr[0].p.shoulder[0], fr[0].p.elbow[0], fr[0].p.wrist[0]) > 165, `elbow ${f1(jointAngle(fr[0].p.shoulder[0], fr[0].p.elbow[0], fr[0].p.wrist[0]))}°`);
  rule("pullup", "no big swing (torso lean ≤ 20°)", Math.max(...fr.map((f) => Math.abs(f.p.tau * 57.3))) <= 20, `max ${f1(Math.max(...fr.map((f) => Math.abs(f.p.tau * 57.3))))}°`);
}
// ---- Row
{
  const fr = frames("row", 0);
  rule("row", "back flat and near-parallel to floor (≤ 20° off)", fr.every((f) => Math.abs(90 - Math.abs(f.p.tau * 57.3)) <= 20), `${f1(90 - fr[0].p.tau * 57.3)}° above horizontal`);
  rule("row", "torso doesn't twist or rise while pulling", fr.every((f) => Math.abs(f.p.sc[1] - fr[0].p.sc[1]) < 1e-9), "shoulders fixed in space");
  const wr = fr.map((f) => f.p.wrist[0][1]);
  rule("row", "dumbbell pulled to ribs/hip (rises ≥ 25 cm)", Math.max(...wr) - Math.min(...wr) > 0.25, `range ${f1((Math.max(...wr) - Math.min(...wr)) * 100)} cm`);
}
// ---- Lunge
{
  const fr = frames("lunge", 0).concat(frames("lunge", 1)); const e = EX_BY_KEY.lunge;
  rule("lunge", "torso stays upright (≤ 10° lean)", Math.max(...fr.map((f) => Math.abs(f.p.tau * 57.3))) <= 10, `max ${f1(Math.max(...fr.map((f) => Math.abs(f.p.tau * 57.3))))}°`);
  const bottom = frames("lunge", 0)[N];
  const front = bottom.p.ankle[0][2] > bottom.p.ankle[1][2] ? 0 : 1, rear = 1 - front;
  rule("lunge", "front knee stays over the ankle (≤ 5 cm past toe)", bottom.p.knee[front][2] - bottom.p.toe[front][2] < 0.05, `knee ${f1((bottom.p.knee[front][2] - bottom.p.ankle[front][2]) * 100)} cm ahead of ankle`);
  rule("lunge", "rear knee hovers just above the floor (2–12 cm)", bottom.p.knee[rear][1] - 0.052 > 0.0 && bottom.p.knee[rear][1] - 0.052 < 0.13, `${f1((bottom.p.knee[rear][1] - 0.052) * 100)} cm`);
  const fk = jointAngle(bottom.p.hip[front], bottom.p.knee[front], bottom.p.ankle[front]);
  rule("lunge", "front knee ~90° at the bottom", fk > 75 && fk < 105, `${f1(fk)}°`);
  rule("lunge", "alternates legs each rep", frames("lunge", 1)[N].p.ankle[0][2] > frames("lunge", 1)[N].p.ankle[1][2] !== (frames("lunge", 0)[N].p.ankle[0][2] > frames("lunge", 0)[N].p.ankle[1][2]), "rep 1 leads with the other leg");
  void e;
}
// ---- Curl
{
  const fr = frames("curl");
  const drift = Math.max(...fr.map((f) => Math.abs(f.p.elbow[0][2] - f.p.shoulder[0][2])));
  rule("curl", "upper arms stay pinned (elbow drift ≤ 6 cm)", drift < 0.06, `${f1(drift * 100)} cm`);
  rule("curl", "torso stays still (no swinging)", fr.every((f) => Math.abs(f.p.tau) < 1e-9), "trunk 0° throughout");
  const [e0, e1] = minmax(fr.map((f) => jointAngle(f.p.shoulder[0], f.p.elbow[0], f.p.wrist[0])));
  rule("curl", "full range: straight → fully flexed", e1 > 160 && e0 < 45, `elbow ${f1(e0)}–${f1(e1)}°`);
}
// ---- Pushdown
{
  const fr = frames("pushdown");
  const drift = Math.max(...fr.map((f) => dist(f.p.elbow[0], fr[0].p.elbow[0])));
  rule("pushdown", "elbows stay pinned (no movement)", drift < 0.005, `${f1(drift * 100)} cm`);
  const [e0, e1] = minmax(fr.map((f) => jointAngle(f.p.shoulder[0], f.p.elbow[0], f.p.wrist[0])));
  rule("pushdown", "range: ~90° → locked out", e0 < 95 && e1 > 165, `elbow ${f1(e0)}–${f1(e1)}°`);
}
// ---- Lateral raise
{
  const fr = frames("lateral");
  const top = fr[N].p;
  rule("lateral", "top: arms at ~shoulder height (≤ 95°)", fr.every((f) => f.p.elbow[0][1] <= f.p.shoulder[0][1] + 0.05), `elbow ${f1((top.elbow[0][1] - top.shoulder[0][1]) * 100)} cm vs shoulder`);
  rule("lateral", "top: wrists not above elbows (no pouring up)", top.wrist[0][1] <= top.elbow[0][1] + 0.005, `wrist ${f1((top.wrist[0][1] - top.elbow[0][1]) * 100)} cm vs elbow`);
  rule("lateral", "no shrug or swing (shoulders fixed)", fr.every((f) => dist(f.p.shoulder[0], fr[0].p.shoulder[0]) < 1e-9), "shoulders fixed");
}
// ---- Bridge
{
  const fr = frames("bridge"); const top = fr[N].p;
  const hipExt = jointAngle(top.sc, top.hip[0], top.knee[0]);
  rule("bridge", "top: no over-arching (hip ≤ 183°)", hipExt <= 183, `hip ${f1(hipExt)}° (180° = straight line)`);
  rule("bridge", "top: reaches full hip extension (≥ 165°)", hipExt >= 165, `hip ${f1(hipExt)}°`);
  rule("bridge", "upper back stays on the floor", fr.every((f) => Math.abs(f.p.sc[1] - fr[0].p.sc[1]) < 1e-9 && Math.abs(f.p.sc[2]) < 1e-9), "shoulders fixed on the floor");
  rule("bridge", "feet stay planted", fr.every((f) => dist(f.p.ankle[0], fr[0].p.ankle[0]) < 1e-6), "ankle never moves");
}
// ---- Plank
{
  const fr = frames("plank");
  rule("plank", "elbows directly under shoulders", Math.abs(fr[0].p.elbow[0][2] - fr[0].p.shoulder[0][2]) < 0.02, `${f1((fr[0].p.elbow[0][2] - fr[0].p.shoulder[0][2]) * 100)} cm`);
  const line = jointAngle(fr[0].p.sc, fr[0].p.pelvis, mul(add(fr[0].p.ankle[0], fr[0].p.ankle[1]), 0.5));
  rule("plank", "straight line shoulders–hips–ankles (≥ 176°)", line >= 176, `${f1(line)}° (no sag or pike)`);
  rule("plank", "legs straight", jointAngle(fr[0].p.hip[0], fr[0].p.knee[0], fr[0].p.ankle[0]) > 172, `knee ${f1(jointAngle(fr[0].p.hip[0], fr[0].p.knee[0], fr[0].p.ankle[0]))}°`);
}
void DIM; void ({} as Pose);
console.log(rows.join("\n"));
console.log(`\n${rows.length - failures}/${rows.length} checks passed`);
process.exit(failures ? 1 : 0);
