import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';

export function AttendanceRosterPage() {
  const students = [
    { name: 'Emma Thompson', timeIn: '07:55 AM', status: 'present', method: 'Biometric' },
    { name: 'Michael Chang', timeIn: '08:02 AM', status: 'late', method: 'Biometric' },
    { name: 'Sarah Miller', timeIn: '07:58 AM', status: 'present', method: 'Biometric' },
    { name: 'David Wilson', timeIn: null, status: 'absent', method: '-' },
    { name: 'Jessica Taylor', timeIn: '08:15 AM', status: 'present', method: 'CI Override' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Live Attendance Roster</h2>
          <p className="text-muted-foreground mt-1">St. Luke's ICU • Oct 15, 08:00 AM - 04:00 PM</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Print Roster</Button>
          <Button>End Duty Shift</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-muted/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Students</p>
              <p className="text-2xl font-bold">8</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-emerald-700">Present</p>
              <p className="text-2xl font-bold text-emerald-700">6</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-emerald-500 opacity-50" />
          </CardContent>
        </Card>
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-700">Late</p>
              <p className="text-2xl font-bold text-amber-700">1</p>
            </div>
            <Clock className="w-8 h-8 text-amber-500 opacity-50" />
          </CardContent>
        </Card>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-destructive">Absent</p>
              <p className="text-2xl font-bold text-destructive">1</p>
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
              {students.map((s, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback>{s.name.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{s.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{s.timeIn || '--:--'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{s.method}</TableCell>
                  <TableCell>
                    {s.status === 'present' && <Badge className="bg-emerald-500 hover:bg-emerald-600">Present</Badge>}
                    {s.status === 'late' && <Badge variant="outline" className="text-amber-600 border-amber-600 bg-amber-50">Late</Badge>}
                    {s.status === 'absent' && <Badge variant="destructive">Absent</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" className="h-8">Override</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
