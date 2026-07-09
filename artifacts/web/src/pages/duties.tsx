import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, Users, Building2, ClipboardCheck, CheckSquare, Loader2 } from 'lucide-react';
import { useGetTodayDuties, useListSchedules } from '@workspace/api-client-react';
import type { Schedule } from '@workspace/api-client-react';

function statusBadge(status: string) {
  if (status === 'active')
    return <Badge variant="success">Active</Badge>;
  if (status === 'upcoming')
    return <Badge variant="upcoming">Upcoming</Badge>;
  return <Badge variant="completed">Completed</Badge>;
}

function DutyCard({ duty }: { duty: Schedule }) {
  return (
    <Card className="flex flex-col md:flex-row md:items-center gap-4 p-5">
      <div className="flex-1 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-base">{duty.hospital?.name ?? duty.hospitalId}</span>
          {statusBadge(duty.status)}
        </div>
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <Building2 className="w-3.5 h-3.5" />
          {duty.department?.name ?? duty.departmentId}
        </p>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-1">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {duty.dutyDate}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {duty.startTime} – {duty.endTime}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {duty.students?.length ?? 0} students
          </span>
          {(duty as any).dutyHours != null && (
            <span className="flex items-center gap-1 font-medium text-primary">
              <Clock className="w-3.5 h-3.5" />
              {(duty as any).dutyHours} duty hrs
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <Button asChild variant="outline" size="sm">
          <Link href={`/duties/${duty.id}/attendance`}>
            <ClipboardCheck className="w-4 h-4 mr-1" />
            View Attendance
          </Link>
        </Button>
        <Button asChild size="sm">
          <Link href={`/duties/${duty.id}/verify`}>
            <CheckSquare className="w-4 h-4 mr-1" />
            Verify Cases
          </Link>
        </Button>
      </div>
    </Card>
  );
}

export function MyDutiesPage() {
  const { data: todayDuties = [], isLoading: loadingToday } = useGetTodayDuties({ query: { staleTime: 60_000, refetchOnMount: true } as never });
  const { data: allDuties = [], isLoading: loadingAll } = useListSchedules(undefined, { query: { staleTime: 60_000, refetchOnMount: true } as never });

  const today = new Date().toISOString().split('T')[0];
  const weekEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const weekDuties = allDuties.filter((d) => d.dutyDate >= today && d.dutyDate <= weekEnd);

  const isLoading = loadingToday || loadingAll;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">My Duties</h2>
        <p className="text-muted-foreground mt-1">Clinical rotation assignments for your supervision.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Duties</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{todayDuties.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{today}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{weekDuties.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Next 7 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{allDuties.filter((d) => d.status === 'upcoming').length}</p>
            <p className="text-xs text-muted-foreground mt-1">Scheduled ahead</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="week">This Week</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-3 mt-4">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : todayDuties.length === 0 ? (
            <p className="text-muted-foreground text-sm">No duties today.</p>
          ) : (
            todayDuties.map((d) => <DutyCard key={d.id} duty={d} />)
          )}
        </TabsContent>

        <TabsContent value="week" className="space-y-3 mt-4">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : weekDuties.length === 0 ? (
            <p className="text-muted-foreground text-sm">No duties this week.</p>
          ) : (
            weekDuties.map((d) => <DutyCard key={d.id} duty={d} />)
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-3 mt-4">
          {loadingAll ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : allDuties.length === 0 ? (
            <p className="text-muted-foreground text-sm">No duties found.</p>
          ) : (
            allDuties.map((d) => <DutyCard key={d.id} duty={d} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
