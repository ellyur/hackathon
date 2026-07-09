import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  MapPin, ScanFace, CheckCircle2, AlertCircle,
  RefreshCw, Loader2, Navigation, LogOut, Clock,
  HelpCircle, ChevronDown, ChevronUp, Users, UserCheck,
} from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRoute, Link } from 'wouter';
import { getDistance } from 'geolib';
import {
  useGetSchedule, useRecordTimeIn, useRecordTimeOut,
  useListAttendance, useGetMyFaceDescriptor,
  useWhyAssigned, useBuddyTimeIn, useBuddyEligible,
} from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { loadFaceApiModels, detectFaceDescriptor, prefetchFaceApiModels } from '@/lib/face-detection';
import { AttendanceMap, type GpsZoneStatus } from '@/components/attendance-map';
import { DutyInfoPanel } from '@/components/duty-info-panel';
import { useAuth } from '@/hooks/use-auth';

// ── Types ─────────────────────────────────────────────────────────────────────

type SelfStep =
  | 'idle' | 'gps-checking' | 'gps-ok' | 'gps-error'
  | 'face-loading' | 'face-scanning' | 'face-ok' | 'face-error' | 'face-no-match'
  | 'submitting' | 'done' | 'submit-error' | 'timed-out';

type BuddyStep =
  | 'buddy-select'
  | 'buddy-face-loading' | 'buddy-face-scanning'
  | 'buddy-submitting' | 'buddy-done' | 'buddy-error';

type Step = SelfStep | BuddyStep;

interface GpsResult {
  distance: number;
  withinRange: boolean;
  accuracy: number;
  latitude: number;
  longitude: number;
}

interface LiveGps {
  latitude: number;
  longitude: number;
  accuracy: number;
  distance: number;
  withinRange: boolean;
}

interface ScheduleStudent {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  section?: string | null;
}

// ── GPS status panel ───────────────────────────────────────────────────────────

function GpsStatusPanel({
  status, distance, radius, accuracy, hospitalName,
}: {
  status: GpsZoneStatus;
  distance: number | null;
  radius: number;
  accuracy: number | null;
  hospitalName: string;
}) {
  const cfg = {
    'no-hospital': { emoji: '📍', color: 'bg-blue-50 border-blue-200 text-blue-800', msg: 'GPS check not required for this hospital.' },
    inside:        { emoji: '🟢', color: 'bg-emerald-50 border-emerald-200 text-emerald-800', msg: 'You are within the attendance zone.' },
    approaching:   { emoji: '🟡', color: 'bg-amber-50 border-amber-200 text-amber-800', msg: 'You are approaching the attendance zone.' },
    outside:       { emoji: '🔴', color: 'bg-red-50 border-red-200 text-red-700', msg: 'You are outside the attendance zone.' },
  }[status];

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${cfg.color}`}>
      <div className="flex items-center gap-2 font-semibold">
        <span className="text-lg">{cfg.emoji}</span>
        {cfg.msg}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div>
          <div className="text-xs opacity-70 mb-0.5">Distance</div>
          <div className="font-semibold">{distance !== null ? `${distance} m` : '—'}</div>
        </div>
        <div>
          <div className="text-xs opacity-70 mb-0.5">Attendance Radius</div>
          <div className="font-semibold">{radius} m</div>
        </div>
        <div>
          <div className="text-xs opacity-70 mb-0.5">GPS Accuracy</div>
          <div className="font-semibold">{accuracy !== null ? `±${accuracy} m` : '—'}</div>
        </div>
        <div>
          <div className="text-xs opacity-70 mb-0.5">Hospital</div>
          <div className="font-semibold truncate">{hospitalName}</div>
        </div>
      </div>
    </div>
  );
}

// ── Why Was I Assigned section ─────────────────────────────────────────────────

function WhyAssignedSection({ scheduleId }: { scheduleId: string }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading, isError } = useWhyAssigned(scheduleId, open);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="w-full gap-2 justify-between">
          <span className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-primary" />
            Why was I assigned to this duty?
          </span>
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 rounded-xl border bg-muted/40 p-4 text-sm space-y-2">
          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading reasons…
            </div>
          )}
          {isError && (
            <p className="text-muted-foreground">Could not load assignment reasons.</p>
          )}
          {data?.reasons && data.reasons.length > 0 && (
            <>
              <p className="font-semibold text-foreground">You were selected because:</p>
              <ul className="space-y-1.5">
                {data.reasons.map((reason, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
              {data.score != null && (
                <p className="text-xs text-muted-foreground pt-1 border-t">
                  Recommendation score: <span className="font-semibold">{data.score}/100</span>
                </p>
              )}
            </>
          )}
          {data?.reasons && data.reasons.length === 0 && (
            <p className="text-muted-foreground">You were selected for this duty by your scheduler.</p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function TimeInSimulatorPage() {
  const [, params] = useRoute('/schedule/:id');
  const scheduleId = params?.id ?? '';
  const { toast } = useToast();
  const { user } = useAuth();
  const currentUserId = (user as { id?: string } | undefined)?.id;

  const { data: schedule, isLoading: scheduleLoading } = useGetSchedule(scheduleId, {
    query: { enabled: !!scheduleId, staleTime: 60_000 } as never,
  });
  const { data: faceData, isLoading: faceLoading } = useGetMyFaceDescriptor({
    query: { staleTime: 60_000 } as never,
  });
  const { data: attendanceList, isLoading: attendanceLoading, refetch: refetchAttendance } = useListAttendance(
    { scheduleId },
    { query: { enabled: !!scheduleId, staleTime: 0, refetchOnMount: true } as never },
  );
  const recordTimeIn = useRecordTimeIn();
  const recordTimeOut = useRecordTimeOut();
  const buddyMutate = useBuddyTimeIn();

  // ── Derived schedule data ─────────────────────────────────────────────────
  const sch = schedule as {
    attendanceRadius?: number;
    hospital?: { attendanceRadius?: number; latitude?: number; longitude?: number; name?: string; address?: string };
    department?: { name?: string };
    ci?: { firstName?: string; lastName?: string };
    students?: ScheduleStudent[];
    dutyDate?: string;
    startTime?: string;
    endTime?: string;
    dutyHours?: number | null;
    title?: string;
    status?: string;
  } | undefined;

  const hospitalRadius = sch?.attendanceRadius ?? sch?.hospital?.attendanceRadius ?? 150;
  const hospitalLat = sch?.hospital?.latitude ?? 0;
  const hospitalLng = sch?.hospital?.longitude ?? 0;
  const hasHospitalGps = hospitalLat !== 0 || hospitalLng !== 0;

  const hospitalName = sch?.hospital?.name ?? sch?.title ?? 'Hospital';
  const hospitalAddress = sch?.hospital?.address ?? null;
  const deptName = sch?.department?.name ?? '';
  const dutyDate = sch?.dutyDate ?? '';
  const startTime = sch?.startTime ?? '';
  const endTime = sch?.endTime ?? '';
  const dutyHours = sch?.dutyHours ?? null;
  const scheduleStatus = sch?.status ?? 'upcoming';
  const ciFirstName = sch?.ci?.firstName ?? null;
  const ciLastName = sch?.ci?.lastName ?? null;
  const scheduleStudents: ScheduleStudent[] = (sch?.students ?? []) as ScheduleStudent[];

  const isEnrolled = faceData?.enrolled === true;

  // ── Self attendance state ─────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('idle');
  const [gpsResult, setGpsResult] = useState<GpsResult | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [faceError, setFaceError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceVerificationToken, setFaceVerificationToken] = useState<string | null>(null);
  const [timeInAt, setTimeInAt] = useState<string | null>(null);
  const [timeOutAt, setTimeOutAt] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Buddy state ───────────────────────────────────────────────────────────
  const [buddyTarget, setBuddyTarget] = useState<ScheduleStudent | null>(null);
  const [buddyFaceDetected, setBuddyFaceDetected] = useState(false);
  const [buddyError, setBuddyError] = useState<string | null>(null);
  const [buddyDoneName, setBuddyDoneName] = useState<string | null>(null);
  // Tracks which terminal step (done/timed-out) was active before entering buddy flow
  const [prebuddyStep, setPrebuddyStep] = useState<'done' | 'timed-out'>('done');

  // ── Live GPS state ────────────────────────────────────────────────────────
  const [liveGps, setLiveGps] = useState<LiveGps | null>(null);
  const [gpsPermDenied, setGpsPermDenied] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processingRef = useRef(false);

  // ── Buddy eligibility check ───────────────────────────────────────────────
  const isDoneScreen = step === 'done' || step === 'timed-out';
  const { data: buddyEligibility } = useBuddyEligible(scheduleId, isDoneScreen);

  // ── GPS zone status ───────────────────────────────────────────────────────
  const gpsZoneStatus: GpsZoneStatus = !hasHospitalGps
    ? 'no-hospital'
    : liveGps === null
    ? 'outside'
    : liveGps.withinRange
    ? 'inside'
    : liveGps.distance <= hospitalRadius * 3
    ? 'approaching'
    : 'outside';

  const canStartVerification = !hasHospitalGps || (liveGps !== null && liveGps.withinRange);

  useEffect(() => { prefetchFaceApiModels(); }, []);

  // ── Sync step from existing attendance record ─────────────────────────────
  useEffect(() => {
    if (!attendanceList || step !== 'idle') return;
    const record = attendanceList[0];
    if (!record) return;
    if (record.timeIn) {
      setTimeInAt(new Date(record.timeIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
    if (record.timeOut) {
      setTimeOutAt(new Date(record.timeOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setStep('timed-out');
    } else if (record.timeIn) {
      setStep('done');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendanceList]);

  // ── Live GPS watch ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation || !scheduleId) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsPermDenied(false);
        const dist = hasHospitalGps
          ? getDistance(
              { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
              { latitude: hospitalLat, longitude: hospitalLng },
            )
          : 0;
        setLiveGps({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          distance: dist,
          withinRange: !hasHospitalGps || dist <= hospitalRadius,
        });
      },
      (err) => {
        if (err.code === 1) setGpsPermDenied(true);
      },
      { enableHighAccuracy: true, maximumAge: 5000 },
    );

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleId, hospitalLat, hospitalLng, hospitalRadius, hasHospitalGps]);

  // ── Camera stop ───────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    processingRef.current = false;
  }, []);

  // ── Start from live GPS ───────────────────────────────────────────────────
  const startFromLiveGps = useCallback(() => {
    const g = liveGps;
    if (!hasHospitalGps) {
      setGpsResult({ distance: 0, withinRange: true, accuracy: 0, latitude: 0, longitude: 0 });
    } else if (g) {
      setGpsResult({ distance: g.distance, withinRange: g.withinRange, accuracy: g.accuracy, latitude: g.latitude, longitude: g.longitude });
    }
    setStep('face-loading');
    startFaceScan();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveGps, hasHospitalGps]);

  // ── GPS verification (retry) ──────────────────────────────────────────────
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
          withinRange: !hasHospitalGps || dist <= hospitalRadius,
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
          setGpsError(`You are ${result.distance}m from the hospital. You must be within ${hospitalRadius}m to time in.`);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospitalLat, hospitalLng, hospitalRadius, hasHospitalGps]);

  // ── Face scan ─────────────────────────────────────────────────────────────
  const startFaceScan = useCallback(async () => {
    setStep('face-loading');
    setFaceError(null);
    setFaceDetected(false);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('MEDIA_DEVICES_UNAVAILABLE');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      setStep('face-scanning');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'MEDIA_DEVICES_UNAVAILABLE' || msg.includes('mediaDevices')) {
        setFaceError("Camera API unavailable. Open the app in a new browser tab — camera requires a direct HTTPS connection.");
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

  // ── Face capture & verify (self) ──────────────────────────────────────────
  const captureAndVerify = useCallback(async () => {
    const vid = videoRef.current;
    if (!vid || vid.readyState < 2) {
      setFaceError('Camera is not ready. Please wait a moment and try again.');
      return;
    }
    setFaceDetected(true);
    try {
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
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('authToken') ? { Authorization: `Bearer ${localStorage.getItem('authToken')}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ descriptor }),
      });
      const data = await res.json() as { verified?: boolean; error?: string; verificationToken?: string };
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

  // ── Submit when step → 'submitting' ──────────────────────────────────────
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
          faceVerificationToken: faceVerificationToken ?? undefined,
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
          setSubmitError(err instanceof Error ? err.message : 'Failed to record time-in.');
          setStep('submit-error');
        },
      },
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    stopCamera();
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

  // ── Buddy flow helpers ────────────────────────────────────────────────────
  const startBuddyFaceScan = useCallback(async () => {
    setStep('buddy-face-loading');
    setBuddyError(null);
    setBuddyFaceDetected(false);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('MEDIA_DEVICES_UNAVAILABLE');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      setStep('buddy-face-scanning');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setBuddyError(msg.includes('mediaDevices') || msg === 'MEDIA_DEVICES_UNAVAILABLE'
        ? 'Camera API unavailable. Open the app in a new browser tab.'
        : msg.includes('Permission') || msg.includes('NotAllowed')
        ? 'Camera access denied. Allow camera permission and try again.'
        : `Camera error: ${msg}`
      );
      setStep('buddy-error');
    }
  }, []);

  const captureAndVerifyBuddy = useCallback(async () => {
    const vid = videoRef.current;
    if (!vid || vid.readyState < 2 || !buddyTarget) {
      setBuddyError('Camera is not ready. Please wait and try again.');
      return;
    }
    setBuddyFaceDetected(true);
    try {
      await loadFaceApiModels();
      const descriptor = await detectFaceDescriptor(vid);
      stopCamera();
      if (!descriptor) {
        setBuddyFaceDetected(false);
        setBuddyError('No face detected. Make sure the classmate\'s face is centred and well-lit, then try again.');
        setStep('buddy-error');
        return;
      }
      setStep('buddy-submitting');
      await buddyMutate.mutateAsync({
        scheduleId,
        targetStudentId: buddyTarget.id,
        descriptor,
        latitude: liveGps?.latitude,
        longitude: liveGps?.longitude,
      } as Parameters<typeof buddyMutate.mutateAsync>[0]);
      setBuddyDoneName(`${buddyTarget.firstName} ${buddyTarget.lastName}`);
      setStep('buddy-done');
      toast({ title: 'Buddy attendance recorded', description: `Attendance for ${buddyTarget.firstName} ${buddyTarget.lastName} has been saved.` });
      refetchAttendance();
    } catch (err) {
      stopCamera();
      setBuddyFaceDetected(false);
      const msg = err instanceof Error ? err.message : 'Verification failed.';
      setBuddyError(msg);
      setStep('buddy-error');
    }
  }, [buddyTarget, stopCamera, buddyMutate, scheduleId, liveGps, toast, refetchAttendance]);

  const resetBuddy = useCallback(() => {
    stopCamera();
    setStep(prebuddyStep);
    setBuddyTarget(null);
    setBuddyFaceDetected(false);
    setBuddyError(null);
    setBuddyDoneName(null);
  }, [stopCamera, prebuddyStep]);

  // ── Derived screen flags ──────────────────────────────────────────────────
  const isGpsScreen = ['idle', 'gps-checking', 'gps-ok', 'gps-error'].includes(step);
  const isFaceScreen = ['face-loading', 'face-scanning', 'face-ok', 'face-error', 'face-no-match', 'submitting', 'submit-error'].includes(step);
  const isBuddyScreen = ['buddy-select', 'buddy-face-loading', 'buddy-face-scanning', 'buddy-submitting', 'buddy-done', 'buddy-error'].includes(step);

  // ── Loading / enroll guard ────────────────────────────────────────────────
  if (scheduleLoading || faceLoading || attendanceLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading…
      </div>
    );
  }

  if (!isEnrolled) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
          <ScanFace className="w-10 h-10 text-amber-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Face Not Enrolled</h2>
          <p className="text-muted-foreground mt-2">You need to enroll your face before you can time in. This is a one-time setup that takes less than a minute.</p>
        </div>
        <Button size="lg" asChild><Link href="/profile/face-setup">Set Up Face Recognition</Link></Button>
      </div>
    );
  }

  if (gpsPermDenied && hasHospitalGps && step === 'idle') {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <MapPin className="w-10 h-10 text-red-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Location Access Required</h2>
          <p className="text-muted-foreground mt-2">SIPAG needs your location to verify that you are at the hospital. Please allow location access in your browser settings and reload.</p>
        </div>
        <Button onClick={() => window.location.reload()}>
          <RefreshCw className="w-4 h-4 mr-2" /> Reload & Retry
        </Button>
      </div>
    );
  }

  // ── Shared step pill ──────────────────────────────────────────────────────
  const StepPill = ({ current, total }: { current: number; total: number }) => (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i + 1 < current ? 'w-4 bg-emerald-500'
            : i + 1 === current ? 'w-6 bg-primary'
            : 'w-4 bg-muted-foreground/25'
          }`}
        />
      ))}
    </div>
  );

  // ── Shared duty info panel props ──────────────────────────────────────────
  const dutyPanelProps = {
    hospitalName,
    hospitalAddress,
    hospitalLat,
    hospitalLng,
    departmentName: deptName,
    dutyDate,
    startTime,
    endTime,
    dutyHours,
    status: scheduleStatus,
    ciFirstName,
    ciLastName,
    students: scheduleStudents,
    currentUserId,
  };

  // ════════════════════════════════════════════════════════════════════════════
  // BUDDY FLOW SCREENS
  // ════════════════════════════════════════════════════════════════════════════
  if (isBuddyScreen) {
    // ── Buddy: Select classmate ─────────────────────────────────────────────
    if (step === 'buddy-select') {
      const classmates = scheduleStudents.filter(s => s.id !== currentUserId);
      return (
        <div className="max-w-2xl mx-auto space-y-4 -mt-2">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" /> Select Classmate
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Choose the classmate whose face you will scan
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={resetBuddy}>
              ← Back
            </Button>
          </div>

          {classmates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No other classmates are assigned to this duty.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {classmates.map(s => {
                const initials = `${s.firstName?.[0] ?? '?'}${s.lastName?.[0] ?? '?'}`.toUpperCase();
                return (
                  <button
                    key={s.id}
                    className="w-full flex items-center gap-3 p-3.5 rounded-xl border bg-card hover:bg-accent hover:border-primary transition-colors text-left"
                    onClick={() => {
                      setBuddyTarget(s);
                      startBuddyFaceScan();
                    }}
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-border flex-shrink-0">
                      {s.avatarUrl ? (
                        <img src={s.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {initials}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-semibold">{s.firstName} {s.lastName}</div>
                      {s.section && <div className="text-xs text-muted-foreground">{s.section}</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            <strong>Emergency use only.</strong> Buddy attendance requires live face verification. The classmate must pass face recognition — this cannot be bypassed.
          </div>
        </div>
      );
    }

    // ── Buddy: Face scan ────────────────────────────────────────────────────
    if (step === 'buddy-face-loading' || step === 'buddy-face-scanning') {
      const isScanning = step === 'buddy-face-scanning';
      const isLoading = step === 'buddy-face-loading';
      const targetName = buddyTarget ? `${buddyTarget.firstName} ${buddyTarget.lastName}` : 'Classmate';

      return (
        <div className="max-w-2xl mx-auto space-y-0 -mt-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-primary" /> Verify Classmate
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Have <strong>{targetName}</strong> face the camera, then tap Verify
              </p>
            </div>
            <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5 shrink-0" onClick={() => { stopCamera(); setStep('buddy-select'); }}>
              <RefreshCw className="w-3.5 h-3.5" /> Back
            </Button>
          </div>

          <div className="relative rounded-2xl overflow-hidden bg-black border shadow-xl aspect-[3/4] max-h-[520px] w-full">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
              style={{ display: isScanning || buddyFaceDetected ? 'block' : 'none' }}
            />
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-zinc-950">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
                <p className="text-white/80 text-sm font-medium">Opening camera…</p>
              </div>
            )}
            {isScanning && !buddyFaceDetected && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="absolute inset-0 bg-black/30" style={{
                  maskImage: 'radial-gradient(ellipse 55% 65% at 50% 45%, transparent 70%, black 100%)',
                  WebkitMaskImage: 'radial-gradient(ellipse 55% 65% at 50% 45%, transparent 70%, black 100%)',
                }} />
                <div className="w-48 h-64 border-2 border-white/70 rounded-full" />
              </div>
            )}
            {isScanning && buddyFaceDetected && (
              <div className="absolute inset-0 bg-primary/25 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-14 h-14 text-white animate-spin" />
                <p className="text-white font-semibold text-sm">Verifying classmate's face…</p>
              </div>
            )}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full font-medium">
              {isScanning && !buddyFaceDetected ? `Have ${buddyTarget?.firstName ?? 'classmate'} face the camera`
              : buddyFaceDetected ? 'Hold still…'
              : 'Starting camera…'}
            </div>
          </div>

          <div className="pt-3 space-y-2">
            {isScanning && !buddyFaceDetected && (
              <Button size="lg" className="w-full h-14 text-base rounded-xl gap-2" onClick={captureAndVerifyBuddy}>
                <ScanFace className="w-5 h-5" /> Capture &amp; Verify Face
              </Button>
            )}
            <p className="text-xs text-muted-foreground text-center pt-1">
              <ScanFace className="w-3 h-3 inline mr-1" />
              Face matching is processed securely on the server
            </p>
          </div>
        </div>
      );
    }

    // ── Buddy: Submitting ───────────────────────────────────────────────────
    if (step === 'buddy-submitting') {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Recording attendance…
        </div>
      );
    }

    // ── Buddy: Done ─────────────────────────────────────────────────────────
    if (step === 'buddy-done') {
      return (
        <div className="max-w-md mx-auto mt-10 text-center space-y-6">
          <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <UserCheck className="w-12 h-12 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-emerald-700">Buddy Attendance Recorded</h2>
            <p className="text-muted-foreground mt-2">
              {buddyDoneName ? `Attendance for ${buddyDoneName} has been saved via buddy verification.` : 'Classmate attendance saved.'}
            </p>
          </div>
          <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-sm text-left">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Face identity verified</span>
            </div>
            <div className="flex items-center gap-2 text-amber-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Attendance recorded through verified classmate device</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={resetBuddy}>
              Attend Another Classmate
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/schedule">← Back to Schedule</Link>
            </Button>
          </div>
        </div>
      );
    }

    // ── Buddy: Error ────────────────────────────────────────────────────────
    if (step === 'buddy-error') {
      return (
        <div className="max-w-md mx-auto mt-10 text-center space-y-6">
          <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Verification Failed</h2>
            <p className="text-muted-foreground mt-2">{buddyError ?? 'Something went wrong.'}</p>
          </div>
          <div className="flex gap-3">
            <Button className="flex-1" onClick={() => { setBuddyError(null); setBuddyFaceDetected(false); setStep('buddy-select'); }}>
              <RefreshCw className="w-4 h-4 mr-2" /> Try Again
            </Button>
            <Button variant="ghost" size="sm" onClick={resetBuddy}>Cancel</Button>
          </div>
        </div>
      );
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SCREEN 1 — GPS Location Check
  // ════════════════════════════════════════════════════════════════════════════
  if (isGpsScreen) {
    return (
      <div className="max-w-2xl mx-auto space-y-0 -mt-2">
        {/* Duty Info Panel */}
        <DutyInfoPanel {...dutyPanelProps} />

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <StepPill current={1} total={2} />
              <span className="text-xs text-muted-foreground">Step 1 of 2</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Navigation className="w-5 h-5 text-primary" /> GPS Verification
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {hospitalName}{deptName ? ` · ${deptName}` : ''} · {dutyDate ? `${dutyDate}, ${startTime}–${endTime}` : 'Loading…'}
            </p>
          </div>
          {liveGps && (
            <Badge variant="outline" className="text-xs font-normal shrink-0">
              ±{liveGps.accuracy}m accuracy
            </Badge>
          )}
        </div>

        {/* Map */}
        <div className="rounded-2xl overflow-hidden border shadow-md">
          <AttendanceMap
            hospitalLat={hospitalLat}
            hospitalLng={hospitalLng}
            attendanceRadius={hospitalRadius}
            studentLat={liveGps?.latitude ?? null}
            studentLng={liveGps?.longitude ?? null}
            status={gpsZoneStatus}
          />
        </div>

        {/* Status panel */}
        <div className="pt-3 space-y-3">
          <GpsStatusPanel
            status={gpsZoneStatus}
            distance={liveGps?.distance ?? null}
            radius={hospitalRadius}
            accuracy={liveGps?.accuracy ?? null}
            hospitalName={hospitalName}
          />

          {step === 'gps-error' && gpsError && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription className="text-sm">{gpsError}</AlertDescription>
            </Alert>
          )}

          {hasHospitalGps && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${hospitalLat},${hospitalLng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <Navigation className="w-3 h-3" /> Open navigation in Google Maps
            </a>
          )}

          {step === 'gps-error' && (
            <Button
              size="lg"
              variant="outline"
              className="w-full h-14 text-base rounded-xl gap-2 mt-1"
              onClick={verifyGps}
            >
              <RefreshCw className="w-5 h-5" /> Retry GPS Check
            </Button>
          )}

          {step !== 'gps-error' && (
            <Button
              size="lg"
              className="w-full h-14 text-base rounded-xl gap-2 mt-1"
              disabled={step === 'gps-checking' || !canStartVerification}
              onClick={startFromLiveGps}
            >
              {step === 'gps-checking' ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Verifying location…</>
              ) : !canStartVerification ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Waiting for GPS signal…</>
              ) : (
                <><ScanFace className="w-5 h-5" /> Continue to Face Verification</>
              )}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SCREEN 2 — Face Verification
  // ════════════════════════════════════════════════════════════════════════════
  if (isFaceScreen) {
    const isScanning = step === 'face-scanning';
    const isLoading = step === 'face-loading';
    const isSubmitting = step === 'submitting';
    const hasError = step === 'face-error' || step === 'face-no-match' || step === 'submit-error';

    return (
      <div className="max-w-2xl mx-auto space-y-0 -mt-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <StepPill current={2} total={2} />
              <span className="text-xs text-muted-foreground">Step 2 of 2</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <ScanFace className="w-5 h-5 text-primary" /> Face Verification
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Position your face within the frame, then tap Verify
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground gap-1.5 shrink-0"
            onClick={reset}
          >
            <RefreshCw className="w-3.5 h-3.5" /> Back
          </Button>
        </div>

        {/* Camera frame */}
        <div className="relative rounded-2xl overflow-hidden bg-black border shadow-xl aspect-[3/4] max-h-[520px] w-full">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
            style={{ display: isScanning || faceDetected ? 'block' : 'none' }}
          />

          {(isLoading || isSubmitting) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-zinc-950">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <p className="text-white/80 text-sm font-medium">
                {isLoading ? 'Opening camera…' : 'Recording attendance…'}
              </p>
            </div>
          )}

          {isScanning && !faceDetected && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="absolute inset-0 bg-black/30" style={{
                maskImage: 'radial-gradient(ellipse 55% 65% at 50% 45%, transparent 70%, black 100%)',
                WebkitMaskImage: 'radial-gradient(ellipse 55% 65% at 50% 45%, transparent 70%, black 100%)',
              }} />
              <div className="w-48 h-64 border-2 border-white/70 rounded-full" />
              {(['tl','tr','bl','br'] as const).map((pos) => (
                <div
                  key={pos}
                  className="absolute w-8 h-8 border-white"
                  style={{
                    top: pos.startsWith('t') ? '14%' : undefined,
                    bottom: pos.startsWith('b') ? '14%' : undefined,
                    left: pos.endsWith('l') ? '22%' : undefined,
                    right: pos.endsWith('r') ? '22%' : undefined,
                    borderTopWidth: pos.startsWith('t') ? 3 : 0,
                    borderBottomWidth: pos.startsWith('b') ? 3 : 0,
                    borderLeftWidth: pos.endsWith('l') ? 3 : 0,
                    borderRightWidth: pos.endsWith('r') ? 3 : 0,
                    borderTopLeftRadius: pos === 'tl' ? 6 : 0,
                    borderTopRightRadius: pos === 'tr' ? 6 : 0,
                    borderBottomLeftRadius: pos === 'bl' ? 6 : 0,
                    borderBottomRightRadius: pos === 'br' ? 6 : 0,
                  }}
                />
              ))}
            </div>
          )}

          {isScanning && faceDetected && (
            <div className="absolute inset-0 bg-primary/25 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-14 h-14 text-white animate-spin" />
              <p className="text-white font-semibold text-sm tracking-wide">Verifying identity…</p>
            </div>
          )}

          {hasError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-zinc-950 px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/15 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <div>
                <p className="text-white font-semibold text-lg">
                  {step === 'face-no-match' ? 'Face Did Not Match'
                  : step === 'submit-error' ? 'Submission Failed'
                  : 'Camera Error'}
                </p>
                <p className="text-white/60 text-sm mt-1">
                  {faceError ?? submitError ?? 'Something went wrong. Please try again.'}
                </p>
              </div>
            </div>
          )}

          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full font-medium">
            {isScanning && !faceDetected ? 'Centre your face in the oval'
            : faceDetected ? 'Hold still…'
            : isLoading ? 'Starting camera'
            : isSubmitting ? 'Saving attendance'
            : hasError ? 'Tap below to try again'
            : ''}
          </div>
        </div>

        {/* Action buttons */}
        <div className="pt-3 space-y-2">
          {isScanning && !faceDetected && (
            <Button size="lg" className="w-full h-14 text-base rounded-xl gap-2" onClick={captureAndVerify}>
              <ScanFace className="w-5 h-5" /> Capture &amp; Verify Face
            </Button>
          )}

          {(step === 'face-error' || step === 'face-no-match') && (
            <div className="flex gap-2">
              <Button size="lg" className="flex-1 h-12 rounded-xl gap-2" onClick={() => startFaceScan()}>
                <RefreshCw className="w-4 h-4" /> Try Again
              </Button>
              {step === 'face-no-match' && (
                <Button size="lg" variant="outline" className="flex-1 h-12 rounded-xl" asChild>
                  <Link href="/profile/face-setup">Re-enroll Face</Link>
                </Button>
              )}
            </div>
          )}

          {step === 'submit-error' && (
            <Button size="lg" className="w-full h-12 rounded-xl gap-2" onClick={reset}>
              <RefreshCw className="w-4 h-4" /> Start Over
            </Button>
          )}

          <p className="text-xs text-muted-foreground text-center pt-1">
            <ScanFace className="w-3 h-3 inline mr-1" />
            Face matching is processed securely on the server
          </p>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SCREEN 3 — Done / Timed Out
  // ════════════════════════════════════════════════════════════════════════════
  if (isDoneScreen) {
    const isTimedOut = step === 'timed-out';
    return (
      <div className="max-w-md mx-auto mt-6 space-y-5">
        {/* Attendance confirmation */}
        <div className="text-center space-y-4">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto ${isTimedOut ? 'bg-blue-100' : 'bg-emerald-100'}`}>
            {isTimedOut
              ? <Clock className="w-12 h-12 text-blue-600" />
              : <CheckCircle2 className="w-12 h-12 text-emerald-600" />}
          </div>
          <div>
            <h2 className={`text-2xl font-bold ${isTimedOut ? 'text-blue-700' : 'text-emerald-700'}`}>
              {isTimedOut ? 'Duty Complete' : 'Verified & Timed In'}
            </h2>
            <p className="text-muted-foreground mt-2">
              {isTimedOut && timeInAt && timeOutAt
                ? `Time in: ${timeInAt} · Time out: ${timeOutAt}`
                : isTimedOut && timeOutAt
                ? `Time out recorded at ${timeOutAt}`
                : timeInAt
                ? `Attendance recorded at ${timeInAt}`
                : 'Your attendance has been saved.'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {hospitalName}{deptName ? ` · ${deptName}` : ''}
            </p>
          </div>
        </div>

        {/* Verification recap */}
        <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>GPS location verified within {hospitalRadius}m</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Face identity confirmed</span>
          </div>
          {isTimedOut && (
            <div className="flex items-center gap-2 text-blue-700">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Duty hours recorded</span>
            </div>
          )}
        </div>

        {/* Time Out button */}
        {!isTimedOut && (
          <Button
            size="lg"
            variant="outline"
            className="w-full h-14 text-base rounded-xl gap-2 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
            disabled={recordTimeOut.isPending}
            onClick={() => {
              recordTimeOut.mutate(
                { data: { scheduleId, gpsVerified: true, faceVerified: true, livenessVerified: true } },
                {
                  onSuccess: (record) => {
                    setStep('timed-out');
                    if (record.timeOut) {
                      setTimeOutAt(new Date(record.timeOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                    }
                    toast({ title: 'Time-out recorded', description: 'Your duty hours have been saved.' });
                  },
                  onError: (err: unknown) => {
                    toast({
                      title: 'Time-out failed',
                      description: err instanceof Error ? err.message : 'Please try again.',
                      variant: 'destructive',
                    });
                  },
                },
              );
            }}
          >
            {recordTimeOut.isPending
              ? <><Loader2 className="w-5 h-5 animate-spin" /> Recording time-out…</>
              : <><LogOut className="w-5 h-5" /> Time Out</>}
          </Button>
        )}

        {/* Why was I assigned? */}
        <WhyAssignedSection scheduleId={scheduleId} />

        {/* Buddy Attendance */}
        {buddyEligibility?.eligible && (
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold">Attend a Classmate</p>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">Emergency Only</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              For emergency situations only (no internet, low battery, broken phone). Your classmate must pass live face verification — this cannot be skipped.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => {
                setPrebuddyStep(step as 'done' | 'timed-out');
                setStep('buddy-select');
              }}
            >
              <UserCheck className="w-4 h-4" />
              Help a Classmate Time In
            </Button>
          </div>
        )}

        <Button variant="ghost" size="sm" className="w-full" asChild>
          <Link href="/schedule">← Back to Schedule</Link>
        </Button>
      </div>
    );
  }

  return null;
}
