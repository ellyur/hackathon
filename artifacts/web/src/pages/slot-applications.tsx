import { useState } from 'react';
import { Link, useRoute } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, MapPin, Calendar, Users, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const mockSlot = {
  id: '1',
  hospital: 'St. Luke\'s Medical Center',
  department: 'Intensive Care Unit (ICU)',
  date: 'October 18, 2024',
  shift: 'Day Shift (08:00 AM – 04:00 PM)',
  capacity: 5,
};

type AppStatus = 'pending' | 'approved' | 'rejected';

const initialApplications = [
  { id: '1', studentNo: '2021-00001', name: 'Maria Santos', year: 3, section: 'A', hoursNeeded: 90, appliedAt: 'Oct 14, 2024 09:15', status: 'pending' as AppStatus },
  { id: '2', studentNo: '2021-00002', name: 'Juan Dela Cruz', year: 3, section: 'A', hoursNeeded: 275, appliedAt: 'Oct 14, 2024 10:22', status: 'approved' as AppStatus },
  { id: '3', studentNo: '2021-00003', name: 'Ana Reyes', year: 3, section: 'B', hoursNeeded: 45, appliedAt: 'Oct 14, 2024 11:05', status: 'pending' as AppStatus },
  { id: '4', studentNo: '2021-00004', name: 'Carlos Garcia', year: 2, section: 'C', hoursNeeded: 186, appliedAt: 'Oct 15, 2024 08:00', status: 'rejected' as AppStatus },
  { id: '5', studentNo: '2021-00005', name: 'Liza Manalo', year: 4, section: 'A', hoursNeeded: 182, appliedAt: 'Oct 15, 2024 09:30', status: 'approved' as AppStatus },
  { id: '6', studentNo: '2021-00006', name: 'Robert Cruz', year: 2, section: 'D', hoursNeeded: 135, appliedAt: 'Oct 15, 2024 14:45', status: 'pending' as AppStatus },
];

export function SlotApplicationsPage() {
  const { toast } = useToast();
  const [applications, setApplications] = useState(initialApplications);

  const pending = applications.filter((a) => a.status === 'pending').length;
  const approved = applications.filter((a) => a.status === 'approved').length;
  const rejected = applications.filter((a) => a.status === 'rejected').length;
  const atCapacity = approved >= mockSlot.capacity;

  function handleApprove(id: string) {
    if (atCapacity) {
      toast({ title: 'Capacity Reached', description: 'This slot is already at maximum capacity.', variant: 'destructive' });
      return;
    }
    setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'approved' as AppStatus } : a)));
    toast({ title: 'Application Approved', description: 'Student has been approved for this slot.' });
  }

  function handleReject(id: string) {
    setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'rejected' as AppStatus } : a)));
    toast({ title: 'Application Rejected', description: 'Student application has been rejected.', variant: 'destructive' });
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/slots">
          <Button variant="ghost" size="sm" className="mb-2 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Slots
          </Button>
        </Link>
        <h2 className="text-3xl font-bold tracking-tight">Slot Applications</h2>
        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{mockSlot.hospital} — {mockSlot.department}</span>
          <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{mockSlot.date}</span>
          <span className="flex items-center gap-1"><Users className="h-4 w-4" />{mockSlot.shift}</span>
        </div>
      </div>

      {atCapacity && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <p className="text-sm font-medium">This slot has reached maximum capacity ({mockSlot.capacity} students). Approving more requires increasing capacity.</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pending</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-amber-500">{pending}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Approved</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-emerald-600">{approved}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Rejected</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-red-600">{rejected}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Capacity</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{approved}<span className="text-base text-muted-foreground">/{mockSlot.capacity}</span></p>
            <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full ${atCapacity ? 'bg-red-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min((approved / mockSlot.capacity) * 100, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student #</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Year / Section</TableHead>
                <TableHead>Hours Needed</TableHead>
                <TableHead>Applied At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="font-mono text-sm">{app.studentNo}</TableCell>
                  <TableCell className="font-medium">{app.name}</TableCell>
                  <TableCell>Year {app.year} – {app.section}</TableCell>
                  <TableCell>{app.hoursNeeded} hrs</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{app.appliedAt}</TableCell>
                  <TableCell>
                    {app.status === 'pending' && <Badge variant="secondary">Pending</Badge>}
                    {app.status === 'approved' && <Badge className="bg-emerald-500 hover:bg-emerald-600">Approved</Badge>}
                    {app.status === 'rejected' && <Badge variant="destructive">Rejected</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    {app.status === 'pending' && (
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" onClick={() => handleApprove(app.id)} className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleReject(app.id)} className="gap-1">
                          <XCircle className="h-3 w-3" />
                          Reject
                        </Button>
                      </div>
                    )}
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
