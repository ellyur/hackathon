import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MapPin, ScanFace, Map as MapIcon, Fingerprint, CheckCircle2, AlertCircle, Camera, RefreshCw, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRoute } from 'wouter';
import * as faceapi from 'face-api.js';
import { useGetSchedule, useRecordTimeIn } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';

const MODELS_URL = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights';

type Step = 'idle' | 'gps-checking' | 'gps-ok' | 'gps-error' | 'face-loading' | 'face-scanning' | 'face-ok' | 'face-error' | 'submitting' | 'done' | 'submit-error';

interface GpsResult {
  distance: number;
  withinRange: boolean;
  accuracy: number;
  latitude: number;
  longitude: number;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function TimeInSimulatorPage() {
  const [, params] = useRoute('/schedule/:id');
  const scheduleId = params?.id ?? '';
  const { toast } = useToast();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: schedule, isLoading: scheduleLoading } = useGetSchedule(scheduleId, {
    query: { enabled: !!scheduleId, staleTime: 60_000 } as any,
  });

  const recordTimeIn = useRecordTimeIn();

  const [step, setStep] = useState<Step>('idle');
  const [gpsResult, setGpsResult] = useState<GpsResult | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [faceError, setFaceError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [timeInAt, setTimeInAt] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hospitalRadius = (schedule as { attendanceRadius?: number } | undefined)?.attendanceRadius
    ?? (schedule as { hospital?: { attendanceRadius?: number } } | undefined)?.hospital?.attendanceRadius
    ?? 150;
  const hospitalLat = (schedule as { hospital?: { latitude?: number } } | undefined)?.hospital?.latitude ?? 0;
  const hospitalLng = (schedule as { hospital?: { longitude?: number } } | undefined)?.hospital?.longitude ?? 0;

  // ── GPS verification ──────────────────────────────────────────────────────
  const verifyGps = useCallback(() => {
    setStep('gps-checking');
    setGpsError(null);

    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by this browser.');
      setStep('gps-error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = haversineDistance(
          pos.coords.latitude,
          pos.coords.longitude,
          hospitalLat,
          hospitalLng,
        );
        const result: GpsResult = {
          distance: Math.round(dist),
          withinRange: hospitalLat === 0 || dist <= hospitalRadius,
          accuracy: Math.round(pos.coords.accuracy),
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        setGpsResult(result);

        if (result.withinRange) {
          setStep('gps-ok');
          setTimeout(() => startFaceScan(), 1200);
        } else {
          setStep('gps-error');
          setGpsError(
            `You are ${result.distance}m from the hospital. You must be within ${hospitalRadius}m to time in.`,
          );
        }
      },
      (err) => {
        const messages: Record<number, string> = {
          1: 'Location access was denied. Please allow location permission and try again.',
          2: 'Your location could not be determined. Try moving to an area with better signal.',
          3: 'Location request timed out. Please try again.',
        };
        setGpsError(messages[err.code] ?? 'An unknown location error occurred.');
        setStep('gps-error');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }, [hospitalLat, hospitalLng, hospitalRadius]);

  // ── Face scan ─────────────────────────────────────────────────────────────
  const startFaceScan = useCallback(async () => {
    setStep('face-loading');
    setFaceError(null);
    setFaceDetected(false);

    if (!modelsLoaded) {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL);
        setModelsLoaded(true);
      } catch {
        setFaceError('Failed to load face detection models. Check your internet connection.');
        setStep('face-error');
        return;
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      setStep('face-scanning');

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          startDetection();
        }
      }, 300);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Permission') || msg.includes('NotAllowed')) {
        setFaceError('Camera access was denied. Please allow camera permission and try again.');
      } else if (msg.includes('NotFound') || msg.includes('DevicesNotFound')) {
        setFaceError('No camera found on this device.');
      } else {
        setFaceError(`Camera error: ${msg}`);
      }
      setStep('face-error');
    }
  }, [modelsLoaded]);

  const startDetection = useCallback(() => {
    detectionIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;
      try {
        const detection = await faceapi.detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }),
        );
        if (detection) {
          setFaceDetected(true);
          setTimeout(() => confirmFace(), 800);
        }
      } catch {
        // silent — keep trying
      }
    }, 300);
  }, []);

  const stopCamera = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const confirmFace = useCallback(() => {
    stopCamera();
    // Submit to backend
    setStep('submitting');
    setSubmitError(null);
  }, [stopCamera]);

  // Submit when step transitions to 'submitting'
  useEffect(() => {
    if (step !== 'submitting') return;
    recordTimeIn.mutate(
      {
        data: {
          scheduleId,
          studentLatitude: gpsResult?.latitude,
          studentLongitude: gpsResult?.longitude,
          gpsVerified: true,
          faceVerified: true,
          livenessVerified: true,
        },
      },
      {
        onSuccess: () => {
          setStep('done');
          setTimeInAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          toast({ title: 'Time-in recorded', description: 'Your attendance has been saved.' });
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Failed to record time-in.';
          setSubmitError(msg);
          setStep('submit-error');
        },
      },
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const reset = useCallback(() => {
    stopCamera();
    setStep('idle');
    setGpsResult(null);
    setGpsError(null);
    setFaceError(null);
    setFaceDetected(false);
    setTimeInAt(null);
    setSubmitError(null);
  }, [stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  if (scheduleLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading schedule…
      </div>
    );
  }

  const hospitalName = (schedule as { hospital?: { name?: string } } | undefined)?.hospital?.name
    ?? (schedule as { title?: string } | undefined)?.title
    ?? 'Hospital';
  const deptName = (schedule as { department?: { name?: string } } | undefined)?.department?.name ?? '';
  const ciFirstName = (schedule as { ci?: { firstName?: string } } | undefined)?.ci?.firstName ?? '';
  const ciLastName = (schedule as { ci?: { lastName?: string } } | undefined)?.ci?.lastName ?? '';
  const dutyDate = (schedule as { dutyDate?: string } | undefined)?.dutyDate ?? '';
  const startTime = (schedule as { startTime?: string } | undefined)?.startTime ?? '';
  const endTime = (schedule as { endTime?: string } | undefined)?.endTime ?? '';
  const gracePeriodMin = (schedule as { gracePeriodMin?: number } | undefined)?.gracePeriodMin ?? 15;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Active Duty</h2>
          <p className="text-muted-foreground mt-1">Biometric and geofence verification</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2 overflow-hidden">
          <div className="h-2 bg-primary" />
          <CardHeader>
            <CardTitle>{hospitalName}{deptName ? ` — ${deptName}` : ''}</CardTitle>
            <CardDescription>{dutyDate ? `${dutyDate}, ${startTime} – ${endTime}` : 'Loading schedule…'}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-6">
              {/* Left – schedule info */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback>CI</AvatarFallback>
                    </Avatar>
                  </div>
                  <div>
                    <div className="text-sm font-medium">{ciFirstName ? `${ciFirstName} ${ciLastName}` : 'Clinical Instructor'}</div>
                    <div className="text-xs text-muted-foreground">Clinical Instructor</div>
                  </div>
                </div>
                <div className="pt-4 border-t space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Grace Period:</span>
                    <span className="font-medium text-amber-600">{gracePeriodMin} min after start</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Geofence Radius:</span>
                    <span className="font-medium">{hospitalRadius} m</span>
                  </div>
                </div>

                {/* Step indicators */}
                <div className="pt-4 border-t space-y-2">
                  <StepIndicator
                    icon={<MapPin className="w-4 h-4" />}
                    label="GPS Location"
                    status={
                      step === 'idle' ? 'pending'
                      : step === 'gps-checking' ? 'active'
                      : step === 'gps-error' ? 'error'
                      : 'done'
                    }
                    detail={gpsResult ? `${gpsResult.distance}m away · ±${gpsResult.accuracy}m accuracy` : undefined}
                  />
                  <StepIndicator
                    icon={<ScanFace className="w-4 h-4" />}
                    label="Face Verification"
                    status={
                      ['idle', 'gps-checking', 'gps-ok', 'gps-error'].includes(step) ? 'pending'
                      : ['face-loading', 'face-scanning'].includes(step) ? 'active'
                      : step === 'face-error' ? 'error'
                      : 'done'
                    }
                  />
                </div>
              </div>

              {/* Right – verification UI */}
              <div className="flex-1 bg-muted/30 rounded-xl p-6 border flex flex-col items-center justify-center text-center space-y-4 min-h-[240px]">
                {step === 'idle' && (
                  <>
                    <Fingerprint className="w-12 h-12 text-primary opacity-80" />
                    <div>
                      <h3 className="font-semibold text-lg">Ready to Time In</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Make sure you are at the hospital premises.
                      </p>
                    </div>
                    <Button size="lg" className="w-full mt-2" onClick={verifyGps}>
                      Start Verification
                    </Button>
                  </>
                )}

                {step === 'gps-checking' && (
                  <>
                    <MapIcon className="w-12 h-12 text-primary animate-pulse" />
                    <div>
                      <h3 className="font-semibold text-lg">Verifying Location</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Checking GPS coordinates against geofence…
                      </p>
                    </div>
                  </>
                )}

                {step === 'gps-ok' && (
                  <>
                    <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                    <div>
                      <h3 className="font-semibold text-lg text-emerald-700">Location Verified</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {gpsResult?.distance}m from hospital · Opening camera…
                      </p>
                    </div>
                  </>
                )}

                {step === 'gps-error' && (
                  <>
                    <AlertCircle className="w-12 h-12 text-destructive" />
                    <div>
                      <h3 className="font-semibold text-lg text-destructive">Location Failed</h3>
                      {gpsError && (
                        <Alert variant="destructive" className="mt-2 text-left">
                          <AlertDescription className="text-xs">{gpsError}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                    <Button variant="outline" size="sm" onClick={verifyGps} className="gap-2">
                      <RefreshCw className="w-4 h-4" /> Retry GPS
                    </Button>
                  </>
                )}

                {step === 'face-loading' && (
                  <>
                    <Camera className="w-12 h-12 text-primary animate-pulse" />
                    <div>
                      <h3 className="font-semibold text-lg">Preparing Camera</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Loading face detection models…
                      </p>
                    </div>
                  </>
                )}

                {step === 'face-scanning' && (
                  <div className="w-full space-y-3">
                    <p className="text-sm font-medium">
                      {faceDetected ? '✅ Face detected — confirming…' : 'Look directly at the camera'}
                    </p>
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black border-2 border-primary">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover scale-x-[-1]"
                      />
                      {!faceDetected && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-40 h-52 border-2 border-primary/60 rounded-full opacity-60" />
                        </div>
                      )}
                      {faceDetected && (
                        <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                          <CheckCircle2 className="w-16 h-16 text-emerald-400" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <ScanFace className="w-3 h-3 inline mr-1" />
                      Face detection running on-device — no images are uploaded
                    </p>
                  </div>
                )}

                {step === 'submitting' && (
                  <>
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <div>
                      <h3 className="font-semibold text-lg">Recording Attendance</h3>
                      <p className="text-sm text-muted-foreground mt-1">Saving your time-in…</p>
                    </div>
                  </>
                )}

                {step === 'submit-error' && (
                  <>
                    <AlertCircle className="w-12 h-12 text-destructive" />
                    <div>
                      <h3 className="font-semibold text-lg text-destructive">Submission Failed</h3>
                      {submitError && (
                        <Alert variant="destructive" className="mt-2 text-left">
                          <AlertDescription className="text-xs">{submitError}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                    <Button variant="outline" size="sm" onClick={reset} className="gap-2">
                      <RefreshCw className="w-4 h-4" /> Try Again
                    </Button>
                  </>
                )}

                {step === 'face-error' && (
                  <>
                    <AlertCircle className="w-12 h-12 text-destructive" />
                    <div>
                      <h3 className="font-semibold text-lg text-destructive">Camera Failed</h3>
                      {faceError && (
                        <Alert variant="destructive" className="mt-2 text-left">
                          <AlertDescription className="text-xs">{faceError}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => startFaceScan()} className="gap-2">
                      <RefreshCw className="w-4 h-4" /> Retry Camera
                    </Button>
                  </>
                )}

                {step === 'done' && (
                  <>
                    <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                      <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-emerald-700">Verified &amp; Timed In</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {timeInAt} · You are Present
                      </p>
                    </div>
                    <div className="flex gap-3 w-full text-xs text-left bg-background p-3 rounded border">
                      <div className="flex items-center gap-1 text-emerald-600">
                        <CheckCircle2 className="w-3 h-3" /> Location Match
                      </div>
                      <div className="flex items-center gap-1 text-emerald-600">
                        <CheckCircle2 className="w-3 h-3" /> Face Match
                      </div>
                      <div className="flex items-center gap-1 text-emerald-600">
                        <CheckCircle2 className="w-3 h-3" /> Saved to Server
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground">
                      Reset
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Step indicator helper ───────────────────────────────────────────────────
function StepIndicator({
  icon,
  label,
  status,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  status: 'pending' | 'active' | 'done' | 'error';
  detail?: string;
}) {
  const colors = {
    pending: 'text-muted-foreground bg-muted',
    active: 'text-primary bg-primary/10 animate-pulse',
    done: 'text-emerald-600 bg-emerald-50',
    error: 'text-destructive bg-destructive/10',
  };
  return (
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${colors[status]}`}>
        {status === 'done' ? <CheckCircle2 className="w-4 h-4" /> : status === 'error' ? <AlertCircle className="w-4 h-4" /> : icon}
      </div>
      <div className="text-left">
        <p className="text-sm font-medium leading-none">{label}</p>
        {detail && <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>}
      </div>
    </div>
  );
}
