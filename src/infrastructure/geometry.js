import { SHAPES } from "../domain/solids.js";

// GeometryPort adapter: builds the domain solid for a given number of sides.
export function createGeometry() {
  return {
    solidFor(sides) {
      return (SHAPES[sides] || SHAPES[6])();
    },
  };
}
