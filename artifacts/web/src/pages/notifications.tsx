import { useState } from 'react';
import { Bell, Calendar, CheckCircle, XCircle, Clock, BellRing } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

type NotificationType = 'schedule_update' | 'case_verified' | 'case_rejected' | 'slot_available' | 'reminder';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  relatedEntity?: string;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'schedule_update',
    title: 'Schedule Updated',
    message: 'Your duty schedule at St. Luke\'s Medical Center on June 20 has been updated.',
    isRead: false,
    createdAt: new Date().toISOString(),
    relatedEntity: 'schedule-101',
  },
  {
    id: '2',
    type: 'case_verified',
    title: 'Case Completion Verified',
    message: 'Your case log for "Acute Myocardial Infarction" has been verified by CI Santos.',
    isRead: false,
    createdAt: new Date().toISOString(),
    relatedEntity: 'case-55',
  },
  {
    id: '3',
    type: 'case_rejected',
    title: 'Case Completion Rejected',
    message: 'Your case log for "Dengue Fever" was rejected. Reason: Incomplete patient data.',
    isRead: false,
    createdAt: new Date().toISOString(),
    relatedEntity: 'case-56',
  },
  {
    id: '4',
    type: 'slot_available',
    title: 'New Slot Available',
    message: 'A new duty slot opened at Makati Medical Center — Cardiology on June 25.',
    isRead: false,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    relatedEntity: 'slot-88',
  },
  {
    id: '5',
    type: 'reminder',
    title: 'Duty Reminder',
    message: 'You have a scheduled duty tomorrow at Philippine General Hospital — Internal Medicine.',
    isRead: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    relatedEntity: 'schedule-102',
  },
  {
    id: '6',
    type: 'schedule_update',
    title: 'Schedule Cancelled',
    message: 'Your duty at UST Hospital on June 18 has been cancelled by the scheduler.',
    isRead: true,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    relatedEntity: 'schedule-99',
  },
  {
    id: '7',
    type: 'case_verified',
    title: 'Case Completion Verified',
    message: 'Your case log for "Type 2 Diabetes Mellitus" has been verified.',
    isRead: true,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    relatedEntity: 'case-50',
  },
  {
    id: '8',
    type: 'slot_available',
    title: 'Slot Application Approved',
    message: 'Your application for the duty slot at Ospital ng Maynila on June 28 has been approved.',
    isRead: true,
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    relatedEntity: 'slot-80',
  },
];

const typeIcon: Record<NotificationType, React.ReactNode> = {
  schedule_update: <Calendar className="h-5 w-5 text-blue-500" />,
  case_verified: <CheckCircle className="h-5 w-5 text-emerald-500" />,
  case_rejected: <XCircle className="h-5 w-5 text-red-500" />,
  slot_available: <BellRing className="h-5 w-5 text-amber-500" />,
  reminder: <Clock className="h-5 w-5 text-purple-500" />,
};

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export function NotificationsPage() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const todayNotifications = notifications.filter((n) => isToday(n.createdAt));
  const earlierNotifications = notifications.filter((n) => !isToday(n.createdAt));

  const markRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    toast({ title: 'All notifications marked as read.' });
  };

  const NotificationCard = ({ notif }: { notif: Notification }) => (
    <div
      className={`flex gap-4 p-4 rounded-lg border transition-colors ${
        !notif.isRead ? 'border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20' : 'bg-card'
      }`}
    >
      <div className="mt-0.5 flex-shrink-0">{typeIcon[notif.type]}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-medium ${!notif.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
            {notif.title}
          </p>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {isToday(notif.createdAt) ? formatTime(notif.createdAt) : formatDate(notif.createdAt)}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">{notif.message}</p>
        {!notif.isRead && (
          <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs text-blue-600 px-0 hover:text-blue-800" onClick={() => markRead(notif.id)}>
            Mark as read
          </Button>
        )}
      </div>
      {!notif.isRead && <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Notification Center</h2>
          <p className="text-muted-foreground mt-1">Stay up to date with your clinical activities.</p>
        </div>
        <Button variant="outline" onClick={markAllRead} disabled={unreadCount === 0}>
          Mark All Read
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-muted-foreground" />
        {unreadCount > 0 ? (
          <Badge variant="info">{unreadCount} unread</Badge>
        ) : (
          <span className="text-sm text-muted-foreground">No unread notifications</span>
        )}
      </div>

      {notifications.every((n) => n.isRead) ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle className="h-12 w-12 text-emerald-400 mb-4" />
            <h3 className="text-lg font-semibold">You're all caught up!</h3>
            <p className="text-muted-foreground mt-1">No unread notifications.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {todayNotifications.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Today</h3>
              <div className="space-y-2">
                {todayNotifications.map((n) => <NotificationCard key={n.id} notif={n} />)}
              </div>
            </div>
          )}
          {earlierNotifications.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Earlier</h3>
              <div className="space-y-2">
                {earlierNotifications.map((n) => <NotificationCard key={n.id} notif={n} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
