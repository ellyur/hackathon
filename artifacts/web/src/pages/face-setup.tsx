import { useEffect, useRef, useState, useCallback } from 'react';
import type { FaceLandmarker as FaceLandmarkerType } from '@mediapipe/tasks-vision';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScanFace, Camera, CheckCircle2, AlertCircle, RefreshCw, Loader2, ShieldCheck } from 'lucide-react';
import { useGetMyFaceDescriptor, useSaveMyFaceDescriptor } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { getFaceLandmarker, extractDescriptor } from '@/lib/face-detection';

type SetupStep = 'idle' | 'loading-models' | 'opening-camera' | 'scanning' | 'face-detected' | 'saving' | 'done' | 'error';

export function FaceSetupPage() {
  const { toast } = useToast();

  const { data: faceData, isLoading: faceLoading, refetch } = useGetMyFaceDescriptor({
    query: { staleTime: 30_000 } as never,
  });

  const saveDescriptor = useSaveMyFaceDescriptor();

  const [step, setStep] = useState<SetupStep>('idle');
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const confirmingRef = useRef(false);

  const stopCamera = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) { videoRef.current.srcObject = null; }
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // saveEnrollment must be declared BEFORE startDetection (useCallback dep evaluation order)
  const saveEnrollment = useCallback((descriptor: number[]) => {
    stopCamera();
    setStep('saving');
    saveDescriptor.mutate(
      { data: { descriptor } },
      {
        onSuccess: () => {
          setStep('done');
          refetch();
          toast({ title: 'Face enrolled', description: 'Your face has been saved. You can now use it to time in.' });
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : 'Failed to save face data.');
          setStep('error');
        },
      },
    );
  }, [stopCamera, saveDescriptor, refetch, toast]);

  const startDetection = useCallback((landmarker: FaceLandmarkerType) => {
    confirmingRef.current = false;
    intervalRef.current = setInterval(() => {
      if (confirmingRef.current) return;
      if (!videoRef.current || videoRef.current.readyState < 2) return;
      try {
        const result = landmarker.detectForVideo(videoRef.current, performance.now());
        if (result.faceLandmarks && result.faceLandmarks.length > 0) {
          if (confirmingRef.current) return;
          confirmingRef.current = true;
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          const descriptor = extractDescriptor(result.faceLandmarks[0]);
          setStep('face-detected');
          setTimeout(() => saveEnrollment(descriptor), 800);
        }
      } catch {
        // keep trying
      }
    }, 100);
  }, [saveEnrollment]);

  const startEnrollment = useCallback(async () => {
    setError(null);
    setStep('loading-models');

    let landmarker: FaceLandmarkerType;
    try {
      landmarker = await getFaceLandmarker();
    } catch {
      setError('Failed to load face detection. Please refresh the page and try again.');
      setStep('error');
      return;
    }

    setStep('opening-camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      setStep('scanning');

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          startDetection(landmarker);
        }
      }, 300);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Permission') || msg.includes('NotAllowed')) {
        setError('Camera access was denied. Please allow camera permission and try again.');
      } else if (msg.includes('NotFound') || msg.includes('DevicesNotFound')) {
        setError('No camera found on this device.');
      } else {
        setError(`Camera error: ${msg}`);
      }
      setStep('error');
    }
  }, [startDetection]);

  const reset = useCallback(() => {
    stopCamera();
    confirmingRef.current = false;
    setStep('idle');
    setError(null);
  }, [stopCamera]);

  const isEnrolled = faceData?.enrolled === true;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Face Setup</h2>
        <p className="text-muted-foreground mt-1">Enroll your face so attendance can verify your identity.</p>
      </div>

      {/* Status card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Enrollment Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {faceLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Checking…</div>
          ) : isEnrolled ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span className="font-medium text-emerald-700">Face enrolled</span>
              <Badge variant="outline" className="text-emerald-600 border-emerald-300">Active</Badge>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <span className="font-medium text-amber-700">Not yet enrolled</span>
              <Badge variant="outline" className="text-amber-600 border-amber-300">Required</Badge>
            </div>
          )}
          {isEnrolled && (
            <p className="text-sm text-muted-foreground mt-2">
              Your face data is saved. You can re-enroll below if the system doesn't recognize you during time-in.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Camera card */}
      <Card>
        <CardHeader>
          <CardTitle>{isEnrolled ? 'Re-enroll Your Face' : 'Enroll Your Face'}</CardTitle>
          <CardDescription>
            Look directly at the camera with good lighting. Keep your face within the oval guide.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* States */}
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
                    <p className="font-medium">Ready to scan</p>
                    <p className="text-sm text-muted-foreground">Click below to open the camera and enroll your face.</p>
                  </div>
                  <Button size="lg" onClick={startEnrollment}>
                    <Camera className="w-4 h-4 mr-2" /> Start Face Enrollment
                  </Button>
                </>
              )}
            </div>
          )}

          {(step === 'loading-models' || step === 'opening-camera') && (
            <div className="flex flex-col items-center justify-center py-10 gap-3 bg-muted/30 rounded-xl border">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="font-medium">{step === 'loading-models' ? 'Loading face detection models…' : 'Opening camera…'}</p>
            </div>
          )}

          {(step === 'scanning' || step === 'face-detected' || step === 'saving') && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-center">
                {step === 'face-detected' || step === 'saving' ? '✅ Face captured — saving…' : 'Look directly at the camera'}
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
                    <div className="w-44 h-56 border-2 border-primary/60 rounded-full opacity-60" />
                  </div>
                )}
                {(step === 'face-detected' || step === 'saving') && (
                  <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-20 h-20 text-emerald-400" />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                <ScanFace className="w-3 h-3 inline mr-1" />
                Face data is processed on-device and stored securely — no images are uploaded.
              </p>
            </div>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center justify-center py-8 gap-3 bg-destructive/5 rounded-xl border border-destructive/20">
              <AlertCircle className="w-10 h-10 text-destructive" />
              <div className="text-center">
                <p className="font-semibold text-destructive">Enrollment failed</p>
                {error && (
                  <Alert variant="destructive" className="mt-2 text-left max-w-sm">
                    <AlertDescription className="text-xs">{error}</AlertDescription>
                  </Alert>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={reset} className="gap-2">
                <RefreshCw className="w-4 h-4" /> Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
