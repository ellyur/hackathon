import { useState } from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import {
  Search, Download, AlertTriangle, Loader2,
  CheckCircle2, Clock, Circle, ChevronRight,
} from 'lucide-react';
import { useListStudents } from '@workspace/api-client-react';
import { useQuery } from '@tanstack/react-query';

// ── Types ────────────────────────────────────────────────────────────────────

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
  overallCompletion: number;
  totalDutyDaysRequired: number;
  totalDutyDaysCompleted: number;
  wards: WardProgress[];
}

interface StudentRow {
  id: string;
  firstName: string;
  lastName: string;
  studentProfile?: {
    studentNumber?: string;
    yearLevel?: number;
    section?: string;
    program?: string;
    totalHoursRequired?: number;
  } | null;
  totalHoursCompleted?: number;
  totalHoursRequired?: number;
  caseCompletionRate?: number;
  verifiedCaseCount?: number;
  totalCasesRequired?: number;
  isAtRisk?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getAuthToken() { return localStorage.getItem('authToken'); }
async function apiFetch<T>(path: string): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(path, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
  return res.json();
}

function CaseIcon({ status }: { status: WardCase['status'] }) {
  if (status === 'complete') return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
  if (status === 'in_progress') return <Clock className="w-4 h-4 text-amber-500 shrink-0" />;
  return <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0" />;
}

// ── Case Completion Sheet ─────────────────────────────────────────────────────

function StudentCaseSheet({
  student,
  open,
  onClose,
}: {
  student: StudentRow | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data: passport, isLoading } = useQuery<StudentPassport>({
    queryKey: ['student-passport-sheet', student?.id],
    queryFn: () => apiFetch(`/api/students/${student!.id}/passport`),
    enabled: open && !!student?.id,
    staleTime: 30_000,
  });

  const allCases = passport?.wards.flatMap((w) => w.requiredCases) ?? [];
  const pending = allCases.filter((c) => c.status !== 'complete');
  const completed = allCases.filter((c) => c.status === 'complete');

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {student && (
          <>
            <SheetHeader className="mb-6">
              <SheetTitle className="text-lg">
                {student.lastName}, {student.firstName}
              </SheetTitle>
              <SheetDescription>
                {student.studentProfile?.studentNumber ?? ''} · Case Completion Detail
              </SheetDescription>
            </SheetHeader>

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : !passport ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No passport data found.</p>
            ) : (
              <div className="space-y-6">
                {/* Summary bar */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <div className="text-xl font-bold text-foreground">{completed.length}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Completed</div>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-center">
                    <div className="text-xl font-bold text-amber-700">{pending.length}</div>
                    <div className="text-xs text-amber-600 mt-0.5">Pending</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <div className="text-xl font-bold text-foreground">
                      {Math.round((passport.overallCompletion ?? 0) * 100)}%
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">Overall</div>
                  </div>
                </div>

                {/* Per-ward breakdown */}
                <div className="space-y-4">
                  {passport.wards.map((ward) => {
                    const wardPending = ward.requiredCases.filter((c) => c.status !== 'complete');
                    const wardDone = ward.requiredCases.filter((c) => c.status === 'complete');
                    return (
                      <div key={ward.departmentId} className="rounded-xl border bg-card overflow-hidden">
                        {/* Ward header */}
                        <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b">
                          <div className="font-semibold text-sm">{ward.wardName}</div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {ward.completedDutyDays}/{ward.requiredDutyDays} days
                            </span>
                            {ward.status === 'complete' ? (
                              <Badge variant="success" className="text-xs">Complete</Badge>
                            ) : ward.status === 'in_progress' ? (
                              <Badge variant="warning" className="text-xs">In Progress</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">Not Started</Badge>
                            )}
                          </div>
                        </div>

                        {/* Cases */}
                        {ward.requiredCases.length === 0 ? (
                          <p className="text-xs text-muted-foreground px-4 py-3">No cases required.</p>
                        ) : (
                          <div className="divide-y">
                            {ward.requiredCases.map((c) => (
                              <div key={c.caseId} className="flex items-center gap-3 px-4 py-2.5">
                                <CaseIcon status={c.status} />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium truncate">{c.caseName}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {c.verified}/{c.required} verified
                                    {c.remaining > 0 && (
                                      <span className="text-amber-600 ml-1">· {c.remaining} remaining</span>
                                    )}
                                  </div>
                                </div>
                                {c.status === 'complete' ? (
                                  <Badge variant="success" className="text-xs shrink-0">Done</Badge>
                                ) : c.status === 'in_progress' ? (
                                  <Badge variant="warning" className="text-xs shrink-0">Partial</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs shrink-0 text-muted-foreground">
                                    Pending
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2">
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/students/${student.id}`} onClick={onClose}>
                      View Full Student Profile
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function StudentRosterPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: students = [], isLoading } = useListStudents(
    search ? { search } : undefined,
    { query: { staleTime: 30_000 } as never },
  );

  function openSheet(student: StudentRow) {
    setSelectedStudent(student);
    setSheetOpen(true);
  }

  function handleExport() {
    if (students.length === 0) return;
    const rows = (students as StudentRow[]).map((s) => ({
      StudentNumber: s.studentProfile?.studentNumber ?? '',
      LastName: s.lastName,
      FirstName: s.firstName,
      YearLevel: s.studentProfile?.yearLevel ?? '',
      Section: s.studentProfile?.section ?? '',
      Program: s.studentProfile?.program ?? '',
      HoursCompleted: s.totalHoursCompleted ?? 0,
      HoursRequired: s.totalHoursRequired ?? s.studentProfile?.totalHoursRequired ?? 500,
      CaseCompletion: `${Math.round((s.caseCompletionRate ?? 0) * 100)}%`,
      Status: s.isAtRisk ? 'At Risk' : 'On Track',
    }));
    const headers = Object.keys(rows[0]).join(',');
    const csv = [headers, ...rows.map((r) => Object.values(r).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student-roster.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Export ready', description: `${rows.length} students exported.` });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Student Roster</h2>
          <p className="text-muted-foreground mt-1">Monitor case progress and compliance across all students.</p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader className="p-4 border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or student no..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Student No.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Year / Section</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>
                  Case Completion
                  <span className="ml-1 text-xs font-normal text-muted-foreground">(click to view)</span>
                </TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No students found.
                  </TableCell>
                </TableRow>
              ) : (
                (students as StudentRow[]).map((student) => {
                  const rate = Math.round((student.caseCompletionRate ?? 0) * 100);
                  const hoursCompleted = Math.round(student.totalHoursCompleted ?? 0);
                  const hoursRequired = student.totalHoursRequired ?? student.studentProfile?.totalHoursRequired ?? 500;
                  const hoursPct = Math.min(100, Math.round((hoursCompleted / hoursRequired) * 100));
                  const studentNo = student.studentProfile?.studentNumber ?? '—';
                  const yearLevel = student.studentProfile?.yearLevel;
                  const section = student.studentProfile?.section ?? '—';
                  const program = student.studentProfile?.program ?? '—';

                  return (
                    <TableRow key={student.id} className="hover:bg-muted/30">
                      <TableCell className="pl-4 font-mono text-sm">{studentNo}</TableCell>
                      <TableCell>
                        <Link
                          href={`/students/${student.id}`}
                          className="font-medium hover:underline text-primary"
                        >
                          {student.lastName}, {student.firstName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">
                        {yearLevel ? `Year ${yearLevel}` : '—'} – {section}
                      </TableCell>
                      <TableCell className="text-sm">{program}</TableCell>

                      {/* Clickable case completion */}
                      <TableCell>
                        <button
                          onClick={() => openSheet(student)}
                          className="group flex items-center gap-2 w-full hover:opacity-80 transition-opacity text-left"
                          title="Click to view case details"
                        >
                          <div className="flex-1">
                            <Progress value={rate} className="h-2" />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right shrink-0 group-hover:text-primary transition-colors">
                            {rate}%
                          </span>
                          <ChevronRight className="w-3 h-3 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
                        </button>
                      </TableCell>

                      {/* Hours with progress */}
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm tabular-nums">
                            {hoursCompleted}
                            <span className="text-muted-foreground">/{hoursRequired}</span>
                          </div>
                          <Progress value={hoursPct} className="h-1.5" color="navy" />
                        </div>
                      </TableCell>

                      <TableCell>
                        {student.isAtRisk ? (
                          <Badge variant="danger" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            At Risk
                          </Badge>
                        ) : (
                          <Badge variant="success">On Track</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <StudentCaseSheet
        student={selectedStudent}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  );
}
