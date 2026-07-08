import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, LineChart, BarChart, Users, Building2, TrendingUp, AlertOctagon, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

function getAuthToken(): string | null { return localStorage.getItem('authToken'); }
async function apiFetch<T>(path: string): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(path, { headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: 'include' });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
  return res.json();
}

interface AnalyticsOverview {
  totalStudents: number;
  activeRotations: number;
  completionRate: number;
  attendanceRate: number;
  totalHospitals: number;
  pendingVerifications: number;
  studentsNeedingMakeup: number;
  upcomingDutiesCount: number;
}

export function AdminDashboard() {
  const { data: overview, isLoading } = useQuery<AnalyticsOverview>({
    queryKey: ['analytics-overview'],
    queryFn: () => apiFetch('/api/analytics/overview'),
    staleTime: 60_000,
  });

  const { data: atRisk = [] } = useQuery<{ studentId: string }[]>({
    queryKey: ['analytics-at-risk'],
    queryFn: () => apiFetch('/api/analytics/students-at-risk'),
    staleTime: 60_000,
  });

  const stat = (val: number | undefined, decimals = 0) =>
    isLoading ? '—' : val === undefined ? '—' : decimals > 0 ? val.toFixed(decimals) : String(val);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
          <p className="text-muted-foreground mt-1">Program performance and key metrics.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <Users className="w-4 h-4 text-primary" />}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat(overview?.totalStudents)}</div>
            <p className="text-xs text-muted-foreground mt-1">Active students enrolled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Partner Hospitals</CardTitle>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <Building2 className="w-4 h-4 text-primary" />}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat(overview?.totalHospitals)}</div>
            <p className="text-xs text-muted-foreground mt-1">Active partner facilities</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Attendance</CardTitle>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <TrendingUp className="w-4 h-4 text-primary" />}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {isLoading ? '—' : overview ? `${(overview.attendanceRate * 100).toFixed(1)}%` : '—'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Present + late across all duties</p>
          </CardContent>
        </Card>

        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-amber-700">At-Risk Students</CardTitle>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-amber-600" /> : <AlertOctagon className="w-4 h-4 text-amber-600" />}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">{isLoading ? '—' : atRisk.length}</div>
            <p className="text-xs text-amber-700/80 mt-1">Falling behind hours/cases</p>
          </CardContent>
        </Card>
      </div>

      {/* Second row: pending verifications + makeup queue */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Verifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat(overview?.pendingVerifications)}</div>
            <p className="text-xs text-muted-foreground mt-1">Case submissions awaiting review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Makeup Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stat(overview?.studentsNeedingMakeup)}</div>
            <p className="text-xs text-muted-foreground mt-1">Students with unresolved absences</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Rotations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stat(overview?.activeRotations)}</div>
            <p className="text-xs text-muted-foreground mt-1">Schedules currently in progress</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Attendance Trends</CardTitle>
            <CardDescription>Monthly attendance rates across all cohorts</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center border-t border-dashed bg-muted/10">
            <div className="text-center text-muted-foreground flex flex-col items-center">
              <LineChart className="w-8 h-8 mb-2 opacity-50" />
              <span>Chart visualization placeholder</span>
              <span className="text-xs mt-1">Uses Recharts</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hospital Utilization</CardTitle>
            <CardDescription>Student distribution across partner facilities</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center border-t border-dashed bg-muted/10">
             <div className="text-center text-muted-foreground flex flex-col items-center">
              <BarChart className="w-8 h-8 mb-2 opacity-50" />
              <span>Chart visualization placeholder</span>
              <span className="text-xs mt-1">Uses Recharts</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
