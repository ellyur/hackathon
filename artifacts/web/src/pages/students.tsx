import { useState } from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Search, Download, AlertTriangle, Loader2 } from 'lucide-react';
import { useListStudents } from '@workspace/api-client-react';

export function StudentRosterPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');

  const { data: students = [], isLoading } = useListStudents(
    search ? { search } : undefined
  );

  function handleExport() {
    toast({ title: 'Export Started', description: 'Student roster export is being prepared.' });
  }

  function getProgressColor(rate: number) {
    if (rate < 50) return 'bg-red-500';
    if (rate < 75) return 'bg-amber-500';
    return 'bg-emerald-500';
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Student Roster</h2>
          <p className="text-muted-foreground mt-1">Monitor case progress and compliance across all students.</p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      <Card>
        <CardHeader className="p-4 border-b">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or student no..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <CardTitle className="sr-only">Students Table</CardTitle>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student No.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Year / Section</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Case Completion</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    No students found.
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student) => {
                  const rate = Math.round((student.caseCompletionRate ?? 0) * 100);
                  const hoursCompleted = student.totalHoursCompleted ?? 0;
                  const hoursRequired = student.totalHoursRequired ?? student.studentProfile?.totalHoursRequired ?? 500;
                  const studentNo = student.studentProfile?.studentNumber ?? '—';
                  const yearLevel = student.studentProfile?.yearLevel;
                  const section = student.studentProfile?.section ?? '—';
                  const program = student.studentProfile?.program ?? '—';

                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-mono text-sm">{studentNo}</TableCell>
                      <TableCell>
                        <Link href={`/students/${student.id}`} className="font-medium hover:underline text-primary">
                          {student.lastName}, {student.firstName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {yearLevel ? `Year ${yearLevel}` : '—'} – {section}
                      </TableCell>
                      <TableCell>{program}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${getProgressColor(rate)}`}
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-9 text-right">{rate}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {hoursCompleted}/{hoursRequired}
                      </TableCell>
                      <TableCell>
                        {student.isAtRisk ? (
                          <Badge variant="destructive" className="gap-1">
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
    </div>
  );
}
