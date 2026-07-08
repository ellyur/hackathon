import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MapPin, ScanFace, Map as MapIcon, Fingerprint, CheckCircle2, AlertCircle, Camera, RefreshCw, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRoute, Link } from 'wouter';
import { getDistance } from 'geolib';
import { useGetSchedule, useRecordTimeIn, useGetMyFaceDescriptor } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { loadFaceApiModels, detectFaceDescriptor } from '@/lib/face-detection';

type Step = 'idle' | 'gps-checking' | 'gps-ok' | 'gps-error' | 'face-loading' | 'face-scanning' | 'face-ok' | 'face-error' | 'face-no-match' | 'submitting' | 'done' | 'submit-error';

interface GpsResult {
  distance: number;
  withinRange: boolean;
  accuracy: number;
  latitude: number;
  longitude: number;
}

export function TimeInSimulatorPage() {
  const [, params] = useRoute('/schedule/:id');
  const scheduleId = params?.id ?? '';
  const { toast } = useToast();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: schedule, isLoading: scheduleLoading } = useGetSchedule(scheduleId, {
    query: { enabled: !!scheduleId, staleTime: 60_000 } as any,
  });

  const { data: faceData, isLoading: faceLoading } = useGetMyFaceDescriptor({
    query: { staleTime: 60_000 } as never,
  });

  const recordTimeIn = useRecordTimeIn();

  const [step, setStep] = useState<Step>('idle');
  const [gpsResult, setGpsResult] = useState<GpsResult | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [faceError, setFaceError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceVerificationToken, setFaceVerificationToken] = useState<string | null>(null);
  const [timeInAt, setTimeInAt] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const confirmingRef = useRef(false);
  const processingRef = useRef(false);

  const hospitalRadius = (schedule as { attendanceRadius?: number } | undefined)?.attendanceRadius
    ?? (schedule as { hospital?: { attendanceRadius?: number } } | undefined)?.hospital?.attendanceRadius
    ?? 150;
  const hospitalLat = (schedule as { hospital?: { latitude?: number } } | undefined)?.hospital?.latitude ?? 0;
  const hospitalLng = (schedule as { hospital?: { longitude?: number } } | undefined)?.hospital?.longitude ?? 0;

  const isEnrolled = faceData?.enrolled === true;

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
        const dist = getDistance(
          { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
          { latitude: hospitalLat, longitude: hospitalLng },
        );
        const result: GpsResult = {
          distance: dist,
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

  // ── Stop camera ───────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    processingRef.current = false;
  }, []);

  // ── Client-side face verification via face-api.js ────────────────────────
  const captureAndVerify = useCallback(async () => {
    const vid = videoRef.current;
    if (!vid || vid.readyState < 2) {
      setFaceError('Camera is not ready. Please wait a moment and try again.');
      return;
    }

    setFaceDetected(true); // show "verifying…" overlay

    try {
      // Load models (cached after first call) then extract descriptor
      await loadFaceApiModels();
      const descriptor = await detectFaceDescriptor(vid);

      stopCamera();

      if (!descriptor) {
        setFaceDetected(false);
        setFaceError('No face detected. Make sure your face is centred and well-lit, then try again.');
        setStep('face-no-match');
        return;
      }

      const res = await fetch('/api/attendance/verify-face', {
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
      const data = await res.json() as { verified?: boolean; error?: string; distance?: number; verificationToken?: string };

      if (!res.ok) throw new Error(data.error ?? `Server error ${res.status}`);

      if (data.verified && data.verificationToken) {
        setFaceVerificationToken(data.verificationToken);
        setStep('submitting');
        setSubmitError(null);
      } else {
        setFaceDetected(false);
        setFaceError('Face did not match your enrolled profile. Please try again or re-enroll your face.');
        setStep('face-no-match');
      }
    } catch (err) {
      stopCamera();
      setFaceDetected(false);
      setFaceError(err instanceof Error ? err.message : 'Verification failed. Please try again.');
      setStep('face-error');
    }
  }, [stopCamera]);

  // ── Face scan flow ────────────────────────────────────────────────────────
  const startFaceScan = useCallback(async () => {
    setStep('face-loading');
    setFaceError(null);
    setFaceDetected(false);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('MEDIA_DEVICES_UNAVAILABLE');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      setStep('face-scanning');

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {/* autoplay may be blocked */});
          }
        });
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'MEDIA_DEVICES_UNAVAILABLE' || msg.includes('mediaDevices')) {
        setFaceError(
          "Camera API unavailable. If you're in a preview panel, open the app in a new browser tab — camera requires a direct HTTPS connection.",
        );
      } else if (msg.includes('Permission') || msg.includes('NotAllowed') || msg.includes('denied')) {
        setFaceError('Camera access was denied. Please allow camera permission and try again.');
      } else if (msg.includes('NotFound') || msg.includes('DevicesNotFound')) {
        setFaceError('No camera found on this device.');
      } else {
        setFaceError(`Camera error: ${msg}`);
      }
      setStep('face-error');
    }
  }, []);

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
          faceVerificationToken: faceVerificationToken ?? undefined,
          livenessVerified: true,
        } as Parameters<typeof recordTimeIn.mutate>[0]['data'],
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
    confirmingRef.current = false;
    setStep('idle');
    setGpsResult(null);
    setGpsError(null);
    setFaceError(null);
    setFaceDetected(false);
    setFaceVerificationToken(null);
    setTimeInAt(null);
    setSubmitError(null);
  }, [stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  if (scheduleLoading || faceLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading…
      </div>
    );
  }

  // Face not enrolled — block time-in
  if (!isEnrolled) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
          <ScanFace className="w-10 h-10 text-amber-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Face Not Enrolled</h2>
          <p className="text-muted-foreground mt-2">
            You need to enroll your face before you can time in. This is a one-time setup that takes less than a minute.
          </p>
        </div>
        <Button size="lg" asChild>
          <Link href="/profile/face-setup">Set Up Face Recognition</Link>
        </Button>
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
                      : (step === 'face-error' || step === 'face-no-match') ? 'error'
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
                      <h3 className="font-semibold text-lg">Opening Camera</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Allow camera access when prompted…
                      </p>
                    </div>
                  </>
                )}

                {step === 'face-scanning' && (
                  <div className="w-full space-y-3">
                    <p className="text-sm font-medium text-center">
                      {faceDetected ? '⏳ Verifying with server…' : 'Centre your face, then tap Verify'}
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
                          <div className="w-40 h-52 border-2 border-white/60 rounded-full opacity-60" />
                        </div>
                      )}
                      {faceDetected && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <Loader2 className="w-16 h-16 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    {!faceDetected && (
                      <Button className="w-full gap-2" onClick={captureAndVerify}>
                        <ScanFace className="w-4 h-4" /> Capture &amp; Verify Face
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground text-center">
                      <ScanFace className="w-3 h-3 inline mr-1" />
                      Face matching runs locally on your device
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

                {(step === 'face-error' || step === 'face-no-match') && (
                  <>
                    <AlertCircle className="w-12 h-12 text-destructive" />
                    <div>
                      <h3 className="font-semibold text-lg text-destructive">
                        {step === 'face-no-match' ? 'Face Did Not Match' : 'Camera Failed'}
                      </h3>
                      {faceError && (
                        <Alert variant="destructive" className="mt-2 text-left">
                          <AlertDescription className="text-xs">{faceError}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap justify-center">
                      <Button variant="outline" size="sm" onClick={() => startFaceScan()} className="gap-2">
                        <RefreshCw className="w-4 h-4" /> Try Again
                      </Button>
                      {step === 'face-no-match' && (
                        <Button variant="ghost" size="sm" asChild>
                          <Link href="/profile/face-setup">Re-enroll Face</Link>
                        </Button>
                      )}
                    </div>
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
                        {timeInAt ? `Recorded at ${timeInAt}` : 'Attendance saved.'}
                      </p>
                    </div>
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

// ── Helper component ──────────────────────────────────────────────────────────

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
  const colours = {
    pending: 'text-muted-foreground bg-muted',
    active:  'text-primary bg-primary/10 animate-pulse',
    done:    'text-emerald-600 bg-emerald-100',
    error:   'text-destructive bg-destructive/10',
  };
  return (
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${colours[status]}`}>
        {status === 'done'
          ? <CheckCircle2 className="w-4 h-4" />
          : status === 'error'
          ? <AlertCircle className="w-4 h-4" />
          : icon}
      </div>
      <div className="text-left">
        <div className="text-sm font-medium">{label}</div>
        {detail && <div className="text-xs text-muted-foreground">{detail}</div>}
      </div>
    </div>
  );
}
