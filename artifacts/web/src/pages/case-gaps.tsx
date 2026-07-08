import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Download, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useGetCaseGaps } from '@workspace/api-client-react';

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
        <Badge variant="warning" className="min-w-[28px] justify-center">{value}</Badge>
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
  const { data: matrix, isLoading } = useGetCaseGaps();

  const cases = matrix?.cases ?? [];
  const students = matrix?.students ?? [];
  const gaps = matrix?.gaps ?? [];

  // Build a lookup: studentId → { caseId → remaining }
  const gapMap = new Map<string, Map<string, number>>();
  for (const g of gaps) {
    if (!gapMap.has(g.studentId)) gapMap.set(g.studentId, new Map());
    gapMap.get(g.studentId)!.set(g.caseId, g.remaining);
  }

  // Total gaps per student
  function totalGapForStudent(studentId: string) {
    const m = gapMap.get(studentId);
    if (!m) return 0;
    return Array.from(m.values()).reduce((a, b) => a + b, 0);
  }

  const atRisk = [...students]
    .sort((a, b) => totalGapForStudent(b.id) - totalGapForStudent(a.id))
    .slice(0, 3);

  function handleExport() {
    toast({ title: 'Export Started', description: 'Case gaps matrix is being exported.' });
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Case Gaps Matrix</h2>
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
      {atRisk.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Students with Most Gaps
          </h3>
          <div className="flex gap-3 flex-wrap">
            {atRisk.map((s) => {
              const total = totalGapForStudent(s.id);
              const initials = `${s.firstName[0]}${s.lastName[0]}`;
              return (
                <Card key={s.id} className="w-48 p-4 flex flex-col items-center gap-2">
                  <Avatar>
                    <AvatarFallback className="bg-destructive/10 text-destructive font-bold">{initials}</AvatarFallback>
                  </Avatar>
                  <p className="font-medium text-sm text-center">{s.firstName} {s.lastName}</p>
                  <Badge variant="destructive">{total} gaps</Badge>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Matrix Table */}
      <Card>
        <CardHeader>
          <CardTitle>Gap Matrix</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background z-10 min-w-[160px]">Student</TableHead>
                {cases.map((c) => (
                  <TableHead key={c.id} className="text-center text-xs min-w-[80px]">
                    {c.name.length > 15 ? c.name.slice(0, 15) + '…' : c.name}
                  </TableHead>
                ))}
                <TableHead className="text-center font-semibold">Total Gaps</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={cases.length + 2} className="text-center py-10 text-muted-foreground">
                    No gap data available.
                  </TableCell>
                </TableRow>
              ) : (
                students.map((s) => {
                  const total = totalGapForStudent(s.id);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="sticky left-0 bg-background z-10 font-medium">
                        {s.firstName} {s.lastName}
                      </TableCell>
                      {cases.map((c) => {
                        const remaining = gapMap.get(s.id)?.get(c.id) ?? 0;
                        return (
                          <TableCell key={c.id} className="text-center p-2">
                            <GapCell value={remaining} />
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center font-bold">
                        {total > 0 ? (
                          <Badge variant={total >= 3 ? 'destructive' : 'outline'}>{total}</Badge>
                        ) : (
                          <CheckCircle className="h-4 w-4 text-emerald-500 mx-auto" />
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
