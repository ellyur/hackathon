import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, ClipboardCheck, AlertCircle, Calendar, Loader2, CheckCircle2, BookOpen } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import type { AuthUser } from '@workspace/api-client-react';
import { useGetTodayDuties, useListSchedules } from '@workspace/api-client-react';
import { useListDutyVerifications } from '@/hooks/use-duty-verifications';

function statusBadge(status: string) {
  if (status === 'active') return <Badge variant="success">Active</Badge>;
  if (status === 'upcoming') return <Badge variant="upcoming">Upcoming</Badge>;
  return <Badge variant="completed">Completed</Badge>;
}

export function CIDashboard() {
  const { user: rawUser } = useAuth();
  const user = rawUser as AuthUser | undefined;
  const firstName = user?.firstName ?? 'Instructor';

  const { data: todayDuties = [], isLoading: loadingToday } = useGetTodayDuties();
  const { data: allDuties = [], isLoading: loadingAll } = useListSchedules();
  const { data: pendingVerifications = [], isLoading: loadingDV } = useListDutyVerifications('waiting_ci');

  const today = new Date().toISOString().split('T')[0];
  const recentDuties = allDuties
    .filter(d => d.dutyDate < today && d.status === 'completed')
    .slice(0, 4);

  const totalStudentsToday = todayDuties.reduce((s, d) => s + (d.students?.length ?? 0), 0);
  const activeDuty = todayDuties.find(d => d.status === 'active');

  const isLoading = loadingToday || loadingAll;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Welcome, {firstName}</h2>
          <p className="text-muted-foreground mt-1">Here is your clinical instruction overview for today.</p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> Today's Duties</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{loadingToday ? '—' : todayDuties.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{today}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Students Today</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{loadingToday ? '—' : totalStudentsToday}</p>
            <p className="text-xs text-muted-foreground mt-1">Assigned across all duties</p>
          </CardContent>
        </Card>
        <Card className={pendingVerifications.length > 0 ? 'border-amber-300 bg-amber-50/50' : ''}>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><AlertCircle className="w-4 h-4 text-amber-500" /> Pending Verifications</CardTitle></CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${pendingVerifications.length > 0 ? 'text-amber-600' : ''}`}>
              {loadingDV ? '—' : pendingVerifications.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Awaiting your review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Total Duties</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{loadingAll ? '—' : allDuties.length}</p>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Duty Banner */}
      {!loadingToday && activeDuty && (
        <Card className="border-emerald-300 bg-emerald-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-700">
              <Clock className="w-5 h-5" />
              Active Duty Now
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <p className="font-semibold text-base">{activeDuty.hospital?.name ?? activeDuty.hospitalId}</p>
                <p className="text-sm text-muted-foreground">{activeDuty.department?.name ?? activeDuty.departmentId} · {activeDuty.startTime}–{activeDuty.endTime}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{activeDuty.students?.length ?? 0} students assigned</span>
                  {(activeDuty as any).dutyHours && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{(activeDuty as any).dutyHours} duty hours</span>}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/duties/${activeDuty.id}/attendance`}>Manage Attendance</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href={`/duties/${activeDuty.id}/bulk-verify`}>Bulk Verify</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Today's Duties */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Today's Duties</CardTitle>
            <Button variant="ghost" size="sm" asChild><Link href="/duties">See all</Link></Button>
          </CardHeader>
          <CardContent>
            {loadingToday ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : todayDuties.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No duties scheduled for today.
              </div>
            ) : (
              <div className="space-y-3">
                {todayDuties.map(d => (
                  <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{d.department?.name ?? d.departmentId}</span>
                        {statusBadge(d.status)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{d.hospital?.name} · {d.startTime}–{d.endTime} · {d.students?.length ?? 0} students</p>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/duties/${d.id}/attendance`}>Roster</Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Verifications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Pending Verifications</CardTitle>
            <Button variant="ghost" size="sm" asChild><Link href="/verifications">See all</Link></Button>
          </CardHeader>
          <CardContent>
            {loadingDV ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : pendingVerifications.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <ClipboardCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                All caught up! No pending verifications.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingVerifications.slice(0, 5).map(v => {
                  const name = v.student ? `${v.student.firstName} ${v.student.lastName}` : v.studentId;
                  const daysWaiting = Math.floor((Date.now() - new Date(v.createdAt).getTime()) / 86400000);
                  return (
                    <div key={v.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                      <div>
                        <p className="font-medium text-sm">{name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{v.department?.name} · {v.dutyDate} · {daysWaiting}d waiting</p>
                      </div>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/duty-verifications/${v.id}`}>Review</Link>
                      </Button>
                    </div>
                  );
                })}
                {pendingVerifications.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">+{pendingVerifications.length - 5} more</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Duties */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Duties</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : recentDuties.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">No recent completed duties.</div>
            ) : (
              <div className="space-y-3">
                {recentDuties.map(d => (
                  <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium text-sm">{d.department?.name ?? d.departmentId}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{d.dutyDate} · {d.students?.length ?? 0} students</p>
                    </div>
                    <Badge variant="secondary">Completed</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start gap-2" asChild>
              <Link href="/duties"><Calendar className="w-4 h-4" /> My Duty Schedule</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" asChild>
              <Link href="/verifications"><ClipboardCheck className="w-4 h-4" /> Duty Verifications</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" asChild>
              <Link href="/ci/students"><Users className="w-4 h-4" /> Student Progress</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" asChild>
              <Link href="/evaluations"><BookOpen className="w-4 h-4" /> Evaluations</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
