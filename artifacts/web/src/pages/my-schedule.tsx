import { useMemo } from 'react';
import { Link } from 'wouter';
import { Calendar, Clock, MapPin, User, LogIn, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useListSchedules, useListAttendance } from '@workspace/api-client-react';
import type { Schedule, AttendanceRecord } from '@workspace/api-client-react';

type ScheduleStatus = 'upcoming' | 'active' | 'completed' | 'cancelled';

const statusConfig: Record<ScheduleStatus, { label: string; className: string }> = {
  upcoming: { label: 'Upcoming', className: 'bg-blue-100 text-blue-700' },
  active: { label: 'Active', className: 'bg-emerald-500 text-white' },
  completed: { label: 'Completed', className: '' },
  cancelled: { label: 'Cancelled', className: '' },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
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
  if (record.status === 'absent') {
    return <Badge variant="destructive">Absent</Badge>;
  }
  return null;
}

function ScheduleCard({ schedule, attendanceRecord }: { schedule: Schedule; attendanceRecord?: AttendanceRecord }) {
  const status = (schedule.status as ScheduleStatus) ?? 'upcoming';
  const config = statusConfig[status] ?? statusConfig.upcoming;
  const canTimeIn = status === 'active' || status === 'upcoming';
  const alreadyTimedIn = !!attendanceRecord?.timeIn;

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
            {/* Attendance status takes priority over schedule status when present */}
            <AttendanceBadge record={attendanceRecord} />
            {!attendanceRecord && (
              config.className
                ? <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${config.className}`}>{config.label}</span>
                : <Badge variant={status === 'cancelled' ? 'destructive' : 'outline'}>{config.label}</Badge>
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
        {canTimeIn && (
          <div className="flex justify-end pt-1">
            <Link href={`/schedule/${schedule.id}`}>
              <Button size="sm" variant={alreadyTimedIn ? 'outline' : 'default'} className="gap-2">
                <LogIn className="h-4 w-4" />
                {alreadyTimedIn ? 'View Duty' : 'View & Time In'}
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function MySchedulePage() {
  const { data: schedules, isLoading, isError } = useListSchedules(undefined, {
    query: { staleTime: 60_000 } as never,
  });

  const { data: attendanceRecords = [] } = useListAttendance(undefined, {
    query: { staleTime: 30_000, refetchOnMount: true } as never,
  });

  // Map scheduleId → most-recent attendance record for this student
  const attendanceMap = useMemo(() => {
    const m = new Map<string, AttendanceRecord>();
    [...attendanceRecords].reverse().forEach((r: AttendanceRecord) => m.set(r.scheduleId, r));
    return m;
  }, [attendanceRecords]);

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
  const upcoming = all.filter(s => s.status === 'upcoming' || s.status === 'active');
  const past = all.filter(s => s.status === 'completed' || s.status === 'cancelled');

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
          <TabsTrigger value="past">Past</TabsTrigger>
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
            upcoming.map(s => <ScheduleCard key={s.id} schedule={s} attendanceRecord={attendanceMap.get(s.id)} />)
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
            past.map(s => <ScheduleCard key={s.id} schedule={s} attendanceRecord={attendanceMap.get(s.id)} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
