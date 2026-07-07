import { useState } from 'react';
import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileDown, Filter, Search, Calendar as CalendarIcon, Users, Loader2 } from 'lucide-react';
import { useListSchedules } from '@workspace/api-client-react';

function statusBadge(status: string) {
  if (status === 'active')
    return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">Active</Badge>;
  if (status === 'upcoming')
    return <Badge variant="secondary">Upcoming</Badge>;
  if (status === 'cancelled')
    return <Badge variant="destructive">Cancelled</Badge>;
  return <Badge variant="outline">Completed</Badge>;
}

function formatTime(t: string) {
  // t is like "08:00" — return as-is or reformat if needed
  return t;
}

export function MasterSchedulePage() {
  const [search, setSearch] = useState('');
  const { data: schedules = [], isLoading } = useListSchedules();

  const filtered = schedules.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.hospital?.name?.toLowerCase().includes(q) ||
      s.department?.name?.toLowerCase().includes(q) ||
      `${s.ci?.firstName} ${s.ci?.lastName}`.toLowerCase().includes(q) ||
      (s.title?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Master Schedule</h2>
          <p className="text-muted-foreground mt-1">Manage and monitor all clinical rotations.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><FileDown className="w-4 h-4 mr-2" /> Export</Button>
          <Button asChild>
            <Link href="/schedules/new">
              <CalendarIcon className="w-4 h-4 mr-2" /> New Schedule
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <div className="p-4 border-b">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search hospital, department, or CI..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" className="bg-background">
              <Filter className="w-4 h-4 mr-2" /> Filters
            </Button>
          </div>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Hospital / Dept</TableHead>
                  <TableHead>Clinical Instructor</TableHead>
                  <TableHead className="text-center">Students</TableHead>
                  <TableHead>Status</TableHead>
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
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      No schedules found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((s) => (
                    <TableRow key={s.id} className="hover:bg-muted/10 cursor-pointer transition-colors">
                      <TableCell>
                        <div className="font-medium">{s.dutyDate}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatTime(s.startTime)} – {formatTime(s.endTime)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{s.hospital?.name ?? s.hospitalId}</div>
                        <div className="text-sm text-muted-foreground">{s.department?.name ?? s.departmentId}</div>
                      </TableCell>
                      <TableCell>
                        {s.ci ? `${s.ci.firstName} ${s.ci.lastName}` : '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="font-normal gap-1">
                          <Users className="w-3 h-3" /> {s.students?.length ?? 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {statusBadge(s.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/schedules/${s.id}/edit`}>Edit</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
