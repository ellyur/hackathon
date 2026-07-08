import { Link, useRoute } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, MapPin, Calendar, Users, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useListSlotApplications, useReviewSlotApplication, useListSlots } from '@workspace/api-client-react';

export function SlotApplicationsPage() {
  const { toast } = useToast();
  const [, params] = useRoute('/slots/:id/applications');
  const slotId = params?.id ?? '';

  const { data: applications = [], isLoading: loadingApps, refetch } = useListSlotApplications(slotId, {
    query: { enabled: !!slotId } as any,
  });
  const { data: slots = [] } = useListSlots();
  const slot = slots.find((s) => s.id === slotId);

  const reviewApp = useReviewSlotApplication();

  const pending = applications.filter((a) => a.status === 'pending').length;
  const approved = applications.filter((a) => a.status === 'approved').length;
  const atCapacity = slot ? approved >= slot.maxStudents : false;

  async function handleApprove(appId: string) {
    if (atCapacity) {
      toast({ title: 'Capacity Reached', description: 'This slot is already at maximum capacity.', variant: 'destructive' });
      return;
    }
    try {
      await reviewApp.mutateAsync({ id: slotId, appId, data: { status: 'approved' } });
      toast({ title: 'Application Approved', description: 'Student has been approved for this slot.' });
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to approve';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  }

  async function handleReject(appId: string) {
    try {
      await reviewApp.mutateAsync({ id: slotId, appId, data: { status: 'rejected' } });
      toast({ title: 'Application Rejected', description: 'Student application has been rejected.', variant: 'destructive' });
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reject';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
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
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Slot Applications</h2>
        {slot && (
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />{slot.hospital?.name ?? slot.hospitalId} — {slot.department?.name ?? slot.departmentId}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />{slot.dutyDate}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />{slot.startTime} – {slot.endTime} · max {slot.maxStudents}
            </span>
          </div>
        )}
      </div>

      {atCapacity && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm font-medium">Slot is at full capacity ({slot?.maxStudents} approved). No more approvals allowed.</span>
        </div>
      )}

      {/* Summary badges */}
      <div className="flex gap-3 text-sm">
        <Badge variant="secondary">{pending} Pending</Badge>
        <Badge className="bg-emerald-500 hover:bg-emerald-600">{approved} Approved</Badge>
        <Badge variant="destructive">{applications.filter((a) => a.status === 'rejected').length} Rejected</Badge>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Applied At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingApps ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : applications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                    No applications yet.
                  </TableCell>
                </TableRow>
              ) : (
                applications.map((app) => {
                  const student = app.student;
                  const studentName = student ? `${student.firstName} ${student.lastName}` : app.studentId;

                  return (
                    <TableRow key={app.id}>
                      <TableCell>
                        <p className="font-medium">{studentName}</p>
                        <p className="text-xs text-muted-foreground font-mono">{app.studentId}</p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(app.appliedAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {app.status === 'pending' && <Badge variant="secondary">Pending</Badge>}
                        {app.status === 'approved' && <Badge className="bg-emerald-500 hover:bg-emerald-600">Approved</Badge>}
                        {app.status === 'rejected' && <Badge variant="destructive">Rejected</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        {app.status === 'pending' && (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(app.id)}
                              disabled={reviewApp.isPending || atCapacity}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1"
                            >
                              <CheckCircle className="h-3 w-3" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(app.id)}
                              disabled={reviewApp.isPending}
                              className="gap-1"
                            >
                              <XCircle className="h-3 w-3" />
                              Reject
                            </Button>
                          </div>
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
