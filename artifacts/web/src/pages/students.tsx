import { useState } from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Search, Download, AlertTriangle } from 'lucide-react';

const mockStudents = [
  { id: '1', studentNo: '2021-00001', firstName: 'Maria', lastName: 'Santos', year: 3, section: 'A', program: 'BSN', compliance: 82, hoursCompleted: 410, hoursRequired: 500 },
  { id: '2', studentNo: '2021-00002', firstName: 'Juan', lastName: 'Dela Cruz', year: 3, section: 'A', program: 'BSN', compliance: 45, hoursCompleted: 225, hoursRequired: 500 },
  { id: '3', studentNo: '2021-00003', firstName: 'Ana', lastName: 'Reyes', year: 3, section: 'B', program: 'BSN', compliance: 91, hoursCompleted: 455, hoursRequired: 500 },
  { id: '4', studentNo: '2021-00004', firstName: 'Carlos', lastName: 'Garcia', year: 2, section: 'C', program: 'BSN', compliance: 38, hoursCompleted: 114, hoursRequired: 300 },
  { id: '5', studentNo: '2021-00005', firstName: 'Liza', lastName: 'Manalo', year: 4, section: 'A', program: 'BSN', compliance: 74, hoursCompleted: 518, hoursRequired: 700 },
  { id: '6', studentNo: '2021-00006', firstName: 'Robert', lastName: 'Cruz', year: 2, section: 'D', program: 'BSN', compliance: 55, hoursCompleted: 165, hoursRequired: 300 },
  { id: '7', studentNo: '2021-00007', firstName: 'Patricia', lastName: 'Lim', year: 4, section: 'B', program: 'BSN', compliance: 88, hoursCompleted: 616, hoursRequired: 700 },
  { id: '8', studentNo: '2021-00008', firstName: 'Miguel', lastName: 'Torres', year: 1, section: 'A', program: 'BSN', compliance: 43, hoursCompleted: 43, hoursRequired: 100 },
  { id: '9', studentNo: '2021-00009', firstName: 'Sophia', lastName: 'Bautista', year: 1, section: 'B', program: 'BSN', compliance: 72, hoursCompleted: 72, hoursRequired: 100 },
  { id: '10', studentNo: '2021-00010', firstName: 'Daniel', lastName: 'Ramos', year: 3, section: 'C', program: 'BSN', compliance: 29, hoursCompleted: 145, hoursRequired: 500 },
];

export function StudentRosterPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');

  const filtered = mockStudents.filter((s) => {
    const matchSearch =
      s.firstName.toLowerCase().includes(search.toLowerCase()) ||
      s.lastName.toLowerCase().includes(search.toLowerCase()) ||
      s.studentNo.includes(search);
    const matchYear = yearFilter === 'all' || s.year.toString() === yearFilter;
    const matchSection = sectionFilter === 'all' || s.section === sectionFilter;
    return matchSearch && matchYear && matchSection;
  });

  function handleExport() {
    toast({ title: 'Export Started', description: 'Student roster export is being prepared.' });
  }

  function getProgressColor(compliance: number) {
    if (compliance < 50) return 'bg-red-500';
    if (compliance < 75) return 'bg-amber-500';
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
        <CardHeader>
          <CardTitle>Filter Students</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or student number..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Year Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                <SelectItem value="1">Year 1</SelectItem>
                <SelectItem value="2">Year 2</SelectItem>
                <SelectItem value="3">Year 3</SelectItem>
                <SelectItem value="4">Year 4</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sectionFilter} onValueChange={setSectionFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                <SelectItem value="A">Section A</SelectItem>
                <SelectItem value="B">Section B</SelectItem>
                <SelectItem value="C">Section C</SelectItem>
                <SelectItem value="D">Section D</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student #</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Year / Section</TableHead>
                <TableHead>Program</TableHead>
                <TableHead className="min-w-[160px]">Case Progress</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((student) => (
                <TableRow key={student.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-mono text-sm">{student.studentNo}</TableCell>
                  <TableCell>
                    <Link href={`/students/${student.id}`} className="font-medium hover:underline text-primary">
                      {student.lastName}, {student.firstName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    Year {student.year} – {student.section}
                  </TableCell>
                  <TableCell>{student.program}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getProgressColor(student.compliance)}`}
                          style={{ width: `${student.compliance}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-9 text-right">{student.compliance}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {student.hoursCompleted}/{student.hoursRequired}
                  </TableCell>
                  <TableCell>
                    {student.compliance < 50 ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        At Risk
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-500 hover:bg-emerald-600">On Track</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    No students match your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
