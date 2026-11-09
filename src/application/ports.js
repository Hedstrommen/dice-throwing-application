// Ports (interfaces) the application layer depends on. Infrastructure
// provides the concrete adapters.

export const RandomSourcePort = {
  // nextInt(max) -> integer in [1, max]
  nextInt(max) {
    throw new Error("not implemented");
  },
};

export const GeometryPort = {
  // solidFor(sides) -> { vertices, faces } for the given odds
  solidFor(sides) {
    throw new Error("not implemented");
  },
};

export const RendererPort = {
  // render(dies) draws the whole scene; each die is
  // { solid, labels, R, pos, lift, s }
  render(dies) {
    throw new Error("not implemented");
  },
};
