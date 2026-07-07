import { useState } from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CheckCircle2, XCircle, Clock, FileText } from 'lucide-react';

type Status = 'pending' | 'verified' | 'rejected';

interface Submission {
  id: string;
  studentName: string;
  studentNumber: string;
  caseName: string;
  submittedAt: string;
  notes: string;
  photoUrl?: string;
  status: Status;
}

const INITIAL_SUBMISSIONS: Submission[] = [
  {
    id: '1',
    studentName: 'Emma Thompson',
    studentNumber: '2021-00123',
    caseName: 'Normal Spontaneous Delivery (NSD)',
    submittedAt: 'Oct 15, 2024 – 09:42 AM',
    notes: 'Patient G2P1, uncomplicated delivery. Performed with supervision.',
    photoUrl: 'https://placehold.co/400x200/e2e8f0/94a3b8?text=Evidence+Photo',
    status: 'pending',
  },
  {
    id: '2',
    studentName: 'Michael Chang',
    studentNumber: '2021-00456',
    caseName: 'IV Cannula Insertion',
    submittedAt: 'Oct 15, 2024 – 10:05 AM',
    notes: 'Right antecubital vein, 18G, first attempt successful.',
    status: 'pending',
  },
  {
    id: '3',
    studentName: 'Sarah Miller',
    studentNumber: '2021-00789',
    caseName: 'Foley Catheter Insertion',
    submittedAt: 'Oct 15, 2024 – 10:30 AM',
    notes: 'Post-op patient, 16Fr catheter, sterile technique maintained.',
    photoUrl: 'https://placehold.co/400x200/e2e8f0/94a3b8?text=Evidence+Photo',
    status: 'pending',
  },
  {
    id: '4',
    studentName: 'David Wilson',
    studentNumber: '2021-00321',
    caseName: 'Cardiopulmonary Resuscitation (CPR)',
    submittedAt: 'Oct 15, 2024 – 11:15 AM',
    notes: 'Simulation lab CPR demonstration, 2 full cycles.',
    status: 'pending',
  },
  {
    id: '5',
    studentName: 'Jessica Taylor',
    studentNumber: '2021-00654',
    caseName: 'Nasogastric Tube Insertion (NGT)',
    submittedAt: 'Oct 15, 2024 – 11:50 AM',
    notes: 'Patient NPO pre-op. Size 16 NGT inserted, placement confirmed.',
    photoUrl: 'https://placehold.co/400x200/e2e8f0/94a3b8?text=Evidence+Photo',
    status: 'pending',
  },
];

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export function VerifyCasePage() {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>(INITIAL_SUBMISSIONS);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const verified = submissions.filter((s) => s.status === 'verified').length;
  const rejected = submissions.filter((s) => s.status === 'rejected').length;
  const pending = submissions.filter((s) => s.status === 'pending').length;

  function handleVerify(id: string) {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'verified' } : s))
    );
    toast({ title: 'Case Verified', description: 'The submission has been marked as verified.' });
  }

  function handleRejectConfirm() {
    if (!rejectTarget) return;
    setSubmissions((prev) =>
      prev.map((s) => (s.id === rejectTarget ? { ...s, status: 'rejected' } : s))
    );
    toast({
      title: 'Case Rejected',
      description: 'The submission has been rejected with a reason.',
      variant: 'destructive',
    });
    setRejectTarget(null);
    setRejectReason('');
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/duties" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to My Duties
        </Link>
        <h2 className="text-3xl font-bold tracking-tight">Verify Student Cases</h2>
        <p className="text-muted-foreground mt-1">
          St. Luke's Medical Center · ICU · Oct 15, 2024 · 08:00 AM – 04:00 PM
        </p>
      </div>

      {/* Summary bar */}
      <div className="flex flex-wrap gap-3">
        <Badge variant="secondary" className="text-sm px-3 py-1.5">
          <Clock className="w-3.5 h-3.5 mr-1" /> {pending} Pending
        </Badge>
        <Badge className="bg-emerald-500 text-white text-sm px-3 py-1.5 hover:bg-emerald-600">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> {verified} Verified
        </Badge>
        <Badge variant="destructive" className="text-sm px-3 py-1.5">
          <XCircle className="w-3.5 h-3.5 mr-1" /> {rejected} Rejected
        </Badge>
      </div>

      <div className="space-y-4">
        {submissions.map((sub) => (
          <Card key={sub.id} className={sub.status !== 'pending' ? 'opacity-70' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {initials(sub.studentName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold leading-tight">{sub.studentName}</p>
                    <p className="text-xs text-muted-foreground">{sub.studentNumber}</p>
                  </div>
                </div>
                {sub.status === 'pending' && <Badge variant="secondary">Pending Review</Badge>}
                {sub.status === 'verified' && (
                  <Badge className="bg-emerald-500 text-white hover:bg-emerald-600">Verified</Badge>
                )}
                {sub.status === 'rejected' && <Badge variant="destructive">Rejected</Badge>}
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium text-sm">{sub.caseName}</span>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Submitted: {sub.submittedAt}
              </p>
              {sub.notes && (
                <div className="bg-muted/40 rounded-md p-3 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Notes: </span>{sub.notes}
                </div>
              )}
              {sub.photoUrl && (
                <img
                  src={sub.photoUrl}
                  alt="Evidence"
                  className="rounded-md border w-full max-w-sm object-cover"
                />
              )}
              {sub.status === 'pending' && (
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1"
                    onClick={() => handleVerify(sub.id)}
                  >
                    <CheckCircle2 className="w-4 h-4" /> Verify ✓
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1"
                    onClick={() => setRejectTarget(sub.id)}
                  >
                    <XCircle className="w-4 h-4" /> Reject ✗
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reject Dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) setRejectTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Case Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="reject-reason">Rejection Reason <span className="text-destructive">*</span></Label>
            <Textarea
              id="reject-reason"
              placeholder="Explain why this submission is being rejected..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={!rejectReason.trim()}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
