import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Link } from 'wouter';

export function CIDashboard() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Welcome, Dr. Wilson</h2>
          <p className="text-muted-foreground mt-1">Here is your clinical instruction schedule for today.</p>
        </div>
      </div>

      {/* Active Duty */}
      <Card className="border-primary/20 shadow-sm relative overflow-hidden bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Clock className="w-5 h-5" />
            Current Duty
          </CardTitle>
          <CardDescription>Today, 08:00 AM - 04:00 PM • ICU • St. Luke's Medical Center</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="text-center px-4 py-2 bg-background rounded-md border shadow-sm">
                <div className="text-2xl font-bold">8</div>
                <div className="text-xs text-muted-foreground">Students</div>
              </div>
              <div className="text-center px-4 py-2 bg-background rounded-md border shadow-sm">
                <div className="text-2xl font-bold text-emerald-600">8</div>
                <div className="text-xs text-muted-foreground">Present</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild>
                <Link href="/duties/active/attendance">Manage Attendance</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Recent Duties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { date: 'Yesterday', dept: 'ICU', students: 7, status: 'Completed' },
                { date: 'Oct 10', dept: 'ER', students: 6, status: 'Completed' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <div className="font-medium text-sm">{item.dept}</div>
                    <div className="text-xs text-muted-foreground">{item.date} • {item.students} Students</div>
                  </div>
                  <Badge variant="secondary">{item.status}</Badge>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link href="/duties">View Duty History</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Pending Case Verifications</CardTitle>
            <CardDescription>Cases submitted by your students</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { student: 'Emma Thompson', case: 'IV Insertion', date: '2 hours ago' },
                { student: 'Michael Chang', case: 'Foley Catheter', date: '5 hours ago' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  <div>
                    <div className="font-medium text-sm">{item.student}</div>
                    <div className="text-xs text-muted-foreground">{item.case} • {item.date}</div>
                  </div>
                  <Button size="sm" variant="outline">Review</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
