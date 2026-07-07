import { Link, useRoute } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Clock, CheckCircle, CalendarDays, AlertTriangle } from 'lucide-react';

const mockStudent = {
  id: '1',
  studentNo: '2021-00001',
  firstName: 'Maria',
  lastName: 'Santos',
  year: 3,
  section: 'A',
  program: 'Bachelor of Science in Nursing',
  email: 'maria.santos@university.edu',
  hoursCompleted: 410,
  hoursRequired: 500,
  casesVerified: 28,
  casesRequired: 36,
  attendanceRate: 91,
  makeupOwed: 2,
};

const mockPassport = [
  { category: 'Medical-Surgical', completed: 8, required: 10 },
  { category: 'Pediatric Care', completed: 5, required: 6 },
  { category: 'Obstetrics & Gynecology', completed: 4, required: 5 },
  { category: 'Emergency & Critical Care', completed: 3, required: 5 },
  { category: 'Psychiatric Nursing', completed: 4, required: 5 },
  { category: 'Community Health', completed: 4, required: 5 },
];

const mockAttendance = [
  { id: '1', date: 'Oct 15, 2024', hospital: 'St. Luke\'s', dept: 'ICU', timeIn: '08:02', timeOut: '16:05', status: 'present' },
  { id: '2', date: 'Oct 12, 2024', hospital: 'General Hospital', dept: 'ER', timeIn: '16:00', timeOut: '00:03', status: 'present' },
  { id: '3', date: 'Oct 10, 2024', hospital: 'Medical City', dept: 'Pediatrics', timeIn: '—', timeOut: '—', status: 'absent' },
  { id: '4', date: 'Oct 8, 2024', hospital: 'St. Luke\'s', dept: 'OB-GYN', timeIn: '08:00', timeOut: '16:10', status: 'present' },
  { id: '5', date: 'Oct 5, 2024', hospital: 'PGH', dept: 'Psychiatry', timeIn: '08:05', timeOut: '15:58', status: 'present' },
  { id: '6', date: 'Oct 3, 2024', hospital: 'General Hospital', dept: 'Surgery', timeIn: '07:59', timeOut: '16:02', status: 'present' },
  { id: '7', date: 'Sep 30, 2024', hospital: 'Medical City', dept: 'ICU', timeIn: '—', timeOut: '—', status: 'absent' },
  { id: '8', date: 'Sep 28, 2024', hospital: 'St. Luke\'s', dept: 'ER', timeIn: '16:01', timeOut: '00:00', status: 'present' },
  { id: '9', date: 'Sep 25, 2024', hospital: 'PGH', dept: 'Med-Surg', timeIn: '08:00', timeOut: '16:00', status: 'present' },
  { id: '10', date: 'Sep 22, 2024', hospital: 'General Hospital', dept: 'Peds', timeIn: '08:03', timeOut: '16:05', status: 'present' },
];

const mockSchedules = [
  { id: '1', date: 'Oct 15, 2024', hospital: 'St. Luke\'s Medical Center', dept: 'Intensive Care Unit', shift: 'Day (08:00–16:00)', status: 'completed' },
  { id: '2', date: 'Oct 12, 2024', hospital: 'General Hospital', dept: 'Emergency Room', shift: 'Evening (16:00–00:00)', status: 'completed' },
  { id: '3', date: 'Oct 10, 2024', hospital: 'Medical City', dept: 'Pediatrics Ward', shift: 'Day (08:00–16:00)', status: 'absent' },
  { id: '4', date: 'Oct 8, 2024', hospital: 'St. Luke\'s Medical Center', dept: 'OB-GYN', shift: 'Day (08:00–16:00)', status: 'completed' },
  { id: '5', date: 'Oct 18, 2024', hospital: 'PGH', dept: 'Psychiatry', shift: 'Day (08:00–16:00)', status: 'upcoming' },
];

function StatusBadge({ status }: { status: string }) {
  if (status === 'present' || status === 'completed') return <Badge className="bg-emerald-500 hover:bg-emerald-600">Completed</Badge>;
  if (status === 'absent') return <Badge variant="destructive">Absent</Badge>;
  if (status === 'upcoming') return <Badge variant="secondary">Upcoming</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

export function StudentProfilePage() {
  const [, params] = useRoute('/students/:id');
  const initials = `${mockStudent.firstName[0]}${mockStudent.lastName[0]}`;
  const hoursPercent = Math.round((mockStudent.hoursCompleted / mockStudent.hoursRequired) * 100);
  const casesPercent = Math.round((mockStudent.casesVerified / mockStudent.casesRequired) * 100);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/students">
          <Button variant="ghost" size="sm" className="mb-2 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Student Roster
          </Button>
        </Link>
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 text-lg">
            <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xl">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-3xl font-bold tracking-tight">
                {mockStudent.firstName} {mockStudent.lastName}
              </h2>
              {mockStudent.hoursCompleted / mockStudent.hoursRequired < 0.5 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  At Risk
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              {mockStudent.studentNo} · Year {mockStudent.year}, Section {mockStudent.section} · {mockStudent.program}
            </p>
            <p className="text-sm text-muted-foreground">{mockStudent.email}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="passport">Clinical Passport</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="schedule">Schedule History</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Hours Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{mockStudent.hoursCompleted}</p>
                <p className="text-xs text-muted-foreground">of {mockStudent.hoursRequired} required</p>
                <Progress value={hoursPercent} className="mt-2 h-1.5" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Cases Verified
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{mockStudent.casesVerified}</p>
                <p className="text-xs text-muted-foreground">of {mockStudent.casesRequired} required</p>
                <Progress value={casesPercent} className="mt-2 h-1.5" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Attendance Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{mockStudent.attendanceRate}%</p>
                <p className="text-xs text-muted-foreground">of all scheduled duties</p>
                <Progress value={mockStudent.attendanceRate} className="mt-2 h-1.5" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Makeup Duties Owed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-amber-500">{mockStudent.makeupOwed}</p>
                <p className="text-xs text-muted-foreground">unresolved absences</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* CLINICAL PASSPORT */}
        <TabsContent value="passport" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Clinical Case Passport</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Case Category</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead className="w-48">Progress</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockPassport.map((row) => {
                    const pct = Math.round((row.completed / row.required) * 100);
                    return (
                      <TableRow key={row.category}>
                        <TableCell className="font-medium">{row.category}</TableCell>
                        <TableCell>{row.completed}</TableCell>
                        <TableCell>{row.required}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-8">{pct}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {pct >= 100 ? (
                            <Badge className="bg-emerald-500 hover:bg-emerald-600">Complete</Badge>
                          ) : (
                            <Badge variant="secondary">{row.required - row.completed} remaining</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ATTENDANCE */}
        <TabsContent value="attendance" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Attendance Records</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Hospital</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Time In</TableHead>
                    <TableHead>Time Out</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockAttendance.map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell>{rec.date}</TableCell>
                      <TableCell>{rec.hospital}</TableCell>
                      <TableCell>{rec.dept}</TableCell>
                      <TableCell className="font-mono text-sm">{rec.timeIn}</TableCell>
                      <TableCell className="font-mono text-sm">{rec.timeOut}</TableCell>
                      <TableCell>
                        {rec.status === 'present' ? (
                          <Badge className="bg-emerald-500 hover:bg-emerald-600">Present</Badge>
                        ) : (
                          <Badge variant="destructive">Absent</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SCHEDULE HISTORY */}
        <TabsContent value="schedule" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Schedule History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Hospital</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockSchedules.map((sched) => (
                    <TableRow key={sched.id}>
                      <TableCell>{sched.date}</TableCell>
                      <TableCell>{sched.hospital}</TableCell>
                      <TableCell>{sched.dept}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{sched.shift}</TableCell>
                      <TableCell><StatusBadge status={sched.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
