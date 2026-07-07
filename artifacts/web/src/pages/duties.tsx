import { useState } from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, Users, Building2, ClipboardCheck, CheckSquare } from 'lucide-react';

const DUTIES = [
  {
    id: '1',
    hospital: "St. Luke's Medical Center",
    department: 'Intensive Care Unit (ICU)',
    date: 'Today, Oct 15',
    time: '08:00 AM – 04:00 PM',
    students: 7,
    status: 'active',
    tab: 'today',
  },
  {
    id: '2',
    hospital: 'General Hospital',
    department: 'Emergency Room (ER)',
    date: 'Today, Oct 15',
    time: '04:00 PM – 12:00 MN',
    students: 5,
    status: 'upcoming',
    tab: 'today',
  },
  {
    id: '3',
    hospital: 'Medical City',
    department: 'Pediatrics Ward',
    date: 'Wed, Oct 16',
    time: '08:00 AM – 04:00 PM',
    students: 8,
    status: 'upcoming',
    tab: 'week',
  },
  {
    id: '4',
    hospital: "St. Luke's Medical Center",
    department: 'Operating Room (OR)',
    date: 'Thu, Oct 17',
    time: '06:00 AM – 02:00 PM',
    students: 6,
    status: 'upcoming',
    tab: 'week',
  },
  {
    id: '5',
    hospital: 'General Hospital',
    department: 'OB-Gyn / Delivery Room',
    date: 'Fri, Oct 18',
    time: '08:00 AM – 04:00 PM',
    students: 4,
    status: 'upcoming',
    tab: 'week',
  },
  {
    id: '6',
    hospital: 'Medical City',
    department: 'Intensive Care Unit (ICU)',
    date: 'Mon, Oct 13',
    time: '08:00 AM – 04:00 PM',
    students: 8,
    status: 'completed',
    tab: 'all',
  },
];

function statusBadge(status: string) {
  if (status === 'active')
    return <Badge className="bg-emerald-500 text-white hover:bg-emerald-600">Active</Badge>;
  if (status === 'upcoming')
    return <Badge variant="secondary">Upcoming</Badge>;
  return <Badge variant="outline">Completed</Badge>;
}

function DutyCard({ duty }: { duty: typeof DUTIES[0] }) {
  return (
    <Card className="flex flex-col md:flex-row md:items-center gap-4 p-5">
      <div className="flex-1 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-base">{duty.hospital}</span>
          {statusBadge(duty.status)}
        </div>
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <Building2 className="w-3.5 h-3.5" />
          {duty.department}
        </p>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-1">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {duty.date}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {duty.time}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {duty.students} students
          </span>
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
  const todayDuties = DUTIES.filter((d) => d.tab === 'today' || d.status === 'active');
  const weekDuties = DUTIES.filter((d) => d.tab === 'week' || d.tab === 'today');
  const allDuties = DUTIES;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">My Duties</h2>
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
            <p className="text-xs text-muted-foreground mt-1">Oct 15, 2024</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{weekDuties.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Oct 14 – 18, 2024</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{DUTIES.filter((d) => d.status === 'upcoming').length}</p>
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
          {todayDuties.length === 0 ? (
            <p className="text-muted-foreground text-sm">No duties today.</p>
          ) : (
            todayDuties.map((d) => <DutyCard key={d.id} duty={d} />)
          )}
        </TabsContent>

        <TabsContent value="week" className="space-y-3 mt-4">
          {weekDuties.map((d) => <DutyCard key={d.id} duty={d} />)}
        </TabsContent>

        <TabsContent value="all" className="space-y-3 mt-4">
          {allDuties.map((d) => <DutyCard key={d.id} duty={d} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
