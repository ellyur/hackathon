import { Clock, CheckCircle, XCircle, CalendarDays, MapPin, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

type ApplicationStatus = 'pending' | 'approved' | 'rejected';

interface MyApplication {
  id: string;
  slotId: string;
  status: ApplicationStatus;
  appliedAt: string;
  notes?: string | null;
  dutyDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  hospitalId?: string | null;
  departmentId?: string | null;
}

function getAuthToken() { return localStorage.getItem('authToken'); }
async function apiFetch<T>(path: string): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(path, { headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: 'include' });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
  return res.json();
}

const statusConfig: Record<ApplicationStatus, { label: string; icon: React.ReactNode; badgeClass: string }> = {
  pending: {
    label: 'Pending',
    icon: <Clock className="h-3.5 w-3.5" />,
    badgeClass: 'bg-amber-100 text-amber-700',
  },
  approved: {
    label: 'Approved',
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    badgeClass: 'bg-emerald-500 text-white',
  },
  rejected: {
    label: 'Rejected',
    icon: <XCircle className="h-3.5 w-3.5" />,
    badgeClass: '',
  },
};

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const config = statusConfig[status];
  if (status === 'rejected') {
    return (
      <Badge variant="destructive" className="gap-1">
        {config.icon}
        {config.label}
      </Badge>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full ${config.badgeClass}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}
function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

type TabFilter = 'all' | ApplicationStatus;

export function MyApplicationsPage() {
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

  const { data: applications = [], isLoading } = useQuery<MyApplication[]>({
    queryKey: ['my-slot-applications'],
    queryFn: () => apiFetch('/api/slots/my-applications'),
    staleTime: 30_000,
    refetchOnMount: true,
  });

  const displayed = applications.filter(a =>
    activeTab === 'all' ? true : a.status === activeTab
  );

  const countFor = (f: TabFilter) =>
    applications.filter(a => f === 'all' ? true : a.status === f).length;

  const EmptyState = ({ filter }: { filter: TabFilter }) => (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">
          No {filter === 'all' ? '' : filter} applications
        </h3>
        <p className="text-muted-foreground mt-1 text-sm">
          {filter === 'all'
            ? 'You have not applied for any slots yet.'
            : `You have no ${filter} applications at this time.`}
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">My Slot Applications</h2>
        <p className="text-muted-foreground mt-1">Track the status of your clinical duty slot applications.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabFilter)}>
          <TabsList>
            {(['all', 'pending', 'approved', 'rejected'] as TabFilter[]).map((tab) => (
              <TabsTrigger key={tab} value={tab} className="capitalize">
                {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                {countFor(tab) > 0 && (
                  <span className="ml-2 bg-muted text-muted-foreground text-xs rounded-full px-1.5 py-0.5">
                    {countFor(tab)}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {(['all', 'pending', 'approved', 'rejected'] as TabFilter[]).map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-4">
              {displayed.length === 0 ? (
                <EmptyState filter={tab} />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Applications</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Slot</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Applied At</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayed.map((app) => (
                          <TableRow key={app.id}>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm font-medium">
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="font-mono text-xs text-muted-foreground">{app.slotId.slice(0, 8)}…</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">
                              <span className="flex items-center gap-1">
                                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                                {formatDate(app.dutyDate)}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                              {app.startTime && app.endTime ? `${app.startTime} – ${app.endTime}` : '—'}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {formatDateTime(app.appliedAt)}
                            </TableCell>
                            <TableCell>
                              <div>
                                <StatusBadge status={app.status} />
                                {app.status === 'rejected' && app.notes && (
                                  <p className="text-xs text-muted-foreground mt-1 max-w-[180px]">{app.notes}</p>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
