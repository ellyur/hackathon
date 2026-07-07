import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Clock, CheckCircle, CalendarCheck } from 'lucide-react';

type MakeupStatus = 'pending' | 'scheduled' | 'resolved';

const mockMakeupDuties = [
  { id: '1', studentName: 'Juan Dela Cruz', studentNo: '2021-00002', absenceDate: 'Oct 10, 2024', hospital: 'Medical City', dept: 'Pediatrics', reason: 'Medical emergency', daysPending: 16, status: 'pending' as MakeupStatus },
  { id: '2', studentName: 'Carlos Garcia', studentNo: '2021-00004', absenceDate: 'Oct 8, 2024', hospital: 'General Hospital', dept: 'Emergency Room', reason: 'Family bereavement', daysPending: 18, status: 'scheduled' as MakeupStatus },
  { id: '3', studentName: 'Daniel Ramos', studentNo: '2021-00010', absenceDate: 'Oct 12, 2024', hospital: 'St. Luke\'s', dept: 'ICU', reason: 'Illness (fever)', daysPending: 14, status: 'pending' as MakeupStatus },
  { id: '4', studentName: 'Miguel Torres', studentNo: '2021-00008', absenceDate: 'Oct 14, 2024', hospital: 'PGH', dept: 'Psychiatry', reason: 'Transportation issue', daysPending: 12, status: 'pending' as MakeupStatus },
  { id: '5', studentName: 'Robert Cruz', studentNo: '2021-00006', absenceDate: 'Oct 15, 2024', hospital: 'Medical City', dept: 'Surgery', reason: 'Personal emergency', daysPending: 11, status: 'scheduled' as MakeupStatus },
  { id: '6', studentName: 'Juan Dela Cruz', studentNo: '2021-00002', absenceDate: 'Sep 30, 2024', hospital: 'St. Luke\'s', dept: 'OB-GYN', reason: 'Medical emergency', daysPending: 26, status: 'resolved' as MakeupStatus },
  { id: '7', studentName: 'Sophia Bautista', studentNo: '2021-00009', absenceDate: 'Oct 16, 2024', hospital: 'General Hospital', dept: 'Med-Surg', reason: 'Illness (flu)', daysPending: 10, status: 'pending' as MakeupStatus },
  { id: '8', studentName: 'Daniel Ramos', studentNo: '2021-00010', absenceDate: 'Oct 7, 2024', hospital: 'PGH', dept: 'ICU', reason: 'Illness (dengue)', daysPending: 19, status: 'resolved' as MakeupStatus },
];

function PriorityBadge({ days }: { days: number }) {
  if (days > 14) return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />{days}d</Badge>;
  if (days >= 7) return <Badge className="bg-amber-500 hover:bg-amber-600 gap-1"><Clock className="h-3 w-3" />{days}d</Badge>;
  return <Badge variant="outline">{days}d</Badge>;
}

export function MakeupDutiesQueuePage() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [hospitalFilter, setHospitalFilter] = useState<string>('all');

  const hospitals = [...new Set(mockMakeupDuties.map((m) => m.hospital))];

  const filtered = mockMakeupDuties.filter((m) => {
    const matchStatus = statusFilter === 'all' || m.status === statusFilter;
    const matchHospital = hospitalFilter === 'all' || m.hospital === hospitalFilter;
    return matchStatus && matchHospital;
  });

  const totalInQueue = mockMakeupDuties.filter((m) => m.status !== 'resolved').length;
  const unresolvedOver7 = mockMakeupDuties.filter((m) => m.status !== 'resolved' && m.daysPending > 7).length;
  const resolvedThisWeek = mockMakeupDuties.filter((m) => m.status === 'resolved' && m.daysPending <= 7).length;

  function handleAssignSlot(studentName: string) {
    toast({ title: 'Redirecting to Slot Assignment', description: `Opening slot selection for ${studentName}.` });
  }

  function getRowClass(days: number, status: MakeupStatus) {
    if (status === 'resolved') return '';
    if (days > 14) return 'bg-red-50/50';
    if (days >= 7) return 'bg-amber-50/50';
    return '';
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Makeup Duties Queue</h2>
        <p className="text-muted-foreground mt-1">Track and assign makeup duties for students with unresolved absences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Total in Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalInQueue}</p>
            <p className="text-xs text-muted-foreground">pending + scheduled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-red-500" />
              Unresolved &gt; 7 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{unresolvedOver7}</p>
            <p className="text-xs text-muted-foreground">require immediate action</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              Resolved This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">{resolvedThisWeek}</p>
            <p className="text-xs text-muted-foreground">completed makeup duties</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <CardTitle>Queue List</CardTitle>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
              <Select value={hospitalFilter} onValueChange={setHospitalFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Hospital" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Hospitals</SelectItem>
                  {hospitals.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Absence Date</TableHead>
                <TableHead>Hospital / Dept</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Days Pending</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id} className={getRowClass(item.daysPending, item.status)}>
                  <TableCell>
                    <p className="font-medium">{item.studentName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{item.studentNo}</p>
                  </TableCell>
                  <TableCell>{item.absenceDate}</TableCell>
                  <TableCell>
                    <p className="text-sm">{item.hospital}</p>
                    <p className="text-xs text-muted-foreground">{item.dept}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{item.reason}</TableCell>
                  <TableCell><PriorityBadge days={item.daysPending} /></TableCell>
                  <TableCell>
                    {item.status === 'pending' && <Badge variant="secondary">Pending</Badge>}
                    {item.status === 'scheduled' && <Badge className="bg-blue-500 hover:bg-blue-600">Scheduled</Badge>}
                    {item.status === 'resolved' && <Badge className="bg-emerald-500 hover:bg-emerald-600">Resolved</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.status !== 'resolved' && (
                      <Button size="sm" variant="outline" onClick={() => handleAssignSlot(item.studentName)} className="gap-1">
                        <CalendarCheck className="h-3 w-3" />
                        Assign Slot
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No records match your filters.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
