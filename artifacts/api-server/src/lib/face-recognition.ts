/**
 * Server-side face descriptor comparison.
 * All face embedding is done client-side with face-api.js.
 * The server only stores and compares 128-element descriptor vectors.
 */

/** Euclidean distance between two 128-element face descriptor arrays. */
export function descriptorDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += ((a[i] ?? 0) - (b[i] ?? 0)) ** 2;
  }
  return Math.sqrt(sum);
}

/**
 * Accept a face match when distance ≤ threshold.
 * 0.5 is strict; 0.6 is more lenient for varying lighting conditions.
 */
export const FACE_MATCH_THRESHOLD = 0.5;

export function isFaceMatch(stored: number[], candidate: number[]): boolean {
  if (stored.length !== 128 || candidate.length !== 128) return false;
  return descriptorDistance(stored, candidate) <= FACE_MATCH_THRESHOLD;
}

/** Validate that a value is a 128-element array of finite numbers. */
export function isValidDescriptor(v: unknown): v is number[] {
  return (
    Array.isArray(v) &&
    v.length === 128 &&
    v.every((n) => typeof n === "number" && isFinite(n))
  );
}
