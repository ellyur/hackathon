/**
 * face-detection.ts
 *
 * Shared MediaPipe Tasks Vision wrapper.
 * - FaceLandmarker is loaded lazily and cached as a singleton (models are ~3 MB).
 * - extractDescriptor() converts 478 raw landmarks into a translation/scale-
 *   invariant 1434-element descriptor array.
 * - descriptorSimilarity() computes cosine similarity for verification.
 */

import type { FaceLandmarker as FaceLandmarkerType } from '@mediapipe/tasks-vision';

// Serve WASM and model locally to avoid CDN blocking in sandboxed environments.
// Files are in public/mediapipe-wasm/ — Vite serves them at BASE_URL/mediapipe-wasm/.
function buildPath(rel: string): string {
  // import.meta.env.BASE_URL always ends with "/"; strip trailing slash then join.
  return `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${rel}`;
}

export const WASM_PATH  = buildPath('mediapipe-wasm');
export const MODEL_PATH = buildPath('mediapipe-wasm/face_landmarker.task');

// Singleton cache — reset on failure so the next call retries cleanly.
let _landmarker: FaceLandmarkerType | null = null;
let _loading:    Promise<FaceLandmarkerType> | null = null;

/** Verify local WASM assets are reachable before handing off to MediaPipe. */
async function assertAssetsReachable(): Promise<void> {
  const checks = [
    `${WASM_PATH}/vision_wasm_internal.wasm`,
    MODEL_PATH,
  ];
  await Promise.all(
    checks.map(async (url) => {
      const res = await fetch(url, { method: 'HEAD' });
      if (!res.ok) throw new Error(`Asset not reachable: ${url} (${res.status})`);
    }),
  );
}

/** Returns the cached FaceLandmarker, creating it if necessary. */
export async function getFaceLandmarker(): Promise<FaceLandmarkerType> {
  if (_landmarker) return _landmarker;
  if (_loading)    return _loading;

  _loading = (async () => {
    try {
      await assertAssetsReachable();

      const { FaceLandmarker, FilesetResolver } = await import(
        '@mediapipe/tasks-vision'
      );
      const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
      const lm = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_PATH,
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });
      _landmarker = lm;
      return lm;
    } catch (err) {
      // Reset so the next call retries from scratch instead of returning
      // the same rejected promise.
      _loading = null;
      throw err;
    }
  })();

  return _loading;
}

/** Call after a failure so the next getFaceLandmarker() retries cleanly. */
export function resetFaceLandmarker(): void {
  _landmarker = null;
  _loading    = null;
}

/**
 * Warm the MediaPipe singleton in the background.
 * Call this early (e.g. on component mount) so the model is already loaded
 * when the user clicks "Start".  Errors are silently ignored here — they will
 * surface properly when the user-initiated flow calls getFaceLandmarker().
 */
export function prefetchFaceLandmarker(): void {
  getFaceLandmarker().catch(() => { /* silently retry on user action */ });
}

/**
 * Convert 478 MediaPipe face landmarks into a translation- and
 * scale-invariant descriptor.
 *
 * Strategy:
 *   • Translate so the nose-tip (landmark 4) is the origin.
 *   • Scale by the inter-eye distance (landmarks 33 ↔ 263).
 *   • Flatten [x, y, z] × 478 → 1434-element array.
 */
export function extractDescriptor(
  landmarks: { x: number; y: number; z: number }[],
): number[] {
  const nose         = landmarks[4];   // nose tip
  const leftEyeOuter  = landmarks[33];
  const rightEyeOuter = landmarks[263];
  const eyeDist = Math.sqrt(
    (rightEyeOuter.x - leftEyeOuter.x) ** 2 +
    (rightEyeOuter.y - leftEyeOuter.y) ** 2,
  );
  const scale = eyeDist > 0.001 ? eyeDist : 1;

  const descriptor: number[] = [];
  for (const lm of landmarks) {
    descriptor.push((lm.x - nose.x) / scale);
    descriptor.push((lm.y - nose.y) / scale);
    descriptor.push(lm.z / scale);
  }
  return descriptor;
}

/**
 * Cosine similarity between two descriptor arrays.
 * Returns a value in [-1, 1]; same person ≈ 0.97–1.0.
 */
export function descriptorSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom > 0 ? dot / denom : 0;
}

/** Minimum cosine similarity to accept a face match. */
export const FACE_MATCH_THRESHOLD = 0.97;
