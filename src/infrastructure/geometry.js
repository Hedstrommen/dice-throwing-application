import { SHAPES } from "../domain/solids.js";
import { isClassicDie, closestClassicSides } from "../domain/dice.js";

// GeometryPort adapter: builds the domain solid for a given number of sides.
// Non-classic side counts fall back to the closest real die shape.
export function createGeometry() {
  return {
    solidFor(sides) {
      return (isClassicDie(sides) ? SHAPES[sides] : SHAPES[closestClassicSides(sides)])();
    },
  };
}
