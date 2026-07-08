import { useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Calendar, Clock, MapPin, User, LogIn, Loader2, CheckCircle2, AlertCircle, ClipboardCheck, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useListSchedules, useListAttendance } from '@workspace/api-client-react';
import type { Schedule, AttendanceRecord } from '@workspace/api-client-react';
import { useListDutyVerifications, useRequestDutyVerification } from '@/hooks/use-duty-verifications';

type ScheduleStatus = 'upcoming' | 'active' | 'completed' | 'cancelled';

const statusConfig: Record<ScheduleStatus, { label: string; variant: 'upcoming' | 'success' | 'completed' | 'cancelled' | 'outline' }> = {
  upcoming: { label: 'Upcoming', variant: 'upcoming' },
  active: { label: 'Active', variant: 'success' },
  completed: { label: 'Completed', variant: 'completed' },
  cancelled: { label: 'Cancelled', variant: 'cancelled' },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString([], {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

function formatTime(t: string): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function durationLabel(start: string | undefined, end: string | undefined): string | null {
  if (!start || !end) return null;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins <= 0) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `+${h}h` : `+${h}h ${m}m`;
}

function AttendanceBadge({ record }: { record: AttendanceRecord | undefined }) {
  if (!record) return null;
  if (record.status === 'present') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
        <CheckCircle2 className="h-3 w-3" /> Present
      </span>
    );
  }
  if (record.status === 'late') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
        <AlertCircle className="h-3 w-3" /> Late
      </span>
    );
  }
  if (record.status === 'absent') return <Badge variant="destructive">Absent</Badge>;
  return null;
}

function verificationStatusBadge(status: string) {
  switch (status) {
    case 'waiting_ci':
      return <Badge variant="secondary" className="text-xs">Waiting for CI</Badge>;
    case 'pending_scheduler':
      return <Badge variant="warning" className="text-xs">Pending Scheduler</Badge>;
    case 'officially_verified':
      return <Badge variant="success" className="text-xs">Verified ✓</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
}

function ScheduleCard({
  schedule,
  attendanceRecord,
  existingVerification,
  onRequestVerification,
  isRequesting,
}: {
  schedule: Schedule;
  attendanceRecord?: AttendanceRecord;
  existingVerification?: any;
  onRequestVerification?: () => void;
  isRequesting?: boolean;
}) {
  const status = (schedule.status as ScheduleStatus) ?? 'upcoming';
  const config = statusConfig[status] ?? statusConfig.upcoming;
  const canTimeIn = status === 'active' || status === 'upcoming';
  const alreadyTimedIn = !!attendanceRecord?.timeIn;
  const isPast = status === 'completed';
  const hasAttendance = !!attendanceRecord;

  const hospitalName = schedule.hospital?.name ?? 'Hospital';
  const deptName = schedule.department?.name ?? '';
  const ciName = schedule.ci ? `${schedule.ci.firstName} ${schedule.ci.lastName}` : 'Clinical Instructor';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-base">{hospitalName}</h3>
            {deptName && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="h-3.5 w-3.5" />
                {deptName}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {durationLabel(schedule.startTime, schedule.endTime) && (
              <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                {durationLabel(schedule.startTime, schedule.endTime)}
              </span>
            )}
            <AttendanceBadge record={attendanceRecord} />
            {!attendanceRecord && (
              <Badge variant={config.variant}>{config.label}</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span>{schedule.dutyDate ? formatDate(schedule.dutyDate) : '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <span>{schedule.startTime ? `${formatTime(schedule.startTime)} – ${formatTime(schedule.endTime)}` : '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4 flex-shrink-0" />
            <span>{ciName}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
          {canTimeIn && (
            <Link href={`/schedule/${schedule.id}`}>
              <Button size="sm" variant={alreadyTimedIn ? 'outline' : 'default'} className="gap-2">
                <LogIn className="h-4 w-4" />
                {alreadyTimedIn ? 'View Duty' : 'View & Time In'}
              </Button>
            </Link>
          )}

          {/* Request Duty Verification — shown on past duties where student attended */}
          {isPast && hasAttendance && (
            <div className="flex items-center gap-2">
              {existingVerification ? (
                <Link href={`/duty-verifications/${existingVerification.id}`}>
                  <Button variant="outline" size="sm" className="gap-2">
                    <ClipboardCheck className="h-4 w-4" />
                    View Verification
                    {verificationStatusBadge(existingVerification.status)}
                  </Button>
                </Link>
              ) : (
                <Button
                  size="sm"
                  variant="default"
                  className="gap-2"
                  onClick={onRequestVerification}
                  disabled={isRequesting}
                >
                  {isRequesting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ClipboardCheck className="h-4 w-4" />
                  )}
                  Request Duty Verification
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function MySchedulePage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [requestingFor, setRequestingFor] = useState<string | null>(null);

  const { data: schedules, isLoading, isError } = useListSchedules(undefined, {
    query: { staleTime: 60_000 } as never,
  });

  const { data: attendanceRecords = [] } = useListAttendance(undefined, {
    query: { staleTime: 30_000, refetchOnMount: true } as never,
  });

  const { data: myVerifications = [] } = useListDutyVerifications();
  const requestVerification = useRequestDutyVerification();

  // Map scheduleId → attendance record
  const attendanceMap = useMemo(() => {
    const m = new Map<string, AttendanceRecord>();
    [...attendanceRecords].reverse().forEach((r: AttendanceRecord) => m.set(r.scheduleId, r));
    return m;
  }, [attendanceRecords]);

  // Map attendanceId → verification
  const verifByAttendanceId = useMemo(() => {
    const m = new Map<string, any>();
    for (const v of myVerifications as any[]) m.set(v.attendanceId, v);
    return m;
  }, [myVerifications]);

  async function handleRequestVerification(schedule: Schedule) {
    const rec = attendanceMap.get(schedule.id);
    if (!rec) return;
    setRequestingFor(schedule.id);
    try {
      const created = await requestVerification.mutateAsync({
        scheduleId: schedule.id,
        attendanceId: rec.id,
      });
      toast({
        title: 'Verification Requested ✓',
        description: 'Your Clinical Instructor has been notified.',
      });
      setLocation(`/duty-verifications/${created.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to request verification';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setRequestingFor(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading schedules…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64 text-destructive gap-2">
        Failed to load schedules. Please try again.
      </div>
    );
  }

  const all = schedules ?? [];
  const upcoming = all.filter((s: Schedule) => s.status === 'upcoming' || s.status === 'active');
  const past = all.filter((s: Schedule) => s.status === 'completed' || s.status === 'cancelled');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">My Schedule</h2>
        <p className="text-muted-foreground mt-1">View your assigned clinical duty schedules.</p>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming
            {upcoming.length > 0 && (
              <span className="ml-2 bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5">
                {upcoming.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="past">
            Past
            {past.length > 0 && (
              <span className="ml-2 bg-muted text-muted-foreground text-xs rounded-full px-1.5 py-0.5">
                {past.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4 space-y-4">
          {upcoming.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No upcoming schedules</h3>
                <p className="text-muted-foreground mt-1">Check back later or apply for an available slot.</p>
              </CardContent>
            </Card>
          ) : (
            upcoming.map((s: Schedule) => (
              <ScheduleCard
                key={s.id}
                schedule={s}
                attendanceRecord={attendanceMap.get(s.id)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-4 space-y-4">
          {past.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No past schedules</h3>
                <p className="text-muted-foreground mt-1">Completed duties will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            past.map((s: Schedule) => {
              const rec = attendanceMap.get(s.id);
              const verif = rec ? verifByAttendanceId.get(rec.id) : undefined;
              return (
                <ScheduleCard
                  key={s.id}
                  schedule={s}
                  attendanceRecord={rec}
                  existingVerification={verif}
                  onRequestVerification={() => handleRequestVerification(s)}
                  isRequesting={requestingFor === s.id}
                />
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
