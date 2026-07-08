import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { Bell, Loader2, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  relatedEntity?: string;
  relatedId?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

const TYPE_COLORS: Record<string, string> = {
  schedule_change: 'bg-orange-100 text-orange-700',
  schedule_assigned: 'bg-blue-100 text-blue-700',
  case_approved: 'bg-green-100 text-green-700',
  case_rejected: 'bg-red-100 text-red-700',
  attendance: 'bg-teal-100 text-teal-700',
  evaluation: 'bg-purple-100 text-purple-700',
};

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('authToken');
  const h: Record<string, string> = {};
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

export function AdminNotificationLogPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications-all'],
    queryFn: async () => {
      const res = await fetch('/api/notifications/all', { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to load notification log');
      return res.json();
    },
    refetchInterval: 30_000,
  });

  const types = [...new Set(notifications.map(n => n.type))].sort();

  const filtered = notifications.filter(n => {
    const matchType = typeFilter === 'all' || n.type === typeFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q) || n.userId.toLowerCase().includes(q);
    return matchType && matchSearch;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Bell className="w-7 h-7" /> Notification Log
        </h2>
        <p className="text-muted-foreground mt-1">Full history of system notifications sent to all users.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by title, message, or user ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {types.map(t => (
              <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="text-sm text-muted-foreground">{filtered.length} notification{filtered.length !== 1 ? 's' : ''}</div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead className="w-32">User ID</TableHead>
                  <TableHead className="w-24 text-center">Read</TableHead>
                  <TableHead className="w-36">Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                      {notifications.length === 0 ? 'No notifications have been sent yet.' : 'No results match your filters.'}
                    </TableCell>
                  </TableRow>
                ) : filtered.map(n => (
                  <TableRow key={n.id}>
                    <TableCell>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[n.type] ?? 'bg-gray-100 text-gray-600'}`}>
                        {n.type.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium max-w-[180px] truncate">{n.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[260px] truncate">{n.message}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{n.userId.slice(0, 8)}…</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={n.isRead ? 'secondary' : 'default'} className="text-xs">
                        {n.isRead ? 'Read' : 'Unread'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
