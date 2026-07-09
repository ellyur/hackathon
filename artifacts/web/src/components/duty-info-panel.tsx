/**
 * DutyInfoPanel — compact duty detail card shown at the top of the schedule
 * detail page. Displays hospital, ward, date/time, CI, classmates, and
 * map/navigation links.
 */
import { MapPin, Clock, Calendar, User, Users, ExternalLink, Navigation } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ScheduleStudent {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  section?: string | null;
}

interface DutyInfoPanelProps {
  hospitalName: string;
  hospitalAddress?: string | null;
  hospitalLat?: number;
  hospitalLng?: number;
  departmentName?: string | null;
  dutyDate?: string;
  startTime?: string;
  endTime?: string;
  dutyHours?: number | null;
  status?: string;
  ciFirstName?: string | null;
  ciLastName?: string | null;
  students?: ScheduleStudent[];
  currentUserId?: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  upcoming: { label: 'Upcoming', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  active:   { label: 'On Duty', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  completed:{ label: 'Completed', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  cancelled:{ label: 'Cancelled', className: 'bg-red-100 text-red-700 border-red-200' },
};

function StudentAvatar({ student, size = 'sm' }: { student: ScheduleStudent; size?: 'sm' | 'xs' }) {
  const initials = `${student.firstName?.[0] ?? '?'}${student.lastName?.[0] ?? '?'}`.toUpperCase();
  const dim = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-6 h-6 text-[10px]';
  return (
    <div
      className={`${dim} rounded-full overflow-hidden border border-border shadow-sm flex-shrink-0 flex items-center justify-center font-bold select-none`}
      title={`${student.firstName} ${student.lastName}`}
    >
      {student.avatarUrl ? (
        <img src={student.avatarUrl} alt={`${student.firstName} ${student.lastName}`} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
          {initials}
        </div>
      )}
    </div>
  );
}

function formatDutyDate(dateStr?: string) {
  if (!dateStr) return '—';
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTime(t?: string) {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

function computeHours(startTime?: string, endTime?: string): number | null {
  if (!startTime || !endTime) return null;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let diffMin = (eh * 60 + em) - (sh * 60 + sm);
  if (diffMin < 0) diffMin += 24 * 60;
  return Math.round((diffMin / 60) * 100) / 100;
}

export function DutyInfoPanel({
  hospitalName,
  hospitalAddress,
  hospitalLat,
  hospitalLng,
  departmentName,
  dutyDate,
  startTime,
  endTime,
  dutyHours,
  status,
  ciFirstName,
  ciLastName,
  students = [],
  currentUserId,
}: DutyInfoPanelProps) {
  const [classmatesOpen, setClassmatesOpen] = useState(false);

  const hasGps = !!hospitalLat && !!hospitalLng;
  const mapsUrl = hasGps ? `https://www.google.com/maps/search/?api=1&query=${hospitalLat},${hospitalLng}` : null;
  const navUrl = hasGps ? `https://www.google.com/maps/dir/?api=1&destination=${hospitalLat},${hospitalLng}` : null;
  const statusCfg = STATUS_CONFIG[status ?? 'upcoming'] ?? STATUS_CONFIG.upcoming;
  const totalHours = dutyHours ?? computeHours(startTime, endTime);
  const ciName = ciFirstName ? `${ciFirstName} ${ciLastName ?? ''}`.trim() : null;
  const classmates = students.filter(s => s.id !== currentUserId);

  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden mb-4">
      {/* Header row */}
      <div className="px-4 pt-4 pb-3 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-bold text-base leading-tight">{hospitalName}</h3>
            {departmentName && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                {departmentName}
              </p>
            )}
            {hospitalAddress && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{hospitalAddress}</p>
            )}
          </div>
          <Badge className={`text-xs shrink-0 border ${statusCfg.className}`}>
            {statusCfg.label}
          </Badge>
        </div>
      </div>

      {/* Key info grid */}
      <div className="px-4 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Date
          </span>
          <span className="font-medium text-sm">{formatDutyDate(dutyDate)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" /> Time
          </span>
          <span className="font-medium text-sm">
            {formatTime(startTime)} – {formatTime(endTime)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">Total Hours</span>
          <span className="font-medium text-sm">
            {totalHours != null ? `${totalHours}h` : '—'}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <User className="w-3 h-3" /> Clinical Instructor
          </span>
          <span className="font-medium text-sm">{ciName ?? 'Not assigned'}</span>
        </div>
      </div>

      {/* Classmates */}
      {classmates.length > 0 && (
        <div className="border-t px-4 py-3">
          <Collapsible open={classmatesOpen} onOpenChange={setClassmatesOpen}>
            <CollapsibleTrigger className="w-full flex items-center justify-between group">
              <span className="text-sm font-medium flex items-center gap-1.5">
                <Users className="w-4 h-4 text-muted-foreground" />
                Assigned Classmates
                <span className="text-xs text-muted-foreground font-normal ml-1">({classmates.length})</span>
              </span>
              <div className="flex items-center gap-1.5">
                {/* Stacked mini-avatars preview */}
                <div className="flex -space-x-1.5">
                  {classmates.slice(0, 4).map(s => (
                    <StudentAvatar key={s.id} student={s} size="xs" />
                  ))}
                  {classmates.length > 4 && (
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium border border-border">
                      +{classmates.length - 4}
                    </div>
                  )}
                </div>
                {classmatesOpen
                  ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-2">
              {classmates.map(s => (
                <div key={s.id} className="flex items-center gap-2.5 text-sm">
                  <StudentAvatar student={s} size="sm" />
                  <span className="font-medium">{s.firstName} {s.lastName}</span>
                  {s.section && (
                    <span className="text-xs text-muted-foreground">— {s.section}</span>
                  )}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {/* Map / Navigation buttons */}
      {hasGps && (
        <div className="border-t px-4 py-3 flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" asChild>
            <a href={mapsUrl!} target="_blank" rel="noopener noreferrer">
              <MapPin className="w-3.5 h-3.5" />
              View on Map
            </a>
          </Button>
          <Button variant="default" size="sm" className="gap-1.5 text-xs h-8" asChild>
            <a href={navUrl!} target="_blank" rel="noopener noreferrer">
              <Navigation className="w-3.5 h-3.5" />
              Navigate
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
