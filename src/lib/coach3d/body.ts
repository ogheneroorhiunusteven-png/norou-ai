import { V3, X, Y, add, sub, mul, norm, cross, perp, len, dist } from "./math";
import { Pose, SIDE } from "./rig";
import { Prim, Mat, mat, ell, sphere } from "./shapes";

export type Role = "P" | "S" | "T";
export type Roles = Record<string, Role>;

const SKIN: Mat = mat([176, 176, 188], 0.32, 34, 0);
const SHORTS: Mat = mat([22, 22, 29], 0.2, 14, 0);
const GREYS = [[168, 168, 181], [180, 180, 193], [162, 162, 176], [186, 186, 198]] as const;
/** Primary and secondary are saturated purple; tertiary is the pale lilac used in the reference sheet. */
export const ROLE_MAT: Record<Role, Mat> = {
  P: mat([138, 70, 245], 0.3, 40, 0.5),
  S: mat([118, 66, 226], 0.28, 40, 0.4),
  T: mat([196, 184, 246], 0.3, 40, 0.25),
};

interface Seg { o: V3; d: V3; p: V3; q: V3; len: number }
function seg(a: V3, b: V3, ref: V3): Seg {
  const d = norm(sub(b, a));
  let p = perp(ref, d);
  if (len(p) < 1e-5) p = perp([0, 0, 1], d);
  if (len(p) < 1e-5) p = perp(Y, d);
  p = norm(p);
  return { o: a, d, p, q: cross(d, p), len: dist(a, b) };
}
/** Ellipsoid attached to a segment: `along` metres from its start, an offset, radii (along, p, q). */
const E = (s: Seg, along: number, off: V3, r: [number, number, number], mt: Mat): Prim =>
  ell(add(add(s.o, mul(s.d, along)), off), [s.d, s.p, s.q], r, mt);

/**
 * Builds the anatomical mannequin for a pose. `roles` maps muscle names to
 * Primary / Secondary / Tertiary so targeted muscles are coloured purple.
 */
export function buildBody(pose: Pose, roles: Roles, showTargets: boolean): Prim[] {
  const out: Prim[] = [];
  const m = (...names: string[]): Mat => {
    if (showTargets) {
      const order: Role[] = ["P", "S", "T"];
      let best = 9;
      for (const n of names) { const r = roles[n]; if (r) best = Math.min(best, order.indexOf(r)); }
      if (best < 9) return ROLE_MAT[order[best]];
    }
    const g = GREYS[(names[0].length + names[0].charCodeAt(0)) % GREYS.length];
    return mat([g[0], g[1], g[2]], 0.32, 34, 0);
  };

  // ---------- Trunk ----------
  const T: Seg = { o: pose.pelvis, d: pose.a, p: pose.f, q: X, len: 0.5 };
  const tp = (f: number, x = 0): V3 => add(mul(pose.f, f), [x, 0, 0]);
  out.push(E(T, 0.03, tp(0), [0.115, 0.105, 0.172], SHORTS));
  out.push(E(T, 0.2, tp(0), [0.17, 0.1, 0.142], SKIN));
  out.push(E(T, 0.36, tp(0), [0.17, 0.106, 0.176], SKIN));
  out.push(E(T, 0.455, tp(-0.005), [0.085, 0.095, 0.206], SKIN));
  for (const sg of SIDE) {
    out.push(E(T, 0.388, tp(0.072, sg * 0.085), [0.085, 0.05, 0.1], m("Chest")));
    out.push(E(T, 0.445, tp(0.062, sg * 0.085), [0.05, 0.042, 0.092], m("Upper Chest", "Chest")));
    [0.135, 0.205, 0.275].forEach((al) => out.push(E(T, al, tp(0.09, sg * 0.038), [0.04, 0.028, 0.034], m("Abs"))));
    out.push(E(T, 0.17, tp(0.02, sg * 0.135), [0.11, 0.07, 0.042], m("Obliques")));
    out.push(E(T, 0.33, tp(-0.05, sg * 0.13), [0.17, 0.058, 0.055], m("Lats")));
    out.push(E(T, 0.22, tp(-0.06, sg * 0.1), [0.11, 0.05, 0.05], m("Lats")));
    out.push(E(T, 0.505, tp(-0.03, sg * 0.085), [0.07, 0.06, 0.12], m("Upper Traps")));
    out.push(E(T, 0.385, tp(-0.088, sg * 0.05), [0.085, 0.03, 0.062], m("Rhomboids", "Mid Back")));
    out.push(E(T, 0.13, tp(-0.085, sg * 0.04), [0.12, 0.04, 0.04], m("Lower Back")));
    out.push(E(T, -0.02, tp(-0.088, sg * 0.085), [0.1, 0.09, 0.09], m("Glutes")));
    out.push(sphere(pose.shoulder[sg === 1 ? 0 : 1], 0.055, SKIN));
  }

  // ---------- Head & neck ----------
  const nk = seg(pose.neck, pose.head, pose.headFront);
  out.push(E(nk, 0.06, [0, 0, 0], [0.085, 0.052, 0.056], SKIN));
  out.push(ell(pose.head, [pose.headAxis, pose.headFront, X], [0.116, 0.096, 0.086], SKIN));
  out.push(ell(add(add(pose.head, mul(pose.headFront, 0.075)), mul(pose.headAxis, -0.06)), [pose.headAxis, pose.headFront, X], [0.05, 0.04, 0.055], SKIN));

  // ---------- Arms ----------
  for (let i = 0; i < 2; i++) {
    const sg = SIDE[i];
    const U = seg(pose.shoulder[i], pose.elbow[i], pose.armPole[i]);
    const outward = norm(perp([sg, 0, 0], U.d));
    out.push(E(U, 0.15, [0, 0, 0], [0.17, 0.043, 0.043], SKIN));
    out.push(E(U, 0.07, mul(outward, 0.022), [0.098, 0.064, 0.064], m("Shoulders")));
    out.push(E(U, 0.17, mul(U.p, -0.028), [0.105, 0.04, 0.036], m("Biceps", "Brachialis")));
    out.push(E(U, 0.16, mul(U.p, 0.03), [0.115, 0.042, 0.04], m("Triceps")));
    out.push(sphere(pose.elbow[i], 0.038, SKIN));
    const F = seg(pose.elbow[i], pose.wrist[i], pose.armPole[i]);
    out.push(E(F, 0.1, [0, 0, 0], [0.15, 0.04, 0.037], SKIN));
    out.push(E(F, 0.2, [0, 0, 0], [0.085, 0.03, 0.028], SKIN));
    out.push(E(F, 0.09, mul(F.p, -0.003), [0.11, 0.044, 0.04], m("Forearms")));
    out.push(E(F, 0.3, [0, 0, 0], [0.058, 0.03, 0.04], SKIN));
  }

  // ---------- Legs ----------
  for (let i = 0; i < 2; i++) {
    const sg = SIDE[i];
    const Th = seg(pose.hip[i], pose.knee[i], pose.legPole[i]);
    const outward = norm(perp([sg, 0, 0], Th.d));
    out.push(E(Th, 0.22, [0, 0, 0], [0.25, 0.078, 0.078], SKIN));
    out.push(E(Th, 0.1, [0, 0, 0], [0.19, 0.096, 0.094], SHORTS));
    out.push(E(Th, 0.25, mul(Th.p, 0.028), [0.21, 0.06, 0.066], m("Quadriceps")));
    out.push(E(Th, 0.27, add(mul(outward, 0.048), mul(Th.p, 0.01)), [0.17, 0.042, 0.04], m("Quadriceps")));
    out.push(E(Th, 0.37, add(mul(Th.p, 0.02), mul(outward, -0.04)), [0.07, 0.04, 0.038], m("Quadriceps")));
    out.push(E(Th, 0.23, mul(Th.p, -0.045), [0.2, 0.052, 0.06], m("Hamstrings")));
    out.push(sphere(pose.knee[i], 0.052, SKIN));
    const S = seg(pose.knee[i], pose.ankle[i], pose.legPole[i]);
    out.push(E(S, 0.22, [0, 0, 0], [0.25, 0.048, 0.046], SKIN));
    out.push(E(S, 0.14, mul(S.p, -0.04), [0.13, 0.052, 0.05], m("Calves")));
    out.push(E(S, 0.38, [0, 0, 0], [0.09, 0.036, 0.034], SKIN));
    const fd = pose.foot[i];
    const up = norm(perp(Y, fd));
    const c = sub(add(pose.ankle[i], mul(fd, 0.065)), mul(up, 0.048));
    out.push(ell(c, [fd, up, cross(fd, up)], [0.125, 0.038, 0.05], SKIN));
  }
  return out;
}
