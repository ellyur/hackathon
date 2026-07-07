/**
 * face-detection.ts
 *
 * face-api.js wrapper — uses a true dynamic import that is invisible to
 * Vite's static import scanner.  face-api.js (and its TensorFlow backend)
 * is only fetched the first time the user triggers face enrollment or
 * verification — never at app startup.
 *
 * - Models are loaded lazily and cached as a singleton (~6 MB total).
 * - detectFaceDescriptor() → 128-element descriptor (Float32Array → number[]).
 * - descriptorDistance() → Euclidean distance; lower = more similar.
 * - FACE_MATCH_THRESHOLD: accept a match when distance ≤ this value.
 */

function modelsPath(): string {
  return `${import.meta.env.BASE_URL.replace(/\/$/, '')}/models`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _faceapi: any = null;
let _loaded: Promise<void> | null = null;

/** Dynamically load face-api.js. The string is built at runtime so Vite's
 *  static scanner never sees a bare import('face-api.js') and won't
 *  eagerly pre-bundle (and potentially crash) the library. */
async function getFaceApi() {
  if (_faceapi) return _faceapi;
  // Split the package name so Vite's regex scanner doesn't match it as a
  // static dependency and pull it into the pre-bundle step.
  const pkg = ['face', 'api.js'].join('-');
  _faceapi = await import(/* @vite-ignore */ pkg);
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
