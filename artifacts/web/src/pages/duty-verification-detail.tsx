import { useState } from 'react';
import { Link, useRoute, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft, CheckCircle, User, FileText, MapPin, Loader2, Clock,
  CalendarDays, Stethoscope, ClipboardCheck,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import type { AuthUser } from '@workspace/api-client-react';
import {
  useGetDutyVerification,
  useCiVerifyDuty,
  useConfirmDutyVerification,
} from '@/hooks/use-duty-verifications';
import { useQuery } from '@tanstack/react-query';

function getAuthToken() { return localStorage.getItem('authToken'); }
async function apiFetch<T>(path: string): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(path, { headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: 'include' });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
  return res.json();
}

interface ClinicalCase { id: string; name: string; category: string; requiredCount: number; }

const statusSteps = [
  { key: 'waiting_ci', label: 'Waiting for CI' },
  { key: 'pending_scheduler', label: 'Verified by CI' },
  { key: 'officially_verified', label: 'Officially Verified' },
] as const;

type DVStatus = 'waiting_ci' | 'ci_verified' | 'pending_scheduler' | 'officially_verified';

function StatusTimeline({ status }: { status: DVStatus }) {
  const stepIndex = status === 'officially_verified' ? 2
    : status === 'pending_scheduler' || status === 'ci_verified' ? 1
    : 0;
  return (
    <div className="flex items-center gap-2 py-2">
      {statusSteps.map((step, i) => (
        <div key={step.key} className="flex items-center gap-2 flex-1">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
            i <= stepIndex ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}>
            {i < stepIndex ? '✓' : i + 1}
          </div>
          <span className={`text-xs hidden sm:block ${i <= stepIndex ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
            {step.label}
          </span>
          {i < statusSteps.length - 1 && (
            <div className={`flex-1 h-0.5 ${i < stepIndex ? 'bg-primary' : 'bg-muted'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function formatTime(t: string | null | undefined): string {
  if (!t) return '—';
  return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function DutyVerificationDetailPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/duty-verifications/:id');
  const dvId = params?.id ?? '';

  const { user: rawUser } = useAuth();
  const user = rawUser as AuthUser | undefined;
  const role = user?.role ?? '';

  const { data: dv, isLoading } = useGetDutyVerification(dvId);
  const { data: allCases = [] } = useQuery<ClinicalCase[]>({
    queryKey: ['clinical-cases'],
    queryFn: () => apiFetch('/api/cases'),
    staleTime: 5 * 60_000,
  });

  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const [remarks, setRemarks] = useState('');
  const [done, setDone] = useState(false);

  const ciVerify = useCiVerifyDuty();
  const schedulerConfirm = useConfirmDutyVerification();

  // Pre-select already-chosen cases when data loads
  const alreadySelected = dv?.selectedCases.map(c => c.clinicalCaseId) ?? [];

  // For CI: filter cases relevant to this ward (by category matching dept name)
  const deptName = dv?.department?.name?.toLowerCase() ?? '';
  const relevantCases = allCases.filter(c => c.category.toLowerCase() === deptName);
  // Also show all cases if no department-specific ones exist
  const casesToShow = relevantCases.length > 0 ? relevantCases : allCases;

  function toggleCase(caseId: string) {
    setSelectedCaseIds(prev =>
      prev.includes(caseId) ? prev.filter(id => id !== caseId) : [...prev, caseId]
    );
  }

  async function handleCiVerify() {
    try {
      await ciVerify.mutateAsync({ id: dvId, caseIds: selectedCaseIds, remarks: remarks || undefined });
      toast({ title: 'Duty Verified ✓', description: 'The request is now pending Scheduler confirmation.' });
      setDone(true);
      setTimeout(() => setLocation('/duty-verifications'), 1500);
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
    }
  }

  async function handleSchedulerConfirm() {
    try {
      await schedulerConfirm.mutateAsync(dvId);
      toast({ title: 'Verification Confirmed ✓', description: 'The student\'s passport has been updated.' });
      setDone(true);
      setTimeout(() => setLocation('/duty-verifications'), 1500);
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!dv) {
    return (
      <div className="text-center py-20 text-muted-foreground space-y-4">
        <p>Duty verification not found.</p>
        <Button asChild variant="outline"><Link href="/duty-verifications">Back</Link></Button>
      </div>
    );
  }

  const studentName = dv.student ? `${dv.student.firstName} ${dv.student.lastName}` : dv.studentId;
  const initials = dv.student ? `${dv.student.firstName[0]}${dv.student.lastName[0]}` : '??';
  const ciName = dv.ci ? `${dv.ci.firstName} ${dv.ci.lastName}` : dv.ciId;

  const canCiVerify = role === 'ci' && dv.status === 'waiting_ci';
  const canSchedulerConfirm = (role === 'scheduler' || role === 'admin') && dv.status === 'pending_scheduler';
  const effectiveSelected = selectedCaseIds.length > 0 ? selectedCaseIds : alreadySelected;

  return (
    <div className="space-y-6">
      <div>
        {/* CI goes back to /verifications (their duty-verification list); scheduler/admin/student to /duty-verifications */}
        <Link href={role === 'ci' ? '/verifications' : '/duty-verifications'}>
          <Button variant="ghost" size="sm" className="mb-2 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <h2 className="text-3xl font-bold tracking-tight">Duty Verification</h2>
        <p className="text-muted-foreground mt-1">{dv.department?.name} · {dv.dutyDate}</p>
      </div>

      {/* Status Timeline */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <StatusTimeline status={dv.status as DVStatus} />
          <div className="mt-2 text-center">
            {dv.status === 'waiting_ci' && (
              <Badge variant="secondary" className="text-sm">Waiting for Clinical Instructor</Badge>
            )}
            {dv.status === 'pending_scheduler' && (
              <Badge className="bg-amber-500 hover:bg-amber-600 text-sm">Pending Scheduler Confirmation</Badge>
            )}
            {dv.status === 'officially_verified' && (
              <Badge className="bg-emerald-500 hover:bg-emerald-600 text-sm">Officially Verified ✓</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="space-y-4 lg:col-span-2">
          {/* Student Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" /> Student Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-lg">{studentName}</p>
                  <p className="text-sm text-muted-foreground">{dv.student?.email ?? dv.studentId}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Duty Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" /> Duty Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground">Duty Date</p>
                  <p className="font-medium flex items-center gap-1 mt-0.5">
                    <CalendarDays className="w-3.5 h-3.5 text-primary" />{dv.dutyDate}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Clinical Instructor</p>
                  <p className="font-medium mt-0.5">{ciName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Hospital</p>
                  <p className="font-medium flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-primary" />{dv.hospital?.name ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ward</p>
                  <p className="font-medium mt-0.5">{dv.department?.name ?? '—'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attendance Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" /> Attendance Record
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground">Time In</p>
                  <p className="font-medium">{formatTime(dv.attendance?.timeIn)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Time Out</p>
                  <p className="font-medium">{formatTime(dv.attendance?.timeOut)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">GPS Verified</p>
                  <p className="font-medium">{dv.attendance?.status === 'present' || dv.attendance?.status === 'late' ? '✓' : '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant={dv.attendance?.status === 'present' ? 'default' : 'secondary'} className="capitalize">
                    {dv.attendance?.status ?? '—'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Clinical Cases Checklist — CI action or read-only view */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Stethoscope className="h-4 w-4" /> Clinical Cases
              </CardTitle>
            </CardHeader>
            <CardContent>
              {canCiVerify ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Select all clinical cases completed during this duty:
                  </p>
                  {casesToShow.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">No cases configured for this ward.</p>
                  ) : (
                    casesToShow.map(c => (
                      <div key={c.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                        <Checkbox
                          id={`case-${c.id}`}
                          checked={selectedCaseIds.includes(c.id)}
                          onCheckedChange={() => toggleCase(c.id)}
                        />
                        <label htmlFor={`case-${c.id}`} className="text-sm font-medium cursor-pointer">
                          {c.name}
                          {c.category && c.category.toLowerCase() !== deptName && (
                            <span className="text-xs text-muted-foreground ml-2">({c.category})</span>
                          )}
                        </label>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                // Read-only: show selected cases
                <div className="space-y-2">
                  {dv.selectedCases.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No cases selected yet.</p>
                  ) : (
                    dv.selectedCases.map(sc => (
                      <div key={sc.id} className="flex items-center gap-2 py-1.5 border-b last:border-0 text-sm">
                        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>{sc.clinicalCase?.name ?? sc.clinicalCaseId}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* CI Remarks (if any) */}
          {dv.ciRemarks && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Clinical Instructor Remarks</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm border rounded-md p-3 bg-muted/30">{dv.ciRemarks}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column — Actions */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-base">
                {canCiVerify ? 'Verify Duty' : canSchedulerConfirm ? 'Confirm Verification' : 'Verification Status'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Separator />
              {done ? (
                <p className="text-sm text-muted-foreground text-center py-4">Redirecting…</p>
              ) : canCiVerify ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Remarks (optional)</label>
                    <Textarea
                      placeholder="Add any clinical remarks..."
                      value={remarks}
                      onChange={e => setRemarks(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <Button
                    className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
                    onClick={handleCiVerify}
                    disabled={ciVerify.isPending}
                  >
                    {ciVerify.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
                    Verify Duty
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    This will send the request to the Scheduler for final confirmation.
                  </p>
                </>
              ) : canSchedulerConfirm ? (
                <>
                  <div className="text-sm space-y-2 pb-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CI Verified</span>
                      <span className="font-medium text-emerald-600">✓</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cases Selected</span>
                      <span className="font-medium">{dv.selectedCases.length}</span>
                    </div>
                  </div>
                  <Separator />
                  <Button
                    className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
                    onClick={handleSchedulerConfirm}
                    disabled={schedulerConfirm.isPending}
                  >
                    {schedulerConfirm.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    Confirm Verification
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Once confirmed, the student's Clinical Passport will be updated automatically.
                  </p>
                </>
              ) : (
                <div className="text-sm space-y-2 py-2">
                  {dv.ciVerifiedAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CI Verified At</span>
                      <span className="font-medium">{new Date(dv.ciVerifiedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                  {dv.schedulerConfirmedAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Confirmed At</span>
                      <span className="font-medium">{new Date(dv.schedulerConfirmedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                  {dv.selectedCases.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cases Recorded</span>
                      <span className="font-medium">{dv.selectedCases.length}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
