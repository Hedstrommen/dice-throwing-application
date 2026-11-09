import {
  sub, dot, cross, mag, norm, matMul, matVec, rotAxis, identity,
} from "../domain/math3.js";

// Fixed camera: looking down at the table (~72 deg from horizontal).
const VIEW = rotAxis([1, 0, 0], 1.25);

// Rotation that stands the face up (+Y) with its first edge screen-up (-Z),
// so the die comes to rest showing the rolled face from above.
export function orientationForFace(solid, faceIndex) {
  const face = solid.faces[faceIndex];
  const up = [0, 1, 0];
  const c = Math.max(-1, Math.min(1, dot(face.normal, up)));
  const axis = cross(face.normal, up);
  const R1 = mag(axis) < 1e-9 ? (c > 0 ? identity() : rotAxis([1, 0, 0], Math.PI)) : rotAxis(axis, Math.acos(c));
  const edge = norm(sub(solid.vertices[face.indices[1]], solid.vertices[face.indices[0]]));
  const e = matVec(R1, edge);
  const R2 = rotAxis(up, Math.PI - Math.atan2(e[0], e[2]));
  return matMul(R2, R1);
}

// RendererPort adapter: draws the dice scene onto a 2D canvas.
export class CanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.size = 360;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = this.size * dpr;
    canvas.height = this.size * dpr;
    canvas.style.width = this.size + "px";
    canvas.style.height = this.size + "px";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  drawDie(solid, labels, R, pos, lift, s) {
    const ctx = this.ctx;
    const SIZE = this.size;
    pos = pos || [0, 0];
    lift = lift || 0;
    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const radius = Math.max(...solid.vertices.map((v) => mag(v)));
    const Rv = matMul(VIEW, R);
    const light = norm([0.35, 1, 0.25]);

    // Shadow on the table under the die.
    const sh = matVec(Rv, [pos[0], -radius * 0.85, pos[1]]);
    ctx.beginPath();
    ctx.ellipse(cx + sh[0] * s, cy - sh[1] * s + lift * s * 0.6, radius * s * 0.9, radius * s * 0.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fill();

    const pts = solid.vertices.map((v) => matVec(Rv, [v[0] + pos[0], v[1] + lift, v[2] + pos[1]]));

    const faceData = solid.faces.map((face, i) => {
      const n = matVec(Rv, face.normal);
      let depth = 0;
      let cxSum = 0;
      let cySum = 0;
      let modelEdge = 0;
      const count = face.indices.length;
      for (let k = 0; k < count; k++) {
        const idx = face.indices[k];
        depth += pts[idx][2];
        cxSum += pts[idx][0];
        cySum += pts[idx][1];
        modelEdge += mag(sub(solid.vertices[idx], solid.vertices[face.indices[(k + 1) % count]]));
      }
      return { face, i, n, depth: depth / count, cx: cxSum / count, cy: cySum / count, modelEdge: modelEdge / count };
    });
    faceData.sort((a, b) => a.depth - b.depth);

    for (const fd of faceData) {
      const brightness = 0.45 + 0.55 * Math.max(0, dot(fd.n, light));
      ctx.beginPath();
      fd.face.indices.forEach((idx, k) => {
        const px = cx + pts[idx][0] * s;
        const py = cy - pts[idx][1] * s;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fillStyle = `hsl(222, 32%, ${28 + 42 * brightness}%)`;
      ctx.fill();
      ctx.strokeStyle = "rgba(15, 23, 38, 0.85)";
      ctx.lineWidth = 2;
      ctx.stroke();

      if (fd.n[2] > 0.05 && labels[fd.i] !== undefined) {
        const inds = fd.face.indices;
        const e1 = norm(sub(solid.vertices[inds[1]], solid.vertices[inds[0]]));
        const e2 = norm(cross(fd.face.normal, e1));
        const p1 = matVec(Rv, e1);
        const p2 = matVec(Rv, e2);
        let su = [p1[0] * s, -p1[1] * s];
        let sv = [p2[0] * s, -p2[1] * s];
        if (sv[1] > 0) {
          su = [-su[0], -su[1]];
          sv = [-sv[0], -sv[1]];
        }
        const fontSize = Math.max(0.15, Math.min(1.1, fd.modelEdge * 0.55));
        ctx.save();
        ctx.translate(cx + fd.cx * s, cy - fd.cy * s);
        ctx.transform(su[0], su[1], -sv[0], -sv[1], 0, 0);
        ctx.fillStyle = "#101826";
        ctx.font = `700 ${fontSize}px "Segoe UI", system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(labels[fd.i]), 0, 0);
        ctx.restore();
      }
    }
  }

  render(dies) {
    this.ctx.clearRect(0, 0, this.size, this.size);
    for (const d of dies) {
      const radius = Math.max(...d.solid.vertices.map((v) => mag(v)));
      const s = d.s || (this.size * 0.36) / radius;
      this.drawDie(d.solid, d.labels, d.R, d.pos, d.lift, s);
    }
  }
}
