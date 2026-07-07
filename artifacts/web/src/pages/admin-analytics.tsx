import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useState } from 'react';
import { Users, CalendarCheck, TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const ATTENDANCE_DATA = [
  { week: 'Wk 1', present: 210, absent: 18, late: 12 },
  { week: 'Wk 2', present: 225, absent: 12, late: 8 },
  { week: 'Wk 3', present: 198, absent: 25, late: 17 },
  { week: 'Wk 4', present: 232, absent: 10, late: 6 },
  { week: 'Wk 5', present: 228, absent: 14, late: 8 },
  { week: 'Wk 6', present: 240, absent: 5, late: 4 },
];

const CASE_TREND_DATA = [
  { week: 'Wk 1', completed: 142, pending: 38 },
  { week: 'Wk 2', completed: 167, pending: 42 },
  { week: 'Wk 3', completed: 155, pending: 55 },
  { week: 'Wk 4', completed: 189, pending: 30 },
  { week: 'Wk 5', completed: 201, pending: 28 },
  { week: 'Wk 6', completed: 218, pending: 22 },
];

const ATTENDANCE_PIE = [
  { name: 'Present', value: 78, color: '#10b981' },
  { name: 'Absent', value: 12, color: '#ef4444' },
  { name: 'Late', value: 7, color: '#f59e0b' },
  { name: 'Excused', value: 3, color: '#6366f1' },
];

const AT_RISK_STUDENTS = [
  { name: 'Carlos Bautista', section: '3-A', hoursCompleted: 120, hoursRequired: 500, compliance: 24, risk: 'High' },
  { name: 'Nena Villanueva', section: '3-B', hoursCompleted: 198, hoursRequired: 500, compliance: 40, risk: 'High' },
  { name: 'Rex Domingo', section: '3-C', hoursCompleted: 240, hoursRequired: 500, compliance: 48, risk: 'Medium' },
  { name: 'Grace Aquino', section: '4-A', hoursCompleted: 310, hoursRequired: 500, compliance: 62, risk: 'Medium' },
  { name: 'Ben Torres', section: '3-D', hoursCompleted: 280, hoursRequired: 500, compliance: 56, risk: 'Medium' },
];

const HOSPITAL_UTILIZATION = [
  { hospital: 'Metro General', dept: 'Delivery Room', capacity: 20, fill: 18, pct: 90 },
  { hospital: 'St. Luke\'s', dept: 'OB-Gynecology', capacity: 15, fill: 14, pct: 93 },
  { hospital: 'PGH', dept: 'Medical-Surgical', capacity: 30, fill: 22, pct: 73 },
  { hospital: 'Makati Med', dept: 'Pediatrics', capacity: 12, fill: 5, pct: 42 },
  { hospital: 'The Medical City', dept: 'ICU', capacity: 8, fill: 7, pct: 88 },
];

export function AdminAnalyticsPage() {
  const [dateRange, setDateRange] = useState('month');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Program Analytics</h2>
          <p className="text-muted-foreground mt-1">Overview of student performance and program health.</p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[180px]">
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Students', value: '245', sub: 'Active this semester', icon: Users, color: 'text-blue-500' },
          { label: 'Active Schedules', value: '38', sub: 'Across 5 hospitals', icon: CalendarCheck, color: 'text-teal-500' },
          { label: 'Overall Compliance', value: '78%', sub: '+4% from last month', icon: TrendingUp, color: 'text-emerald-500' },
          { label: 'Avg Hours / Student', value: '312h', sub: 'Target: 500h', icon: Clock, color: 'text-purple-500' },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Attendance</CardTitle>
            <CardDescription>Last 6 weeks — present, absent, late</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={ATTENDANCE_DATA}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="week" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                <Bar dataKey="present" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="absent" fill="#ef4444" radius={[3, 3, 0, 0]} />
                <Bar dataKey="late" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Case Completion Trend</CardTitle>
            <CardDescription>Completed vs pending over last 6 weeks</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={CASE_TREND_DATA}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="week" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="completed" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Attendance Distribution</CardTitle>
            <CardDescription>Overall status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={ATTENDANCE_PIE} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
                  {ATTENDANCE_PIE.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              At-Risk Students
            </CardTitle>
            <CardDescription>Students with &lt;65% compliance — top 5</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Compliance</TableHead>
                  <TableHead>Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {AT_RISK_STUDENTS.map(s => (
                  <TableRow key={s.name}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.section}</TableCell>
                    <TableCell className="text-muted-foreground">{s.hoursCompleted}/{s.hoursRequired}h</TableCell>
                    <TableCell>{s.compliance}%</TableCell>
                    <TableCell>
                      <Badge variant={s.risk === 'High' ? 'destructive' : 'secondary'}>{s.risk}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Hospital Utilization */}
      <Card>
        <CardHeader>
          <CardTitle>Hospital Utilization</CardTitle>
          <CardDescription>Current student fill rate per department</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hospital</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-center">Capacity</TableHead>
                <TableHead className="text-center">Current</TableHead>
                <TableHead className="text-center">Fill %</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {HOSPITAL_UTILIZATION.map((h, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{h.hospital}</TableCell>
                  <TableCell className="text-muted-foreground">{h.dept}</TableCell>
                  <TableCell className="text-center">{h.capacity}</TableCell>
                  <TableCell className="text-center">{h.fill}</TableCell>
                  <TableCell className="text-center font-semibold">{h.pct}%</TableCell>
                  <TableCell className="text-center">
                    {h.pct >= 90
                      ? <Badge variant="destructive">Near Full</Badge>
                      : h.pct >= 70
                      ? <Badge className="bg-amber-500 text-white">Moderate</Badge>
                      : <Badge className="bg-emerald-500 text-white">Available</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
