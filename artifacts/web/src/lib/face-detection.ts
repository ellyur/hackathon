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

const WASM_PATH =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm';
const MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

// Singleton cache
let _landmarker: FaceLandmarkerType | null = null;
let _loading: Promise<FaceLandmarkerType> | null = null;

/** Returns the cached FaceLandmarker, creating it if necessary. */
export async function getFaceLandmarker(): Promise<FaceLandmarkerType> {
  if (_landmarker) return _landmarker;
  if (_loading) return _loading;

  _loading = (async () => {
    const { FaceLandmarker, FilesetResolver } = await import(
      '@mediapipe/tasks-vision'
    );
    const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
    _landmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_PATH,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    });
    return _landmarker;
  })();

  return _loading;
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
  const nose = landmarks[4]; // nose tip
  const leftEyeOuter = landmarks[33];
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
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom > 0 ? dot / denom : 0;
}

/** Minimum cosine similarity to accept a face match. */
export const FACE_MATCH_THRESHOLD = 0.97;
