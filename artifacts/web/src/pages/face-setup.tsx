import { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ScanFace, Camera, CheckCircle2, AlertCircle, RefreshCw,
  Loader2, ShieldCheck, Aperture,
} from 'lucide-react';
import { useGetMyFaceDescriptor } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { loadFaceApiModels, detectFaceDescriptor } from '@/lib/face-detection';

type Step =
  | 'idle'
  | 'requesting-permission'
  | 'preview'
  | 'uploading'
  | 'done'
  | 'error';

export function FaceSetupPage() {
  const { toast } = useToast();

  const { data: faceData, isLoading: faceLoading, refetch } =
    useGetMyFaceDescriptor({ query: { staleTime: 30_000 } as never });

  const [step, setStep]   = useState<Step>('idle');
  const [error, setError] = useState<string | null>(null);

  const videoRef    = useRef<HTMLVideoElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = useCallback(async () => {
    setError(null);
    setStep('requesting-permission');

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        'Camera API unavailable. Open the app directly in your browser over HTTPS ' +
        '(not inside an embedded preview frame).',
      );
      setStep('error');
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError') {
        setError("Camera permission was denied. Tap the camera icon in your browser's address bar and choose \"Allow\", then try again.");
      } else if (name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else if (name === 'NotReadableError') {
        setError('Camera is in use by another app. Close other tabs using the camera and try again.');
      } else {
        setError(`Camera error: ${name || (err instanceof Error ? err.message : String(err))}`);
      }
      setStep('error');
      return;
    }

    streamRef.current = stream;
    setStep('preview');

    // Attach stream to video element via RAF to ensure it's mounted
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {/* autoplay policy — playsInline+muted still works */});
        }
      });
    });
  }, []);

  const captureAndEnroll = useCallback(async () => {
    const vid = videoRef.current;
    if (!vid || vid.readyState < 2) {
      setError('Camera is not ready yet. Please wait a moment and try again.');
      return;
    }

    stopCamera();
    setStep('uploading');

    try {
      // Load face-api.js models (cached after first load)
      await loadFaceApiModels();

      // Extract 128-element face descriptor from the video frame
      const descriptor = await detectFaceDescriptor(vid);
      if (!descriptor) {
        throw new Error('No face detected. Make sure your face is clearly visible and well-lit, then try again.');
      }

      const res = await fetch('/api/students/me/face-enroll', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('authToken')
            ? { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
            : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ descriptor }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' })) as { error?: string };
        throw new Error(body.error ?? `Server error ${res.status}`);
      }

      setStep('done');
      refetch();
      toast({ title: 'Face enrolled', description: 'You can now time in using face verification.' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enrollment failed. Please try again.');
      setStep('error');
    }
  }, [stopCamera, refetch, toast]);

  const reset = useCallback(() => {
    stopCamera();
    setStep('idle');
    setError(null);
  }, [stopCamera]);

  const isEnrolled = faceData?.enrolled === true;
  const showVideo  = step === 'preview';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Face Setup</h2>
        <p className="text-muted-foreground mt-1">
          Enroll your face so attendance can verify your identity.
        </p>
      </div>

      {/* Enrollment status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Enrollment Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {faceLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Checking…
            </div>
          ) : isEnrolled ? (
            <>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="font-medium text-emerald-700">Face enrolled</span>
                <Badge variant="outline" className="text-emerald-600 border-emerald-300">Active</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Your face is registered. Re-enroll below if the system doesn't recognise you during time-in.
              </p>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <span className="font-medium text-amber-700">Not yet enrolled</span>
              <Badge variant="outline" className="text-amber-600 border-amber-300">Required</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Camera / enroll card */}
      <Card>
        <CardHeader>
          <CardTitle>{isEnrolled ? 'Re-enroll Your Face' : 'Enroll Your Face'}</CardTitle>
          <CardDescription>
            Face recognition runs locally on your device — no photos leave your browser.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">

          {/* Live camera preview — always rendered so videoRef stays valid */}
          <div className={showVideo ? 'block' : 'hidden'}>
            <div className="space-y-3">
              <p className="text-sm font-medium text-center">
                Position your face in the centre, then tap <strong>Capture</strong>.
              </p>
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border-2 border-primary">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                {/* Oval guide */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-44 h-56 border-2 border-white/60 rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" />
                </div>
              </div>
              <Button className="w-full gap-2" onClick={captureAndEnroll}>
                <Aperture className="w-4 h-4" /> Capture &amp; Enroll
              </Button>
              <button
                onClick={reset}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Idle */}
          {(step === 'idle' || step === 'done') && (
            <div className="flex flex-col items-center justify-center py-10 gap-4 bg-muted/30 rounded-xl border border-dashed">
              {step === 'done' ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="w-9 h-9 text-emerald-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-emerald-700">Face enrolled successfully!</p>
                    <p className="text-sm text-muted-foreground mt-1">You can now time in using face verification.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={reset}>Enroll Again</Button>
                </>
              ) : (
                <>
                  <ScanFace className="w-12 h-12 text-muted-foreground" />
                  <div className="text-center">
                    <p className="font-medium">Ready to enroll</p>
                    <p className="text-sm text-muted-foreground">Tap below to open your camera.</p>
                  </div>
                  <Button size="lg" onClick={startCamera}>
                    <Camera className="w-4 h-4 mr-2" /> Open Camera
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Requesting permission */}
          {step === 'requesting-permission' && (
            <div className="flex flex-col items-center justify-center py-10 gap-3 bg-muted/30 rounded-xl border">
              <Camera className="w-10 h-10 text-primary animate-pulse" />
              <p className="font-medium">Requesting camera access…</p>
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                Your browser will show a permission prompt. Tap <strong>Allow</strong> to continue.
              </p>
            </div>
          )}

          {/* Uploading */}
          {step === 'uploading' && (
            <div className="flex flex-col items-center justify-center py-10 gap-4 bg-muted/30 rounded-xl border">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="font-medium">Enrolling your face…</p>
              <p className="text-xs text-muted-foreground">Analysing facial features locally…</p>
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div className="flex flex-col items-center justify-center py-8 gap-3 bg-destructive/5 rounded-xl border border-destructive/20">
              <AlertCircle className="w-10 h-10 text-destructive" />
              <div className="text-center">
                <p className="font-semibold text-destructive">Enrollment failed</p>
                {error && (
                  <Alert variant="destructive" className="mt-3 text-left max-w-sm">
                    <AlertDescription className="text-xs">{error}</AlertDescription>
                  </Alert>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={reset} className="gap-2 mt-1">
                <RefreshCw className="w-4 h-4" /> Try Again
              </Button>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
