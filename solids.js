const Solids = (() => {
  const PHI = (1 + Math.sqrt(5)) / 2;

  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const mag = (a) => Math.hypot(a[0], a[1], a[2]);
  const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const norm = (a) => scale(a, 1 / (mag(a) || 1));

  // Derive the faces of a convex polyhedron centered at the origin:
  // a plane through >= 3 vertices with every other vertex on one side is a face.
  function computeFaces(vertices) {
    const faces = [];
    const seen = new Set();
    const n = vertices.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        for (let k = j + 1; k < n; k++) {
          const a = vertices[i];
          const b = vertices[j];
          const c = vertices[k];
          let normal = cross(sub(b, a), sub(c, a));
          if (mag(normal) < 1e-9) continue;
          normal = norm(normal);
          let d = dot(normal, a);
          const onPlane = [];
          let pos = 0;
          let neg = 0;
          for (let m = 0; m < n; m++) {
            const s = dot(normal, vertices[m]) - d;
            if (Math.abs(s) < 1e-6) onPlane.push(m);
            else if (s > 0) pos++;
            else neg++;
          }
          if (onPlane.length < 3 || (pos > 0 && neg > 0)) continue;
          // Canonicalize the plane direction so both winding orders of the
          // same plane dedupe to one key.
          for (const comp of normal) {
            if (Math.abs(comp) > 1e-9) {
              if (comp < 0) {
                normal = scale(normal, -1);
                d = -d;
              }
              break;
            }
          }
          const key = normal.map((v) => v.toFixed(5)).join(",") + "|" + d.toFixed(5);
          if (seen.has(key)) continue;
          seen.add(key);
          const center = scale(
            onPlane.reduce((acc, idx) => add(acc, vertices[idx]), [0, 0, 0]),
            1 / onPlane.length
          );
          if (dot(normal, center) < 0) normal = scale(normal, -1);
          const ref = norm(sub(vertices[onPlane[0]], center));
          const ordered = onPlane.slice().sort((p, q) => {
            const wp = sub(vertices[p], center);
            const wq = sub(vertices[q], center);
            return (
              Math.atan2(dot(cross(ref, wp), normal), dot(ref, wp)) -
              Math.atan2(dot(cross(ref, wq), normal), dot(ref, wq))
            );
          });
          faces.push({ indices: ordered, normal });
        }
      }
    }
    return faces;
  }

  const make = (vertices) => ({ vertices, faces: computeFaces(vertices) });

  function tetrahedron() {
    return make([
      [1, 1, 1],
      [1, -1, -1],
      [-1, 1, -1],
      [-1, -1, 1],
    ]);
  }

  function cube() {
    const v = [];
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) v.push([x, y, z]);
    return make(v);
  }

  function octahedron() {
    return make([
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ]);
  }

  function dodecahedron() {
    const v = [];
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) v.push([x, y, z]);
    for (const s1 of [-1, 1]) {
      for (const s2 of [-1, 1]) {
        v.push([0, s1 / PHI, s2 * PHI]);
        v.push([s1 / PHI, s2 * PHI, 0]);
        v.push([s1 * PHI, 0, s2 / PHI]);
      }
    }
    return make(v);
  }

  function icosahedron() {
    const v = [];
    for (const s1 of [-1, 1]) {
      for (const s2 of [-1, 1]) {
        v.push([0, s1, s2 * PHI]);
        v.push([s1, s2 * PHI, 0]);
        v.push([s1 * PHI, 0, s2]);
      }
    }
    return make(v);
  }

  // Newell's method for a polygon normal.
  function newell(vertices, indices) {
    const n = [0, 0, 0];
    for (let i = 0; i < indices.length; i++) {
      const a = vertices[indices[i]];
      const b = vertices[indices[(i + 1) % indices.length]];
      n[0] += (a[1] - b[1]) * (a[2] + b[2]);
      n[1] += (a[2] - b[2]) * (a[0] + b[0]);
      n[2] += (a[0] - b[0]) * (a[1] + b[1]);
    }
    return norm(n);
  }

  function orientOutward(vertices, face) {
    const center = scale(
      face.indices.reduce((acc, idx) => add(acc, vertices[idx]), [0, 0, 0]),
      1 / face.indices.length
    );
    let normal = newell(vertices, face.indices);
    if (dot(normal, center) < 0) {
      normal = scale(normal, -1);
      face.indices.reverse();
    }
    face.normal = normal;
    return face;
  }

  // A coin: a short cylinder. The two caps carry the coin faces.
  function coin(segments = 16) {
    const vertices = [];
    const faces = [];
    const r = 1;
    const h = 0.16;
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      vertices.push([r * Math.cos(a), h, r * Math.sin(a)]);
    }
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      vertices.push([r * Math.cos(a), -h, r * Math.sin(a)]);
    }
    const top = { indices: [...Array(segments).keys()], label: "Elder Sign" };
    const bottom = { indices: [...Array(segments).keys()].map((i) => i + segments).reverse(), label: "Cthulhu" };
    faces.push(orientOutward(vertices, top), orientOutward(vertices, bottom));
    for (let i = 0; i < segments; i++) {
      const j = (i + 1) % segments;
      faces.push(orientOutward(vertices, { indices: [i, j, j + segments, i + segments] }));
    }
    return { vertices, faces };
  }

  // Polar dual of a convex polyhedron centered at the origin: each face maps
  // to the point normal / distance, which keeps the dual's faces exactly planar.
  function dual(solid) {
    const centers = solid.faces.map((f) => scale(f.normal, 1 / dot(f.normal, solid.vertices[f.indices[0]])));
    const faces = solid.vertices.map((v, vi) => {
      const axis = norm(v);
      const ref = norm(cross(axis, Math.abs(axis[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
      const adj = [];
      solid.faces.forEach((f, fi) => {
        if (f.indices.includes(vi)) adj.push(fi);
      });
      adj.sort((a, b) => {
        const wa = sub(centers[a], scale(axis, dot(centers[a], axis)));
        const wb = sub(centers[b], scale(axis, dot(centers[b], axis)));
        return (
          Math.atan2(dot(cross(ref, wa), axis), dot(ref, wa)) -
          Math.atan2(dot(cross(ref, wb), axis), dot(ref, wb))
        );
      });
      return orientOutward(centers, { indices: adj });
    });
    return { vertices: centers, faces };
  }

  function pentagonalAntiprism() {
    const vertices = [];
    const faces = [];
    const n = 5;
    const h = 0.5;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      vertices.push([Math.cos(a), h, Math.sin(a)]);
    }
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.PI / n;
      vertices.push([Math.cos(a), -h, Math.sin(a)]);
    }
    faces.push({ indices: [...Array(n).keys()] });
    faces.push({ indices: [...Array(n).keys()].map((i) => i + n).reverse() });
    for (let i = 0; i < n; i++) {
      const ni = (i + 1) % n;
      faces.push({ indices: [i, ni, n + i] });
      faces.push({ indices: [n + i, n + ni, ni] });
    }
    return { vertices, faces: faces.map((f) => orientOutward(vertices, f)) };
  }

  // A d10 is the dual of the pentagonal antiprism: the pentagonal trapezohedron.
  function d10() {
    return dual(pentagonalAntiprism());
  }

  const SHAPES = {
    2: coin,
    4: tetrahedron,
    6: cube,
    8: octahedron,
    10: d10,
    12: dodecahedron,
    20: icosahedron,
  };

  return { SHAPES, make, computeFaces, dual, sub, add, dot, cross, mag, scale, norm };
})();

if (typeof module !== "undefined") module.exports = Solids;
