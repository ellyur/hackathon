import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileDown, Filter, Search, Calendar as CalendarIcon, Users } from 'lucide-react';

export function MasterSchedulePage() {
  const schedules = [
    { id: '1', date: 'Oct 15', time: '08:00 - 16:00', hosp: 'St. Luke\'s', dept: 'ICU', ci: 'Dr. Wilson', students: 8, status: 'Active' },
    { id: '2', date: 'Oct 15', time: '14:00 - 22:00', hosp: 'General Hospital', dept: 'ER', ci: 'Dr. Smith', students: 6, status: 'Upcoming' },
    { id: '3', date: 'Oct 16', time: '06:00 - 14:00', hosp: 'Medical City', dept: 'Pediatrics', ci: 'Dr. Lee', students: 7, status: 'Upcoming' },
    { id: '4', date: 'Oct 14', time: '08:00 - 16:00', hosp: 'St. Luke\'s', dept: 'OR', ci: 'Dr. Davis', students: 5, status: 'Completed' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Master Schedule</h2>
          <p className="text-muted-foreground mt-1">Manage and monitor all clinical rotations.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><FileDown className="w-4 h-4 mr-2"/> Export</Button>
          <Button><CalendarIcon className="w-4 h-4 mr-2"/> New Schedule</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="p-4 border-b">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search hospital, department, or CI..." className="pl-9" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="bg-background"><Filter className="w-4 h-4 mr-2" /> Filters</Button>
            </div>
          </div>
        </CardHeader>
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
              {schedules.map((s) => (
                <TableRow key={s.id} className="hover:bg-muted/10 cursor-pointer transition-colors">
                  <TableCell>
                    <div className="font-medium">{s.date}</div>
                    <div className="text-sm text-muted-foreground">{s.time}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{s.hosp}</div>
                    <div className="text-sm text-muted-foreground">{s.dept}</div>
                  </TableCell>
                  <TableCell>{s.ci}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="font-normal gap-1">
                      <Users className="w-3 h-3" /> {s.students}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={s.status === 'Active' ? 'default' : s.status === 'Completed' ? 'outline' : 'secondary'}
                      className={s.status === 'Active' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''}
                    >
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">View</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
