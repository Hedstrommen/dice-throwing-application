import { SHAPES } from "./solids.js";

export const MAX_ODDS = 1000000;

export function isClassicDie(sides) {
  return Boolean(SHAPES[sides]);
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
