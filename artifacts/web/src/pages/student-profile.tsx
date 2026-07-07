import { Link, useRoute } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Clock, CheckCircle, CalendarDays, AlertTriangle, Loader2, Stethoscope } from 'lucide-react';
import {
  useGetUser,
  useGetStudentAttendance,
  useGetStudentPassport,
  useListSchedules,
} from '@workspace/api-client-react';

function StatusBadge({ status }: { status: string }) {
  if (status === 'present' || status === 'completed') return <Badge className="bg-emerald-500 hover:bg-emerald-600">Completed</Badge>;
  if (status === 'absent') return <Badge variant="destructive">Absent</Badge>;
  if (status === 'upcoming') return <Badge variant="secondary">Upcoming</Badge>;
  if (status === 'late') return <Badge className="bg-amber-500 hover:bg-amber-600">Late</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

export function StudentProfilePage() {
  const [, params] = useRoute('/students/:id');
  const studentId = params?.id ?? '';

  const { data: user, isLoading: loadingUser } = useGetUser(studentId, {
    query: { enabled: !!studentId },
  });
  const { data: attendance = [], isLoading: loadingAttendance } = useGetStudentAttendance(studentId, {
    query: { enabled: !!studentId },
  });
  const { data: passport, isLoading: loadingPassport } = useGetStudentPassport(studentId, {
    query: { enabled: !!studentId },
  });
  const { data: schedules = [], isLoading: loadingSchedules } = useListSchedules(
    { studentId },
    { query: { enabled: !!studentId } }
  );

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Student not found.{' '}
        <Link href="/students" className="underline text-foreground">Back to roster</Link>
      </div>
    );
  }

  const sp = user.studentProfile;
  const initials = `${user.firstName[0]}${user.lastName[0]}`;

  // Calculate stats from attendance
  const presentCount = attendance.filter((a) => a.status === 'present' || a.status === 'late').length;
  const attendanceRate = attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : 0;

  // Hours from passport
  const hoursCompleted = passport ? Math.round(passport.completedCases * 8) : 0; // rough approximation
  const hoursRequired = sp?.totalHoursRequired ?? 500;
  const hoursPercent = hoursRequired > 0 ? Math.min(Math.round((hoursCompleted / hoursRequired) * 100), 100) : 0;

  const overallCompletion = passport ? Math.round((passport.overallCompletion ?? 0) * 100) : 0;
  const isAtRisk = hoursPercent < 50 || attendanceRate < 70;

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
                {user.firstName} {user.lastName}
              </h2>
              {isAtRisk && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  At Risk
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              {sp?.studentNumber ?? '—'} · Year {sp?.yearLevel ?? '?'}, Section {sp?.section ?? '?'} · {sp?.program ?? '—'}
            </p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
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
                  Attendance Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{attendanceRate}%</p>
                <Progress value={attendanceRate} className="mt-2 h-1.5" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Case Completion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{overallCompletion}%</p>
                <Progress value={overallCompletion} className="mt-2 h-1.5" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Total Rotations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{schedules.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Absences
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-destructive">
                  {attendance.filter((a) => a.status === 'absent').length}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* CLINICAL PASSPORT */}
        <TabsContent value="passport" className="mt-4">
          {loadingPassport ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : !passport || passport.categories.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">No passport data available.</p>
          ) : (
            <div className="space-y-4">
              {passport.categories.map((cat, i) => (
                <Card key={i}>
                  <CardHeader className="bg-muted/30 border-b pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-primary" />
                        {cat.category}
                      </CardTitle>
                      <Badge variant="outline">{Math.round(cat.completionRate * 100)}% Complete</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Case</TableHead>
                          <TableHead className="text-center">Required</TableHead>
                          <TableHead className="text-center">Completed</TableHead>
                          <TableHead className="text-center">Verified</TableHead>
                          <TableHead className="text-center">Remaining</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cat.cases.map((c, j) => (
                          <TableRow key={j}>
                            <TableCell className="font-medium">{c.caseName}</TableCell>
                            <TableCell className="text-center text-muted-foreground">{c.required}</TableCell>
                            <TableCell className="text-center">{c.completed}</TableCell>
                            <TableCell className="text-center text-emerald-600 font-semibold">{c.verified}</TableCell>
                            <TableCell className="text-center">{c.remaining}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ATTENDANCE */}
        <TabsContent value="attendance" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loadingAttendance ? (
                <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time In</TableHead>
                      <TableHead>Time Out</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">No attendance records.</TableCell>
                      </TableRow>
                    ) : (
                      attendance.map((rec) => (
                        <TableRow key={rec.id}>
                          <TableCell className="font-mono text-xs text-muted-foreground">{rec.scheduleId.slice(0, 8)}</TableCell>
                          <TableCell className="text-muted-foreground">{rec.timeIn ?? '—'}</TableCell>
                          <TableCell className="text-muted-foreground">{rec.timeOut ?? '—'}</TableCell>
                          <TableCell><StatusBadge status={rec.status} /></TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SCHEDULE HISTORY */}
        <TabsContent value="schedule" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loadingSchedules ? (
                <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : (
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
                    {schedules.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No schedule history.</TableCell>
                      </TableRow>
                    ) : (
                      schedules.map((sched) => (
                        <TableRow key={sched.id}>
                          <TableCell>{sched.dutyDate}</TableCell>
                          <TableCell>{sched.hospital?.name ?? sched.hospitalId}</TableCell>
                          <TableCell>{sched.department?.name ?? sched.departmentId}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {sched.startTime}–{sched.endTime}
                          </TableCell>
                          <TableCell><StatusBadge status={sched.status} /></TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
