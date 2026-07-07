import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Download, ChevronDown, ChevronUp, Search } from 'lucide-react';

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  ipAddress: string;
  details: { oldValue?: Record<string, unknown>; newValue?: Record<string, unknown>; note?: string };
}

const ACTION_COLORS: Record<string, string> = {
  login: 'bg-blue-100 text-blue-700 border-blue-200',
  case_verified: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  case_rejected: 'bg-red-100 text-red-700 border-red-200',
  schedule_created: 'bg-purple-100 text-purple-700 border-purple-200',
  user_created: 'bg-orange-100 text-orange-700 border-orange-200',
  user_deactivated: 'bg-gray-100 text-gray-700 border-gray-200',
};

const MOCK_LOGS: AuditLog[] = [
  { id: 'al-001', timestamp: '2024-06-15 08:02:14', user: 'Dr. Elena Reyes', userEmail: 'admin@clinicalflow.com', action: 'login', entityType: 'Session', entityId: 'sess-abc123', ipAddress: '192.168.1.10', details: { note: 'Successful admin login' } },
  { id: 'al-002', timestamp: '2024-06-15 08:15:30', user: 'Ana Dela Cruz', userEmail: 'ana.dc@clinicalflow.com', action: 'case_verified', entityType: 'CaseCompletion', entityId: 'cc-00451', ipAddress: '10.0.0.52', details: { oldValue: { status: 'pending' }, newValue: { status: 'verified' } } },
  { id: 'al-003', timestamp: '2024-06-15 09:00:05', user: 'Maria Santos', userEmail: 'scheduler@clinicalflow.com', action: 'schedule_created', entityType: 'Schedule', entityId: 'sch-00812', ipAddress: '10.0.0.23', details: { newValue: { hospitalId: 'h-001', departmentId: 'd-001', startDate: '2024-06-20' } } },
  { id: 'al-004', timestamp: '2024-06-15 09:45:22', user: 'Ana Dela Cruz', userEmail: 'ana.dc@clinicalflow.com', action: 'case_rejected', entityType: 'CaseCompletion', entityId: 'cc-00452', ipAddress: '10.0.0.52', details: { oldValue: { status: 'pending' }, newValue: { status: 'rejected' }, note: 'Incomplete documentation' } },
  { id: 'al-005', timestamp: '2024-06-15 10:30:00', user: 'Dr. Elena Reyes', userEmail: 'admin@clinicalflow.com', action: 'user_created', entityType: 'User', entityId: 'u-013', ipAddress: '192.168.1.10', details: { newValue: { email: 'newstudent@edu.ph', role: 'student' } } },
  { id: 'al-006', timestamp: '2024-06-15 11:00:45', user: 'Liza Flores', userEmail: 'lflores@clinicalflow.com', action: 'case_verified', entityType: 'CaseCompletion', entityId: 'cc-00453', ipAddress: '10.0.1.34', details: { oldValue: { status: 'pending' }, newValue: { status: 'verified' } } },
  { id: 'al-007', timestamp: '2024-06-15 11:20:10', user: 'Dr. Elena Reyes', userEmail: 'admin@clinicalflow.com', action: 'user_deactivated', entityType: 'User', entityId: 'u-006', ipAddress: '192.168.1.10', details: { oldValue: { isActive: true }, newValue: { isActive: false } } },
  { id: 'al-008', timestamp: '2024-06-15 13:05:55', user: 'Maria Santos', userEmail: 'scheduler@clinicalflow.com', action: 'schedule_created', entityType: 'Schedule', entityId: 'sch-00813', ipAddress: '10.0.0.23', details: { newValue: { hospitalId: 'h-002', departmentId: 'd-005', startDate: '2024-06-22' } } },
  { id: 'al-009', timestamp: '2024-06-15 13:30:00', user: 'Juan Cruz', userEmail: 'jcruz@student.edu', action: 'login', entityType: 'Session', entityId: 'sess-def456', ipAddress: '203.177.12.5', details: { note: 'Successful student login' } },
  { id: 'al-010', timestamp: '2024-06-15 14:00:22', user: 'Ana Dela Cruz', userEmail: 'ana.dc@clinicalflow.com', action: 'case_verified', entityType: 'CaseCompletion', entityId: 'cc-00454', ipAddress: '10.0.0.52', details: { oldValue: { status: 'pending' }, newValue: { status: 'verified' } } },
  { id: 'al-011', timestamp: '2024-06-15 14:45:10', user: 'Dr. Elena Reyes', userEmail: 'admin@clinicalflow.com', action: 'user_created', entityType: 'User', entityId: 'u-014', ipAddress: '192.168.1.10', details: { newValue: { email: 'newci@clinicalflow.com', role: 'ci' } } },
  { id: 'al-012', timestamp: '2024-06-15 15:10:05', user: 'Liza Flores', userEmail: 'lflores@clinicalflow.com', action: 'case_rejected', entityType: 'CaseCompletion', entityId: 'cc-00455', ipAddress: '10.0.1.34', details: { oldValue: { status: 'pending' }, newValue: { status: 'rejected' }, note: 'Wrong case category selected' } },
  { id: 'al-013', timestamp: '2024-06-15 15:55:30', user: 'Maria Santos', userEmail: 'scheduler@clinicalflow.com', action: 'login', entityType: 'Session', entityId: 'sess-ghi789', ipAddress: '10.0.0.23', details: { note: 'Successful scheduler login' } },
  { id: 'al-014', timestamp: '2024-06-15 16:20:00', user: 'Dr. Elena Reyes', userEmail: 'admin@clinicalflow.com', action: 'schedule_created', entityType: 'Schedule', entityId: 'sch-00814', ipAddress: '192.168.1.10', details: { newValue: { hospitalId: 'h-003', departmentId: 'd-004', startDate: '2024-06-25' } } },
  { id: 'al-015', timestamp: '2024-06-15 17:00:00', user: 'Ana Dela Cruz', userEmail: 'ana.dc@clinicalflow.com', action: 'login', entityType: 'Session', entityId: 'sess-jkl012', ipAddress: '10.0.0.52', details: { note: 'Successful CI login' } },
];

const ACTION_OPTIONS = ['all', 'login', 'case_verified', 'case_rejected', 'schedule_created', 'user_created', 'user_deactivated'];

export function AdminAuditPage() {
  const { toast } = useToast();
  const [actionFilter, setActionFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = MOCK_LOGS.filter(log => {
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesUser = !userSearch || log.user.toLowerCase().includes(userSearch.toLowerCase()) || log.userEmail.toLowerCase().includes(userSearch.toLowerCase());
    return matchesAction && matchesUser;
  });

  const handleExport = () => {
    toast({ title: 'Export started', description: 'Audit log CSV is being prepared for download.' });
  };

  const truncateId = (id: string) => id.length > 12 ? id.slice(0, 12) + '…' : id;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Audit Logs</h2>
          <p className="text-muted-foreground mt-1">Track all system actions and changes for compliance and security.</p>
        </div>
        <Button variant="outline" onClick={handleExport} className="gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by user or email..."
                className="pl-9"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Action type" />
              </SelectTrigger>
              <SelectContent>
                {ACTION_OPTIONS.map(a => (
                  <SelectItem key={a} value={a}>
                    {a === 'all' ? 'All Actions' : a.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" className="w-[160px]" value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="From" />
            <Input type="date" className="w-[160px]" value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="To" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity Type</TableHead>
                <TableHead>Entity ID</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(log => (
                <>
                  <TableRow key={log.id} className="group">
                    <TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap">{log.timestamp}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{log.user}</p>
                        <p className="text-xs text-muted-foreground">{log.userEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{log.entityType}</TableCell>
                    <TableCell className="font-mono text-xs">{truncateId(log.entityId)}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{log.ipAddress}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                      >
                        {expandedId === log.id
                          ? <ChevronUp className="w-4 h-4" />
                          : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expandedId === log.id && (
                    <TableRow key={`${log.id}-details`} className="bg-muted/30">
                      <TableCell colSpan={7} className="py-3 px-6">
                        <div className="space-y-2">
                          {log.details.note && (
                            <p className="text-xs text-muted-foreground italic">Note: {log.details.note}</p>
                          )}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {log.details.oldValue && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground mb-1">Old Value</p>
                                <pre className="text-xs bg-background border rounded p-2 overflow-auto">{JSON.stringify(log.details.oldValue, null, 2)}</pre>
                              </div>
                            )}
                            {log.details.newValue && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground mb-1">New Value</p>
                                <pre className="text-xs bg-background border rounded p-2 overflow-auto">{JSON.stringify(log.details.newValue, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">No audit logs match your filters.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="px-4 py-3 border-t text-sm text-muted-foreground">
            Showing {filtered.length} of {MOCK_LOGS.length} log entries
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
