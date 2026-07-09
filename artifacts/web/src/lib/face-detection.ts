/**
 * face-detection.ts
 *
 * Wraps face-api.js with lazy loading so TensorFlow.js is never imported at
 * app startup — only when the user explicitly triggers face enrollment or
 * time-in verification.
 *
 * face-api.js is listed in vite.config optimizeDeps.exclude so Vite does NOT
 * attempt to pre-bundle it in Node.js (which would crash because TF.js needs
 * real browser APIs).  The standard dynamic import() below is still rewritten
 * by Vite at build time to the correct module URL, so the browser can find it.
 */

function modelsPath(): string {
  return `${import.meta.env.BASE_URL.replace(/\/$/, '')}/models`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _faceapi: any = null;
let _loaded: Promise<void> | null = null;
let _modelsReady = false;

/** Returns true if models are already loaded and ready — no async wait. */
export function areFaceModelsReady(): boolean {
  return _modelsReady;
}

async function getFaceApi() {
  if (_faceapi) return _faceapi;
  // Standard dynamic import — Vite rewrites the specifier to the correct URL.
  // optimizeDeps.exclude keeps this out of the pre-bundle step so TF.js only
  // runs inside the browser, never in Vite's Node.js pre-bundler.
  _faceapi = await import('face-api.js');
  return _faceapi;
}

/** Load all three required nets (lazy singleton). */
export async function loadFaceApiModels(): Promise<void> {
  if (_modelsReady) return;
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
      _modelsReady = true;
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
  _modelsReady = false;
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
  return Array.from(detection.descriptor as Float32Array);
}

/**
 * Euclidean distance between two 128-element descriptor arrays.
 * Lower = more similar. Typical same-person range: 0.0 – 0.5.
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
