/**
 * face-detection.ts
 *
 * face-api.js wrapper replacing the old MediaPipe implementation.
 * - Models are loaded lazily and cached as a singleton (~6 MB total).
 * - detectFaceDescriptor() runs detection + landmark + recognition in one call,
 *   returning a 128-element descriptor array (Float32Array converted to number[]).
 * - descriptorDistance() returns Euclidean distance; lower = more similar.
 * - FACE_MATCH_THRESHOLD: accept a match when distance ≤ this value (0.5 is strict).
 */

import * as faceapi from 'face-api.js';

function modelsPath(): string {
  return `${import.meta.env.BASE_URL.replace(/\/$/, '')}/models`;
}

let _loaded: Promise<void> | null = null;

/** Load all three required nets (lazy singleton). */
export async function loadFaceApiModels(): Promise<void> {
  if (_loaded) return _loaded;
  _loaded = (async () => {
    try {
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
  _loaded = null;
}

/**
 * Warm the models in the background on component mount.
 * Errors are silently ignored here — they surface on user action.
 */
export function prefetchFaceApiModels(): void {
  loadFaceApiModels().catch(() => { /* retried on user action */ });
}

/**
 * Detect a face in a video frame and return its 128-element descriptor.
 * Returns null if no face is found in this frame.
 * Models must already be loaded before calling this.
 */
export async function detectFaceDescriptor(
  video: HTMLVideoElement,
): Promise<number[] | null> {
  const detection = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();
  if (!detection) return null;
  return Array.from(detection.descriptor);
}

/**
 * Euclidean distance between two 128-element descriptor arrays.
 * Returns 0 for identical faces, higher values for less similar faces.
 * Typical same-person range: 0.0 – 0.5.
 */
export function descriptorDistance(a: number[], b: number[]): number {
  return faceapi.euclideanDistance(
    new Float32Array(a),
    new Float32Array(b),
  );
}

/**
 * Accept a face match when distance ≤ this threshold.
 * 0.5 is a strict setting; raise to 0.6 if you want more leniency.
 */
export const FACE_MATCH_THRESHOLD = 0.5;
