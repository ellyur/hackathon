import { Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused';
type VerificationMethod = 'qr_scan' | 'ci_assisted' | 'manual_override';

interface AttendanceRecord {
  id: string;
  date: string;
  hospital: string;
  department: string;
  timeIn: string | null;
  timeOut: string | null;
  hours: number | null;
  status: AttendanceStatus;
  verificationMethod: VerificationMethod | null;
}

const mockAttendance: AttendanceRecord[] = [
  { id: 'a1', date: '2024-06-18', hospital: 'St. Luke\'s Medical Center', department: 'Internal Medicine', timeIn: '06:55 AM', timeOut: '03:02 PM', hours: 8.1, status: 'present', verificationMethod: 'qr_scan' },
  { id: 'a2', date: '2024-06-17', hospital: 'Philippine General Hospital', department: 'Pediatrics', timeIn: '07:18 AM', timeOut: '03:00 PM', hours: 7.7, status: 'late', verificationMethod: 'qr_scan' },
  { id: 'a3', date: '2024-06-15', hospital: 'Makati Medical Center', department: 'Cardiology', timeIn: null, timeOut: null, hours: null, status: 'absent', verificationMethod: null },
  { id: 'a4', date: '2024-06-13', hospital: 'UST Hospital', department: 'Surgery', timeIn: '06:58 AM', timeOut: '03:05 PM', hours: 8.1, status: 'present', verificationMethod: 'ci_assisted' },
  { id: 'a5', date: '2024-06-12', hospital: 'Ospital ng Maynila', department: 'Emergency', timeIn: '11:02 PM', timeOut: '07:00 AM', hours: 8.0, status: 'present', verificationMethod: 'qr_scan' },
  { id: 'a6', date: '2024-06-10', hospital: 'St. Luke\'s Medical Center', department: 'Neurology', timeIn: '07:00 AM', timeOut: '03:00 PM', hours: 8.0, status: 'present', verificationMethod: 'qr_scan' },
  { id: 'a7', date: '2024-06-08', hospital: 'Philippine General Hospital', department: 'OB-GYN', timeIn: '07:05 AM', timeOut: '03:00 PM', hours: 7.9, status: 'late', verificationMethod: 'qr_scan' },
  { id: 'a8', date: '2024-06-06', hospital: 'Makati Medical Center', department: 'Radiology', timeIn: '06:50 AM', timeOut: '02:55 PM', hours: 8.1, status: 'present', verificationMethod: 'manual_override' },
  { id: 'a9', date: '2024-06-04', hospital: 'UST Hospital', department: 'Orthopedics', timeIn: null, timeOut: null, hours: null, status: 'excused', verificationMethod: null },
  { id: 'a10', date: '2024-06-02', hospital: 'Ospital ng Maynila', department: 'Psychiatry', timeIn: '07:00 AM', timeOut: '03:00 PM', hours: 8.0, status: 'present', verificationMethod: 'qr_scan' },
];

const statusConfig: Record<AttendanceStatus, { label: string; className: string }> = {
  present: { label: 'Present', className: 'bg-emerald-500 text-white' },
  late: { label: 'Late', className: 'bg-amber-100 text-amber-700' },
  absent: { label: 'Absent', className: '' },
  excused: { label: 'Excused', className: 'bg-slate-100 text-slate-600' },
};

const verificationLabel: Record<VerificationMethod, string> = {
  qr_scan: 'QR Scan',
  ci_assisted: 'CI Assisted',
  manual_override: 'Manual',
};

function StatusBadge({ status }: { status: AttendanceStatus }) {
  const config = statusConfig[status];
  if (status === 'absent') return <Badge variant="destructive">{config.label}</Badge>;
  return <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${config.className}`}>{config.label}</span>;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export function AttendanceHistoryPage() {
  const { toast } = useToast();

  const total = mockAttendance.length;
  const present = mockAttendance.filter((a) => a.status === 'present').length;
  const late = mockAttendance.filter((a) => a.status === 'late').length;
  const absent = mockAttendance.filter((a) => a.status === 'absent').length;
  const totalHours = mockAttendance.reduce((sum, a) => sum + (a.hours ?? 0), 0);

  const handleExport = () => {
    toast({ title: 'Attendance history exported to CSV.' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Attendance History</h2>
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
          { label: 'Total Duties', value: total, className: 'text-foreground' },
          { label: 'Present', value: present, className: 'text-emerald-600' },
          { label: 'Late', value: late, className: 'text-amber-600' },
          { label: 'Absent', value: absent, className: 'text-red-600' },
          { label: 'Total Hours', value: `${totalHours.toFixed(1)}h`, className: 'text-blue-600' },
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
        <CardContent className="p-0">
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
              {mockAttendance.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium whitespace-nowrap">{formatDate(record.date)}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{record.hospital}</p>
                      <p className="text-xs text-muted-foreground">{record.department}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{record.timeIn ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-sm">{record.timeOut ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-sm">{record.hours != null ? `${record.hours.toFixed(1)}h` : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell><StatusBadge status={record.status} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {record.verificationMethod ? verificationLabel[record.verificationMethod] : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
