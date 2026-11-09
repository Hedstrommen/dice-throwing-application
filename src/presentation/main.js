import { rotAxis, matMul, transpose, axisAngle, mag, scale, norm } from "../domain/math3.js";
import { isClassicDie, labelsFor, validateOdds } from "../domain/dice.js";
import { rollDie } from "../application/rollDice.js";
import { createRandomSource } from "../infrastructure/randomSource.js";
import { createGeometry } from "../infrastructure/geometry.js";
import { CanvasRenderer, orientationForFace } from "../infrastructure/canvasRenderer.js";

const form = document.getElementById("odds-form");
const oddsInput = document.getElementById("odds-input");
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

function preview() {
  const max = Number(oddsInput.value);
  if (!Number.isInteger(max) || max < 1) return;
  const solid = geometry.solidFor(max);
  const labels = isClassicDie(max)
    ? labelsFor(solid, max)
    : Array.from({ length: solid.faces.length }, () => randomSource.nextInt(max));
  rotation = rotAxis([0, 1, 0], 0.5);
  renderer.render([{ solid, labels, R: rotation, pos: [0, 0], lift: 0 }]);
}

function roll(max) {
  const solid = geometry.solidFor(max);
  const outcome = rollDie({ sides: max, solid, randomSource });
  const classic = isClassicDie(max);

  const radius = Math.max(...solid.vertices.map((v) => mag(v)));
  const s = (renderer.size * 0.36) / radius;
  const bound = (renderer.size / 2 - radius * s * 0.85) / s;

  const R_final = orientationForFace(solid, outcome.faceIndex);
  const TUMBLE_TIME = 1.25;
  const SETTLE_TIME = 0.6;
  const start = performance.now();
  let last = start;
  let R = rotation;
  let pos = [0, 0];
  let vel = [(Math.random() - 0.5) * 7, (Math.random() - 0.5) * 7];
  let omega = scale(norm([Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5]), 9 + Math.random() * 6);
  let labels = outcome.labels.slice();
  const scramble = classic ? null : setInterval(() => {
    labels = labels.map(() => randomSource.nextInt(max));
  }, 90);

  function finish() {
    if (scramble) clearInterval(scramble);
    labels = outcome.labels.slice();
    rotation = R_final;
    renderer.render([{ solid, labels, R: R_final, pos: [0, 0], lift: 0, s }]);
    resultEl.textContent =
      max === 2 ? `The coin shows ${labels[outcome.faceIndex]} (1 out of ${max})` : `You rolled ${outcome.value} (1 out of ${max})`;
    resultEl.classList.toggle("win", outcome.value === 1);
    rollButton.disabled = false;
    rolling = false;
  }

  function frame(now) {
    const t = (now - start) / 1000;
    if (t < TUMBLE_TIME) {
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
      renderer.render([{ solid, labels, R, pos, lift, s }]);
      requestAnimationFrame(frame);
    } else {
      if (scramble) {
        clearInterval(scramble);
        labels = outcome.labels.slice();
      }
      const u = Math.min(1, (t - TUMBLE_TIME) / SETTLE_TIME);
      const eased = 1 - Math.pow(1 - u, 3);
      pos = [pos[0] * (1 - eased), pos[1] * (1 - eased)];
      const d = axisAngle(matMul(R_final, transpose(R)));
      R = matMul(rotAxis(d.axis, d.angle * eased), R);
      rotation = R;
      renderer.render([{ solid, labels, R, pos, lift: 0, s }]);
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
  const error = validateOdds(max);
  if (error) {
    showError(error);
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

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
