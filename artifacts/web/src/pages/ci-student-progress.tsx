import { useRoute, Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, CheckCircle2, AlertCircle, Clock, Loader2, User, BookOpen, GraduationCap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

function getAuthToken() { return localStorage.getItem('authToken'); }
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
  completionPct: number;
  status: 'complete' | 'in_progress' | 'not_started';
  requiredCases: WardCase[];
}
interface StudentPassport {
  studentId: string;
  earnedDutyHours: number;
  requiredDutyHours: number;
  dutyHoursCompletion: number;
  totalDutyDaysRequired: number;
  totalDutyDaysCompleted: number;
  overallCompletion: number;
  wards: WardProgress[];
}
interface StudentUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  section?: string;
  yearLevel?: number;
}

function caseStatusBadge(status: WardCase['status']) {
  if (status === 'complete') return <Badge className="bg-emerald-500 text-white text-xs">Done</Badge>;
  if (status === 'in_progress') return <Badge className="bg-amber-500 text-white text-xs">In Progress</Badge>;
  return <Badge variant="destructive" className="text-xs">Deficient</Badge>;
}

function wardStatusIcon(status: WardProgress['status']) {
  if (status === 'complete') return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
  if (status === 'in_progress') return <Clock className="w-5 h-5 text-amber-500" />;
  return <AlertCircle className="w-5 h-5 text-muted-foreground" />;
}

export function CIStudentProgressPage() {
  const [, params] = useRoute('/ci/students/:studentId');
  const studentId = params?.studentId ?? '';

  const { data: passport, isLoading: loadingPassport } = useQuery<StudentPassport>({
    queryKey: ['passport', studentId],
    queryFn: () => apiFetch(`/api/students/${studentId}/passport`),
    enabled: !!studentId,
  });

  const { data: student } = useQuery<StudentUser>({
    queryKey: ['user', studentId],
    queryFn: () => apiFetch(`/api/users/${studentId}`),
    enabled: !!studentId,
  });

  const studentName = student ? `${student.firstName} ${student.lastName}` : 'Student';

  if (loadingPassport) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/ci/students">
          <Button variant="ghost" size="sm" className="mb-1 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Students
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{studentName}</h2>
            {student && (
              <p className="text-muted-foreground text-sm">
                {student.section && `Section ${student.section}`}
                {student.yearLevel && ` · Year ${student.yearLevel}`}
                {student.email && ` · ${student.email}`}
              </p>
            )}
          </div>
        </div>
        <Badge variant="outline" className="mt-2 ml-13">Read-only view</Badge>
      </div>

      {!passport ? (
        <div className="text-center py-12 text-muted-foreground">No passport data available.</div>
      ) : (
        <>
          {/* Duty Hours Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Duty Hours Progress</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{passport.dutyHoursCompletion}%</div>
                <Progress value={passport.dutyHoursCompletion} className="mt-2" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Earned Duty Hours</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">{passport.earnedDutyHours.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground mt-1">Out of {passport.requiredDutyHours} required</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Remaining Hours</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {Math.max(0, passport.requiredDutyHours - passport.earnedDutyHours).toFixed(1)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Hours still needed</p>
              </CardContent>
            </Card>
          </div>

          {/* Ward Progress */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-5 h-5" /> Clinical Cases by Ward</h3>
            <div className="space-y-4">
              {passport.wards.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                  No ward data configured.
                </div>
              ) : (
                passport.wards.map(ward => (
                  <Card key={ward.departmentId} className={
                    ward.status === 'complete' ? 'border-emerald-200' :
                    ward.status === 'in_progress' ? 'border-amber-200' : ''
                  }>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          {wardStatusIcon(ward.status)}
                          {ward.wardName}
                        </CardTitle>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>{ward.completedDutyDays}/{ward.requiredDutyDays} duty days</span>
                          <span className="font-semibold">{ward.completionPct}%</span>
                        </div>
                      </div>
                      <Progress value={ward.completionPct} className="h-1.5 mt-1" />
                    </CardHeader>
                    {ward.requiredCases.length > 0 && (
                      <CardContent className="pt-2">
                        <div className="space-y-1.5">
                          {ward.requiredCases.map(c => (
                            <div key={c.caseId} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                              <div className="flex items-center gap-2">
                                {c.status === 'complete'
                                  ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  : <AlertCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                                <span>{c.caseName}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs text-muted-foreground">{c.verified}/{c.required}</span>
                                {caseStatusBadge(c.status)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
