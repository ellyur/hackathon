import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, ExternalLink, Loader2, ClipboardCheck, CheckCircle2 } from 'lucide-react';
import { useListDutyVerifications } from '@/hooks/use-duty-verifications';

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'waiting_ci':
      return <Badge variant="secondary" className="text-xs">Waiting for CI</Badge>;
    case 'pending_scheduler':
      return <Badge className="bg-amber-500 hover:bg-amber-600 text-xs">Pending Your Confirmation</Badge>;
    case 'officially_verified':
      return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-xs">Officially Verified</Badge>;
    default:
      return <Badge variant="outline" className="text-xs capitalize">{status.replace(/_/g, ' ')}</Badge>;
  }
}

function CIStatusBadge({ status }: { status: string }) {
  if (status === 'pending_scheduler' || status === 'officially_verified') {
    return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">CI Verified ✓</Badge>;
  }
  return <Badge variant="outline" className="text-xs text-amber-600">Awaiting CI</Badge>;
}

export function SchedulerDutyVerificationsPage() {
  const { data: pending = [], isLoading: loadingPending } = useListDutyVerifications('pending_scheduler');
  const { data: verified = [], isLoading: loadingVerified } = useListDutyVerifications('officially_verified');
  const { data: waiting = [], isLoading: loadingWaiting } = useListDutyVerifications('waiting_ci');

  const allVerifications = [...pending, ...verified, ...waiting];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Duty Verifications</h2>
        <p className="text-muted-foreground mt-1">
          Confirm duty verifications after receiving signed paper documents.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Pending Your Confirmation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{pending.length}</p>
            <p className="text-xs text-muted-foreground">awaiting paper docs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              Waiting for CI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{waiting.length}</p>
            <p className="text-xs text-muted-foreground">CI has not reviewed yet</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Officially Verified
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">{verified.length}</p>
            <p className="text-xs text-muted-foreground">completed this cycle</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Confirmation
            {pending.length > 0 && (
              <span className="ml-2 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {pending.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="waiting">Waiting for CI ({waiting.length})</TabsTrigger>
          <TabsTrigger value="verified">Verified ({verified.length})</TabsTrigger>
        </TabsList>

        {/* Pending Scheduler Confirmation */}
        <TabsContent value="pending" className="mt-4">
          <VerificationsTable
            rows={pending}
            isLoading={loadingPending}
            emptyMessage="No verifications pending your confirmation."
            emptyIcon="check"
          />
        </TabsContent>

        {/* Waiting for CI */}
        <TabsContent value="waiting" className="mt-4">
          <VerificationsTable
            rows={waiting}
            isLoading={loadingWaiting}
            emptyMessage="No requests are waiting for CI review."
          />
        </TabsContent>

        {/* Officially Verified */}
        <TabsContent value="verified" className="mt-4">
          <VerificationsTable
            rows={verified}
            isLoading={loadingVerified}
            emptyMessage="No verified duties yet."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function VerificationsTable({
  rows,
  isLoading,
  emptyMessage,
  emptyIcon,
}: {
  rows: any[];
  isLoading: boolean;
  emptyMessage: string;
  emptyIcon?: string;
}) {
  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Ward</TableHead>
              <TableHead>Hospital</TableHead>
              <TableHead>Duty Date</TableHead>
              <TableHead>Clinical Instructor</TableHead>
              <TableHead>CI Status</TableHead>
              <TableHead>Current Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  <ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    <p className="font-medium text-sm">
                      {v.student ? `${v.student.firstName} ${v.student.lastName}` : v.studentId}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm">{v.department?.name ?? '—'}</TableCell>
                  <TableCell className="text-sm">{v.hospital?.name ?? '—'}</TableCell>
                  <TableCell className="text-sm">{v.dutyDate}</TableCell>
                  <TableCell className="text-sm">
                    {v.ci ? `${v.ci.firstName} ${v.ci.lastName}` : '—'}
                  </TableCell>
                  <TableCell>
                    <CIStatusBadge status={v.status} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={v.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/duty-verifications/${v.id}`}>
                      <Button
                        size="sm"
                        variant={v.status === 'pending_scheduler' ? 'default' : 'outline'}
                        className="gap-1"
                      >
                        {v.status === 'pending_scheduler' ? (
                          <><CheckCircle2 className="h-3 w-3" /> Confirm</>
                        ) : (
                          <><ExternalLink className="h-3 w-3" /> View</>
                        )}
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
  );
}
