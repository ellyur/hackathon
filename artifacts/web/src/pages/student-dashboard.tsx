import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, CheckCircle2, AlertCircle, ArrowRight, Loader2, ScanFace, Calendar, CalendarDays, ClipboardCheck, FileCheck } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useListSchedules, useGetMyFaceDescriptor, useListAttendance } from '@workspace/api-client-react';
import { useAuth } from '@/hooks/use-auth';
import type { AuthUser } from '@workspace/api-client-react';
import type { Schedule, AttendanceRecord } from '@workspace/api-client-react';
import { useQuery } from '@tanstack/react-query';
import { useListDutyVerifications, useRequestDutyVerification } from '@/hooks/use-duty-verifications';
import { useToast } from '@/hooks/use-toast';

function getAuthToken() { return localStorage.getItem('authToken'); }
async function apiFetch<T>(path: string): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(path, { headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: 'include' });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
  return res.json();
}

interface WardCase { status: 'complete' | 'in_progress' | 'deficient'; required: number; verified: number; }
interface WardProgress { requiredCases: WardCase[]; }
interface StudentPassport {
  totalDutyDaysRequired: number;
  totalDutyDaysCompleted: number;
  overallCompletion: number;
  wards: WardProgress[];
  earnedDutyHours: number;
  requiredDutyHours: number;
  dutyHoursCompletion: number;
}

function formatTime(t: string): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function verificationStatusBadge(status: string) {
  switch (status) {
    case 'waiting_ci': return <Badge variant="secondary" className="text-xs">Waiting for CI</Badge>;
    case 'pending_scheduler': return <Badge variant="warning" className="text-xs">Pending Scheduler</Badge>;
    case 'officially_verified': return <Badge variant="success" className="text-xs">Verified ✓</Badge>;
    default: return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
}

export function StudentDashboard() {
  const { user: rawUser } = useAuth();
  const user = rawUser as AuthUser | undefined;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [requestingFor, setRequestingFor] = useState<string | null>(null);

  const { data: schedules, isLoading: schedulesLoading } = useListSchedules(undefined, {
    query: { staleTime: 60_000, refetchOnMount: true } as never,
  });

  const { data: faceData } = useGetMyFaceDescriptor({
    query: { staleTime: 60_000 } as never,
  });

  const { data: attendance = [] } = useListAttendance(undefined, {
    query: { staleTime: 30_000, refetchOnMount: true } as never,
  });

  const userId = user?.id ?? '';

  const { data: passport } = useQuery<StudentPassport>({
    queryKey: ['student-passport', userId],
    queryFn: () => apiFetch(`/api/students/${userId}/passport`),
    enabled: !!userId,
    staleTime: 30_000,
  });

  const { data: myVerifications = [] } = useListDutyVerifications();
  const requestVerification = useRequestDutyVerification();

  // Slot applications
  const { data: myApplications = [] } = useQuery<any[]>({
    queryKey: ['my-slot-applications'],
    queryFn: () => apiFetch('/api/slots/my-applications'),
    staleTime: 30_000,
    refetchOnMount: true,
  });
  const pendingApplications = myApplications.filter((a: any) => a.status === 'pending');

  async function handleRequestVerification(scheduleId: string, attendanceId: string) {
    setRequestingFor(scheduleId);
    try {
      const created = await requestVerification.mutateAsync({ scheduleId, attendanceId });
      toast({ title: 'Verification Requested ✓', description: 'Your Clinical Instructor has been notified.' });
      setLocation(`/duty-verifications/${created.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to request verification';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setRequestingFor(null);
    }
  }

  const isEnrolled = faceData?.enrolled === true;

  const attendedScheduleIds = new Set(
    attendance.map((r: { scheduleId: string }) => r.scheduleId),
  );

  const all = schedules ?? [];
  const upcoming = all.filter(
    (s: Schedule) =>
      (s.status === 'active' || s.status === 'upcoming') && !attendedScheduleIds.has(s.id),
  );
  const nextDuty: Schedule | undefined = upcoming[0];

  // Attended/completed duties where student can request verification
  const attendanceMap = new Map<string, AttendanceRecord>();
  for (const r of attendance as AttendanceRecord[]) attendanceMap.set(r.scheduleId, r);

  const verificationByAttendanceId = new Map(myVerifications.map((v: any) => [v.attendanceId, v]));

  const attendedDuties = all
    .filter((s: Schedule) => attendedScheduleIds.has(s.id))
    .slice(0, 3); // show most recent 3

  const presentCount  = attendance.filter((r: { status: string }) => r.status === 'present').length;
  const lateCount     = attendance.filter((r: { status: string }) => r.status === 'late').length;

  const totalDays = passport?.totalDutyDaysRequired ?? 0;
  const completedDays = passport?.totalDutyDaysCompleted ?? 0;
  const earnedHours = passport?.earnedDutyHours ?? 0;
  const requiredHours = passport?.requiredDutyHours ?? 0;
  const hoursPct = passport?.dutyHoursCompletion ?? 0;

  // Case-type stats from wards (matches what the full passport page shows)
  const allWardCases = (passport?.wards ?? []).flatMap(w => w.requiredCases);
  const totalCaseTypes = allWardCases.length;
  const completedCaseTypes = allWardCases.filter(c => c.status === 'complete').length;
  const totalCaseInstances = allWardCases.reduce((s, c) => s + c.required, 0);
  const verifiedCaseInstances = allWardCases.reduce((s, c) => s + c.verified, 0);
  const casesPct = totalCaseInstances > 0 ? Math.round(verifiedCaseInstances / totalCaseInstances * 100) : 0;
  const overallPct = totalCaseTypes > 0 ? casesPct : Math.round((passport?.overallCompletion ?? 0) * 100);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
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

        {/* Clinical Passport Summary */}
        <Card className="col-span-full md:col-span-1 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Clinical Passport</CardTitle>
            <CardDescription>Overall case completion</CardDescription>
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
                    strokeDashoffset={351.85 * (1 - overallPct / 100)}
                    className="text-primary transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold">{overallPct}%</span>
                </div>
              </div>
            </div>
            {/* Clinical Hours Progress Bar */}
            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Clinical Hours</span>
                <span className="font-semibold tabular-nums">
                  {earnedHours}h
                  <span className="text-muted-foreground font-normal"> / {requiredHours}h</span>
                </span>
              </div>
              <Progress value={hoursPct} className="h-3" />
              <p className="text-xs text-muted-foreground text-right">
                {hoursPct}% complete · {Math.max(0, requiredHours - earnedHours)}h remaining
              </p>
            </div>

            <div className="mt-4 space-y-2">
              {/* Case types row */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Case Types</span>
                <span className="font-semibold">
                  {completedCaseTypes}
                  <span className="text-muted-foreground font-normal"> / {totalCaseTypes}</span>
                  <span className="text-muted-foreground font-normal ml-1 text-xs">completed</span>
                </span>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link href="/passport">View Full Passport</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Slot Applications Status */}
        {myApplications.length > 0 && (
          <Card className="col-span-full md:col-span-1 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                Slot Applications
              </CardTitle>
              <CardDescription>Status of your duty slot requests</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {myApplications.slice(0, 4).map((app: any) => (
                <div key={app.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-card text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-xs">{app.dutyDate ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{app.startTime && app.endTime ? `${app.startTime} – ${app.endTime}` : '—'}</p>
                  </div>
                  {app.status === 'pending' && (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs shrink-0">Pending</Badge>
                  )}
                  {app.status === 'approved' && (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs shrink-0">Approved ✓</Badge>
                  )}
                  {app.status === 'rejected' && (
                    <Badge variant="destructive" className="text-xs shrink-0">Rejected</Badge>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                <Link href="/slots/my-applications">View All Applications</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Attendance Stats */}
        <Card className="col-span-full md:col-span-1 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Attendance</CardTitle>
            <CardDescription>Your duty attendance record</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="pt-2">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Attendance Rate</span>
                <span className="font-semibold">
                  {attendance.length > 0 ? Math.round((presentCount + lateCount) / attendance.length * 100) : 0}%
                </span>
              </div>
              <Progress
                value={attendance.length > 0 ? (presentCount + lateCount) / attendance.length * 100 : 0}
                className="h-3"
              />
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
        {/* Attended Duties — Request Verification */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-primary" />
              Duty Verifications
            </CardTitle>
            <CardDescription>Request verification for completed duties</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {attendedDuties.length === 0 ? (
                <p className="text-sm text-center text-muted-foreground py-4">No attended duties yet.</p>
              ) : (
                attendedDuties.map((s: Schedule) => {
                  const rec = attendanceMap.get(s.id);
                  if (!rec) return null;
                  const existingVerif = verificationByAttendanceId.get(rec.id) as any;
                  return (
                    <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <FileCheck className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">
                            {s.department?.name ?? s.title ?? 'Clinical Rotation'}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {s.hospital?.name ?? ''} • {s.dutyDate}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 ml-2">
                        {existingVerif ? (
                          <Link href={`/duty-verifications/${existingVerif.id}`}>
                            <Button variant="ghost" size="sm" className="gap-1 text-xs">
                              {verificationStatusBadge(existingVerif.status)}
                            </Button>
                          </Link>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs gap-1"
                            disabled={requestingFor === s.id}
                            onClick={() => {
                              const rec = attendanceMap.get(s.id);
                              if (rec) handleRequestVerification(s.id, rec.id);
                            }}
                          >
                            {requestingFor === s.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <>Request <ArrowRight className="w-3 h-3" /></>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link href="/schedule">View All Schedules</Link>
            </Button>
          </CardContent>
        </Card>

        {/* My Schedule */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">
              <span className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                My Schedule
              </span>
            </CardTitle>
            <CardDescription>{upcoming.length} upcoming {upcoming.length === 1 ? 'duty' : 'duties'}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcoming.slice(0, 2).map((s: Schedule) => (
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
