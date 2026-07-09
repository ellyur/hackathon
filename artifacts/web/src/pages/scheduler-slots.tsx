import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon, Clock, Users, PlusCircle, Loader2, ExternalLink, CheckCircle } from 'lucide-react';
import { useListSlots } from '@workspace/api-client-react';

export function SchedulerSlotsPage() {
  const { data: slots = [], isLoading } = useListSlots();

  const openSlots   = slots.filter(s => s.status === 'open');
  const closedSlots = slots.filter(s => s.status !== 'open');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Duty Slots</h2>
          <p className="text-muted-foreground mt-1">
            Manage open slots and review student applications.
          </p>
        </div>
        <Link href="/slots/create">
          <Button className="gap-2">
            <PlusCircle className="w-4 h-4" /> Create New Slot
          </Button>
        </Link>
      </div>

      {/* Summary pills */}
      <div className="flex gap-3 text-sm flex-wrap">
        <Badge variant="secondary">{slots.length} total</Badge>
        <Badge className="bg-emerald-500 hover:bg-emerald-600">{openSlots.length} open</Badge>
        <Badge variant="outline">{closedSlots.length} closed</Badge>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : slots.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          No slots yet. Create one to get started.
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hospital / Dept</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slots.map((slot) => {
                  const approved = slot.approvedCount ?? 0;
                  const spotsLeft = slot.maxStudents - approved;
                  const isFull = spotsLeft <= 0;

                  return (
                    <TableRow key={slot.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{slot.hospital?.name ?? slot.hospitalId}</p>
                        <p className="text-xs text-muted-foreground">{slot.department?.name ?? slot.departmentId}</p>
                        {slot.isMakeup && (
                          <Badge variant="outline" className="text-[10px] mt-1 border-amber-300 text-amber-600">
                            Makeup Eligible
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <CalendarIcon className="w-3.5 h-3.5" />
                          {slot.dutyDate}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          {slot.startTime} – {slot.endTime}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          <Users className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className={isFull ? 'text-red-600 font-medium' : ''}>
                            {approved} / {slot.maxStudents}
                          </span>
                          {isFull && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Full</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {slot.status === 'open' ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
                            <CheckCircle className="w-3 h-3" /> Open
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground capitalize">
                            {slot.status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/slots/${slot.id}/applications`}>
                          <Button size="sm" variant="outline" className="gap-1.5">
                            <ExternalLink className="w-3.5 h-3.5" />
                            View Applications
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
