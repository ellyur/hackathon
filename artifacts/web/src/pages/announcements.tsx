import { useState } from 'react';
import { Pin, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

type TargetRole = 'all' | 'student' | 'ci' | 'scheduler';

interface Announcement {
  id: string;
  title: string;
  body: string;
  isPinned: boolean;
  targetRole: TargetRole;
  createdAt: string;
  postedBy: string;
}

const mockAnnouncements: Announcement[] = [
  {
    id: '1',
    title: 'Updated Clinical Rotation Guidelines for AY 2024-2025',
    body: 'Please be informed that the clinical rotation guidelines have been updated effective July 1, 2024. All students are required to complete a minimum of 200 hours per rotation cycle. Please review the updated guidelines posted on the school portal. Attendance must be logged via the SIPAG app for all rotations starting July 1. Failure to comply may result in invalidation of hours.',
    isPinned: true,
    targetRole: 'all',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    postedBy: 'Dr. Maria Santos',
  },
  {
    id: '2',
    title: 'Mandatory Orientation for New CI Evaluators',
    body: 'All newly appointed Clinical Instructors are required to attend the orientation session on June 22, 2024 at 2:00 PM via Zoom. Topics include case verification procedures, grading criteria, and use of the SIPAG verification portal.',
    isPinned: true,
    targetRole: 'ci',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    postedBy: 'Admin Office',
  },
  {
    id: '3',
    title: 'Slot Application Window: July Rotation',
    body: 'The slot application window for July rotation is now open. Students may apply for available slots from June 18 to June 25. Priority will be given to students with fewer completed hours. Please log in to view available slots and submit your application.',
    isPinned: false,
    targetRole: 'student',
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    postedBy: 'Clinical Scheduling Office',
  },
  {
    id: '4',
    title: 'System Maintenance Notice — June 20, 2024',
    body: 'SIPAG will undergo scheduled maintenance on June 20, 2024 from 12:00 AM to 4:00 AM. During this period, the app will be unavailable. Please record your time-in/out before or after the maintenance window.',
    isPinned: false,
    targetRole: 'all',
    createdAt: new Date(Date.now() - 345600000).toISOString(),
    postedBy: 'IT Support Team',
  },
  {
    id: '5',
    title: 'Reminder: Case Log Submission Deadline',
    body: 'Students are reminded to submit all pending case logs for the first semester by June 30, 2024. Late submissions will not be accepted. Please coordinate with your assigned CI for verification before the deadline.',
    isPinned: false,
    targetRole: 'student',
    createdAt: new Date(Date.now() - 432000000).toISOString(),
    postedBy: 'Dr. Jose Reyes',
  },
];

const roleBadgeVariant: Record<TargetRole, string> = {
  all: 'bg-slate-100 text-slate-700',
  student: 'bg-blue-100 text-blue-700',
  ci: 'bg-sky-100 text-sky-700',
  scheduler: 'bg-orange-100 text-orange-700',
};

const roleLabel: Record<TargetRole, string> = {
  all: 'All',
  student: 'Students',
  ci: 'CI',
  scheduler: 'Scheduler',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
}

function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = announcement.body.length > 160;
  const displayBody = expanded || !isLong ? announcement.body : announcement.body.slice(0, 160) + '…';

  return (
    <Card className={announcement.isPinned ? 'border-amber-300 shadow-sm' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {announcement.isPinned && <Pin className="h-4 w-4 text-amber-500 fill-amber-400 flex-shrink-0" />}
            <CardTitle className="text-base font-semibold leading-snug">{announcement.title}</CardTitle>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${roleBadgeVariant[announcement.targetRole]}`}>
            {roleLabel[announcement.targetRole]}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <p className="text-sm text-muted-foreground leading-relaxed">{displayBody}</p>
        {isLong && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 h-7 px-0 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Read more</>}
          </Button>
        )}
      </CardContent>
      <CardFooter className="pt-2 pb-3">
        <Separator className="mb-3" />
        <div className="flex items-center gap-1 text-xs text-muted-foreground w-full">
          <span>Posted by <span className="font-medium">{announcement.postedBy}</span></span>
          <span>·</span>
          <span>{formatDate(announcement.createdAt)}</span>
        </div>
      </CardFooter>
    </Card>
  );
}

export function AnnouncementsPage() {
  const [search, setSearch] = useState('');

  const filtered = mockAnnouncements.filter((a) =>
    a.title.toLowerCase().includes(search.toLowerCase())
  );

  const pinned = filtered.filter((a) => a.isPinned);
  const regular = filtered.filter((a) => !a.isPinned);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Announcements</h2>
        <p className="text-muted-foreground mt-1">Important updates from the clinical coordination office.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search announcements..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No announcements found</h3>
            <p className="text-muted-foreground mt-1">Try a different search term.</p>
          </CardContent>
        </Card>
      )}

      {pinned.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Pin className="h-4 w-4 text-amber-500 fill-amber-400" />
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Pinned</h3>
          </div>
          <div className="space-y-3">
            {pinned.map((a) => <AnnouncementCard key={a.id} announcement={a} />)}
          </div>
        </div>
      )}

      {regular.length > 0 && (
        <div className="space-y-3">
          {pinned.length > 0 && (
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">All Announcements</h3>
          )}
          <div className="space-y-3">
            {regular.map((a) => <AnnouncementCard key={a.id} announcement={a} />)}
          </div>
        </div>
      )}
    </div>
  );
}
