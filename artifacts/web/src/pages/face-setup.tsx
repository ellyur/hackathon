import { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  ScanFace, Camera, CheckCircle2, AlertCircle, RefreshCw,
  Loader2, ShieldCheck, Info,
} from 'lucide-react';
import { useGetMyFaceDescriptor, useSaveMyFaceDescriptor } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import {
  loadFaceApiModels, resetFaceApiModels, detectFaceDescriptor,
} from '@/lib/face-detection';

// ─── Types ───────────────────────────────────────────────────────────────────

type Step =
  | 'idle'
  | 'requesting-permission'
  | 'loading-models'
  | 'scanning'
  | 'face-detected'
  | 'saving'
  | 'done'
  | 'error';

// ─── Component ───────────────────────────────────────────────────────────────

export function FaceSetupPage() {
  const { toast } = useToast();

  const { data: faceData, isLoading: faceLoading, refetch } =
    useGetMyFaceDescriptor({ query: { staleTime: 30_000 } as never });

  const saveDescriptor = useSaveMyFaceDescriptor();

  const [step, setStep]           = useState<Step>('idle');
  const [error, setError]         = useState<string | null>(null);
  const [modelProgress, setModelProgress] = useState(0);

  const videoRef            = useRef<HTMLVideoElement>(null);
  const streamRef           = useRef<MediaStream | null>(null);
  const intervalRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveTimeoutRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confirmingRef       = useRef(false);
  const enrollingRef        = useRef(false);
  const processingRef       = useRef(false);
  const rafRef              = useRef<number | null>(null);

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (intervalRef.current)         { clearInterval(intervalRef.current);         intervalRef.current = null; }
    if (progressIntervalRef.current) { clearInterval(progressIntervalRef.current); progressIntervalRef.current = null; }
    if (saveTimeoutRef.current)      { clearTimeout(saveTimeoutRef.current);        saveTimeoutRef.current = null; }
    if (rafRef.current)              { cancelAnimationFrame(rafRef.current);        rafRef.current = null; }
    if (streamRef.current)           { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current)            { videoRef.current.srcObject = null; }
    enrollingRef.current = false;
    processingRef.current = false;
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // ── Save the captured descriptor ─────────────────────────────────────────
  const saveEnrollment = useCallback((descriptor: number[]) => {
    stopCamera();
    setStep('saving');
    saveDescriptor.mutate(
      { data: { descriptor } },
      {
        onSuccess: () => {
          setStep('done');
          refetch();
          toast({
            title: 'Face enrolled',
            description: 'Your face is saved. You can now use it to time in.',
          });
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : 'Failed to save face data.');
          setStep('error');
        },
      },
    );
  }, [stopCamera, saveDescriptor, refetch, toast]);

  // ── Run the face detection loop ──────────────────────────────────────────
  const startDetection = useCallback(() => {
    confirmingRef.current = false;
    intervalRef.current = setInterval(async () => {
      if (confirmingRef.current || processingRef.current) return;
      const vid = videoRef.current;
      if (!vid || vid.readyState < 2 || vid.paused) return;

      processingRef.current = true;
      try {
        const descriptor = await detectFaceDescriptor(vid);
        if (descriptor && !confirmingRef.current) {
          confirmingRef.current = true;
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setStep('face-detected');
          saveTimeoutRef.current = setTimeout(() => {
            saveTimeoutRef.current = null;
            saveEnrollment(descriptor);
          }, 800);
        }
      } catch {
        // keep trying
      } finally {
        processingRef.current = false;
      }
    }, 300);
  }, [saveEnrollment]);

  // ── Assign the stream to the <video> once it's in the DOM ───────────────
  const attachStreamAndDetect = useCallback(
    (stream: MediaStream) => {
      const tryAttach = () => {
        const vid = videoRef.current;
        if (!vid) { rafRef.current = requestAnimationFrame(tryAttach); return; }
        vid.srcObject = stream;
        vid.play().catch(() => { /* autoplay policy — playsInline+muted still works */ });
        startDetection();
      };
      rafRef.current = requestAnimationFrame(tryAttach);
    },
    [startDetection],
  );

  // ── Main enrollment flow ─────────────────────────────────────────────────
  const startEnrollment = useCallback(async () => {
    if (enrollingRef.current) return;
    enrollingRef.current = true;

    setError(null);

    // Step 1 – camera permission ─────────────────────────────────────────
    setStep('requesting-permission');

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        'Camera API unavailable. ' +
        'This usually means the page is not served over HTTPS, or you are inside ' +
        'a sandboxed iframe. Open the app URL directly in your browser.',
      );
      setStep('error');
      enrollingRef.current = false;
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width:  { ideal: 640 },
          height: { ideal: 480 },
        },
      });
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      const msg  = err instanceof Error ? err.message : String(err);
      if (name === 'NotAllowedError' || /Permission|denied/i.test(msg)) {
        setError(
          "Camera permission was denied. " +
          "Tap the camera icon in your browser's address bar and choose \"Allow\", " +
          "then try again.",
        );
      } else if (name === 'NotFoundError' || /NotFound|DevicesNotFound/i.test(msg)) {
        setError('No camera found on this device.');
      } else if (name === 'NotReadableError' || /NotReadable|TrackStart/i.test(msg)) {
        setError(
          'Camera is already in use by another app. Close other tabs or apps ' +
          'using the camera, then try again.',
        );
      } else {
        setError(`Camera error: ${name || msg}`);
      }
      setStep('error');
      enrollingRef.current = false;
      return;
    }

    streamRef.current = stream;

    // Step 2 – load models (may already be cached from prefetch) ─────────
    setStep('loading-models');

    setModelProgress(0);
    progressIntervalRef.current = setInterval(() => {
      setModelProgress(p => (p >= 85 ? 85 : p + 8));
    }, 200);

    try {
      await loadFaceApiModels();
    } catch (err) {
      stopCamera();
      resetFaceApiModels();
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Model load failed: ${msg}`);
      setStep('error');
      return;
    }

    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setModelProgress(100);

    // Step 3 – activate camera view & run detection ───────────────────────
    setStep('scanning');
    attachStreamAndDetect(stream);
  }, [attachStreamAndDetect, stopCamera]);

  // ── Reset to idle ────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    stopCamera();
    confirmingRef.current = false;
    setStep('idle');
    setError(null);
    setModelProgress(0);
  }, [stopCamera]);

  const isEnrolled = faceData?.enrolled === true;
  const isScanning = step === 'scanning' || step === 'face-detected' || step === 'saving';

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6">

      <div>
        <h2 className="text-3xl font-bold tracking-tight">Face Setup</h2>
        <p className="text-muted-foreground mt-1">
          Enroll your face so attendance can verify your identity.
        </p>
      </div>

      {/* ── Enrollment status card ─────────────────────────────────────── */}
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
                Your face data is saved. Re-enroll below if the system doesn't recognise
                you during time-in.
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

      {/* ── Camera / enrollment card ────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>{isEnrolled ? 'Re-enroll Your Face' : 'Enroll Your Face'}</CardTitle>
          <CardDescription>
            Look directly at the camera with good lighting. Keep your face centred in the oval guide.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">

          {/* The video element is always mounted so videoRef is never null. */}
          <div className={isScanning ? 'block' : 'hidden'}>
            <div className="space-y-3">
              <p className="text-sm font-medium text-center">
                {step === 'face-detected' || step === 'saving'
                  ? '✅ Face captured — saving…'
                  : 'Look directly at the camera'}
              </p>

              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border-2 border-primary">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                {step === 'scanning' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-44 h-56 border-2 border-primary/70 rounded-full opacity-70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                  </div>
                )}
                {(step === 'face-detected' || step === 'saving') && (
                  <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-20 h-20 text-emerald-400 drop-shadow-lg" />
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground text-center">
                <ScanFace className="w-3 h-3 inline mr-1" />
                Face data is processed on-device — no images are uploaded.
              </p>
            </div>
          </div>

          {/* ── Idle / done ─────────────────────────────────────────────── */}
          {(step === 'idle' || step === 'done') && (
            <div className="flex flex-col items-center justify-center py-10 gap-4 bg-muted/30 rounded-xl border border-dashed">
              {step === 'done' ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="w-9 h-9 text-emerald-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-emerald-700">Face enrolled successfully!</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      You can now time in using face verification.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={reset}>Enroll Again</Button>
                </>
              ) : (
                <>
                  <ScanFace className="w-12 h-12 text-muted-foreground" />
                  <div className="text-center">
                    <p className="font-medium">Ready to enroll</p>
                    <p className="text-sm text-muted-foreground">
                      Click below — your browser will ask for camera permission.
                    </p>
                  </div>
                  <Button size="lg" onClick={startEnrollment}>
                    <Camera className="w-4 h-4 mr-2" /> Start Face Enrollment
                  </Button>

                  <Alert className="max-w-sm text-left bg-muted/50 border-muted-foreground/20">
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs text-muted-foreground">
                      Allow camera access when prompted. If nothing happens, make sure you
                      are opening the app over HTTPS in a regular browser tab (not a preview frame).
                    </AlertDescription>
                  </Alert>
                </>
              )}
            </div>
          )}

          {/* ── Requesting camera permission ────────────────────────────── */}
          {step === 'requesting-permission' && (
            <div className="flex flex-col items-center justify-center py-10 gap-3 bg-muted/30 rounded-xl border">
              <Camera className="w-10 h-10 text-primary animate-pulse" />
              <p className="font-medium">Requesting camera access…</p>
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                Your browser will show a permission prompt. Tap <strong>Allow</strong> to continue.
              </p>
            </div>
          )}

          {/* ── Loading face detection models ───────────────────────────── */}
          {step === 'loading-models' && (
            <div className="flex flex-col items-center justify-center py-10 gap-4 bg-muted/30 rounded-xl border">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="font-medium">Loading face detection…</p>
              <div className="w-48">
                <Progress value={modelProgress} className="h-1.5" />
              </div>
              <p className="text-xs text-muted-foreground">
                First load downloads ~6 MB — subsequent loads are instant.
              </p>
            </div>
          )}

          {/* ── Error ───────────────────────────────────────────────────── */}
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
