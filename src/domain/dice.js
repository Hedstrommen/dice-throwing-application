import { SHAPES } from "./solids.js";

export const MAX_ODDS = 1000000;
export const MAX_DICE = 10;

export function validateAmount(amount) {
  if (!Number.isInteger(amount) || amount < 1 || amount > MAX_DICE) {
    return `Enter a whole number of dice from 1 to ${MAX_DICE}.`;
  }
  return null;
}

export function isClassicDie(sides) {
  return Boolean(SHAPES[sides]);
}

// The closest real die shape for an arbitrary number of sides. Used when the
// requested sides are not a classic die: the die is rendered with this shape
// while the rolled number still comes from 1..sides.
export function closestClassicSides(sides) {
  const classic = Object.keys(SHAPES).map(Number);
  let best = classic[0];
  for (const c of classic) {
    if (Math.abs(c - sides) < Math.abs(best - sides)) best = c;
  }
  return best;
}

export function labelsFor(solid, sides) {
  if (sides === 2) return solid.faces.slice(0, 2).map((f) => f.label);
  if (isClassicDie(sides)) return solid.faces.map((_, i) => i + 1);
  return null;
}

export function createRollResult({ sides, value, faceIndex, labels }) {
  return Object.freeze({ sides, value, faceIndex, labels: Object.freeze(labels) });
}

export function validateOdds(max) {
  if (!Number.isInteger(max) || max < 1) return "Enter a whole number of 1 or more.";
  if (max > MAX_ODDS) return "Keep it at 1,000,000 or less.";
  return null;
}
