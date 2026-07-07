import { useState } from 'react';
import { Link } from 'wouter';
import { Calendar, Clock, MapPin, User, LogIn } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ScheduleStatus = 'upcoming' | 'active' | 'completed' | 'cancelled';

interface Schedule {
  id: string;
  hospital: string;
  department: string;
  date: string;
  timeStart: string;
  timeEnd: string;
  ciName: string;
  status: ScheduleStatus;
}

const mockSchedules: Schedule[] = [
  {
    id: 'sch-1',
    hospital: 'St. Luke\'s Medical Center',
    department: 'Internal Medicine',
    date: '2024-06-25',
    timeStart: '07:00 AM',
    timeEnd: '03:00 PM',
    ciName: 'CI Maria Santos',
    status: 'upcoming',
  },
  {
    id: 'sch-2',
    hospital: 'Philippine General Hospital',
    department: 'Pediatrics',
    date: '2024-06-20',
    timeStart: '07:00 AM',
    timeEnd: '03:00 PM',
    ciName: 'CI Jose Reyes',
    status: 'active',
  },
  {
    id: 'sch-3',
    hospital: 'Makati Medical Center',
    department: 'Cardiology',
    date: '2024-06-28',
    timeStart: '03:00 PM',
    timeEnd: '11:00 PM',
    ciName: 'CI Ana Lim',
    status: 'upcoming',
  },
  {
    id: 'sch-4',
    hospital: 'UST Hospital',
    department: 'Surgery',
    date: '2024-06-10',
    timeStart: '07:00 AM',
    timeEnd: '03:00 PM',
    ciName: 'CI Roberto Cruz',
    status: 'completed',
  },
  {
    id: 'sch-5',
    hospital: 'Ospital ng Maynila',
    department: 'Emergency',
    date: '2024-06-05',
    timeStart: '11:00 PM',
    timeEnd: '07:00 AM',
    ciName: 'CI Lena Garcia',
    status: 'completed',
  },
];

const statusConfig: Record<ScheduleStatus, { label: string; className: string }> = {
  upcoming: { label: 'Upcoming', className: 'bg-blue-100 text-blue-700' },
  active: { label: 'Active', className: 'bg-emerald-500 text-white' },
  completed: { label: 'Completed', className: '' },
  cancelled: { label: 'Cancelled', className: '' },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function ScheduleCard({ schedule }: { schedule: Schedule }) {
  const config = statusConfig[schedule.status];
  const canTimeIn = schedule.status === 'active' || schedule.status === 'upcoming';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-base">{schedule.hospital}</h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3.5 w-3.5" />
              {schedule.department}
            </p>
          </div>
          {config.className ? (
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${config.className}`}>{config.label}</span>
          ) : (
            <Badge variant={schedule.status === 'cancelled' ? 'destructive' : 'outline'}>{config.label}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span>{formatDate(schedule.date)}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <span>{schedule.timeStart} – {schedule.timeEnd}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4 flex-shrink-0" />
            <span>{schedule.ciName}</span>
          </div>
        </div>
        {canTimeIn && (
          <div className="flex justify-end pt-1">
            <Link href={`/schedule/${schedule.id}`}>
              <Button size="sm" className="gap-2">
                <LogIn className="h-4 w-4" />
                View &amp; Time In
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function MySchedulePage() {
  const upcoming = mockSchedules.filter((s) => s.status === 'upcoming' || s.status === 'active');
  const past = mockSchedules.filter((s) => s.status === 'completed' || s.status === 'cancelled');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">My Schedule</h2>
        <p className="text-muted-foreground mt-1">View your assigned clinical duty schedules.</p>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming
            {upcoming.length > 0 && (
              <span className="ml-2 bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5">
                {upcoming.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4 space-y-4">
          {upcoming.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No upcoming schedules</h3>
                <p className="text-muted-foreground mt-1">Check back later or apply for an available slot.</p>
              </CardContent>
            </Card>
          ) : (
            upcoming.map((s) => <ScheduleCard key={s.id} schedule={s} />)
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-4 space-y-4">
          {past.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No past schedules</h3>
                <p className="text-muted-foreground mt-1">Completed duties will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            past.map((s) => <ScheduleCard key={s.id} schedule={s} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
