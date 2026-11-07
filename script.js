const form = document.getElementById("odds-form");
const oddsInput = document.getElementById("odds-input");
const rollButton = document.getElementById("roll-button");
const errorEl = document.getElementById("error");
const diceEl = document.getElementById("dice");
const resultEl = document.getElementById("result");

const faces = Array.from(diceEl.querySelectorAll(".face"));

// Rotation that brings each physical face to the front (the visible result).
const faceOrientations = {
  front: { x: 0, y: 0 },
  back: { x: 0, y: 180 },
  right: { x: 0, y: -90 },
  left: { x: 0, y: 90 },
  top: { x: -90, y: 0 },
  bottom: { x: 90, y: 0 },
};

let currentRotation = { x: 0, y: 0 };
let rolling = false;
let scrambleTimer = null;

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = !message;
}

function randomInt(max) {
  return 1 + Math.floor(Math.random() * max);
}

function scrambleFaces(max) {
  for (const face of faces) {
    face.textContent = randomInt(max);
  }
}

function roll(max) {
  const result = randomInt(max);
  const faceNames = Object.keys(faceOrientations);
  const targetFace = faceNames[Math.floor(Math.random() * faceNames.length)];
  const target = faceOrientations[targetFace];

  const startX = currentRotation.x;
  const startY = currentRotation.y;
  const endX = startX + 360 * (2 + Math.floor(Math.random() * 3)) + ((target.x - startX) % 360 + 360) % 360;
  const endY = startY + 360 * (2 + Math.floor(Math.random() * 3)) + ((target.y - startY) % 360 + 360) % 360;

  scrambleTimer = setInterval(() => scrambleFaces(max), 90);

  const animation = diceEl.animate(
    [
      { transform: `rotateX(${startX}deg) rotateY(${startY}deg)` },
      { transform: `rotateX(${endX}deg) rotateY(${endY}deg)` },
    ],
    { duration: 1800, easing: "cubic-bezier(0.15, 0.85, 0.25, 1)", fill: "forwards" }
  );

  animation.onfinish = () => {
    clearInterval(scrambleTimer);
    scrambleFaces(max);
    diceEl.querySelector(`.${targetFace}`).textContent = result;
    currentRotation = { x: endX, y: endY };
    resultEl.textContent = `You rolled ${result} (1 out of ${max})`;
    resultEl.classList.toggle("win", result === 1);
    rollButton.disabled = false;
    rolling = false;
  };
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
