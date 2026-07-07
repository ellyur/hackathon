import { useRoute } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CheckCircle2, XCircle, AlertCircle, Clock, Loader2 } from 'lucide-react';
import { useListAttendance, useGetSchedule, useManualAttendanceOverride } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';

export function AttendanceRosterPage() {
  const [, params] = useRoute('/duties/:id/attendance');
  const scheduleId = params?.id ?? '';
  const { toast } = useToast();

  const { data: schedule } = useGetSchedule(scheduleId, {
    query: { enabled: !!scheduleId } as any,
  });
  const { data: records = [], isLoading, refetch } = useListAttendance(
    { scheduleId },
    { query: { enabled: !!scheduleId } as any }
  );

  const override = useManualAttendanceOverride();

  const present = records.filter((r) => r.status === 'present').length;
  const late = records.filter((r) => r.status === 'late').length;
  const absent = records.filter((r) => r.status === 'absent').length;

  async function handleOverride(attendanceId: string, newStatus: 'present' | 'late' | 'absent') {
    try {
      await override.mutateAsync({
        id: attendanceId,
        data: { status: newStatus },
      });
      toast({ title: 'Attendance Updated', description: `Status changed to ${newStatus}.` });
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Override failed';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Live Attendance Roster</h2>
          {schedule && (
            <p className="text-muted-foreground mt-1">
              {schedule.hospital?.name ?? schedule.hospitalId} · {schedule.department?.name ?? ''} · {schedule.dutyDate} {schedule.startTime}–{schedule.endTime}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Print Roster</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-muted/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Students</p>
              <p className="text-2xl font-bold">{records.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-emerald-700">Present</p>
              <p className="text-2xl font-bold text-emerald-700">{present}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-emerald-500 opacity-50" />
          </CardContent>
        </Card>
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-700">Late</p>
              <p className="text-2xl font-bold text-amber-700">{late}</p>
            </div>
            <Clock className="w-8 h-8 text-amber-500 opacity-50" />
          </CardContent>
        </Card>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-destructive">Absent</p>
              <p className="text-2xl font-bold text-destructive">{absent}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-destructive opacity-50" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-4 border-b bg-muted/30">
          <CardTitle className="text-lg">Student Verification Log</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Time In</TableHead>
                <TableHead>Verification Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Manual Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    No attendance records yet.
                  </TableCell>
                </TableRow>
              ) : (
                records.map((r) => {
                  const name = r.student
                    ? `${r.student.firstName} ${r.student.lastName}`
                    : r.studentId;
                  const initials = r.student
                    ? `${r.student.firstName[0]}${r.student.lastName[0]}`
                    : '??';
                  const methodLabel =
                    r.method === 'biometric'
                      ? 'Biometric'
                      : r.method === 'ci_assisted'
                      ? 'CI Override'
                      : r.method === 'manual'
                      ? 'Manual'
                      : '—';

                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.timeIn ?? '--:--'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{methodLabel}</TableCell>
                      <TableCell>
                        {r.status === 'present' && <Badge className="bg-emerald-500 hover:bg-emerald-600">Present</Badge>}
                        {r.status === 'late' && (
                          <Badge variant="outline" className="text-amber-600 border-amber-600 bg-amber-50">Late</Badge>
                        )}
                        {r.status === 'absent' && <Badge variant="destructive">Absent</Badge>}
                        {r.status === 'pending' && <Badge variant="secondary">Pending</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() =>
                              handleOverride(r.id, r.status === 'present' ? 'absent' : 'present')
                            }
                            disabled={override.isPending}
                          >
                            Override
                          </Button>
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
    </div>
  );
}
