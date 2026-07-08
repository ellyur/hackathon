import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useState } from 'react';
import { Users, CalendarCheck, TrendingUp, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  useGetAnalyticsOverview,
  useGetStudentsAtRisk,
  useGetAttendanceTrend,
  useGetHospitalUtilization,
} from '@workspace/api-client-react';

export function AdminAnalyticsPage() {
  const [dateRange, setDateRange] = useState('month');

  const { data: overview, isLoading: loadingOverview } = useGetAnalyticsOverview();
  const { data: atRisk = [], isLoading: loadingRisk } = useGetStudentsAtRisk();
  const { data: trend = [], isLoading: loadingTrend } = useGetAttendanceTrend();
  const { data: utilization = [], isLoading: loadingUtil } = useGetHospitalUtilization();

  const kpiCards = overview ? [
    {
      label: 'Total Students',
      value: String(overview.totalStudents),
      sub: `${overview.activeRotations} active rotations`,
      icon: Users,
      color: 'text-blue-500',
    },
    {
      label: 'Attendance Rate',
      value: `${Math.round((overview.attendanceRate ?? 0) * 100)}%`,
      sub: 'Across all duties',
      icon: CalendarCheck,
      color: 'text-primary',
    },
    {
      label: 'Case Completion',
      value: `${Math.round((overview.completionRate ?? 0) * 100)}%`,
      sub: 'Verified cases',
      icon: TrendingUp,
      color: 'text-success',
    },
    {
      label: 'Pending Reviews',
      value: String(overview.pendingVerifications),
      sub: 'Awaiting CI verification',
      icon: Clock,
      color: 'text-amber-500',
    },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Program Analytics</h2>
          <p className="text-muted-foreground mt-1">Overview of student performance and program health.</p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="semester">This Semester</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Row */}
      {loadingOverview ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((card, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                    <p className="text-3xl font-bold mt-1">{card.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                  </div>
                  <card.icon className={`w-8 h-8 ${card.color} opacity-60`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Trend</CardTitle>
            <CardDescription>Monthly attendance breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTrend ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : trend.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No trend data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Hospital Utilization Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Hospital Utilization</CardTitle>
            <CardDescription>Active rotations per hospital</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingUtil ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : utilization.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No utilization data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={utilization}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hospitalName" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="studentCount" name="Students" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="activeRotations" name="Rotations" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* At-Risk Students */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              At-Risk Students
            </CardTitle>
            <CardDescription>Students flagged by low compliance or high absences</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {loadingRisk ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : atRisk.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No at-risk students. 🎉</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-center">Absences</TableHead>
                    <TableHead className="text-center">Cases %</TableHead>
                    <TableHead className="text-center">Risk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {atRisk.map((s, i) => {
                    const caseRate = Math.round((s.caseCompletionRate ?? 0) * 100);
                    const risk = s.riskScore >= 0.7 ? 'High' : s.riskScore >= 0.4 ? 'Medium' : 'Low';
                    return (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{s.firstName} {s.lastName}</TableCell>
                        <TableCell className="text-center">{s.absenceCount}</TableCell>
                        <TableCell className="text-center">{caseRate}%</TableCell>
                        <TableCell className="text-center">
                          {risk === 'High' ? (
                            <Badge variant="destructive">High</Badge>
                          ) : risk === 'Medium' ? (
                            <Badge variant="warning">Medium</Badge>
                          ) : (
                            <Badge variant="outline">Low</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Hospital Utilization Table */}
        <Card>
          <CardHeader>
            <CardTitle>Hospital Utilization Table</CardTitle>
            <CardDescription>Current student placement per hospital</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {loadingUtil ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hospital</TableHead>
                    <TableHead className="text-center">Students</TableHead>
                    <TableHead className="text-center">Rotations</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {utilization.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No data yet.</TableCell>
                    </TableRow>
                  ) : (
                    utilization.map((h, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{h.hospitalName}</TableCell>
                        <TableCell className="text-center">{h.studentCount}</TableCell>
                        <TableCell className="text-center">{h.activeRotations}</TableCell>
                        <TableCell className="text-center">
                          {h.activeRotations > 0 ? (
                            <Badge variant="success">Active</Badge>
                          ) : (
                            <Badge variant="outline">Idle</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
