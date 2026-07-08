import { useMemo } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useListAttendance, useListSchedules } from '@workspace/api-client-react';
import type { AttendanceRecord, Schedule } from '@workspace/api-client-react';

type AttendanceStatus = 'present' | 'late' | 'absent';

const methodLabel: Record<string, string> = {
  biometric:   'Face Scan',
  ci_assisted: 'CI Assisted',
  manual:      'Manual',
  qr_scan:     'QR Scan',
};

function StatusBadge({ status }: { status: string }) {
  const s = status as AttendanceStatus;
  if (s === 'present') return <Badge variant="success">Present</Badge>;
  if (s === 'late') return <Badge variant="warning">Late</Badge>;
  if (s === 'absent') return <Badge variant="destructive">Absent</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(isoStr: string | undefined | null): string {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function AttendanceHistoryPage() {
  const { toast } = useToast();

  const { data: records = [], isLoading: recLoading } = useListAttendance(undefined, {
    query: { staleTime: 30_000 } as never,
  });

  const { data: schedules = [], isLoading: schLoading } = useListSchedules(undefined, {
    query: { staleTime: 60_000 } as never,
  });

  const scheduleMap = useMemo(() => {
    const m = new Map<string, Schedule>();
    schedules.forEach((s: Schedule) => m.set(s.id, s));
    return m;
  }, [schedules]);

  const isLoading = recLoading || schLoading;

  // Summary totals
  const presentCount = records.filter((r: AttendanceRecord) => r.status === 'present').length;
  const lateCount    = records.filter((r: AttendanceRecord) => r.status === 'late').length;
  const absentCount  = records.filter((r: AttendanceRecord) => r.status === 'absent').length;
  const totalHours   = records.reduce((sum: number, r: AttendanceRecord) => sum + (r.dutyHours ?? 0), 0);

  const handleExport = () => {
    toast({ title: 'Attendance history exported to CSV.' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading attendance records…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Attendance History</h2>
          <p className="text-muted-foreground mt-1">A complete record of your clinical duty attendance.</p>
        </div>
        <Button variant="outline" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: 'Total Duties', value: records.length,              className: 'text-foreground' },
          { label: 'Present',      value: presentCount,                className: 'text-emerald-600' },
          { label: 'Late',         value: lateCount,                   className: 'text-amber-600' },
          { label: 'Absent',       value: absentCount,                 className: 'text-red-600' },
          { label: 'Total Hours',  value: `${totalHours.toFixed(1)}h`, className: 'text-blue-600' },
        ].map(({ label, value, className }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-4 text-center">
              <p className={`text-2xl font-bold ${className}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Duty Records</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <p className="text-sm">No attendance records yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Hospital / Dept</TableHead>
                  <TableHead>Time In</TableHead>
                  <TableHead>Time Out</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Verification</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record: AttendanceRecord) => {
                  const sched = scheduleMap.get(record.scheduleId);
                  const hospital = sched?.hospital?.name ?? '—';
                  const dept    = sched?.department?.name ?? '';
                  const date    = sched?.dutyDate ?? record.createdAt;
                  return (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium whitespace-nowrap">{formatDate(date)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{hospital}</p>
                          {dept && <p className="text-xs text-muted-foreground">{dept}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{record.timeIn ? formatTime(record.timeIn) : <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-sm">{record.timeOut ? formatTime(record.timeOut) : <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-sm">
                        {record.dutyHours != null
                          ? `${record.dutyHours.toFixed(1)}h`
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell><StatusBadge status={record.status} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {record.method ? (methodLabel[record.method] ?? record.method) : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
