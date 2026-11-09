import { rotAxis, matMul, transpose, axisAngle, mag, scale, norm } from "../domain/math3.js";
import { isClassicDie, labelsFor, validateAmount, validateOdds } from "../domain/dice.js";
import { rollDie, scrambledLabels } from "../application/rollDice.js";
import { createRandomSource } from "../infrastructure/randomSource.js";
import { createGeometry } from "../infrastructure/geometry.js";
import { CanvasRenderer, orientationForFace } from "../infrastructure/canvasRenderer.js";

const form = document.getElementById("odds-form");
const amountInput = document.getElementById("amount-input");
const typeInput = document.getElementById("type-input");
const rollButton = document.getElementById("roll-button");
const errorEl = document.getElementById("error");
const resultEl = document.getElementById("result");
const canvas = document.getElementById("scene-canvas");

const renderer = new CanvasRenderer(canvas);
const randomSource = createRandomSource();
const geometry = createGeometry();

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = !message;
}

let rotation = rotAxis([0, 1, 0], 0.5);
let rolling = false;

// Lay the dice out on a centered grid that fits the canvas.
function layoutFor(amount, solid) {
  const radius = Math.max(...solid.vertices.map((v) => mag(v)));
  const cols = Math.ceil(Math.sqrt(amount));
  const rows = Math.ceil(amount / cols);
  // Each die gets its own cell; the die fills at most ~70% of the cell so
  // neighbouring dice never touch or stack.
  const cellW = (renderer.size * 0.9) / cols;
  const cellH = (renderer.size * 0.9) / rows;
  const s = Math.min(
    (renderer.size * 0.36) / radius,
    (cellW * 0.7) / (2 * radius),
    (cellH * 0.7) / (2 * radius)
  );
  const slots = [];
  for (let i = 0; i < amount; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    slots.push([
      ((c - (cols - 1) / 2) * cellW) / s,
      ((r - (rows - 1) / 2) * cellH) / s,
    ]);
  }
  return { s, slots, bound: (renderer.size / 2 - radius * s * 0.85) / s };
}

function preview() {
  const amount = Number(amountInput.value);
  const sides = Number(typeInput.value);
  if (!Number.isInteger(amount) || amount < 1) return;
  if (!Number.isInteger(sides) || sides < 1) return;
  const solid = geometry.solidFor(sides);
  const layout = layoutFor(amount, solid);
  rotation = rotAxis([0, 1, 0], 0.5);
  const dice = [];
  for (let i = 0; i < amount; i++) {
    const labels = isClassicDie(sides) ? labelsFor(solid, sides) : scrambledLabels(solid, sides, randomSource);
    dice.push({ solid, labels, R: rotation, pos: layout.slots[i], lift: 0, s: layout.s });
  }
  renderer.render(dice);
}

function roll(amount, sides) {
  const classic = isClassicDie(sides);
  const solid = geometry.solidFor(sides);
  const layout = layoutFor(amount, solid);
  const TUMBLE_TIME = 1.5;
  const SETTLE_TIME = 0.6;
  const start = performance.now();
  let last = start;
  const dice = [];
  for (let i = 0; i < amount; i++) {
    const outcome = rollDie({ sides, solid, randomSource });
    dice.push({
      solid,
      outcome,
      labels: classic ? outcome.labels.slice() : scrambledLabels(solid, sides, randomSource),
      R_final: orientationForFace(solid, outcome.faceIndex),
      slot: layout.slots[i],
      R: rotation,
      pos: [0, 0],
      vel: [(Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14],
      omega: scale(norm([Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5]), 14 + Math.random() * 10),
      lift: 0,
      s: layout.s,
    });
  }
  // Non-classic dice only show real numbers once they settle.
  const scramble = classic ? null : setInterval(() => {
    for (const d of dice) d.labels = scrambledLabels(solid, sides, randomSource);
  }, 90);

  function lockLabels() {
    if (scramble) clearInterval(scramble);
    for (const d of dice) d.labels = d.outcome.labels.slice();
  }

  function finish() {
    lockLabels();
    for (const d of dice) d.R = d.R_final;
    rotation = dice[0].R_final;
    renderer.render(dice);
    const parts = dice.map((d) => d.labels[d.outcome.faceIndex]);
    const total = dice.reduce((sum, d) => sum + d.outcome.value, 0);
    resultEl.textContent =
      sides === 2
        ? amount === 1
          ? `The coin shows ${parts[0]}`
          : `The coins show ${parts.join(", ")}`
        : amount === 1
          ? `You rolled ${parts[0]} (1 out of ${sides})`
          : `Rolled ${amount}d${sides}: ${parts.join(", ")} — total ${total}`;
    resultEl.classList.toggle("win", amount === 1 && dice[0].outcome.value === 1);
    rollButton.disabled = false;
    rolling = false;
  }

  function frame(now) {
    const t = (now - start) / 1000;
    if (t < TUMBLE_TIME) {
      // Simulated throw: the dice slide across the table, bounce off the
      // edges of the view, spin with damped angular velocity and hop.
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      for (let i = 0; i < dice.length; i++) {
        const d = dice[i];
        d.pos[0] += d.vel[0] * dt;
        d.pos[1] += d.vel[1] * dt;
        const fr = Math.exp(-0.8 * dt);
        d.vel = [d.vel[0] * fr, d.vel[1] * fr];
        if (Math.abs(d.pos[0]) > layout.bound) {
          d.pos[0] = Math.sign(d.pos[0]) * layout.bound;
          d.vel[0] = -d.vel[0] * 0.72;
        }
        if (Math.abs(d.pos[1]) > layout.bound) {
          d.pos[1] = Math.sign(d.pos[1]) * layout.bound;
          d.vel[1] = -d.vel[1] * 0.72;
        }
        const w = mag(d.omega);
        if (w > 1e-6) d.R = matMul(rotAxis(d.omega, w * dt), d.R);
        d.omega = scale(d.omega, Math.exp(-1.4 * dt));
        // More hops: faster bouncing that decays over a longer throw.
        d.lift = Math.abs(Math.sin(t * 10 + i * 1.7)) * Math.exp(-1.4 * t) * 0.7;
      }
      // Dice bounce off each other instead of sticking together.
      const colR = Math.max(...solid.vertices.map((v) => mag(v))) * 0.95;
      for (let i = 0; i < dice.length; i++) {
        for (let j = i + 1; j < dice.length; j++) {
          const a = dice[i];
          const b = dice[j];
          const dx = b.pos[0] - a.pos[0];
          const dy = b.pos[1] - a.pos[1];
          const dist = Math.hypot(dx, dy);
          if (dist >= 2 * colR || dist < 1e-9) continue;
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = 2 * colR - dist;
          a.pos[0] -= nx * overlap / 2;
          a.pos[1] -= ny * overlap / 2;
          b.pos[0] += nx * overlap / 2;
          b.pos[1] += ny * overlap / 2;
          // Equal-mass elastic bounce along the collision normal.
          const rel = (a.vel[0] - b.vel[0]) * nx + (a.vel[1] - b.vel[1]) * ny;
          if (rel > 0) {
            a.vel[0] -= rel * nx;
            a.vel[1] -= rel * ny;
            b.vel[0] += rel * nx;
            b.vel[1] += rel * ny;
          }
        }
      }
      renderer.render(dice);
      requestAnimationFrame(frame);
    } else {
      // Settle: glide to the grid slots and ease onto the rolled faces.
      lockLabels();
      const u = Math.min(1, (t - TUMBLE_TIME) / SETTLE_TIME);
      const eased = 1 - Math.pow(1 - u, 3);
      for (const d of dice) {
        d.pos = [d.pos[0] * (1 - eased) + d.slot[0] * eased, d.pos[1] * (1 - eased) + d.slot[1] * eased];
        const diff = axisAngle(matMul(d.R_final, transpose(d.R)));
        d.R = matMul(rotAxis(diff.axis, diff.angle * eased), d.R);
        d.lift = 0;
      }
      renderer.render(dice);
      if (u < 1) requestAnimationFrame(frame);
      else finish();
    }
  }
  requestAnimationFrame(frame);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (rolling) return;

  const amount = Number(amountInput.value);
  const amountError = validateAmount(amount);
  if (amountError) {
    showError(amountError);
    return;
  }
  const sides = Number(typeInput.value);
  const sidesError = validateOdds(sides);
  if (sidesError) {
    showError(sidesError);
    return;
  }

  showError("");
  rollButton.disabled = true;
  rolling = true;
  resultEl.classList.remove("win");
  resultEl.textContent = "Rolling...";
  roll(amount, sides);
});

amountInput.addEventListener("input", () => {
  if (!rolling) preview();
});
typeInput.addEventListener("input", () => {
  if (!rolling) preview();
});

preview();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
