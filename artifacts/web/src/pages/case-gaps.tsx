import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Download, CheckCircle, AlertTriangle } from 'lucide-react';

const caseTypes = [
  'Med-Surg',
  'Pediatrics',
  'OB-GYN',
  'Emergency',
  'Psychiatry',
  'Community',
];

const mockStudents = [
  { id: '1', name: 'Maria Santos',    studentNo: '2021-00001', year: 3, section: 'A', gaps: [0, 0, 1, 2, 0, 0] },
  { id: '2', name: 'Juan Dela Cruz',  studentNo: '2021-00002', year: 3, section: 'A', gaps: [3, 1, 2, 3, 2, 1] },
  { id: '3', name: 'Ana Reyes',       studentNo: '2021-00003', year: 3, section: 'B', gaps: [0, 0, 0, 1, 0, 0] },
  { id: '4', name: 'Carlos Garcia',   studentNo: '2021-00004', year: 2, section: 'C', gaps: [4, 3, 3, 4, 3, 3] },
  { id: '5', name: 'Liza Manalo',     studentNo: '2021-00005', year: 4, section: 'A', gaps: [0, 0, 0, 0, 1, 0] },
  { id: '6', name: 'Robert Cruz',     studentNo: '2021-00006', year: 2, section: 'D', gaps: [2, 1, 2, 2, 1, 2] },
  { id: '7', name: 'Patricia Lim',    studentNo: '2021-00007', year: 4, section: 'B', gaps: [0, 0, 0, 0, 0, 0] },
  { id: '8', name: 'Miguel Torres',   studentNo: '2021-00008', year: 1, section: 'A', gaps: [1, 2, 1, 2, 2, 1] },
  { id: '9', name: 'Sophia Bautista', studentNo: '2021-00009', year: 1, section: 'B', gaps: [0, 1, 0, 1, 0, 0] },
  { id: '10', name: 'Daniel Ramos',   studentNo: '2021-00010', year: 3, section: 'C', gaps: [3, 3, 4, 4, 3, 3] },
];

function totalGap(gaps: number[]) {
  return gaps.reduce((a, b) => a + b, 0);
}

function GapCell({ value }: { value: number }) {
  if (value === 0)
    return (
      <div className="flex justify-center">
        <CheckCircle className="h-4 w-4 text-emerald-500" />
      </div>
    );
  if (value <= 2)
    return (
      <div className="flex justify-center">
        <Badge className="bg-amber-500 hover:bg-amber-600 text-white min-w-[28px] justify-center">{value}</Badge>
      </div>
    );
  return (
    <div className="flex justify-center">
      <Badge variant="destructive" className="min-w-[28px] justify-center">{value}</Badge>
    </div>
  );
}

export function CaseGapsMatrixPage() {
  const { toast } = useToast();

  const atRisk = [...mockStudents]
    .sort((a, b) => totalGap(b.gaps) - totalGap(a.gaps))
    .slice(0, 3);

  function handleExport() {
    toast({ title: 'Export Started', description: 'Case gaps matrix is being exported.' });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Case Gaps Matrix</h2>
          <p className="text-muted-foreground mt-1">
            Students with deficient cases who need targeted rotation assignment.
          </p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-emerald-500" /> Complete</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-4 w-4 rounded bg-amber-500" /> 1–2 remaining</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-4 w-4 rounded bg-red-500" /> 3+ remaining</span>
      </div>

      {/* At-Risk Students */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          Top At-Risk Students
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {atRisk.map((s, i) => (
            <Card key={s.id} className="border-red-200">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-red-100 text-red-700 font-bold">
                      {s.name.split(' ').map((n) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold leading-tight">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.studentNo} · Yr {s.year}{s.section}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total gaps</span>
                  <Badge variant="destructive">{totalGap(s.gaps)} cases</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {caseTypes.map((ct, ci) =>
                    s.gaps[ci] > 0 ? (
                      <span key={ct} className="text-xs bg-red-50 text-red-700 border border-red-200 rounded px-1.5 py-0.5">
                        {ct}: {s.gaps[ci]}
                      </span>
                    ) : null
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Matrix Table */}
      <Card>
        <CardHeader>
          <CardTitle>Full Matrix — Cases Remaining Per Student</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Student</TableHead>
                {caseTypes.map((ct) => (
                  <TableHead key={ct} className="text-center min-w-[90px]">{ct}</TableHead>
                ))}
                <TableHead className="text-center">Total Gaps</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockStudents.map((s) => {
                const total = totalGap(s.gaps);
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{s.studentNo}</p>
                    </TableCell>
                    {s.gaps.map((g, gi) => (
                      <TableCell key={gi} className="text-center py-3">
                        <GapCell value={g} />
                      </TableCell>
                    ))}
                    <TableCell className="text-center">
                      {total === 0 ? (
                        <Badge className="bg-emerald-500 hover:bg-emerald-600">None</Badge>
                      ) : total <= 3 ? (
                        <Badge className="bg-amber-500 hover:bg-amber-600">{total}</Badge>
                      ) : (
                        <Badge variant="destructive">{total}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
