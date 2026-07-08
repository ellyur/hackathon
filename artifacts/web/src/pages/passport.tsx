import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle2, Clock, Circle, CalendarDays, Stethoscope, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import type { AuthUser } from '@workspace/api-client-react';
import { useQuery } from '@tanstack/react-query';

function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}
async function apiFetch<T>(path: string): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
  return res.json();
}

interface WardCase {
  caseId: string;
  caseName: string;
  required: number;
  verified: number;
  remaining: number;
  status: 'complete' | 'in_progress' | 'deficient';
}

interface WardProgress {
  departmentId: string;
  wardName: string;
  requiredDutyDays: number;
  completedDutyDays: number;
  requiredDutyHours: number;
  completedDutyHours: number;
  completionPct: number;
  status: 'complete' | 'in_progress' | 'not_started';
  requiredCases: WardCase[];
}

interface StudentPassport {
  studentId: string;
  totalDutyDaysRequired: number;
  totalDutyDaysCompleted: number;
  overallCompletion: number;
  wards: WardProgress[];
}

function StatusBadge({ status }: { status: WardProgress['status'] }) {
  if (status === 'complete') {
    return (
      <Badge className="bg-emerald-500 hover:bg-emerald-600 shrink-0">
        <CheckCircle2 className="w-3 h-3 mr-1" /> Complete
      </Badge>
    );
  }
  if (status === 'in_progress') {
    return (
      <Badge variant="secondary" className="shrink-0">
        <Clock className="w-3 h-3 mr-1" /> In Progress
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="shrink-0 text-muted-foreground">
      <Circle className="w-3 h-3 mr-1" /> Not Started
    </Badge>
  );
}

function CaseStatusBadge({ status }: { status: WardCase['status'] }) {
  if (status === 'complete') return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-xs">Complete</Badge>;
  if (status === 'in_progress') return <Badge variant="secondary" className="text-xs">In Progress</Badge>;
  return <Badge variant="outline" className="text-xs text-muted-foreground">Not Started</Badge>;
}

export function ClinicalPassportPage() {
  const { user: rawUser } = useAuth();
  const user = rawUser as AuthUser | undefined;

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
  const overallPct = Math.round((passport?.overallCompletion ?? 0) * 100);
  const totalDays = passport?.totalDutyDaysRequired ?? 0;
  const completedDays = passport?.totalDutyDaysCompleted ?? 0;
  const remainingDays = Math.max(0, totalDays - completedDays);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Clinical Passport</h2>
        <p className="text-muted-foreground mt-1">Track your ward duty days and clinical case requirements.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overall Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallPct}%</div>
            <Progress value={overallPct} className="mt-3" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Duty Days Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{completedDays}</div>
            <p className="text-xs text-muted-foreground mt-1">Out of {totalDays} required</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Remaining Duty Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{remainingDays}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all wards</p>
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
              <p className="text-sm text-muted-foreground mt-1">
                An administrator needs to set duty day requirements for your assigned wards.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-1">
          {wards.map((ward) => (
            <Card key={ward.departmentId} className="shadow-sm">
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
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {ward.requiredDutyHours} hours equivalent
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={ward.status} />
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {/* Duty Days Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium flex items-center gap-1.5">
                      <CalendarDays className="w-4 h-4 text-primary" />
                      Duty Days
                    </span>
                    <span className="font-bold">
                      {ward.completedDutyDays} / {ward.requiredDutyDays}{' '}
                      <span className="font-normal text-muted-foreground text-xs">days</span>
                    </span>
                  </div>
                  <Progress value={ward.completionPct} className="h-2" />
                  <p className="text-xs text-right text-muted-foreground">{ward.completionPct}% complete</p>
                </div>

                {/* Clinical Cases (only for wards that have them) */}
                {ward.requiredCases.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Clinical Cases
                    </div>
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
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground">
                              <span className="font-semibold text-foreground">{c.verified}</span>
                              /{c.required}
                            </span>
                            <CaseStatusBadge status={c.status} />
                          </div>
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

      {/* Informational note */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="flex items-start gap-3 pt-4 pb-4">
          <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-700">
            Your Clinical Passport is read-only. Duty days and clinical cases are updated automatically
            after your Clinical Instructor verifies your duty and the Scheduler confirms the paper documents.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
