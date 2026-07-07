import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, CheckCircle, ExternalLink, Loader2 } from 'lucide-react';
import { useListCaseCompletions } from '@workspace/api-client-react';

function daysSince(dateStr: string) {
  const submitted = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24));
}

function getRowClass(days: number) {
  if (days > 7) return 'bg-red-50/50';
  if (days > 3) return 'bg-amber-50/50';
  return '';
}

function WaitBadge({ days }: { days: number }) {
  if (days > 7) return <Badge variant="destructive">{days}d</Badge>;
  if (days > 3) return <Badge className="bg-amber-500 hover:bg-amber-600">{days}d</Badge>;
  return <Badge variant="outline">{days}d</Badge>;
}

export function PendingVerificationsPage() {
  const { data: completions = [], isLoading } = useListCaseCompletions({ status: 'pending' });

  // Enrich with computed daysWaiting
  const verifications = completions.map((v) => ({
    ...v,
    daysWaiting: daysSince(v.submittedAt),
  }));

  const avgWait = verifications.length > 0
    ? Math.round(verifications.reduce((sum, v) => sum + v.daysWaiting, 0) / verifications.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pending Verifications</h2>
          <p className="text-muted-foreground mt-1">Review and approve submitted clinical case completions.</p>
        </div>
        <Button disabled className="gap-2">
          <CheckCircle className="h-4 w-4 mr-2" />
          Bulk Approve Top 3
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Total Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{verifications.length}</p>
            <p className="text-xs text-muted-foreground">awaiting review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-red-500" />
              Average Wait Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{avgWait} days</p>
            <p className="text-xs text-muted-foreground">since submission</p>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded bg-red-100 border border-red-300" /> &gt;7 days overdue</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded bg-amber-100 border border-amber-300" /> 3–7 days</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded bg-white border" /> &lt;3 days</span>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Case Name</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Wait</TableHead>
                <TableHead>Hospital / Dept</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : verifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No pending verifications. You're all caught up!
                  </TableCell>
                </TableRow>
              ) : (
                verifications.map((v) => (
                  <TableRow key={v.id} className={getRowClass(v.daysWaiting)}>
                    <TableCell>
                      <p className="font-medium">
                        {v.student ? `${v.student.firstName} ${v.student.lastName}` : v.studentId}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">{v.studentId}</p>
                    </TableCell>
                    <TableCell className="text-sm">{v.clinicalCase?.name ?? v.clinicalCaseId}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(v.submittedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell><WaitBadge days={v.daysWaiting} /></TableCell>
                    <TableCell>
                      <p className="text-sm">{v.hospital?.name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{v.department?.name ?? '—'}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/verifications/${v.id}`}>
                        <Button size="sm" variant="outline" className="gap-1">
                          <ExternalLink className="h-3 w-3" />
                          Review
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
