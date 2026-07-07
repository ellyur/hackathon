import { useState } from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Clock, CheckCircle, ExternalLink } from 'lucide-react';

const mockVerifications = [
  { id: '1', student: 'Maria Santos',    studentNo: '2021-00001', caseName: 'Medical-Surgical Case #3',    submittedAt: 'Oct 13, 2024',  daysWaiting: 3, hospital: 'St. Luke\'s',     dept: 'ICU',        status: 'pending' },
  { id: '2', student: 'Juan Dela Cruz',  studentNo: '2021-00002', caseName: 'Pediatric Assessment #2',     submittedAt: 'Oct 9, 2024',   daysWaiting: 7, hospital: 'Medical City',   dept: 'Pediatrics', status: 'pending' },
  { id: '3', student: 'Ana Reyes',       studentNo: '2021-00003', caseName: 'OB-GYN Delivery Assist #1',   submittedAt: 'Oct 7, 2024',   daysWaiting: 9, hospital: 'St. Luke\'s',     dept: 'OB-GYN',     status: 'pending' },
  { id: '4', student: 'Carlos Garcia',   studentNo: '2021-00004', caseName: 'Emergency Triage #4',         submittedAt: 'Oct 12, 2024',  daysWaiting: 4, hospital: 'General Hospital', dept: 'ER',         status: 'pending' },
  { id: '5', student: 'Liza Manalo',     studentNo: '2021-00005', caseName: 'Psychiatric Eval #2',         submittedAt: 'Oct 8, 2024',   daysWaiting: 8, hospital: 'PGH',             dept: 'Psychiatry', status: 'pending' },
  { id: '6', student: 'Robert Cruz',     studentNo: '2021-00006', caseName: 'Community Health Visit #3',   submittedAt: 'Oct 14, 2024',  daysWaiting: 2, hospital: 'Barangay HC',     dept: 'Community',  status: 'pending' },
  { id: '7', student: 'Sophia Bautista', studentNo: '2021-00009', caseName: 'Medical-Surgical Case #1',    submittedAt: 'Oct 5, 2024',   daysWaiting: 11, hospital: 'General Hospital', dept: 'Med-Surg',  status: 'pending' },
  { id: '8', student: 'Daniel Ramos',    studentNo: '2021-00010', caseName: 'Pediatric Assessment #1',     submittedAt: 'Oct 10, 2024',  daysWaiting: 6, hospital: 'Medical City',   dept: 'Pediatrics', status: 'pending' },
];

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
  const { toast } = useToast();
  const [verifications, setVerifications] = useState(mockVerifications);

  const avgWait = Math.round(
    verifications.reduce((sum, v) => sum + v.daysWaiting, 0) / verifications.length
  );

  function handleBulkApprove() {
    const topThree = verifications
      .sort((a, b) => b.daysWaiting - a.daysWaiting)
      .slice(0, 3)
      .map((v) => v.id);
    toast({
      title: 'Bulk Approve Initiated',
      description: `Approving top 3 longest-waiting verifications (IDs: ${topThree.join(', ')}).`,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pending Verifications</h2>
          <p className="text-muted-foreground mt-1">Review and approve submitted clinical case completions.</p>
        </div>
        <Button onClick={handleBulkApprove}>
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
              {verifications.map((v) => (
                <TableRow key={v.id} className={getRowClass(v.daysWaiting)}>
                  <TableCell>
                    <p className="font-medium">{v.student}</p>
                    <p className="text-xs text-muted-foreground font-mono">{v.studentNo}</p>
                  </TableCell>
                  <TableCell className="text-sm">{v.caseName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{v.submittedAt}</TableCell>
                  <TableCell><WaitBadge days={v.daysWaiting} /></TableCell>
                  <TableCell>
                    <p className="text-sm">{v.hospital}</p>
                    <p className="text-xs text-muted-foreground">{v.dept}</p>
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
