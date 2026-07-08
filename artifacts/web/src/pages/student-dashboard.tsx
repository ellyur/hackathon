import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, CheckCircle2, AlertCircle, FileCheck, ArrowRight, Loader2, ScanFace, Calendar } from 'lucide-react';
import { Link } from 'wouter';
import { useListSchedules, useGetMyFaceDescriptor, useListAttendance, useGetStudentHours } from '@workspace/api-client-react';
import { useAuth } from '@/hooks/use-auth';
import type { AuthUser } from '@workspace/api-client-react';
import type { Schedule } from '@workspace/api-client-react';

function formatTime(t: string): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function StudentDashboard() {
  const { user: rawUser } = useAuth();
  const user = rawUser as AuthUser | undefined;

  const { data: schedules, isLoading: schedulesLoading } = useListSchedules(undefined, {
    query: { staleTime: 60_000 } as never,
  });

  const { data: faceData } = useGetMyFaceDescriptor({
    query: { staleTime: 60_000 } as never,
  });

  const { data: attendance = [] } = useListAttendance(undefined, {
    query: { staleTime: 30_000, refetchOnMount: true } as never,
  });

  const userId = user?.id ?? '';
  const { data: hoursData } = useGetStudentHours(userId, {
    query: { enabled: !!userId, staleTime: 30_000 } as never,
  });

  const isEnrolled = faceData?.enrolled === true;

  // Schedules the student has already timed in for should not appear as
  // "upcoming" even if the schedule row itself is still active/upcoming —
  // the schedule status reflects the shift as a whole, not this student's
  // individual attendance for it.
  const attendedScheduleIds = new Set(
    attendance.map((r: { scheduleId: string }) => r.scheduleId),
  );

  const upcoming = (schedules ?? []).filter(
    (s: Schedule) =>
      (s.status === 'active' || s.status === 'upcoming') && !attendedScheduleIds.has(s.id),
  );
  const nextDuty: Schedule | undefined = upcoming[0];

  const presentCount  = attendance.filter((r: { status: string }) => r.status === 'present').length;
  const lateCount     = attendance.filter((r: { status: string }) => r.status === 'late').length;
  const hoursCompleted = hoursData?.totalHoursCompleted ?? 0;
  const hoursRequired  = hoursData?.totalHoursRequired  ?? 500;
  const progressPct    = hoursData?.progressPercent      ?? 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Welcome back{user ? `, ${user.firstName}` : ''}
          </h2>
          <p className="text-muted-foreground mt-1">Here's your clinical rotation overview for today.</p>
        </div>
        <Button asChild>
          <Link href="/slots">Browse Open Slots</Link>
        </Button>
      </div>

      {/* Face enrollment banner */}
      {!isEnrolled && (
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900">
          <div className="flex items-center gap-3">
            <ScanFace className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-medium text-sm">Face not enrolled</p>
              <p className="text-xs text-amber-700 mt-0.5">You need to set up face recognition before you can time in for attendance.</p>
            </div>
          </div>
          <Button size="sm" asChild className="shrink-0 bg-amber-600 hover:bg-amber-700">
            <Link href="/profile/face-setup">Set Up Now</Link>
          </Button>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Next Duty Card */}
        <Card className="col-span-full lg:col-span-1 border-primary/20 shadow-sm relative overflow-hidden bg-primary/5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-full -mr-8 -mt-8" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Clock className="w-5 h-5" />
              Next Duty
            </CardTitle>
            {nextDuty ? (
              <CardDescription>
                {nextDuty.dutyDate}, {formatTime(nextDuty.startTime)} – {formatTime(nextDuty.endTime)}
              </CardDescription>
            ) : (
              <CardDescription>No upcoming duties</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {schedulesLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </div>
            ) : nextDuty ? (
              <>
                <div className="space-y-2">
                  <div className="font-semibold text-lg">
                    {nextDuty.department?.name ?? nextDuty.title ?? 'Clinical Rotation'}
                  </div>
                  <div className="text-sm flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    {nextDuty.hospital?.name ?? 'Hospital'}
                  </div>
                  {nextDuty.ci && (
                    <div className="text-sm flex items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4" />
                      CI: {nextDuty.ci.firstName} {nextDuty.ci.lastName}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button className="w-full" asChild disabled={!isEnrolled}>
                    <Link href={`/schedule/${nextDuty.id}`}>Time In</Link>
                  </Button>
                </div>
                {!isEnrolled && (
                  <p className="text-xs text-amber-600 text-center">Set up face recognition first</p>
                )}
              </>
            ) : (
              <div className="py-4 text-center text-muted-foreground text-sm">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                No upcoming duties scheduled.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Passport Progress — kept as summary; real data comes from /passport page */}
        <Card className="col-span-full md:col-span-1 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Clinical Passport</CardTitle>
            <CardDescription>Overall completion</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mt-2 flex items-center justify-center">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" r="56" fill="none" stroke="currentColor" strokeWidth="12" className="text-muted" />
                  <circle
                    cx="64" cy="64" r="56"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="12"
                    strokeDasharray="351.85"
                    strokeDashoffset={351.85 * (1 - 0.65)}
                    className="text-primary transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold">65%</span>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-between text-sm text-muted-foreground">
              <div className="text-center">
                <div className="font-medium text-foreground">26</div>
                <div>Completed</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-foreground">40</div>
                <div>Required</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hours Progress */}
        <Card className="col-span-full md:col-span-1 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Duty Hours</CardTitle>
            <CardDescription>{hoursCompleted.toFixed(1)} / {hoursRequired} hours completed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="pt-2">
              <Progress value={progressPct} className="h-3" />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-1 p-3 rounded-lg bg-muted/50">
                <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Present
                </div>
                <div className="text-2xl font-bold">{presentCount}</div>
              </div>
              <div className="space-y-1 p-3 rounded-lg bg-muted/50">
                <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  Late
                </div>
                <div className="text-2xl font-bold">{lateCount}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Pending Case Verifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { title: 'Normal Spontaneous Delivery', status: 'Pending CI Review', date: 'Oct 12' },
                { title: 'IV Insertion', status: 'Pending CI Review', date: 'Oct 10' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <FileCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{item.title}</div>
                      <div className="text-xs text-muted-foreground">{item.status} • {item.date}</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link href="/passport">View Full Passport</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">My Schedule</CardTitle>
            <CardDescription>{upcoming.length} upcoming {upcoming.length === 1 ? 'duty' : 'duties'}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcoming.slice(0, 2).map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  <div>
                    <div className="font-medium text-sm">{s.department?.name ?? s.title ?? 'Rotation'}</div>
                    <div className="text-xs text-muted-foreground">{s.hospital?.name ?? 'Hospital'} • {s.dutyDate}</div>
                  </div>
                  <Button size="sm" asChild>
                    <Link href={`/schedule/${s.id}`}>Time In</Link>
                  </Button>
                </div>
              ))}
              {upcoming.length === 0 && !schedulesLoading && (
                <p className="text-sm text-center text-muted-foreground py-4">No upcoming duties.</p>
              )}
            </div>
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link href="/schedule">View All Schedules</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

