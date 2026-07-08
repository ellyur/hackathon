import { useState } from 'react';
import { Link, useRoute } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, AlertCircle, Clock, Loader2, Shield, ShieldCheck, ShieldOff, Scan, ChevronDown, ArrowLeft, Users } from 'lucide-react';
import { useListAttendance, useGetSchedule, useManualAttendanceOverride } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

function getAuthToken() { return localStorage.getItem('authToken'); }
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers },
    credentials: 'include',
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
  return res.json();
}

function VerifiedIcon({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${ok ? 'text-emerald-600' : 'text-muted-foreground'}`}>
      {ok ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldOff className="w-3.5 h-3.5" />}
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'present') return <Badge className="bg-emerald-500 hover:bg-emerald-600">Present</Badge>;
  if (status === 'late') return <Badge variant="outline" className="text-amber-600 border-amber-600 bg-amber-50">Late</Badge>;
  if (status === 'absent') return <Badge variant="destructive">Absent</Badge>;
  return <Badge variant="secondary">Pending</Badge>;
}

function formatTime(t: string | null | undefined) {
  if (!t) return '—';
  try { return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch { return t; }
}

interface RemarksDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (remarks: string, status: 'present' | 'late' | 'absent') => Promise<void>;
  initialStatus: string;
  studentName: string;
}

function RemarksDialog({ open, onClose, onSave, initialStatus, studentName }: RemarksDialogProps) {
  const [remarks, setRemarks] = useState('');
  const [status, setStatus] = useState<'present' | 'late' | 'absent'>(
    initialStatus === 'present' ? 'present' : initialStatus === 'late' ? 'late' : 'absent'
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try { await onSave(remarks, status); onClose(); setRemarks(''); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Update Attendance — {studentName}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="mb-1 block">Status</Label>
            <div className="flex gap-2">
              {(['present', 'late', 'absent'] as const).map(s => (
                <Button key={s} variant={status === s ? 'default' : 'outline'} size="sm" onClick={() => setStatus(s)} className="capitalize">{s}</Button>
              ))}
            </div>
          </div>
          <div>
            <Label className="mb-1 block">Remarks <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="Add any clinical remarks..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AttendanceRosterPage() {
  const [, params] = useRoute('/duties/:id/attendance');
  const scheduleId = params?.id ?? '';
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: schedule } = useGetSchedule(scheduleId, {
    query: { enabled: !!scheduleId } as any,
  });
  const { data: records = [], isLoading, refetch } = useListAttendance(
    { scheduleId },
    { query: { enabled: !!scheduleId } as any }
  );

  const override = useManualAttendanceOverride();

  // Remarks dialog state
  const [remarksOpen, setRemarksOpen] = useState(false);
  const [remarksTarget, setRemarksTarget] = useState<{ id: string; name: string; status: string } | null>(null);

  // CI-assisted attendance (mark excused)
  const excuseMutation = useMutation({
    mutationFn: ({ attendanceId, remarks }: { attendanceId: string; remarks: string }) =>
      apiFetch(`/api/attendance/${attendanceId}/override`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'absent', remarks }),
      }),
    onSuccess: () => { refetch(); toast({ title: 'Marked Excused', description: 'Attendance updated with excused remark.' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const present = records.filter(r => r.status === 'present').length;
  const late = records.filter(r => r.status === 'late').length;
  const absent = records.filter(r => r.status === 'absent').length;
  const pending = records.filter(r => r.status === 'pending').length;

  async function handleQuickOverride(attendanceId: string, newStatus: 'present' | 'late' | 'absent') {
    try {
      await override.mutateAsync({ id: attendanceId, data: { status: newStatus } });
      toast({ title: 'Attendance Updated', description: `Status changed to ${newStatus}.` });
      refetch();
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Override failed', variant: 'destructive' });
    }
  }

  async function handleRemarksAndStatus(remarks: string, status: 'present' | 'late' | 'absent') {
    if (!remarksTarget) return;
    if (status === 'absent' && remarks.toLowerCase().includes('excused')) {
      await excuseMutation.mutateAsync({ attendanceId: remarksTarget.id, remarks });
    } else {
      await override.mutateAsync({ id: remarksTarget.id, data: { status, remarks } as any });
      refetch();
      toast({ title: 'Attendance Updated' });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/duties">
            <Button variant="ghost" size="sm" className="mb-1 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Duties
            </Button>
          </Link>
          <h2 className="text-3xl font-bold tracking-tight">Attendance Roster</h2>
          {schedule && (
            <p className="text-muted-foreground mt-1">
              {schedule.hospital?.name ?? schedule.hospitalId} · {schedule.department?.name ?? ''} · {schedule.dutyDate} · {schedule.startTime}–{schedule.endTime}
              {(schedule as any).dutyHours != null && ` · ${(schedule as any).dutyHours} duty hrs`}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {scheduleId && (
            <Button asChild variant="outline">
              <Link href={`/duties/${scheduleId}/bulk-verify`}>Bulk Verify Students</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card className="bg-muted/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold">{records.length}</p></div>
            <Users className="w-7 h-7 text-muted-foreground/30" />
          </CardContent>
        </Card>
        <Card className="border-emerald-300/50 bg-emerald-50/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div><p className="text-xs text-emerald-700">Present</p><p className="text-2xl font-bold text-emerald-700">{present}</p></div>
            <CheckCircle2 className="w-7 h-7 text-emerald-400/50" />
          </CardContent>
        </Card>
        <Card className="border-amber-300/50 bg-amber-50/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div><p className="text-xs text-amber-700">Late</p><p className="text-2xl font-bold text-amber-700">{late}</p></div>
            <Clock className="w-7 h-7 text-amber-400/50" />
          </CardContent>
        </Card>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div><p className="text-xs text-destructive">Absent{pending > 0 ? ` / ${pending} Pending` : ''}</p><p className="text-2xl font-bold text-destructive">{absent}</p></div>
            <AlertCircle className="w-7 h-7 text-destructive/30" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-4 border-b bg-muted/20">
          <CardTitle className="text-base">Student Verification Log</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Time In</TableHead>
                <TableHead>Time Out</TableHead>
                <TableHead>Verification</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    No attendance records yet.
                  </TableCell>
                </TableRow>
              ) : (
                records.map(r => {
                  const student = (r as any).student;
                  const name = student ? `${student.firstName} ${student.lastName}` : r.studentId;
                  const initials = student ? `${student.firstName[0]}${student.lastName[0]}` : '??';
                  const section = student?.section ?? '—';
                  const yearLevel = student?.yearLevel ? `Y${student.yearLevel}` : '';

                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{name}</p>
                            {r.remarks && <p className="text-xs text-muted-foreground italic truncate max-w-[140px]">{r.remarks}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {yearLevel && <span className="mr-1">{yearLevel}</span>}{section}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatTime(r.timeIn)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatTime((r as any).timeOut)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <VerifiedIcon ok={r.gpsVerified ?? false} label="GPS" />
                          <VerifiedIcon ok={r.faceVerified ?? false} label="Face" />
                        </div>
                      </TableCell>
                      <TableCell><StatusBadge status={r.status} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={() => {
                              setRemarksTarget({ id: r.id, name, status: r.status });
                              setRemarksOpen(true);
                            }}
                          >
                            Remarks
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline" className="h-8 px-2">
                                <ChevronDown className="w-3.5 h-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleQuickOverride(r.id, 'present')}>
                                <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" /> Mark Present
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleQuickOverride(r.id, 'late')}>
                                <Clock className="w-4 h-4 mr-2 text-amber-500" /> Mark Late
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleQuickOverride(r.id, 'absent')} className="text-destructive">
                                <XCircle className="w-4 h-4 mr-2" /> Mark Absent
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setRemarksTarget({ id: r.id, name, status: 'absent' });
                                  setRemarksOpen(true);
                                }}
                                className="text-muted-foreground"
                              >
                                <Shield className="w-4 h-4 mr-2" /> Mark Excused
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {remarksTarget && (
        <RemarksDialog
          open={remarksOpen}
          onClose={() => { setRemarksOpen(false); setRemarksTarget(null); }}
          onSave={handleRemarksAndStatus}
          initialStatus={remarksTarget.status}
          studentName={remarksTarget.name}
        />
      )}
    </div>
  );
}
