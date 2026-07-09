import { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  ScanFace, Camera, CheckCircle2, AlertCircle, RefreshCw,
  Loader2, ShieldCheck, Aperture, Brain, Scan, Save,
} from 'lucide-react';
import { useGetMyFaceDescriptor } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import {
  loadFaceApiModels, detectFaceDescriptor, prefetchFaceApiModels, areFaceModelsReady,
} from '@/lib/face-detection';

type Step =
  | 'idle'
  | 'requesting-permission'
  | 'preview'
  | 'loading-models'
  | 'detecting'
  | 'saving'
  | 'done'
  | 'error';

function StageRow({ icon, label, status }: {
  icon: React.ReactNode;
  label: string;
  status: 'waiting' | 'active' | 'done';
}) {
  return (
    <div className={`flex items-center gap-3 text-sm transition-colors ${
      status === 'done' ? 'text-emerald-600' :
      status === 'active' ? 'text-primary font-medium' :
      'text-muted-foreground'
    }`}>
      <span className="w-5 h-5 flex items-center justify-center shrink-0">
        {status === 'done' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> :
         status === 'active' ? <Loader2 className="w-4 h-4 animate-spin" /> :
         icon}
      </span>
      {label}
    </div>
  );
}

export function FaceSetupPage() {
  const { toast } = useToast();

  const { data: faceData, isLoading: faceLoading, refetch } =
    useGetMyFaceDescriptor({ query: { staleTime: 30_000 } as never });

  const [modelsPreloading, setModelsPreloading] = useState(!areFaceModelsReady());

  useEffect(() => {
    if (areFaceModelsReady()) return;
    setModelsPreloading(true);
    prefetchFaceApiModels();
    const interval = setInterval(() => {
      if (areFaceModelsReady()) {
        setModelsPreloading(false);
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    });

    // Kick off model loading in parallel while camera warms up
    if (!areFaceModelsReady()) {
      loadFaceApiModels().catch(() => {});
    }
  }, []);

  const captureAndEnroll = useCallback(async () => {
    const vid = videoRef.current;
    if (!vid || vid.readyState < 2) {
      setError('Camera is not ready yet. Please wait a moment and try again.');
      return;
    }

    try {
      // Stage 1 — load models (may already be done from background prefetch)
      if (!areFaceModelsReady()) {
        setStep('loading-models');
        await loadFaceApiModels();
      }

      // Stage 2 — detect face from live video
      setStep('detecting');
      const descriptor = await detectFaceDescriptor(vid);
      stopCamera();

      if (!descriptor) {
        throw new Error('No face detected. Make sure your face is clearly visible and well-lit, then try again.');
      }

      // Stage 3 — save to server
      setStep('saving');
      const res = await fetch('/api/students/me/face-enroll', {
        method: 'POST',
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
      toast({ title: 'Face enrolled ✓', description: 'You can now time in using face verification.' });
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
  const showVideo = step === 'preview';
  const isProcessing = step === 'loading-models' || step === 'detecting' || step === 'saving';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Face Setup</h2>
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

      {/* AI models preload notice */}
      {modelsPreloading && step === 'idle' && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-blue-50/60 border-blue-200 text-blue-800 text-sm">
          <Loader2 className="w-4 h-4 animate-spin shrink-0 text-blue-500" />
          <span>Loading AI face recognition models in the background — this only happens once…</span>
        </div>
      )}

      {/* Camera / enroll card */}
      <Card>
        <CardHeader>
          <CardTitle>{isEnrolled ? 'Re-enroll Your Face' : 'Enroll Your Face'}</CardTitle>
          <CardDescription>
            Face recognition runs locally on your device — no photos are sent to any server.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">

          {/* Live camera preview */}
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

          {/* Multi-stage processing */}
          {isProcessing && (
            <div className="flex flex-col gap-5 py-8 px-4 bg-muted/30 rounded-xl border">
              <div className="text-center">
                <p className="font-semibold text-base">
                  {step === 'loading-models' && 'Loading AI models…'}
                  {step === 'detecting' && 'Detecting your face…'}
                  {step === 'saving' && 'Saving enrollment…'}
                </p>
                {step === 'loading-models' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    First-time only — about 5–15 seconds depending on your connection.
                  </p>
                )}
              </div>

              <Progress
                value={
                  step === 'loading-models' ? 33 :
                  step === 'detecting' ? 66 :
                  90
                }
                className="h-2"
              />

              <div className="space-y-3">
                <StageRow
                  icon={<Brain className="w-4 h-4" />}
                  label="Load AI recognition models"
                  status={
                    step === 'loading-models' ? 'active' :
                    step === 'detecting' || step === 'saving' ? 'done' : 'waiting'
                  }
                />
                <StageRow
                  icon={<Scan className="w-4 h-4" />}
                  label="Detect and analyse your face"
                  status={
                    step === 'detecting' ? 'active' :
                    step === 'saving' ? 'done' :
                    step === 'loading-models' ? 'waiting' : 'waiting'
                  }
                />
                <StageRow
                  icon={<Save className="w-4 h-4" />}
                  label="Save face profile"
                  status={step === 'saving' ? 'active' : 'waiting'}
                />
              </div>
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

      {/* Tips */}
      <Card className="bg-muted/40 border-dashed">
        <CardContent className="pt-4 pb-4">
          <p className="text-sm font-medium mb-2">Tips for best results</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Make sure your face is well-lit — avoid bright lights directly behind you</li>
            <li>Look straight at the camera, keep your face centred in the oval guide</li>
            <li>Remove glasses or face coverings if recognition fails</li>
            <li>First use downloads ~7 MB of AI models — subsequent uses are instant</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
