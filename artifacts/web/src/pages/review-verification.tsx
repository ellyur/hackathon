import { useState } from 'react';
import { Link, useRoute, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CheckCircle, XCircle, User, FileText, MapPin, Loader2 } from 'lucide-react';
import {
  useListCaseCompletions,
  useVerifyCaseCompletion,
  useRejectCaseCompletion,
} from '@workspace/api-client-react';

export function ReviewVerificationPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/verifications/:id');
  const completionId = params?.id ?? '';

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [done, setDone] = useState(false);

  // Load the list of pending completions and find the one matching the route id
  const { data: completions = [], isLoading } = useListCaseCompletions({ status: 'pending' });
  const completion = completions.find((c) => c.id === completionId);

  const verify = useVerifyCaseCompletion();
  const reject = useRejectCaseCompletion();

  async function handleVerify() {
    try {
      await verify.mutateAsync({ id: completionId });
      toast({ title: 'Case Verified ✓', description: 'The case completion has been verified.' });
      setDone(true);
      setTimeout(() => setLocation('/verifications'), 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to verify';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  }

  async function handleRejectSubmit() {
    if (!rejectReason.trim()) return;
    try {
      await reject.mutateAsync({ id: completionId, data: { rejectionReason: rejectReason } });
      toast({
        title: 'Case Rejected',
        description: 'Rejection reason has been sent to the student.',
        variant: 'destructive',
      });
      setRejectOpen(false);
      setDone(true);
      setTimeout(() => setLocation('/verifications'), 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reject';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!completion) {
    return (
      <div className="text-center py-20 text-muted-foreground space-y-4">
        <p>Submission not found or already reviewed.</p>
        <Button asChild variant="outline">
          <Link href="/verifications">Back to Pending Verifications</Link>
        </Button>
      </div>
    );
  }

  const student = completion.student;
  const studentName = student ? `${student.firstName} ${student.lastName}` : completion.studentId;
  const initials = student
    ? `${student.firstName[0]}${student.lastName[0]}`
    : '??';

  return (
    <div className="space-y-6">
      <div>
        <Link href="/verifications">
          <Button variant="ghost" size="sm" className="mb-2 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Pending Verifications
          </Button>
        </Link>
        <h2 className="text-3xl font-bold tracking-tight">Review Case Verification</h2>
        <p className="text-muted-foreground mt-1">Verify or reject this student's submitted case completion.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="space-y-4 lg:col-span-2">
          {/* Student Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                Student Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-lg">{studentName}</p>
                  <p className="text-sm text-muted-foreground">{completion.studentId}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Case Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                Case Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Case Name</p>
                <p className="font-medium">{completion.clinicalCase?.name ?? completion.clinicalCaseId}</p>
              </div>
              {completion.clinicalCase?.category && (
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="font-medium">{completion.clinicalCase.category}</p>
                </div>
              )}
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Submitted At</p>
                <p className="font-medium">{new Date(completion.submittedAt).toLocaleString()}</p>
              </div>
              {completion.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm border rounded-md p-3 bg-muted/30">{completion.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Hospital</p>
                <p className="font-medium">{completion.hospital?.name ?? completion.hospitalId ?? '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Department</p>
                <p className="font-medium">{completion.department?.name ?? completion.departmentId ?? '—'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column — Actions */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Verification Decision</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge variant="secondary" className="w-full justify-center py-1">
                Status: Pending Review
              </Badge>
              <Separator />
              {done ? (
                <p className="text-sm text-muted-foreground text-center py-4">Redirecting…</p>
              ) : (
                <>
                  <Button
                    className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
                    onClick={handleVerify}
                    disabled={verify.isPending || reject.isPending}
                  >
                    {verify.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    Verify ✓
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full gap-2"
                    onClick={() => setRejectOpen(true)}
                    disabled={verify.isPending || reject.isPending}
                  >
                    <XCircle className="h-4 w-4" />
                    Reject ✗
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Verifying will add +1 to the student's case count.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Rejection Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Case Verification</DialogTitle>
            <DialogDescription>
              Provide a reason for rejection. This will be sent to the student.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter rejection reason..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectSubmit}
              disabled={!rejectReason.trim() || reject.isPending}
            >
              {reject.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
