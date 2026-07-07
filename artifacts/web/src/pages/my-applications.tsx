import { useState } from 'react';
import { Clock, CheckCircle, XCircle, CalendarDays, MapPin, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

type ApplicationStatus = 'pending' | 'approved' | 'rejected';

interface SlotApplication {
  id: string;
  hospital: string;
  department: string;
  date: string;
  timeStart: string;
  timeEnd: string;
  appliedAt: string;
  status: ApplicationStatus;
  rejectionReason?: string;
}

const mockApplications: SlotApplication[] = [
  {
    id: 'app-1',
    hospital: 'St. Luke\'s Medical Center',
    department: 'Cardiology',
    date: '2024-06-28',
    timeStart: '07:00 AM',
    timeEnd: '03:00 PM',
    appliedAt: new Date(Date.now() - 3600000).toISOString(),
    status: 'pending',
  },
  {
    id: 'app-2',
    hospital: 'Makati Medical Center',
    department: 'Internal Medicine',
    date: '2024-06-30',
    timeStart: '03:00 PM',
    timeEnd: '11:00 PM',
    appliedAt: new Date(Date.now() - 7200000).toISOString(),
    status: 'pending',
  },
  {
    id: 'app-3',
    hospital: 'Philippine General Hospital',
    department: 'Pediatrics',
    date: '2024-06-22',
    timeStart: '07:00 AM',
    timeEnd: '03:00 PM',
    appliedAt: new Date(Date.now() - 172800000).toISOString(),
    status: 'approved',
  },
  {
    id: 'app-4',
    hospital: 'UST Hospital',
    department: 'Surgery',
    date: '2024-06-20',
    timeStart: '11:00 PM',
    timeEnd: '07:00 AM',
    appliedAt: new Date(Date.now() - 259200000).toISOString(),
    status: 'approved',
  },
  {
    id: 'app-5',
    hospital: 'Ospital ng Maynila',
    department: 'Emergency',
    date: '2024-06-18',
    timeStart: '07:00 AM',
    timeEnd: '03:00 PM',
    appliedAt: new Date(Date.now() - 345600000).toISOString(),
    status: 'rejected',
    rejectionReason: 'Slot already filled by another student.',
  },
];

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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

type TabFilter = 'all' | ApplicationStatus;

export function MyApplicationsPage() {
  const { toast } = useToast();
  const [cancelledIds, setCancelledIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

  const handleCancel = (id: string, hospital: string) => {
    setCancelledIds((prev) => new Set(prev).add(id));
    toast({ title: 'Application cancelled.', description: `Your application for ${hospital} has been cancelled.` });
  };

  const displayApplications = mockApplications.filter((a) => {
    if (cancelledIds.has(a.id)) return false;
    if (activeTab === 'all') return true;
    return a.status === activeTab;
  });

  const countFor = (filter: TabFilter) =>
    mockApplications.filter((a) => {
      if (cancelledIds.has(a.id)) return false;
      return filter === 'all' ? true : a.status === filter;
    }).length;

  const EmptyState = ({ filter }: { filter: TabFilter }) => (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No {filter === 'all' ? '' : filter} applications</h3>
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
        <h2 className="text-3xl font-bold tracking-tight">My Slot Applications</h2>
        <p className="text-muted-foreground mt-1">Track the status of your clinical duty slot applications.</p>
      </div>

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
            {displayApplications.length === 0 ? (
              <EmptyState filter={tab} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Applications</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hospital / Department</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Applied At</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayApplications.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                {app.hospital}
                              </p>
                              <p className="text-xs text-muted-foreground ml-5">{app.department}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                              {formatDate(app.date)}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                            {app.timeStart} – {app.timeEnd}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {formatDateTime(app.appliedAt)}
                          </TableCell>
                          <TableCell>
                            <div>
                              <StatusBadge status={app.status} />
                              {app.status === 'rejected' && app.rejectionReason && (
                                <p className="text-xs text-muted-foreground mt-1 max-w-[180px]">{app.rejectionReason}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {app.status === 'pending' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() => handleCancel(app.id, app.hospital)}
                              >
                                Cancel
                              </Button>
                            )}
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
    </div>
  );
}
