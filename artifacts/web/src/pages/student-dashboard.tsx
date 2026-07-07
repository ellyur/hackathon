import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, CheckCircle2, AlertCircle, FileCheck, ArrowRight } from 'lucide-react';
import { Link } from 'wouter';

export function StudentDashboard() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Welcome back, Emma</h2>
          <p className="text-muted-foreground mt-1">Here's your clinical rotation overview for today.</p>
        </div>
        <Button asChild>
          <Link href="/slots">Browse Open Slots</Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Next Duty Card */}
        <Card className="col-span-full lg:col-span-1 border-primary/20 shadow-sm relative overflow-hidden bg-primary/5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-full -mr-8 -mt-8" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Clock className="w-5 h-5" />
              Next Duty
            </CardTitle>
            <CardDescription>Today, 08:00 AM - 04:00 PM</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="font-semibold text-lg">ICU Rotation</div>
              <div className="text-sm flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                St. Luke's Medical Center
              </div>
              <div className="text-sm flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="w-4 h-4" />
                CI: Dr. James Wilson
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="w-full" asChild>
                <Link href="/schedule/active">Time In</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Passport Progress */}
        <Card className="col-span-full md:col-span-1 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Clinical Passport</CardTitle>
            <CardDescription>Overall completion</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mt-2 flex items-center justify-center">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" r="56" fill="none" stroke="currentColor" strokeWidth="12" className="text-muted" />
                  <circle 
                    cx="64" cy="64" r="56" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="12" 
                    strokeDasharray="351.85" 
                    strokeDashoffset={351.85 * (1 - 0.65)} 
                    className="text-primary transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold">65%</span>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-between text-sm text-muted-foreground">
              <div className="text-center">
                <div className="font-medium text-foreground">26</div>
                <div>Completed</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-foreground">40</div>
                <div>Required</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hours Progress */}
        <Card className="col-span-full md:col-span-1 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Duty Hours</CardTitle>
            <CardDescription>320 / 500 hours completed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="pt-2">
              <Progress value={64} className="h-3" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-1 p-3 rounded-lg bg-muted/50">
                <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Present
                </div>
                <div className="text-2xl font-bold">42</div>
              </div>
              <div className="space-y-1 p-3 rounded-lg bg-muted/50">
                <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  Late
                </div>
                <div className="text-2xl font-bold">2</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Grid: Recent Notifications & Passport Needs */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Pending Case Verifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { title: 'Normal Spontaneous Delivery', status: 'Pending CI Review', date: 'Oct 12' },
                { title: 'IV Insertion', status: 'Pending CI Review', date: 'Oct 10' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <FileCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{item.title}</div>
                      <div className="text-xs text-muted-foreground">{item.status} • {item.date}</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link href="/passport">View Full Passport</Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Available Duty Slots</CardTitle>
            <CardDescription>Matching your missing cases</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
              {[
                { hosp: 'General Hospital', dept: 'OR / DR', date: 'Tomorrow, 08:00 AM' },
                { hosp: 'St. Luke\'s', dept: 'ICU', date: 'Oct 16, 04:00 PM' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  <div>
                    <div className="font-medium text-sm">{item.dept}</div>
                    <div className="text-xs text-muted-foreground">{item.hosp} • {item.date}</div>
                  </div>
                  <Button size="sm">Apply</Button>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link href="/slots">View All Slots</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
