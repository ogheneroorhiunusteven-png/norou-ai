import { V3, X, Y, add, sub, mul, norm, perp, ik2 } from "./math";

/** Body dimensions in metres (a ~1.75 m adult). */
export const DIM = {
  thigh: 0.44, shank: 0.44, uarm: 0.30, farm: 0.26, hand: 0.07,
  hipW: 0.09, shW: 0.19, TS: 0.47, TN: 0.54, head: 0.14, ankleH: 0.09,
};
/** Index 0 is the +x side, index 1 the -x side. */
export const SIDE = [1, -1] as const;

export interface LegSpec { ankle: V3; pole: V3; foot: V3 }
export interface ArmSpec { grip?: V3; elbow?: V3; wrist?: V3; pole: V3 }
export interface Spec {
  /** Trunk angle in the y-z plane. 0 = upright, +ve = leaning forward (+z), -90deg = lying on the back. */
  tau: number;
  pelvis: V3;
  legs: [LegSpec, LegSpec];
  arms: [ArmSpec, ArmSpec];
  /** 0..1.5: how much the head follows the trunk tilt (0 = looks level, 1 = in line with the spine). */
  headFollow?: number;
  headOffset?: V3;
  headCenter?: V3;
}
export interface Pose {
  tau: number; a: V3; f: V3;
  pelvis: V3; sc: V3; neck: V3; head: V3; headAxis: V3; headFront: V3;
  hip: [V3, V3]; knee: [V3, V3]; ankle: [V3, V3]; toe: [V3, V3]; foot: [V3, V3];
  shoulder: [V3, V3]; elbow: [V3, V3]; wrist: [V3, V3]; hand: [V3, V3];
  legPole: [V3, V3]; armPole: [V3, V3];
  /** Metres by which IK could not reach the target. Anything above a couple of cm is a modelling error. */
  armReach: [number, number]; legReach: [number, number];
}

export function assemble(s: Spec): Pose {
  const a: V3 = [0, Math.cos(s.tau), Math.sin(s.tau)];
  const f: V3 = [0, -Math.sin(s.tau), Math.cos(s.tau)];
  const pelvis = s.pelvis;
  const hip = SIDE.map((sg) => add(pelvis, [sg * DIM.hipW, 0, 0])) as [V3, V3];
  const sc = add(pelvis, mul(a, DIM.TS));
  const shoulder = SIDE.map((sg) => add(sc, [sg * DIM.shW, 0, 0])) as [V3, V3];
  const neck = add(pelvis, mul(a, DIM.TN));
  let head: V3, headAxis: V3;
  if (s.headCenter) {
    head = s.headCenter; headAxis = norm(sub(head, neck));
  } else {
    const th = s.tau * (s.headFollow ?? 0.6);
    headAxis = [0, Math.cos(th), Math.sin(th)];
    head = add(add(neck, mul(headAxis, DIM.head)), s.headOffset ?? [0, 0, 0]);
    headAxis = norm(sub(head, neck));
  }
  const th2 = Math.atan2(headAxis[2], headAxis[1]);
  const headFront: V3 = [0, -Math.sin(th2), Math.cos(th2)];

  const knee: [V3, V3] = [X, X], ankle: [V3, V3] = [X, X], toe: [V3, V3] = [X, X], foot: [V3, V3] = [X, X];
  const legReach: [number, number] = [0, 0];
  const legPole: [V3, V3] = [s.legs[0].pole, s.legs[1].pole];
  for (let i = 0; i < 2; i++) {
    const L = s.legs[i];
    const r = ik2(hip[i], L.ankle, DIM.thigh, DIM.shank, L.pole);
    knee[i] = r.mid; ankle[i] = r.end; legReach[i] = r.reach;
    const fd = norm(L.foot);
    const up = norm(perp(Y, fd));
    foot[i] = fd;
    toe[i] = sub(add(r.end, mul(fd, 0.17)), mul(up, 0.085));
  }

  const elbow: [V3, V3] = [X, X], wrist: [V3, V3] = [X, X], hand: [V3, V3] = [X, X];
  const armReach: [number, number] = [0, 0];
  const armPole: [V3, V3] = [s.arms[0].pole, s.arms[1].pole];
  for (let i = 0; i < 2; i++) {
    const A = s.arms[i];
    if (A.grip) {
      const r = ik2(shoulder[i], A.grip, DIM.uarm, DIM.farm + DIM.hand, A.pole);
      elbow[i] = r.mid; hand[i] = r.end; armReach[i] = r.reach;
      wrist[i] = add(r.mid, mul(norm(sub(r.end, r.mid)), DIM.farm));
    } else {
      elbow[i] = A.elbow as V3; wrist[i] = A.wrist as V3;
      hand[i] = add(wrist[i], mul(norm(sub(wrist[i], elbow[i])), DIM.hand));
    }
  }
  return { tau: s.tau, a, f, pelvis, sc, neck, head, headAxis, headFront, hip, knee, ankle, toe, foot, shoulder, elbow, wrist, hand, legPole, armPole, armReach, legReach };
}
