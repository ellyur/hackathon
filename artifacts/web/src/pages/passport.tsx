import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import {
  Loader2, CheckCircle2, Clock, Circle, CalendarDays,
  Stethoscope, AlertCircle, ChevronRight, AlertTriangle,
  History, UserCheck, ClipboardCheck,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import type { AuthUser } from '@workspace/api-client-react';
import { useQuery } from '@tanstack/react-query';

function getAuthToken(): string | null { return localStorage.getItem('authToken'); }
async function apiFetch<T>(path: string): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
  return res.json();
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface WardCase { caseId: string; caseName: string; required: number; verified: number; remaining: number; hourValue?: number | null; status: 'complete' | 'in_progress' | 'deficient'; }
interface WardProgress { departmentId: string; wardName: string; requiredDutyDays: number; completedDutyDays: number; requiredDutyHours: number; completionPct: number; status: 'complete' | 'in_progress' | 'not_started'; requiredCases: WardCase[]; }
interface StudentPassport {
  studentId: string;
  // Independent Duty Hours track
  earnedDutyHours: number;
  requiredDutyHours: number;
  dutyHoursCompletion: number;
  // Legacy ward-day fields
  totalDutyDaysRequired: number;
  totalDutyDaysCompleted: number;
  overallCompletion: number;
  wards: WardProgress[];
}

interface AttendanceRecord { id: string; dutyDate: string; timeIn: string | null; timeOut: string | null; status: string; dutyHours: number | null; lateMinutes: number; gpsVerified: boolean | null; faceVerified: boolean | null; }
interface VerificationRecord { id: string; dutyDate: string; status: string; ciName: string; ciRemarks: string | null; ciVerifiedAt: string | null; schedulerConfirmedAt: string | null; selectedCases: string[]; }
interface CaseProgress { caseId: string; caseName: string; required: number; verified: number; remaining: number; }
interface WardDetail { departmentId: string; wardName: string; requiredDutyDays: number; requiredDutyHours: number; completedDutyDays: number; absenceCount: number; totalLateMinutes: number; attendanceHistory: AttendanceRecord[]; verificationHistory: VerificationRecord[]; cases: CaseProgress[]; }

// ── Badges ────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: WardProgress['status'] }) {
  if (status === 'complete') return <Badge className="bg-emerald-500 hover:bg-emerald-600 shrink-0"><CheckCircle2 className="w-3 h-3 mr-1" /> Complete</Badge>;
  if (status === 'in_progress') return <Badge variant="secondary" className="shrink-0"><Clock className="w-3 h-3 mr-1" /> In Progress</Badge>;
  return <Badge variant="outline" className="shrink-0 text-muted-foreground"><Circle className="w-3 h-3 mr-1" /> Not Started</Badge>;
}

function VerifStatusBadge({ status }: { status: string }) {
  if (status === 'officially_verified') return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-xs">Verified ✓</Badge>;
  if (status === 'pending_scheduler') return <Badge className="bg-amber-500 hover:bg-amber-600 text-xs">Pending Scheduler</Badge>;
  if (status === 'waiting_ci') return <Badge variant="secondary" className="text-xs">Waiting for CI</Badge>;
  return <Badge variant="outline" className="text-xs capitalize">{status.replace(/_/g, ' ')}</Badge>;
}

function formatDt(s: string | null | undefined): string {
  if (!s) return '—';
  return new Date(s).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Ward Detail Sheet ─────────────────────────────────────────────────────────

function WardDetailSheet({ ward, studentId, open, onClose }: { ward: WardProgress; studentId: string; open: boolean; onClose: () => void; }) {
  const { data: detail, isLoading } = useQuery<WardDetail>({
    queryKey: ['ward-detail', studentId, ward.departmentId],
    queryFn: () => apiFetch(`/api/students/${studentId}/ward-detail/${ward.departmentId}`),
    enabled: open && !!studentId && !!ward.departmentId,
    staleTime: 30_000,
  });

  return (
    <Sheet open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-primary" />
            {ward.wardName}
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : !detail ? null : (
          <div className="mt-6 space-y-6">

            {/* Duty Days Progress */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-primary" /> Duty Days Progress
              </h3>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-bold">{detail.completedDutyDays} / {detail.requiredDutyDays} days</span>
              </div>
              <Progress value={detail.requiredDutyDays > 0 ? Math.min(100, detail.completedDutyDays / detail.requiredDutyDays * 100) : 0} className="h-2.5" />
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div className="text-center p-2 bg-muted/50 rounded-lg">
                  <p className="font-bold text-emerald-600">{detail.completedDutyDays}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Completed</p>
                </div>
                <div className="text-center p-2 bg-muted/50 rounded-lg">
                  <p className="font-bold text-amber-600">{Math.max(0, detail.requiredDutyDays - detail.completedDutyDays)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Remaining</p>
                </div>
                <div className="text-center p-2 bg-muted/50 rounded-lg">
                  <p className="font-bold text-red-500">{detail.absenceCount}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Absences</p>
                </div>
              </div>
              {detail.totalLateMinutes > 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                  Total late time: {Math.floor(detail.totalLateMinutes / 60) > 0 ? `${Math.floor(detail.totalLateMinutes / 60)}h ` : ''}{detail.totalLateMinutes % 60}min
                </p>
              )}
            </div>

            <Separator />

            {/* Clinical Cases */}
            {detail.cases.length > 0 && (
              <>
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-1.5">
                    <ClipboardCheck className="w-4 h-4 text-primary" /> Clinical Cases
                  </h3>
                  <div className="border rounded-lg divide-y overflow-hidden">
                    {detail.cases.map(c => (
                      <div key={c.caseId} className="flex items-center justify-between px-3 py-2.5 text-sm">
                        <div className="flex items-center gap-2">
                          {c.verified >= c.required
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            : c.verified > 0
                            ? <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                            : <Circle className="w-4 h-4 text-muted-foreground/50 shrink-0" />}
                          <span className="font-medium">{c.caseName}</span>
                        </div>
                        <span className="text-muted-foreground text-xs">
                          <span className="font-semibold text-foreground">{c.verified}</span>/{c.required}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Attendance History */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm flex items-center gap-1.5">
                <History className="w-4 h-4 text-primary" /> Attendance History
              </h3>
              {detail.attendanceHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No attendance records yet.</p>
              ) : (
                <div className="space-y-2">
                  {detail.attendanceHistory.map(r => (
                    <div key={r.id} className="p-3 border rounded-lg text-sm space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{r.dutyDate}</span>
                        <div className="flex items-center gap-2">
                          {r.lateMinutes > 0 && (
                            <span className="text-xs text-amber-600 font-medium">+{r.lateMinutes}min late</span>
                          )}
                          <Badge
                            variant={r.status === 'present' ? 'default' : r.status === 'late' ? 'secondary' : 'destructive'}
                            className={`text-xs capitalize ${r.status === 'present' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}
                          >
                            {r.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>In: {r.timeIn ? new Date(r.timeIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                        <span>Out: {r.timeOut ? new Date(r.timeOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                        {r.dutyHours != null && <span>{r.dutyHours.toFixed(1)}h</span>}
                        {r.gpsVerified && <span className="text-emerald-600">GPS ✓</span>}
                        {r.faceVerified && <span className="text-emerald-600">Face ✓</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Verification History */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-primary" /> Verification History
              </h3>
              {detail.verificationHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No verifications yet.</p>
              ) : (
                <div className="space-y-2">
                  {detail.verificationHistory.map(v => (
                    <div key={v.id} className="p-3 border rounded-lg text-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{v.dutyDate}</span>
                        <VerifStatusBadge status={v.status} />
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <p>CI: {v.ciName}</p>
                        {v.ciVerifiedAt && <p>Verified: {formatDt(v.ciVerifiedAt)}</p>}
                        {v.schedulerConfirmedAt && <p>Confirmed: {formatDt(v.schedulerConfirmedAt)}</p>}
                      </div>
                      {v.selectedCases.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {v.selectedCases.map((c, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{c}</Badge>
                          ))}
                        </div>
                      )}
                      {v.ciRemarks && (
                        <p className="text-xs text-muted-foreground italic border-l-2 border-muted pl-2">{v.ciRemarks}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function ClinicalPassportPage() {
  const { user: rawUser } = useAuth();
  const user = rawUser as AuthUser | undefined;
  const [selectedWard, setSelectedWard] = useState<WardProgress | null>(null);

  const { data: passport, isLoading } = useQuery<StudentPassport>({
    queryKey: ['student-passport', user?.id],
    queryFn: () => apiFetch(`/api/students/${user!.id}/passport`),
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const wards = passport?.wards ?? [];
  // Duty Hours (independent track)
  const earnedHours = passport?.earnedDutyHours ?? 0;
  const requiredHours = passport?.requiredDutyHours ?? 0;
  const dutyHoursPct = passport?.dutyHoursCompletion ?? 0;
  const remainingHours = Math.max(0, requiredHours - earnedHours);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Clinical Passport</h2>
        <p className="text-muted-foreground mt-1">Track your duty hours and clinical case requirements independently. Click any ward for details.</p>
      </div>

      {/* Duty Hours Summary — independent of Clinical Cases */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Duty Hours Progress</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dutyHoursPct}%</div>
            <Progress value={dutyHoursPct} className="mt-3" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Duty Hours Completed</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{earnedHours.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground mt-1">Out of {requiredHours} required hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Remaining Duty Hours</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{remainingHours.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground mt-1">Hours still needed</p>
          </CardContent>
        </Card>
      </div>

      {/* Ward Cards */}
      {wards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <CalendarDays className="h-12 w-12 text-muted-foreground opacity-50" />
            <div>
              <p className="font-medium">No ward requirements configured yet</p>
              <p className="text-sm text-muted-foreground mt-1">An administrator needs to set duty day requirements for your assigned wards.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {wards.map((ward) => (
            <Card
              key={ward.departmentId}
              className="shadow-sm cursor-pointer hover:shadow-md hover:border-primary/40 transition-all group"
              onClick={() => setSelectedWard(ward)}
            >
              <CardHeader className="pb-3 border-b">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-8 rounded-full ${
                      ward.status === 'complete' ? 'bg-emerald-500'
                      : ward.status === 'in_progress' ? 'bg-primary'
                      : 'bg-muted-foreground/30'
                    }`} />
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-primary" />
                        {ward.wardName}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{ward.requiredDutyHours} hours equivalent</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={ward.status} />
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium flex items-center gap-1.5">
                      <CalendarDays className="w-4 h-4 text-primary" /> Duty Days
                    </span>
                    <span className="font-bold">
                      {ward.completedDutyDays} / {ward.requiredDutyDays}{' '}
                      <span className="font-normal text-muted-foreground text-xs">days</span>
                    </span>
                  </div>
                  <Progress value={ward.completionPct} className="h-2" />
                  <p className="text-xs text-right text-muted-foreground">{ward.completionPct}% complete</p>
                </div>

                {ward.requiredCases.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Clinical Cases</div>
                    <div className="divide-y">
                      {ward.requiredCases.map((c) => (
                        <div key={c.caseId} className="flex items-center justify-between px-3 py-2.5 text-sm">
                          <div className="flex items-center gap-2">
                            {c.status === 'complete'
                              ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              : c.status === 'in_progress'
                              ? <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                              : <Circle className="w-4 h-4 text-muted-foreground/50 shrink-0" />}
                            <span className="font-medium">{c.caseName}</span>
                          </div>
                          <span className="text-muted-foreground text-xs">
                            <span className="font-semibold text-foreground">{c.verified}</span>/{c.required}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info note */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="flex items-start gap-3 pt-4 pb-4">
          <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-700">
            <strong>Duty Hours</strong> are earned from completed duty schedules — the Scheduler sets the official hours for each shift.
            <strong> Clinical Cases</strong> are tracked separately and verified by your Clinical Instructor; completing a case does <em>not</em> add Duty Hours.
            Both are updated automatically after verification. Click any ward card to see detailed history.
          </p>
        </CardContent>
      </Card>

      {/* Ward Detail Sheet */}
      {selectedWard && user?.id && (
        <WardDetailSheet
          ward={selectedWard}
          studentId={user.id}
          open={!!selectedWard}
          onClose={() => setSelectedWard(null)}
        />
      )}
    </div>
  );
}
