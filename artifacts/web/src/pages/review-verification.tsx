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
import { ArrowLeft, CheckCircle, XCircle, User, FileText, MapPin, ImageIcon } from 'lucide-react';

const mockVerification = {
  id: '3',
  student: {
    name: 'Ana Reyes',
    studentNo: '2021-00003',
    year: 3,
    section: 'B',
    program: 'BSN',
  },
  case: {
    name: 'OB-GYN Delivery Assist #1',
    category: 'Obstetrics & Gynecology',
    requiredCount: 5,
    currentCount: 4,
  },
  submission: {
    submittedAt: 'October 7, 2024 at 10:32 AM',
    schedule: 'October 6, 2024 — Day Shift (08:00–16:00)',
    hospital: 'St. Luke\'s Medical Center',
    department: 'OB-GYN Ward',
    notes:
      'Assisted with a normal spontaneous vaginal delivery. Patient was a 28-year-old G2P1 at 39 weeks AOG. All vital signs were within normal range. Placenta was delivered completely.',
    hasPhoto: false,
  },
};

export function ReviewVerificationPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [done, setDone] = useState(false);

  const s = mockVerification.student;
  const initials = s.name.split(' ').map((n) => n[0]).join('');

  function handleVerify() {
    toast({ title: 'Case Verified ✓', description: `${mockVerification.case.name} has been verified for ${s.name}.` });
    setDone(true);
    setTimeout(() => setLocation('/verifications'), 1500);
  }

  function handleRejectSubmit() {
    if (!rejectReason.trim()) return;
    toast({
      title: 'Case Rejected',
      description: `Verification rejected. Reason sent to ${s.name}.`,
      variant: 'destructive',
    });
    setRejectOpen(false);
    setDone(true);
    setTimeout(() => setLocation('/verifications'), 1500);
  }

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
                  <p className="font-semibold text-lg">{s.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {s.studentNo} · Year {s.year}, Section {s.section} · {s.program}
                  </p>
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
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Case Name</p>
                  <p className="font-medium mt-0.5">{mockVerification.case.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Category</p>
                  <p className="font-medium mt-0.5">{mockVerification.case.category}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Required Count</p>
                  <p className="font-medium mt-0.5">{mockVerification.case.requiredCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Current Count</p>
                  <p className="font-medium mt-0.5">{mockVerification.case.currentCount} <span className="text-muted-foreground text-sm">(before this submission)</span></p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submission Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4" />
                Submission Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Submitted At</p>
                  <p className="font-medium mt-0.5">{mockVerification.submission.submittedAt}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Schedule</p>
                  <p className="font-medium mt-0.5">{mockVerification.submission.schedule}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Hospital</p>
                  <p className="font-medium mt-0.5">{mockVerification.submission.hospital}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Department</p>
                  <p className="font-medium mt-0.5">{mockVerification.submission.department}</p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Student Notes</p>
                <p className="text-sm leading-relaxed bg-muted/50 rounded-lg p-3">{mockVerification.submission.notes}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Photo Evidence */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ImageIcon className="h-4 w-4" />
                Photo Evidence
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mockVerification.submission.hasPhoto ? (
                <img src="" alt="Evidence" className="w-full rounded-lg" />
              ) : (
                <div className="flex flex-col items-center justify-center h-40 bg-muted rounded-lg text-muted-foreground gap-2">
                  <ImageIcon className="h-8 w-8 opacity-30" />
                  <p className="text-sm">No photo submitted</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {done ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">Action submitted. Redirecting…</p>
                </div>
              ) : (
                <>
                  <Button
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
                    onClick={handleVerify}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Verify ✓
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full gap-2"
                    onClick={() => setRejectOpen(true)}
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
            <Button variant="destructive" onClick={handleRejectSubmit} disabled={!rejectReason.trim()}>
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
