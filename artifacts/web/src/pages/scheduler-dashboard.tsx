import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Users, Calendar, Clock, ArrowRight, Loader2, CheckCircle2, MapPin, ClipboardCheck, UserCheck } from 'lucide-react';
import { Link } from 'wouter';
import { useListSchedules } from '@workspace/api-client-react';
import type { Schedule } from '@workspace/api-client-react';
import { useListDutyVerifications } from '@/hooks/use-duty-verifications';
import { useQuery } from '@tanstack/react-query';

function getAuthToken() { return localStorage.getItem('authToken'); }
async function apiFetch<T>(path: string): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(path, { headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: 'include' });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
  return res.json();
}

interface Analytics {
  totalStudents: number;
  totalClinicalInstructors: number;
  totalHospitals: number;
  attendanceRate: number;
  completionRate: number;
}

function formatTime(t: string): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function SchedulerDashboard() {
  const today = todayStr();

  const { data: allSchedules = [], isLoading: loadingSchedules } = useListSchedules(undefined, {
    query: { staleTime: 60_000 } as never,
  });

  const { data: pendingVerifications = [], isLoading: loadingVerifs } = useListDutyVerifications('pending_scheduler');

  const { data: analytics } = useQuery<Analytics>({
    queryKey: ['analytics-overview'],
    queryFn: () => apiFetch('/api/analytics/overview'),
    staleTime: 5 * 60_000,
  });

  const schedules = allSchedules as Schedule[];

  // Today's duties (active and upcoming with today's date)
  const todayDuties = useMemo(() =>
    schedules.filter((s: Schedule) =>
      s.dutyDate === today && (s.status === 'active' || s.status === 'upcoming')
    ),
    [schedules, today]
  );

  // Upcoming (future dates)
  const upcomingDuties = useMemo(() =>
    schedules.filter((s: Schedule) =>
      s.dutyDate > today && s.status === 'upcoming'
    ).slice(0, 5),
    [schedules, today]
  );

  // Completed today
  const completedToday = useMemo(() =>
    schedules.filter((s: Schedule) =>
      s.dutyDate === today && s.status === 'completed'
    ).length,
    [schedules, today]
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Scheduler Dashboard</h2>
          <p className="text-muted-foreground mt-1">
            {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link href="/slots/create">Create Duty Slot</Link></Button>
          <Button asChild><Link href="/schedules/create">New Schedule</Link></Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Duties</CardTitle>
            <Calendar className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loadingSchedules
              ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              : <>
                <div className="text-2xl font-bold">{todayDuties.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {completedToday} completed today
                </p>
              </>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming</CardTitle>
            <Users className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loadingSchedules
              ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              : <>
                <div className="text-2xl font-bold">{upcomingDuties.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Scheduled this week</p>
              </>}
          </CardContent>
        </Card>

        <Card className={pendingVerifications.length > 0 ? 'border-amber-200 bg-amber-50/30' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Verifications</CardTitle>
            <ClipboardCheck className={`w-4 h-4 ${pendingVerifications.length > 0 ? 'text-amber-500' : 'text-primary'}`} />
          </CardHeader>
          <CardContent>
            {loadingVerifs
              ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              : <>
                <div className={`text-2xl font-bold ${pendingVerifications.length > 0 ? 'text-amber-600' : ''}`}>
                  {pendingVerifications.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Awaiting paper docs + confirmation</p>
              </>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
            <UserCheck className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalStudents ?? '—'}</div>
            <p className="text-xs text-muted-foreground mt-1">Enrolled in the system</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Today's Duty Roster */}
        <Card className="col-span-full lg:col-span-2">
          <CardHeader>
            <CardTitle>Today's Active Duties</CardTitle>
            <CardDescription>Clinical duties scheduled for {new Date().toLocaleDateString([], { month: 'long', day: 'numeric' })}</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingSchedules ? (
              <div className="flex items-center gap-2 py-6 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading schedules…
              </div>
            ) : todayDuties.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-sm gap-2">
                <Calendar className="w-8 h-8 opacity-30" />
                <span>No active duties today.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {todayDuties.map((duty: Schedule) => {
                  const studentCount = (duty as any).studentIds?.length ?? (duty as any).assignedStudents ?? 0;
                  return (
                    <div key={duty.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {(duty as any).hospital?.name ?? 'Hospital'} — {(duty as any).department?.name ?? 'Ward'}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-3 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatTime(duty.startTime)} – {formatTime(duty.endTime)}
                          </span>
                          {(duty as any).ci && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {(duty as any).ci.firstName} {(duty as any).ci.lastName}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {studentCount > 0 && (
                          <span className="text-xs font-medium text-muted-foreground">
                            {studentCount} student{studentCount !== 1 ? 's' : ''}
                          </span>
                        )}
                        <Badge variant={duty.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                          {duty.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link href="/schedules">View Master Schedule</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Pending Verifications */}
          <Card className="border-amber-200/60">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-amber-500" />
                Duty Verifications
              </CardTitle>
              <CardDescription>Need your confirmation</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingVerifs ? (
                <div className="flex items-center gap-2 text-muted-foreground py-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                </div>
              ) : pendingVerifications.length === 0 ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  All caught up!
                </div>
              ) : (
                <div className="space-y-2">
                  {(pendingVerifications as any[]).slice(0, 3).map(v => (
                    <Link key={v.id} href={`/duty-verifications/${v.id}`}>
                      <div className="flex items-center justify-between p-2 rounded-md bg-amber-50 border border-amber-100 hover:border-amber-300 cursor-pointer transition-colors">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {v.student ? `${v.student.firstName} ${v.student.lastName}` : v.studentId}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {v.department?.name ?? '—'} · {v.dutyDate}
                          </p>
                        </div>
                        <Badge variant="warning" className="text-xs shrink-0 ml-2">Confirm</Badge>
                      </div>
                    </Link>
                  ))}
                  {pendingVerifications.length > 3 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">
                      +{pendingVerifications.length - 3} more
                    </p>
                  )}
                </div>
              )}
              <Button variant="outline" className="w-full mt-3" asChild>
                <Link href="/duty-verifications">View All Verifications <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>
              </Button>
            </CardContent>
          </Card>

          {/* Upcoming Duties */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upcoming Duties</CardTitle>
              <CardDescription>Next {upcomingDuties.length} scheduled</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSchedules ? (
                <div className="flex items-center gap-2 text-muted-foreground py-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                </div>
              ) : upcomingDuties.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No upcoming duties scheduled.</p>
              ) : (
                <div className="space-y-2">
                  {upcomingDuties.map((s: Schedule) => (
                    <div key={s.id} className="flex justify-between items-center text-sm p-2 bg-muted/30 rounded-md">
                      <div>
                        <div className="font-medium truncate max-w-[160px]">
                          {(s as any).department?.name ?? 'Ward'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {s.dutyDate} · {(s as any).hospital?.name ?? ''}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">Upcoming</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Stats */}
          {analytics && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">System Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Attendance Rate</span>
                    <span className="font-medium">{analytics.attendanceRate ?? 0}%</span>
                  </div>
                  <Progress value={analytics.attendanceRate ?? 0} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Clinical Completion</span>
                    <span className="font-medium">{analytics.completionRate ?? 0}%</span>
                  </div>
                  <Progress value={analytics.completionRate ?? 0} className="h-2" />
                </div>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href="/admin/analytics">View Full Analytics</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
