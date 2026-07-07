/**
 * face-detection.ts
 *
 * face-api.js wrapper — uses DYNAMIC import so the library (and its TensorFlow
 * dependency) is never loaded at module-init time. It is only fetched the first
 * time the user triggers face enrollment or verification.
 *
 * - Models are loaded lazily and cached as a singleton (~6 MB total).
 * - detectFaceDescriptor() runs detection + landmark + recognition in one call,
 *   returning a 128-element descriptor array.
 * - descriptorDistance() returns Euclidean distance; lower = more similar.
 * - FACE_MATCH_THRESHOLD: accept a match when distance ≤ this value.
 */

function modelsPath(): string {
  return `${import.meta.env.BASE_URL.replace(/\/$/, '')}/models`;
}

type FaceApiModule = typeof import('face-api.js');

let _faceapi: FaceApiModule | null = null;
let _loaded: Promise<void> | null = null;

async function getFaceApi(): Promise<FaceApiModule> {
  if (!_faceapi) {
    _faceapi = await import('face-api.js');
  }
  return _faceapi;
}

/** Load all three required nets (lazy singleton). */
export async function loadFaceApiModels(): Promise<void> {
  if (_loaded) return _loaded;
  _loaded = (async () => {
    try {
      const faceapi = await getFaceApi();
      const uri = modelsPath();
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(uri),
        faceapi.nets.faceLandmark68Net.loadFromUri(uri),
        faceapi.nets.faceRecognitionNet.loadFromUri(uri),
      ]);
    } catch (err) {
      _loaded = null;
      throw err;
    }
  })();
  return _loaded;
}

/** Reset the singleton so the next call retries from scratch. */
export function resetFaceApiModels(): void {
  _faceapi = null;
  _loaded = null;
}

/**
 * Warm the models in the background on component mount.
 * Errors are silently ignored — they surface properly on user action.
 */
export function prefetchFaceApiModels(): void {
  loadFaceApiModels().catch(() => { /* retried on user action */ });
}

/**
 * Detect a face in a video frame and return its 128-element descriptor.
 * Returns null if no face is found. Models must already be loaded.
 */
export async function detectFaceDescriptor(
  video: HTMLVideoElement,
): Promise<number[] | null> {
  const faceapi = await getFaceApi();
  const detection = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();
  if (!detection) return null;
  return Array.from(detection.descriptor);
}

/**
 * Euclidean distance between two 128-element descriptor arrays.
 * Lower = more similar faces. Typical same-person range: 0.0 – 0.5.
 */
export function descriptorDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
}

/**
 * Accept a face match when distance ≤ this threshold.
 * 0.5 is strict; raise to 0.6 for more leniency.
 */
export const FACE_MATCH_THRESHOLD = 0.5;
