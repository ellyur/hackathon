import { useState, useMemo } from 'react';
import { Link, useRoute, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft, CheckSquare, Loader2, Stethoscope, Users,
  CheckCircle2, AlertCircle, ClipboardCheck, Clock,
} from 'lucide-react';
import { useGetSchedule } from '@workspace/api-client-react';
import { useListDutyVerifications, useCiBulkVerifyDuty } from '@/hooks/use-duty-verifications';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

function getAuthToken() { return localStorage.getItem('authToken'); }
async function apiFetch<T>(path: string): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(path, { headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: 'include' });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
  return res.json();
}

interface ClinicalCase { id: string; name: string; category: string; requiredCount: number; }

type VerifyStep = 'select_students' | 'select_cases' | 'done';

export function CIBulkVerifyPage() {
  const [, params] = useRoute('/duties/:id/bulk-verify');
  const scheduleId = params?.id ?? '';
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: schedule } = useGetSchedule(scheduleId, { query: { enabled: !!scheduleId } as any });
  const { data: allVerifications = [], isLoading: loadingDV, refetch } = useListDutyVerifications('waiting_ci');

  // Filter to this schedule
  const scheduleVerifications = allVerifications.filter(v => v.scheduleId === scheduleId);

  const { data: allCases = [] } = useQuery<ClinicalCase[]>({
    queryKey: ['clinical-cases'],
    queryFn: () => apiFetch('/api/cases'),
    staleTime: 5 * 60_000,
  });

  const deptName = schedule?.department?.name?.toLowerCase() ?? '';
  const relevantCases = allCases.filter(c => c.category.toLowerCase() === deptName);
  const casesToShow = relevantCases.length > 0 ? relevantCases : allCases;

  const [step, setStep] = useState<VerifyStep>('select_students');
  const [selectedDvIds, setSelectedDvIds] = useState<Set<string>>(new Set());
  const [selectedCaseIds, setSelectedCaseIds] = useState<Set<string>>(new Set());
  const [remarks, setRemarks] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifiedCount, setVerifiedCount] = useState(0);

  const bulkVerify = useCiBulkVerifyDuty();

  function toggleDv(id: string) {
    setSelectedDvIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function toggleCase(id: string) {
    setSelectedCaseIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function selectAll() {
    setSelectedDvIds(new Set(scheduleVerifications.map(v => v.id)));
  }
  function clearAll() { setSelectedDvIds(new Set()); }

  async function handleBulkVerify() {
    setVerifying(true);
    try {
      const result = await bulkVerify.mutateAsync({
        ids: [...selectedDvIds],
        caseIds: [...selectedCaseIds],
        remarks: remarks || undefined,
      });
      setVerifiedCount(result.verified);
      setStep('done');
      toast({
        title: `${result.verified} student${result.verified !== 1 ? 's' : ''} verified ✓`,
        description: 'All selected duties sent to Scheduler.',
      });
    } catch (e: any) {
      // Server may return structured details (e.g. precondition failure on a specific ID)
      const serverMsg: string = e?.message ?? 'An unexpected error occurred.';
      toast({
        title: 'Bulk verification failed',
        description: serverMsg,
        variant: 'destructive',
      });
    } finally {
      setVerifying(false);
      refetch();
    }
  }

  const selectedStudentNames = scheduleVerifications
    .filter(v => selectedDvIds.has(v.id))
    .map(v => v.student ? `${v.student.firstName} ${v.student.lastName}` : v.studentId);

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/duties/${scheduleId}/attendance`}>
          <Button variant="ghost" size="sm" className="mb-1 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Attendance Roster
          </Button>
        </Link>
        <h2 className="text-3xl font-bold tracking-tight">Bulk Duty Verification</h2>
        {schedule && (
          <p className="text-muted-foreground mt-1">
            {schedule.hospital?.name} · {schedule.department?.name} · {schedule.dutyDate}
          </p>
        )}
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-3">
        {[
          { s: 'select_students', label: '1. Select Students' },
          { s: 'select_cases', label: '2. Select Cases' },
          { s: 'done', label: '3. Done' },
        ].map(({ s, label }, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <div className="h-px w-6 bg-border" />}
            <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
              step === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}>{label}</span>
          </div>
        ))}
      </div>

      {/* Step 1: Select Students */}
      {step === 'select_students' && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                Students with Pending Verifications
              </CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={selectAll}>Select All</Button>
                <Button size="sm" variant="ghost" onClick={clearAll}>Clear</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingDV ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : scheduleVerifications.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <ClipboardCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No pending verifications for this schedule.</p>
                  <Button variant="outline" size="sm" className="mt-4" asChild>
                    <Link href="/verifications">View All Verifications</Link>
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Requested</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scheduleVerifications.map(v => {
                      const name = v.student ? `${v.student.firstName} ${v.student.lastName}` : v.studentId;
                      const initials = v.student ? `${v.student.firstName[0]}${v.student.lastName[0]}` : '??';
                      const days = Math.floor((Date.now() - new Date(v.createdAt).getTime()) / 86400000);
                      return (
                        <TableRow key={v.id} className={selectedDvIds.has(v.id) ? 'bg-primary/5' : ''}>
                          <TableCell>
                            <Checkbox
                              checked={selectedDvIds.has(v.id)}
                              onCheckedChange={() => toggleDv(v.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-sm">{name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {days === 0 ? 'Today' : `${days}d ago`}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={() => setStep('select_cases')}
              disabled={selectedDvIds.size === 0}
            >
              Next: Select Cases ({selectedDvIds.size} selected)
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Select Cases */}
      {step === 'select_cases' && (
        <div className="space-y-4">
          <Alert>
            <Users className="h-4 w-4" />
            <AlertDescription>
              Applying to <strong>{selectedDvIds.size} student{selectedDvIds.size !== 1 ? 's' : ''}</strong>: {selectedStudentNames.join(', ')}.
              These cases will be applied to all selected students. You can verify students individually later for different case selections.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Stethoscope className="w-4 h-4" />
                Select Completed Clinical Cases
              </CardTitle>
              <p className="text-sm text-muted-foreground">Check all cases actually performed by the selected students during this duty.</p>
            </CardHeader>
            <CardContent>
              {casesToShow.length === 0 ? (
                <p className="text-muted-foreground text-sm">No cases configured for this ward.</p>
              ) : (
                <div className="space-y-2">
                  {casesToShow.map(c => (
                    <div key={c.id} className="flex items-center gap-3 py-2.5 border-b last:border-0">
                      <Checkbox
                        id={`bulk-case-${c.id}`}
                        checked={selectedCaseIds.has(c.id)}
                        onCheckedChange={() => toggleCase(c.id)}
                      />
                      <label htmlFor={`bulk-case-${c.id}`} className="text-sm font-medium cursor-pointer flex-1">
                        {c.name}
                        {c.category && c.category.toLowerCase() !== deptName && (
                          <span className="text-xs text-muted-foreground ml-2">({c.category})</span>
                        )}
                      </label>
                      {selectedCaseIds.has(c.id) && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">CI Remarks <span className="text-muted-foreground font-normal text-sm">(optional — applies to all)</span></CardTitle></CardHeader>
            <CardContent>
              <Textarea
                placeholder="Add any common remarks for all selected students..."
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep('select_students')}>Back</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 gap-2"
              onClick={handleBulkVerify}
              disabled={verifying}
            >
              {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
              Verify {selectedDvIds.size} Student{selectedDvIds.size !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Done */}
      {step === 'done' && (
        <Card className="border-emerald-300 bg-emerald-50/50">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <div>
              <h3 className="text-xl font-semibold text-emerald-700">
                {verifiedCount} Student{verifiedCount !== 1 ? 's' : ''} Verified
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                All selected duties are now pending Scheduler confirmation.
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <Button variant="outline" asChild><Link href="/verifications">View Verifications</Link></Button>
              <Button asChild><Link href="/duties">Back to Duties</Link></Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
