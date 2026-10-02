// Tiny vector maths for the Coach 3D engine (no dependencies).
export type V3 = [number, number, number];
export const X: V3 = [1, 0, 0];
export const Y: V3 = [0, 1, 0];
export const Z: V3 = [0, 0, 1];
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const dist = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
export const norm = (a: V3): V3 => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
/** Cosine ease: gentle start and stop, like a controlled lift. */
export const ease = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x, 0, 1));
export const rad = (d: number) => (d * Math.PI) / 180;
export const deg = (r: number) => (r * 180) / Math.PI;
/** Part of `v` perpendicular to unit `axis`. */
export const perp = (v: V3, axis: V3): V3 => sub(v, mul(axis, dot(v, axis)));

/** Angle in degrees at joint `b` formed by a-b-c. */
export function jointAngle(a: V3, b: V3, c: V3): number {
  const u = norm(sub(a, b)), w = norm(sub(c, b));
  return deg(Math.acos(clamp(dot(u, w), -1, 1)));
}

/** Piecewise eased profile through [u, value] knots (smooth start/stop on every segment). */
export function profile(u: number, knots: [number, number][]): number {
  if (u <= knots[0][0]) return knots[0][1];
  for (let i = 1; i < knots.length; i++) {
    if (u <= knots[i][0]) {
      const [u0, v0] = knots[i - 1], [u1, v1] = knots[i];
      return lerp(v0, v1, ease((u - u0) / (u1 - u0 || 1)));
    }
  }
  return knots[knots.length - 1][1];
}

/**
 * Two-bone inverse kinematics. Returns the middle joint (elbow / knee) and the end
 * point actually reached. Bones never stretch: if the target is too far the limb is
 * straightened and `reach` reports how far short it fell.
 */
export function ik2(root: V3, target: V3, l1: number, l2: number, pole: V3): { mid: V3; end: V3; reach: number } {
  const to = sub(target, root);
  const d = len(to);
  const dir = d > 1e-9 ? mul(to, 1 / d) : Y;
  const maxD = l1 + l2 - 1e-4, minD = Math.abs(l1 - l2) + 1e-3;
  const dc = clamp(d, minD, maxD);
  const a = (l1 * l1 - l2 * l2 + dc * dc) / (2 * dc);
  const h = Math.sqrt(Math.max(l1 * l1 - a * a, 0));
  let p = perp(pole, dir);
  if (len(p) < 1e-6) p = perp(Z, dir);
  p = norm(p);
  const mid = add(add(root, mul(dir, a)), mul(p, h));
  const end = add(root, mul(dir, dc));
  return { mid, end, reach: d > maxD ? d - maxD : d < minD ? minD - d : 0 };
}
