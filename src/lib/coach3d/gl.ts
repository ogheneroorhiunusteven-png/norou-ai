import { V3, Y, add, sub, mul, dot, norm, cross, len } from "./math";
import { Prim } from "./shapes";

export interface Camera { target: V3; dist: number; yaw: number; pitch: number; fov: number }

const VS = `
attribute vec3 aPos; attribute vec3 aNor;
uniform mat4 uVP; uniform mat3 uAxes; uniform mat3 uNAxes; uniform vec3 uT;
varying vec3 vN; varying vec3 vW;
void main(){
  vec3 w = uAxes * aPos + uT;
  vW = w; vN = normalize(uNAxes * aNor);
  gl_Position = uVP * vec4(w, 1.0);
}`;
const FS = `
precision mediump float;
varying vec3 vN; varying vec3 vW;
uniform vec3 uCam; uniform vec3 uCol; uniform vec3 uL1; uniform vec3 uL2;
uniform float uSpec; uniform float uShin; uniform float uGlow;
void main(){
  vec3 n = normalize(vN);
  vec3 v = normalize(uCam - vW);
  if (dot(n, v) < 0.0) n = -n;
  float d1 = max(dot(n, uL1), 0.0);
  float d2 = max(dot(n, uL2), 0.0);
  float hemi = 0.5 + 0.5 * n.y;
  vec3 h = normalize(uL1 + v);
  float sp = pow(max(dot(n, h), 0.0), uShin) * uSpec;
  float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
  vec3 base = uCol / 255.0;
  vec3 col = base * (0.2 + 0.28 * hemi + 0.78 * d1) * (1.0 + uGlow * 0.5)
           + vec3(0.14, 0.1, 0.27) * d2
           + vec3(sp)
           + vec3(0.4, 0.26, 0.85) * fres * (0.2 + uGlow * 0.45);
  gl_FragColor = vec4(min(col, vec3(1.0)), 1.0);
}`;

function mkMesh(pos: number[], nor: number[], idx: number[]) { return { pos: new Float32Array(pos), nor: new Float32Array(nor), idx: new Uint16Array(idx) }; }
function sphereMesh(la = 18, lo = 28) {
  const p: number[] = [], n: number[] = [], ix: number[] = [];
  for (let i = 0; i <= la; i++) { const t = (i / la) * Math.PI; for (let j = 0; j <= lo; j++) { const u = (j / lo) * Math.PI * 2; const x = Math.sin(t) * Math.cos(u), y = Math.cos(t), z = Math.sin(t) * Math.sin(u); p.push(x, y, z); n.push(x, y, z); } }
  for (let i = 0; i < la; i++) for (let j = 0; j < lo; j++) { const a = i * (lo + 1) + j, b = a + lo + 1; ix.push(a, b, a + 1, b, b + 1, a + 1); }
  return mkMesh(p, n, ix);
}
function cylMesh(sg = 28) {
  const p: number[] = [], n: number[] = [], ix: number[] = [];
  for (let j = 0; j <= sg; j++) { const u = (j / sg) * Math.PI * 2, c = Math.cos(u), s = Math.sin(u); p.push(c, -1, s, c, 1, s); n.push(c, 0, s, c, 0, s); }
  for (let j = 0; j < sg; j++) { const a = j * 2; ix.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  for (const y of [-1, 1]) {
    const base = p.length / 3; p.push(0, y, 0); n.push(0, y, 0);
    for (let j = 0; j <= sg; j++) { const u = (j / sg) * Math.PI * 2; p.push(Math.cos(u), y, Math.sin(u)); n.push(0, y, 0); }
    for (let j = 0; j < sg; j++) y > 0 ? ix.push(base, base + 1 + j, base + 2 + j) : ix.push(base, base + 2 + j, base + 1 + j);
  }
  return mkMesh(p, n, ix);
}
function boxMesh() {
  const p: number[] = [], n: number[] = [], ix: number[] = [];
  const faces: [number[], number[], number[]][] = [
    [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
    [[0, 1, 0], [0, 0, 1], [1, 0, 0]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
    [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [0, 1, 0], [1, 0, 0]],
  ];
  for (const [nn, u, v] of faces) {
    const b = p.length / 3;
    for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) p.push(nn[0] + u[0] * su + v[0] * sv, nn[1] + u[1] * su + v[1] * sv, nn[2] + u[2] * su + v[2] * sv), n.push(nn[0], nn[1], nn[2]);
    ix.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  return mkMesh(p, n, ix);
}

type Mesh = ReturnType<typeof mkMesh> & { vb?: WebGLBuffer; nb?: WebGLBuffer; ib?: WebGLBuffer };

function perspective(fov: number, aspect: number, near: number, far: number): number[] {
  const f = 1 / Math.tan(fov / 2), nf = 1 / (near - far);
  return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
}
function lookAt(eye: V3, target: V3): number[] {
  const f = norm(sub(target, eye)), s = norm(cross(f, Y)), u = cross(s, f);
  return [s[0], u[0], -f[0], 0, s[1], u[1], -f[1], 0, s[2], u[2], -f[2], 0, -dot(s, eye), -dot(u, eye), dot(f, eye), 1];
}
function mat4mul(a: number[], b: number[]): number[] {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; }
  return o;
}

/** Minimal WebGL renderer for ellipsoids, capped cylinders and boxes. No dependencies. */
export class CoachGL {
  gl: WebGLRenderingContext;
  private prog: WebGLProgram;
  private meshes: { ell: Mesh; cyl: Mesh; box: Mesh };
  private loc: Record<string, WebGLUniformLocation | null> = {};
  private aPos = 0; private aNor = 0;

  constructor(public canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl", { antialias: true, alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true }) as WebGLRenderingContext | null;
    if (!gl) throw new Error("WebGL unavailable");
    this.gl = gl;
    const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader"); return s; };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || "link");
    this.prog = prog;
    for (const n of ["uVP", "uAxes", "uNAxes", "uT", "uCam", "uCol", "uL1", "uL2", "uSpec", "uShin", "uGlow"]) this.loc[n] = gl.getUniformLocation(prog, n);
    this.aPos = gl.getAttribLocation(prog, "aPos"); this.aNor = gl.getAttribLocation(prog, "aNor");
    const up = (m: Mesh): Mesh => { m.vb = gl.createBuffer()!; gl.bindBuffer(gl.ARRAY_BUFFER, m.vb); gl.bufferData(gl.ARRAY_BUFFER, m.pos, gl.STATIC_DRAW); m.nb = gl.createBuffer()!; gl.bindBuffer(gl.ARRAY_BUFFER, m.nb); gl.bufferData(gl.ARRAY_BUFFER, m.nor, gl.STATIC_DRAW); m.ib = gl.createBuffer()!; gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.idx, gl.STATIC_DRAW); return m; };
    this.meshes = { ell: up(sphereMesh()), cyl: up(cylMesh()), box: up(boxMesh()) };
  }

  resize(cssW: number, cssH: number, dpr: number) {
    const w = Math.max(2, Math.round(cssW * dpr)), h = Math.max(2, Math.round(cssH * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
  }

  render(prims: Prim[], cam: Camera) {
    const gl = this.gl, W = this.canvas.width, H = this.canvas.height;
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.prog);
    const cp = Math.cos(cam.pitch);
    const eye: V3 = add(cam.target, [cam.dist * Math.sin(cam.yaw) * cp, cam.dist * Math.sin(cam.pitch), cam.dist * Math.cos(cam.yaw) * cp]);
    const vp = mat4mul(perspective(cam.fov, W / H, 0.1, 30), lookAt(eye, cam.target));
    const fwd = norm(sub(cam.target, eye)), right = norm(cross(fwd, Y)), up = cross(right, fwd), back = mul(fwd, -1);
    const L1 = norm(add(add(mul(right, -0.55), mul(up, 0.8)), mul(back, 0.6)));
    const L2 = norm(add(add(mul(right, 0.9), mul(up, 0.05)), mul(back, 0.4)));
    gl.uniformMatrix4fv(this.loc.uVP, false, new Float32Array(vp));
    gl.uniform3f(this.loc.uCam, eye[0], eye[1], eye[2]);
    gl.uniform3f(this.loc.uL1, L1[0], L1[1], L1[2]);
    gl.uniform3f(this.loc.uL2, L2[0], L2[1], L2[2]);
    gl.enableVertexAttribArray(this.aPos); gl.enableVertexAttribArray(this.aNor);
    let bound: Mesh | null = null;
    for (const p of prims) {
      const mesh = this.meshes[p.k];
      if (bound !== mesh) {
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vb!); gl.vertexAttribPointer(this.aPos, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.nb!); gl.vertexAttribPointer(this.aNor, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.ib!);
        bound = mesh;
      }
      let ax: number[], nx: number[], t: V3;
      if (p.k === "ell") {
        const [u0, u1, u2] = p.m, r = p.r;
        ax = [...mul(u0, r[0]), ...mul(u1, r[1]), ...mul(u2, r[2])];
        nx = [...mul(u0, 1 / r[0]), ...mul(u1, 1 / r[1]), ...mul(u2, 1 / r[2])]; t = p.c;
      } else if (p.k === "box") {
        const [u0, u1, u2] = p.m, h = p.h;
        ax = [...mul(u0, h[0]), ...mul(u1, h[1]), ...mul(u2, h[2])];
        nx = [...mul(u0, 1 / h[0]), ...mul(u1, 1 / h[1]), ...mul(u2, 1 / h[2])]; t = p.c;
      } else {
        const d = sub(p.b, p.a), L = len(d), a = mul(d, 1 / L);
        let p1 = cross(a, Math.abs(a[1]) > 0.95 ? [1, 0, 0] : Y); p1 = norm(p1);
        const p2 = cross(a, p1), hl = L / 2;
        ax = [...mul(p1, p.r), ...mul(a, hl), ...mul(p2, p.r)];
        nx = [...mul(p1, 1 / p.r), ...mul(a, 1 / hl), ...mul(p2, 1 / p.r)]; t = mul(add(p.a, p.b), 0.5);
      }
      gl.uniformMatrix3fv(this.loc.uAxes, false, new Float32Array(ax));
      gl.uniformMatrix3fv(this.loc.uNAxes, false, new Float32Array(nx));
      gl.uniform3f(this.loc.uT, t[0], t[1], t[2]);
      gl.uniform3f(this.loc.uCol, p.mat.c[0], p.mat.c[1], p.mat.c[2]);
      gl.uniform1f(this.loc.uSpec, p.mat.spec); gl.uniform1f(this.loc.uShin, p.mat.shin); gl.uniform1f(this.loc.uGlow, p.mat.glow);
      gl.drawElements(gl.TRIANGLES, mesh.idx.length, gl.UNSIGNED_SHORT, 0);
    }
  }

  dispose() { try { this.gl.getExtension("WEBGL_lose_context")?.loseContext(); } catch { /* ignore */ } }
}
