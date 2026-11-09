import { isClassicDie, labelsFor, createRollResult } from "../domain/dice.js";

// Display labels for a non-classic die while it is still tumbling.
export function scrambledLabels(solid, sides, randomSource) {
  return Array.from({ length: solid.faces.length }, () => randomSource.nextInt(sides));
}

// Use case: roll one die with `sides` sides (classic die type or custom odds).
export function rollDie({ sides, solid, randomSource }) {
  const classic = isClassicDie(sides);
  const result = randomSource.nextInt(sides);
  const labels = classic
    ? labelsFor(solid, sides)
    : scrambledLabels(solid, sides, randomSource);
  const faceIndex = classic ? result - 1 : Math.floor(randomSource.nextInt(solid.faces.length)) - 1;
  const finalLabels = classic ? labels : labels.map((l, i) => (i === faceIndex ? result : l));
  return createRollResult({ sides, value: result, faceIndex, labels: finalLabels });
}
