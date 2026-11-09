export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const mag = (a) => Math.hypot(a[0], a[1], a[2]);
export const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const norm = (a) => scale(a, 1 / (mag(a) || 1));

export const identity = () => [1, 0, 0, 0, 1, 0, 0, 0, 1];

export function matMul(A, B) {
  const R = new Array(9).fill(0);
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      for (let k = 0; k < 3; k++) R[r * 3 + c] += A[r * 3 + k] * B[k * 3 + c];
  return R;
}

export function transpose(R) {
  return [R[0], R[3], R[6], R[1], R[4], R[7], R[2], R[5], R[8]];
}

export function matVec(R, v) {
  return [
    R[0] * v[0] + R[1] * v[1] + R[2] * v[2],
    R[3] * v[0] + R[4] * v[1] + R[5] * v[2],
    R[6] * v[0] + R[7] * v[1] + R[8] * v[2],
  ];
}

export function rotAxis(axis, angle) {
  const [x, y, z] = norm(axis);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;
  return [
    t * x * x + c, t * x * y - s * z, t * x * z + s * y,
    t * x * y + s * z, t * y * y + c, t * y * z - s * x,
    t * x * z - s * y, t * y * z + s * x, t * z * z + c,
  ];
}

export function axisAngle(R) {
  const c = Math.max(-1, Math.min(1, (R[0] + R[4] + R[8] - 1) / 2));
  const angle = Math.acos(c);
  if (angle < 1e-9) return { axis: [0, 0, 1], angle: 0 };
  const s = 2 * Math.sin(angle);
  return { axis: [(R[7] - R[5]) / s, (R[2] - R[6]) / s, (R[3] - R[1]) / s], angle };
}
