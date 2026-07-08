import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Clock, CheckCircle, CalendarCheck, Loader2 } from 'lucide-react';
import { useGetMakeupQueue } from '@workspace/api-client-react';

function PriorityBadge({ days }: { days: number }) {
  if (days > 14) return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />{days}d</Badge>;
  if (days >= 7) return <Badge variant="warning" className="gap-1"><Clock className="h-3 w-3" />{days}d</Badge>;
  return <Badge variant="outline">{days}d</Badge>;
}

function getRowClass(days: number) {
  if (days > 14) return 'bg-red-50/50';
  if (days >= 7) return 'bg-amber-50/50';
  return '';
}

export function MakeupDutiesQueuePage() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: items = [], isLoading } = useGetMakeupQueue();

  // Filter — the API returns items that all need makeup (no resolved status available)
  const filtered = statusFilter === 'resolved'
    ? [] // API only returns unresolved items
    : items;

  const totalInQueue = items.length;
  const unresolvedOver7 = items.filter((m) => m.daysSinceAbsence > 7).length;

  function handleAssignSlot(studentName: string) {
    toast({ title: 'Redirecting to Slot Assignment', description: `Opening slot selection for ${studentName}.` });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Makeup Duties Queue</h2>
        <p className="text-muted-foreground mt-1">Track and assign makeup duties for students with unresolved absences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Total in Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalInQueue}</p>
            <p className="text-xs text-muted-foreground">awaiting makeup</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-red-500" />
              Overdue (&gt;7 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{unresolvedOver7}</p>
            <p className="text-xs text-muted-foreground">need urgent assignment</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              Priority Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">
              {items.filter((m) => m.daysSinceAbsence <= 7).length}
            </p>
            <p className="text-xs text-muted-foreground">within 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded bg-red-100 border border-red-300" /> &gt;14 days critical</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded bg-amber-100 border border-amber-300" /> 7–14 days urgent</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded bg-white border" /> &lt;7 days</span>
      </div>

      <Card>
        <div className="p-4 border-b flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pending</SelectItem>
              <SelectItem value="urgent">Overdue (&gt;7d)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Absence Date</TableHead>
                <TableHead>Days Pending</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                    No makeup duties in queue.
                  </TableCell>
                </TableRow>
              ) : (
                filtered
                  .filter((m) => statusFilter === 'urgent' ? m.daysSinceAbsence > 7 : true)
                  .map((item, i) => {
                    const name = `${item.firstName} ${item.lastName}`;
                    return (
                      <TableRow key={`${item.studentId}-${i}`} className={getRowClass(item.daysSinceAbsence)}>
                        <TableCell>
                          <p className="font-medium">{name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{item.studentId}</p>
                        </TableCell>
                        <TableCell>{item.absenceDate}</TableCell>
                        <TableCell><PriorityBadge days={item.daysSinceAbsence} /></TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAssignSlot(name)}
                            className="gap-1"
                          >
                            <CalendarCheck className="h-3 w-3" />
                            Assign Slot
                          </Button>
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
