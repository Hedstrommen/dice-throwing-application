const form = document.getElementById("odds-form");
const oddsInput = document.getElementById("odds-input");
const rollButton = document.getElementById("roll-button");
const errorEl = document.getElementById("error");
const resultEl = document.getElementById("result");
const canvas = document.getElementById("scene-canvas");
const ctx = canvas.getContext("2d");

const SIZE = 360;
const dpr = window.devicePixelRatio || 1;
canvas.width = SIZE * dpr;
canvas.height = SIZE * dpr;
canvas.style.width = SIZE + "px";
canvas.style.height = SIZE + "px";
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

const { SHAPES, sub, dot, cross, mag, norm, scale } = Solids;

const identity = () => [1, 0, 0, 0, 1, 0, 0, 0, 1];

function matMul(A, B) {
  const R = new Array(9).fill(0);
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      for (let k = 0; k < 3; k++) R[r * 3 + c] += A[r * 3 + k] * B[k * 3 + c];
  return R;
}

function transpose(R) {
  return [R[0], R[3], R[6], R[1], R[4], R[7], R[2], R[5], R[8]];
}

function matVec(R, v) {
  return [
    R[0] * v[0] + R[1] * v[1] + R[2] * v[2],
    R[3] * v[0] + R[4] * v[1] + R[5] * v[2],
    R[6] * v[0] + R[7] * v[1] + R[8] * v[2],
  ];
}

function rotAxis(axis, angle) {
  const [x, y, z] = norm(axis);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;
  return [
    t * x * x + c, t * x * y - s * z, t * x * z + s * y,
    t * x * y + s * z, t * y * y + c, t * y * z - s * x,
    t * x * z - s * y, t * y * z + s * x, t * z * z + c,
  ];
}

function axisAngle(R) {
  const c = Math.max(-1, Math.min(1, (R[0] + R[4] + R[8] - 1) / 2));
  const angle = Math.acos(c);
  if (angle < 1e-9) return { axis: [0, 0, 1], angle: 0 };
  const s = 2 * Math.sin(angle);
  return { axis: [(R[7] - R[5]) / s, (R[2] - R[6]) / s, (R[3] - R[1]) / s], angle };
}

// Fixed camera: looking down at the table (~72 deg from horizontal).
const VIEW = rotAxis([1, 0, 0], 1.25);

// Rotation that stands the face up (+Y) with its first edge screen-up (-Z),
// so the die comes to rest showing the rolled face from above.
function orientationForFace(solid, faceIndex) {
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

function render(solid, labels, R, pos, lift) {
  pos = pos || [0, 0];
  lift = lift || 0;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const radius = Math.max(...solid.vertices.map((v) => mag(v)));
  const s = (SIZE * 0.36) / radius;
  const Rv = matMul(VIEW, R);
  const light = norm([0.35, 1, 0.25]);

  ctx.clearRect(0, 0, SIZE, SIZE);

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

    // Paint the label onto the face plane: map the text axes onto the face's
    // projected edge directions so the number lies flat on the face.
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

function randomInt(max) {
  return 1 + Math.floor(Math.random() * max);
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = !message;
}

let rotation = rotAxis([0, 1, 0], 0.5);
let rolling = false;

function preview() {
  const max = Number(oddsInput.value);
  if (!Number.isInteger(max) || max < 1) return;
  const shapeFn = SHAPES[max] || SHAPES[6];
  const solid = shapeFn();
  const labels = max === 2 ? solid.faces.slice(0, 2).map((f) => f.label) : solid.faces.map((_, i) => (SHAPES[max] ? i + 1 : randomInt(max)));
  rotation = rotAxis([0, 1, 0], 0.5);
  render(solid, labels, rotation, [0, 0], 0);
}

function roll(max) {
  const isClassicDie = Boolean(SHAPES[max]);
  const solid = (SHAPES[max] || SHAPES[6])();
  let labels;
  let result;
  let targetFace;
  if (isClassicDie) {
    labels = max === 2 ? solid.faces.slice(0, 2).map((f) => f.label) : solid.faces.map((_, i) => i + 1);
    result = randomInt(max);
    targetFace = result - 1;
  } else {
    labels = Array.from({ length: solid.faces.length }, () => randomInt(max));
    result = randomInt(max);
    targetFace = Math.floor(Math.random() * solid.faces.length);
  }

  const radius = Math.max(...solid.vertices.map((v) => mag(v)));
  const s = (SIZE * 0.36) / radius;
  const bound = (SIZE / 2 - radius * s * 0.85) / s;

  const R_final = orientationForFace(solid, targetFace);
  const TUMBLE_TIME = 1.25;
  const SETTLE_TIME = 0.6;
  const start = performance.now();
  let last = start;
  let R = rotation;
  let pos = [0, 0];
  let vel = [(Math.random() - 0.5) * 7, (Math.random() - 0.5) * 7];
  let omega = scale(norm([Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5]), 9 + Math.random() * 6);
  const scramble = isClassicDie ? null : setInterval(() => {
    labels = labels.map(() => randomInt(max));
  }, 90);

  function finish() {
    if (scramble) clearInterval(scramble);
    if (!isClassicDie) {
      labels = labels.map(() => randomInt(max));
      labels[targetFace] = result;
    }
    rotation = R_final;
    render(solid, labels, R_final, [0, 0], 0);
    resultEl.textContent =
      max === 2 ? `The coin shows ${labels[targetFace]} (1 out of ${max})` : `You rolled ${result} (1 out of ${max})`;
    resultEl.classList.toggle("win", result === 1);
    rollButton.disabled = false;
    rolling = false;
  }

  function frame(now) {
    const t = (now - start) / 1000;
    if (t < TUMBLE_TIME) {
      // Simulated throw: the die slides across the table, bounces off the
      // edges of the view, spins with damped angular velocity and hops.
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      pos[0] += vel[0] * dt;
      pos[1] += vel[1] * dt;
      const fr = Math.exp(-1.1 * dt);
      vel = [vel[0] * fr, vel[1] * fr];
      if (Math.abs(pos[0]) > bound) {
        pos[0] = Math.sign(pos[0]) * bound;
        vel[0] = -vel[0] * 0.55;
      }
      if (Math.abs(pos[1]) > bound) {
        pos[1] = Math.sign(pos[1]) * bound;
        vel[1] = -vel[1] * 0.55;
      }
      const w = mag(omega);
      if (w > 1e-6) R = matMul(rotAxis(omega, w * dt), R);
      omega = scale(omega, Math.exp(-1.7 * dt));
      const lift = Math.abs(Math.sin(t * 7)) * Math.exp(-2.0 * t) * 0.5;
      rotation = R;
      render(solid, labels, R, pos, lift);
      requestAnimationFrame(frame);
    } else {
      // Settle: glide back to the middle and ease onto the rolled face.
      const u = Math.min(1, (t - TUMBLE_TIME) / SETTLE_TIME);
      const eased = 1 - Math.pow(1 - u, 3);
      pos = [pos[0] * (1 - eased), pos[1] * (1 - eased)];
      const d = axisAngle(matMul(R_final, transpose(R)));
      R = matMul(rotAxis(d.axis, d.angle * eased), R);
      rotation = R;
      render(solid, labels, R, pos, 0);
      if (u < 1) requestAnimationFrame(frame);
      else finish();
    }
  }
  requestAnimationFrame(frame);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (rolling) return;

  const max = Number(oddsInput.value);
  if (!Number.isInteger(max) || max < 1) {
    showError("Enter a whole number of 1 or more.");
    return;
  }
  if (max > 1000000) {
    showError("Keep it at 1,000,000 or less.");
    return;
  }

  showError("");
  rollButton.disabled = true;
  rolling = true;
  resultEl.classList.remove("win");
  resultEl.textContent = "Rolling...";
  roll(max);
});

oddsInput.addEventListener("input", () => {
  if (!rolling) preview();
});

preview();
