import { V3, X, Y, Z, add, mul } from "./math";

export type RGB = [number, number, number];
export interface Mat { c: RGB; spec: number; shin: number; glow: number }
export type Prim =
  | { k: "ell"; c: V3; m: [V3, V3, V3]; r: V3; mat: Mat }
  | { k: "cyl"; a: V3; b: V3; r: number; mat: Mat }
  | { k: "box"; c: V3; m: [V3, V3, V3]; h: V3; mat: Mat };

export const mat = (c: RGB, spec = 0.3, shin = 28, glow = 0): Mat => ({ c, spec, shin, glow });
export const M = {
  steel: mat([205, 207, 216], 0.9, 70),
  plate: mat([34, 34, 42], 0.45, 40),
  plateEdge: mat([72, 72, 86], 0.6, 50),
  rubber: mat([22, 22, 29], 0.15, 12),
  frame: mat([52, 52, 66], 0.5, 40),
  purple: mat([150, 84, 240], 0.6, 50, 0.35),
  cable: mat([150, 150, 160], 0.4, 30),
  stack: mat([58, 58, 72], 0.5, 40),
  floor: mat([26, 23, 38], 0.12, 10),
  shadow: mat([12, 10, 18], 0, 1),
  mat: mat([60, 36, 110], 0.2, 14, 0.1),
};

const AX: [V3, V3, V3] = [X, Y, Z];
export const ell = (c: V3, m: [V3, V3, V3], r: V3, mt: Mat): Prim => ({ k: "ell", c, m, r, mat: mt });
export const cyl = (a: V3, b: V3, r: number, mt: Mat): Prim => ({ k: "cyl", a, b, r, mat: mt });
export const box = (c: V3, h: V3, mt: Mat, m: [V3, V3, V3] = AX): Prim => ({ k: "box", c, m, h, mat: mt });
export const sphere = (c: V3, r: number, mt: Mat): Prim => ell(c, AX, [r, r, r], mt);

/** Olympic barbell with a plate on each side. `c` is the bar centre; the bar lies along x. */
export function barbell(c: V3): Prim[] {
  const out: Prim[] = [];
  const seg = (x0: number, x1: number, r: number, mt: Mat) => out.push(cyl(add(c, [x0, 0, 0]), add(c, [x1, 0, 0]), r, mt));
  seg(-1.1, 1.1, 0.0145, M.steel);
  for (const sg of [1, -1]) {
    seg(sg * 0.42, sg * 1.1, 0.0255, M.steel);
    seg(sg * 0.46, sg * 0.495, 0.225, M.plate);
    seg(sg * 0.46, sg * 0.4975, 0.205, M.plateEdge);
    seg(sg * 0.495, sg * 0.525, 0.17, M.plate);
    seg(sg * 0.46, sg * 0.53, 0.045, M.steel);
    seg(sg * 0.53, sg * 0.56, 0.04, M.frame);
  }
  return out;
}

/** Hex-style dumbbell. `axis` is the handle direction. */
export function dumbbell(c: V3, axis: "x" | "z" = "x"): Prim[] {
  const d: V3 = axis === "x" ? X : Z;
  const out: Prim[] = [cyl(add(c, mul(d, -0.075)), add(c, mul(d, 0.075)), 0.0135, M.steel)];
  for (const sg of [1, -1]) {
    out.push(cyl(add(c, mul(d, sg * 0.075)), add(c, mul(d, sg * 0.135)), 0.06, M.plate));
    out.push(cyl(add(c, mul(d, sg * 0.075)), add(c, mul(d, sg * 0.082)), 0.063, M.plateEdge));
  }
  return out;
}

/** Flat bench. Pad runs along z from z0 to z1 and its upper surface is at height `top`. */
export function bench(cx: number, z0: number, z1: number, top: number, halfW = 0.15): Prim[] {
  const zc = (z0 + z1) / 2, hl = Math.abs(z1 - z0) / 2;
  const out: Prim[] = [box([cx, top - 0.05, zc], [halfW, 0.05, hl], M.rubber)];
  out.push(box([cx, top - 0.108, zc], [halfW * 0.6, 0.012, hl * 0.96], M.frame));
  for (const z of [z0 + 0.12, z1 - 0.12]) {
    out.push(box([cx, (top - 0.1) / 2, z], [0.03, (top - 0.1) / 2, 0.03], M.frame));
    out.push(box([cx, 0.02, z], [halfW + 0.12, 0.02, 0.04], M.frame));
  }
  return out;
}

export function rack(zc: number, hookY: number, height: number, halfX = 0.68): Prim[] {
  const out: Prim[] = [];
  for (const sg of [1, -1]) {
    out.push(box([sg * halfX, height / 2, zc], [0.04, height / 2, 0.04], M.frame));
    out.push(box([sg * halfX, 0.02, zc], [0.05, 0.02, 0.4], M.frame));
    out.push(box([sg * halfX, hookY - 0.03, zc + 0.06], [0.035, 0.012, 0.08], M.purple));
  }
  out.push(box([0, height - 0.02, zc], [halfX, 0.02, 0.04], M.frame));
  return out;
}

export function pullupRig(barY: number, barZ: number): Prim[] {
  const out: Prim[] = [];
  const top = barY + 0.16;
  for (const sg of [1, -1]) {
    out.push(box([sg * 0.72, top / 2, barZ - 0.06], [0.04, top / 2, 0.04], M.frame));
    out.push(box([sg * 0.72, 0.02, barZ - 0.06], [0.05, 0.02, 0.45], M.frame));
    out.push(box([sg * 0.72, barY, barZ - 0.03], [0.04, 0.03, 0.05], M.frame));
  }
  out.push(box([0, top, barZ - 0.06], [0.72, 0.035, 0.04], M.frame));
  out.push(cyl([-0.72, barY, barZ], [0.72, barY, barZ], 0.0185, M.steel));
  return out;
}

export function cableTower(zc: number, top: number): Prim[] {
  const out: Prim[] = [];
  out.push(box([0, top / 2, zc + 0.14], [0.22, top / 2, 0.06], M.frame));
  for (let i = 0; i < 9; i++) out.push(box([0, 0.12 + i * 0.1, zc + 0.03], [0.18, 0.04, 0.06], i === 3 ? M.purple : M.plateEdge));
  out.push(box([0, top + 0.03, zc + 0.02], [0.22, 0.03, 0.14], M.frame));
  return out;
}

export const cable = (a: V3, b: V3): Prim => cyl(a, b, 0.0075, M.cable);
