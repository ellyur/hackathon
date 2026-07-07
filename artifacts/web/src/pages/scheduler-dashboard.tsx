import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Users, Calendar, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'wouter';

export function SchedulerDashboard() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Scheduler Dashboard</h2>
          <p className="text-muted-foreground mt-1">Overview of today's operations and pending tasks.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link href="/slots/create">Create Duty Slot</Link></Button>
          <Button asChild><Link href="/schedules/create">New Schedule</Link></Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Duties Today</CardTitle>
            <Calendar className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground mt-1">Across 4 hospitals</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Applications</CardTitle>
            <Users className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground mt-1">For available slots</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-destructive">Makeup Queue</CardTitle>
            <AlertTriangle className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">8</div>
            <p className="text-xs text-destructive/80 mt-1">Students need assignments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Case Verifications</CardTitle>
            <Clock className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45</div>
            <p className="text-xs text-muted-foreground mt-1">Pending CI review</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-full lg:col-span-2">
          <CardHeader>
            <CardTitle>Active Duty Roster (Today)</CardTitle>
            <CardDescription>Live attendance status for ongoing clinical duties</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { hosp: "St. Luke's", dept: "ICU", ci: "Dr. Wilson", time: "08:00 - 16:00", status: "8/8 Present" },
                { hosp: "General Hospital", dept: "ER", ci: "Dr. Smith", time: "14:00 - 22:00", status: "Starting soon" },
                { hosp: "Medical City", dept: "Pediatrics", ci: "Dr. Lee", time: "06:00 - 14:00", status: "5/6 Present, 1 Absent" },
              ].map((duty, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">{duty.hosp} - {duty.dept}</div>
                    <div className="text-sm text-muted-foreground">{duty.ci} • {duty.time}</div>
                  </div>
                  <Badge variant={duty.status.includes('Absent') ? 'destructive' : duty.status.includes('Starting') ? 'secondary' : 'default'}>
                    {duty.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="text-lg">Recent Absences</CardTitle>
              <CardDescription>Requires makeup scheduling</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: "John Doe", date: "Yesterday", hosp: "General Hosp" },
                  { name: "Alice Reyes", date: "Oct 12", hosp: "St. Luke's" },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-muted-foreground text-xs">{item.date} • {item.hosp}</div>
                    </div>
                    <Button size="sm" variant="ghost" className="text-primary">Assign</Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4 text-xs" asChild>
                <Link href="/makeup-duties">View Full Queue</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
