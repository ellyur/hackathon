import { useState, useMemo, useCallback } from 'react';
import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  CalendarIcon, ChevronLeft, ChevronRight, List, Plus, Loader2, Users,
  Search, FileDown, Filter, CheckCircle2, XCircle, AlertCircle, Clock,
  ArrowLeft, Sparkles,
} from 'lucide-react';
import {
  useListSchedules,
  useCreateSchedule,
  useListHospitals,
  useListDepartments,
  useListUsers,
  useUpdateSchedule,
} from '@workspace/api-client-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface EnrichedSchedule {
  id: string;
  title?: string | null;
  hospitalId: string;
  departmentId: string;
  ciId: string;
  dutyDate: string;
  startTime: string;
  endTime: string;
  gracePeriodMin: number;
  status: string;
  notes?: string | null;
  maxStudents: number;
  requiredYearLevel?: number | null;
  eligibleSections?: string | null;
  caseTypeId?: string | null;
  studentIds: string[];
  hospital: { id: string; name: string } | null;
  department: { id: string; name: string } | null;
  ci: { id: string; firstName: string; lastName: string } | null;
}

interface RecommendationStudent {
  id: string;
  firstName: string;
  lastName: string;
  yearLevel: number | null;
  section: string | null;
  studentNumber: string;
  dutyCount: number;
  attendanceRatePercent: number;
  hasConflict: boolean;
  score: number;
  reasons: string[];
}

// ── Calendar helpers ───────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  const days: { date: Date; isCurrentMonth: boolean }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month - 1, prevMonthDays - i), isCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ date: new Date(year, month, d), isCurrentMonth: true });
  }
  const needed = 42 - days.length;
  for (let i = 1; i <= needed; i++) {
    days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
  }
  return days;
}

function toDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

const STATUS_CHIP: Record<string, { bg: string; label: string }> = {
  upcoming: { bg: 'bg-blue-100 text-blue-700 border border-blue-200', label: 'Upcoming' },
  active:   { bg: 'bg-emerald-100 text-emerald-700 border border-emerald-200', label: 'Active' },
  completed:{ bg: 'bg-gray-100 text-gray-600 border border-gray-200', label: 'Completed' },
  cancelled:{ bg: 'bg-red-100 text-red-600 border border-red-200', label: 'Cancelled' },
};

function statusBadge(status: string) {
  if (status === 'active') return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">Active</Badge>;
  if (status === 'upcoming') return <Badge variant="secondary">Upcoming</Badge>;
  if (status === 'cancelled') return <Badge variant="destructive">Cancelled</Badge>;
  return <Badge variant="outline">Completed</Badge>;
}

// ── ScheduleChip ──────────────────────────────────────────────────────────────

function ScheduleChip({ schedule, onClick }: { schedule: EnrichedSchedule; onClick: () => void }) {
  const chip = STATUS_CHIP[schedule.status] ?? STATUS_CHIP.upcoming;
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`w-full text-left px-1.5 py-0.5 rounded text-[11px] truncate leading-5 ${chip.bg} hover:opacity-80 transition-opacity`}
    >
      {schedule.department?.name ?? schedule.hospital?.name ?? 'Schedule'}
      {schedule.startTime ? ` ${schedule.startTime}` : ''}
    </button>
  );
}

// ── Recommendation card ───────────────────────────────────────────────────────

function RecommendationCard({
  student,
  isAssigned,
  onAssign,
  onRemove,
}: {
  student: RecommendationStudent;
  isAssigned: boolean;
  onAssign: () => void;
  onRemove: () => void;
}) {
  const initials = `${student.firstName[0] ?? ''}${student.lastName[0] ?? ''}`;
  const scoreColor = student.score >= 80 ? 'text-emerald-600' : student.score >= 60 ? 'text-amber-600' : 'text-red-500';

  return (
    <div className={`border rounded-lg p-3 space-y-2 transition-colors ${isAssigned ? 'bg-emerald-50 border-emerald-200' : student.hasConflict ? 'bg-muted/40 opacity-60' : 'bg-card'}`}>
      <div className="flex items-center gap-3">
        <Avatar className="w-9 h-9 flex-shrink-0">
          <AvatarFallback className="text-sm bg-primary/10 text-primary">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{student.firstName} {student.lastName}</div>
          <div className="text-xs text-muted-foreground">
            {student.section ? `Section ${student.section}` : ''}
            {student.yearLevel ? ` · Year ${student.yearLevel}` : ''}
          </div>
        </div>
        <div className={`text-lg font-bold flex-shrink-0 ${scoreColor}`}>{student.score}%</div>
      </div>
      <div className="flex flex-wrap gap-1">
        {student.hasConflict && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">⚠ Conflict</span>}
        {student.reasons.map((r) => (
          <span key={r} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">✓ {r}</span>
        ))}
      </div>
      <div className="flex gap-2 justify-end pt-1">
        {isAssigned ? (
          <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={onRemove}>
            Remove
          </Button>
        ) : (
          <Button size="sm" className="h-7 text-xs" disabled={student.hasConflict} onClick={onAssign}>
            Assign
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const emptyForm = {
  hospitalId: '', departmentId: '', ciId: '',
  startTime: '', endTime: '',
  maxStudents: '10', requiredYearLevel: '', eligibleSections: '',
  caseTypeId: '', gracePeriodMin: '15', notes: '',
};

export function MasterSchedulePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── View ──────────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [search, setSearch] = useState('');

  // ── Calendar state ────────────────────────────────────────────────────────
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  // ── Day dialog ────────────────────────────────────────────────────────────
  const [dayStr, setDayStr] = useState<string | null>(null);
  const [dayOpen, setDayOpen] = useState(false);

  // ── Create schedule dialog ────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState<'form' | 'recommendations'>('form');
  const [createDate, setCreateDate] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [selectedHospital, setSelectedHospital] = useState('');
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendationStudent[]>([]);
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const [recSearch, setRecSearch] = useState('');

  // ── Detail dialog ─────────────────────────────────────────────────────────
  const [detailSchedule, setDetailSchedule] = useState<EnrichedSchedule | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: rawSchedules = [], isLoading } = useListSchedules();
  const schedules = rawSchedules as unknown as EnrichedSchedule[];
  const { data: hospitals = [], isLoading: loadingHospitals } = useListHospitals();
  const { data: departments = [], isLoading: loadingDepts } = useListDepartments(selectedHospital, {
    query: { enabled: !!selectedHospital } as never,
  });
  const { data: allUsers = [] } = useListUsers({ role: 'ci' });
  const ciList = allUsers.filter((u) => u.role === 'ci' && u.isActive);
  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();

  // ── Schedule grouping ─────────────────────────────────────────────────────
  const schedulesByDate = useMemo(() => {
    const map: Record<string, EnrichedSchedule[]> = {};
    for (const s of schedules) {
      if (!map[s.dutyDate]) map[s.dutyDate] = [];
      map[s.dutyDate].push(s);
    }
    return map;
  }, [schedules]);

  const calDays = useMemo(() => getCalendarDays(calYear, calMonth), [calYear, calMonth]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  // ── Open day dialog ───────────────────────────────────────────────────────
  const openDay = useCallback((ds: string) => { setDayStr(ds); setDayOpen(true); }, []);

  // ── Open create from day ──────────────────────────────────────────────────
  const openCreate = useCallback((ds: string) => {
    setCreateDate(ds);
    setForm({ ...emptyForm });
    setSelectedHospital('');
    setRecommendations([]);
    setAssignedIds([]);
    setCreateStep('form');
    setDayOpen(false);
    setCreateOpen(true);
  }, []);

  // ── Generate recommendations ──────────────────────────────────────────────
  const generateRecommendations = async () => {
    if (!form.hospitalId || !form.departmentId || !form.ciId || !form.startTime || !form.endTime) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields first.', variant: 'destructive' });
      return;
    }
    setLoadingRecs(true);
    try {
      const params = new URLSearchParams({ dutyDate: createDate });
      if (form.requiredYearLevel) params.set('yearLevel', form.requiredYearLevel);
      if (form.eligibleSections) params.set('sections', form.eligibleSections);
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/schedules/recommendations?${params}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) throw new Error('Failed to load recommendations');
      const data = await res.json() as RecommendationStudent[];
      setRecommendations(data);
      setCreateStep('recommendations');
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Could not load recommendations', variant: 'destructive' });
    } finally {
      setLoadingRecs(false);
    }
  };

  // ── Save schedule ─────────────────────────────────────────────────────────
  const saveSchedule = async () => {
    try {
      await createSchedule.mutateAsync({
        data: {
          hospitalId: form.hospitalId,
          departmentId: form.departmentId,
          ciId: form.ciId,
          dutyDate: createDate,
          startTime: form.startTime,
          endTime: form.endTime,
          gracePeriodMin: Number(form.gracePeriodMin) || 15,
          notes: form.notes || undefined,
          maxStudents: Number(form.maxStudents) || 10,
          requiredYearLevel: form.requiredYearLevel ? Number(form.requiredYearLevel) : undefined,
          eligibleSections: form.eligibleSections || undefined,
          caseTypeId: form.caseTypeId || undefined,
          studentIds: assignedIds,
        },
      });
      queryClient.invalidateQueries();
      setCreateOpen(false);
      toast({ title: 'Schedule created', description: `${assignedIds.length} student(s) assigned.` });
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to create schedule', variant: 'destructive' });
    }
  };

  // ── Remove student from detail ────────────────────────────────────────────
  const removeStudent = async (scheduleId: string, studentId: string, currentIds: string[]) => {
    try {
      await updateSchedule.mutateAsync({ id: scheduleId, data: { studentIds: currentIds.filter(id => id !== studentId) } });
      queryClient.invalidateQueries();
      toast({ title: 'Student removed' });
      setDetailOpen(false);
    } catch {
      toast({ title: 'Error', description: 'Failed to remove student', variant: 'destructive' });
    }
  };

  // ── List view filter ──────────────────────────────────────────────────────
  const filtered = schedules.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.hospital?.name?.toLowerCase().includes(q) ||
      s.department?.name?.toLowerCase().includes(q) ||
      `${s.ci?.firstName ?? ''} ${s.ci?.lastName ?? ''}`.toLowerCase().includes(q) ||
      (s.title?.toLowerCase().includes(q) ?? false)
    );
  });

  // ── Rec search filter ─────────────────────────────────────────────────────
  const filteredRecs = recommendations.filter((r) => {
    if (!recSearch) return true;
    const q = recSearch.toLowerCase();
    return `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) || r.section?.toLowerCase().includes(q);
  });

  const daySchedules = dayStr ? (schedulesByDate[dayStr] ?? []) : [];
  const maxStudentsNum = Number(form.maxStudents) || 10;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Master Schedule</h2>
          <p className="text-muted-foreground mt-1">Manage and monitor all clinical rotations.</p>
        </div>
        <div className="flex gap-2">
          {/* View toggle */}
          <div className="flex border rounded-md overflow-hidden">
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none"
              onClick={() => setViewMode('calendar')}
            >
              <CalendarIcon className="w-4 h-4 mr-1.5" /> Calendar
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none border-l"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4 mr-1.5" /> List
            </Button>
          </div>
          <Button variant="outline"><FileDown className="w-4 h-4 mr-2" /> Export</Button>
          <Button onClick={() => openCreate(toDateKey(today))}>
            <Plus className="w-4 h-4 mr-2" /> New Schedule
          </Button>
        </div>
      </div>

      {/* ── Calendar View ──────────────────────────────────────────────────── */}
      {viewMode === 'calendar' && (
        <Card>
          {/* Month navigation */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="w-5 h-5" /></Button>
            <h3 className="text-xl font-semibold">{MONTH_NAMES[calMonth]} {calYear}</h3>
            <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="w-5 h-5" /></Button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 border-b">
            {DAY_NAMES.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7" style={{ minHeight: 480 }}>
            {calDays.map(({ date, isCurrentMonth }, idx) => {
              const ds = toDateKey(date);
              const dayScheduleList = schedulesByDate[ds] ?? [];
              const isToday = ds === toDateKey(today);
              return (
                <div
                  key={idx}
                  onClick={() => { if (isCurrentMonth) openDay(ds); }}
                  className={[
                    'border-b border-r p-1.5 min-h-[100px] flex flex-col gap-0.5',
                    isCurrentMonth ? 'cursor-pointer hover:bg-muted/30 transition-colors' : 'bg-muted/10',
                    idx % 7 === 0 && 'border-l',
                  ].filter(Boolean).join(' ')}
                >
                  <span className={[
                    'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mb-0.5',
                    isToday ? 'bg-primary text-primary-foreground' : '',
                    !isCurrentMonth ? 'text-muted-foreground/40' : '',
                  ].filter(Boolean).join(' ')}>
                    {date.getDate()}
                  </span>
                  {dayScheduleList.slice(0, 2).map((s) => (
                    <ScheduleChip
                      key={s.id}
                      schedule={s}
                      onClick={() => { setDetailSchedule(s); setDetailOpen(true); }}
                    />
                  ))}
                  {dayScheduleList.length > 2 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openDay(ds); }}
                      className="text-[10px] text-muted-foreground hover:text-foreground px-1"
                    >
                      +{dayScheduleList.length - 2} more
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 px-6 py-3 border-t text-xs text-muted-foreground">
            {Object.entries(STATUS_CHIP).map(([key, val]) => (
              <span key={key} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-sm ${val.bg.split(' ')[0]}`} />
                {val.label}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* ── List View ──────────────────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <Card>
          <div className="p-4 border-b">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search hospital, department, or CI…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Button variant="outline" className="bg-background"><Filter className="w-4 h-4 mr-2" /> Filters</Button>
            </div>
          </div>
          <CardContent className="p-0">
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
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No schedules found.</TableCell></TableRow>
                  ) : filtered.map((s) => (
                    <TableRow key={s.id} className="hover:bg-muted/10 cursor-pointer" onClick={() => { setDetailSchedule(s); setDetailOpen(true); }}>
                      <TableCell>
                        <div className="font-medium">{s.dutyDate}</div>
                        <div className="text-sm text-muted-foreground">{s.startTime} – {s.endTime}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{s.hospital?.name ?? s.hospitalId}</div>
                        <div className="text-sm text-muted-foreground">{s.department?.name ?? s.departmentId}</div>
                      </TableCell>
                      <TableCell>{s.ci ? `${s.ci.firstName} ${s.ci.lastName}` : '—'}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="font-normal gap-1">
                          <Users className="w-3 h-3" /> {s.studentIds?.length ?? 0} / {s.maxStudents ?? '—'}
                        </Badge>
                      </TableCell>
                      <TableCell>{statusBadge(s.status)}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/schedules/${s.id}/edit`}>Edit</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Day Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={dayOpen} onOpenChange={setDayOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              {dayStr ? new Date(dayStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : ''}
            </DialogTitle>
          </DialogHeader>
          {daySchedules.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">No schedules for this day.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {daySchedules.map((s) => {
                const chip = STATUS_CHIP[s.status] ?? STATUS_CHIP.upcoming;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className="w-full text-left p-3 rounded-lg border hover:bg-muted/30 transition-colors space-y-1"
                    onClick={() => { setDetailSchedule(s); setDetailOpen(true); setDayOpen(false); }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{s.department?.name ?? 'Department'}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${chip.bg}`}>{chip.label}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <Clock className="w-3 h-3 inline mr-1" />{s.startTime} – {s.endTime}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {s.hospital?.name} · <Users className="w-3 h-3 inline" /> {s.studentIds?.length ?? 0}/{s.maxStudents} students
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDayOpen(false)}>Close</Button>
            <Button onClick={() => dayStr && openCreate(dayStr)}>
              <Plus className="w-4 h-4 mr-2" /> Create Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create Schedule Dialog (multi-step) ────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {createStep === 'recommendations' && (
                <button type="button" onClick={() => setCreateStep('form')} className="text-muted-foreground hover:text-foreground mr-1">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              {createStep === 'form' ? (
                <><CalendarIcon className="w-5 h-5" /> Create Schedule — {createDate}</>
              ) : (
                <><Sparkles className="w-5 h-5 text-amber-500" /> Recommended Students</>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* ── Step 1: Form ── */}
          {createStep === 'form' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Hospital */}
                <div className="col-span-2 space-y-1.5">
                  <Label>Hospital <span className="text-destructive">*</span></Label>
                  <Select
                    value={form.hospitalId}
                    onValueChange={(v) => {
                      setSelectedHospital(v);
                      setForm(f => ({ ...f, hospitalId: v, departmentId: '' }));
                    }}
                    disabled={loadingHospitals}
                  >
                    <SelectTrigger><SelectValue placeholder="Select hospital" /></SelectTrigger>
                    <SelectContent>{hospitals.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {/* Department */}
                <div className="col-span-2 space-y-1.5">
                  <Label>Department / Area <span className="text-destructive">*</span></Label>
                  <Select
                    value={form.departmentId}
                    onValueChange={(v) => setForm(f => ({ ...f, departmentId: v }))}
                    disabled={!form.hospitalId || loadingDepts}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={!form.hospitalId ? 'Select hospital first' : loadingDepts ? 'Loading…' : 'Select department'} />
                    </SelectTrigger>
                    <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {/* Clinical Case Type */}
                <div className="col-span-2 space-y-1.5">
                  <Label>Clinical Case Type <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input placeholder="e.g. Normal Delivery, IV Insertion…" value={form.caseTypeId} onChange={e => setForm(f => ({ ...f, caseTypeId: e.target.value }))} />
                </div>
                {/* CI */}
                <div className="col-span-2 space-y-1.5">
                  <Label>Clinical Instructor <span className="text-destructive">*</span></Label>
                  <Select value={form.ciId} onValueChange={(v) => setForm(f => ({ ...f, ciId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select CI" /></SelectTrigger>
                    <SelectContent>{ciList.map(ci => <SelectItem key={ci.id} value={ci.id}>{ci.firstName} {ci.lastName}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {/* Start/End Time */}
                <div className="space-y-1.5">
                  <Label>Start Time <span className="text-destructive">*</span></Label>
                  <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>End Time <span className="text-destructive">*</span></Label>
                  <Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
                </div>
                {/* Max Students */}
                <div className="space-y-1.5">
                  <Label>Required Students</Label>
                  <Input type="number" min={1} max={100} value={form.maxStudents} onChange={e => setForm(f => ({ ...f, maxStudents: e.target.value }))} />
                </div>
                {/* Year Level */}
                <div className="space-y-1.5">
                  <Label>Required Year Level <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Select value={form.requiredYearLevel} onValueChange={(v) => setForm(f => ({ ...f, requiredYearLevel: v === 'any' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Any year level" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="1">Year 1</SelectItem>
                      <SelectItem value="2">Year 2</SelectItem>
                      <SelectItem value="3">Year 3</SelectItem>
                      <SelectItem value="4">Year 4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Eligible Sections */}
                <div className="col-span-2 space-y-1.5">
                  <Label>Eligible Sections <span className="text-muted-foreground text-xs">(optional — comma-separated)</span></Label>
                  <Input placeholder="e.g. 3-A, 3-B, 3-C" value={form.eligibleSections} onChange={e => setForm(f => ({ ...f, eligibleSections: e.target.value }))} />
                </div>
                {/* Grace Period */}
                <div className="space-y-1.5">
                  <Label>Grace Period (min)</Label>
                  <Input type="number" min={0} max={60} value={form.gracePeriodMin} onChange={e => setForm(f => ({ ...f, gracePeriodMin: e.target.value }))} />
                </div>
                {/* Remarks */}
                <div className="col-span-2 space-y-1.5">
                  <Label>Remarks <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Textarea rows={2} placeholder="Any special instructions…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={generateRecommendations} disabled={loadingRecs}>
                  {loadingRecs ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading…</> : <><Sparkles className="w-4 h-4 mr-2" /> Generate Recommendations</>}
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* ── Step 2: Recommendations ── */}
          {createStep === 'recommendations' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{assignedIds.length}</span> / {maxStudentsNum} students assigned
                </div>
                <div className="relative w-48">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input className="pl-8 h-8 text-sm" placeholder="Search students…" value={recSearch} onChange={e => setRecSearch(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {filteredRecs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">No students match the criteria.</p>
                ) : filteredRecs.map((student) => (
                  <RecommendationCard
                    key={student.id}
                    student={student}
                    isAssigned={assignedIds.includes(student.id)}
                    onAssign={() => {
                      if (!assignedIds.includes(student.id)) setAssignedIds(ids => [...ids, student.id]);
                    }}
                    onRemove={() => setAssignedIds(ids => ids.filter(id => id !== student.id))}
                  />
                ))}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateStep('form')}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button onClick={saveSchedule} disabled={createSchedule.isPending}>
                  {createSchedule.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : `Save Schedule (${assignedIds.length} assigned)`}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Schedule Detail Dialog ──────────────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          {detailSchedule && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${STATUS_CHIP[detailSchedule.status]?.bg.split(' ')[0] ?? 'bg-gray-300'}`} />
                  {detailSchedule.hospital?.name ?? 'Schedule'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div><span className="text-muted-foreground">Department:</span> <span className="font-medium">{detailSchedule.department?.name ?? '—'}</span></div>
                  <div><span className="text-muted-foreground">Date:</span> <span className="font-medium">{detailSchedule.dutyDate}</span></div>
                  <div><span className="text-muted-foreground">Time:</span> <span className="font-medium">{detailSchedule.startTime} – {detailSchedule.endTime}</span></div>
                  <div><span className="text-muted-foreground">CI:</span> <span className="font-medium">{detailSchedule.ci ? `${detailSchedule.ci.firstName} ${detailSchedule.ci.lastName}` : '—'}</span></div>
                  <div><span className="text-muted-foreground">Students:</span> <span className="font-medium">{detailSchedule.studentIds?.length ?? 0} / {detailSchedule.maxStudents}</span></div>
                  <div><span className="text-muted-foreground">Status:</span> {statusBadge(detailSchedule.status)}</div>
                  {detailSchedule.notes && <div className="col-span-2"><span className="text-muted-foreground">Notes:</span> <span>{detailSchedule.notes}</span></div>}
                </div>

                {(detailSchedule.studentIds?.length ?? 0) > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Users className="w-4 h-4" /> Assigned Students</h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {detailSchedule.studentIds.map((sid) => (
                        <div key={sid} className="flex items-center justify-between py-1.5 px-3 rounded border text-sm">
                          <span className="font-mono text-xs text-muted-foreground truncate">{sid}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => removeStudent(detailSchedule.id, sid, detailSchedule.studentIds)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
                <Button variant="outline" asChild>
                  <Link href={`/schedules/${detailSchedule.id}/edit`}>Edit Schedule</Link>
                </Button>
                <Button asChild>
                  <Link href={`/schedules/${detailSchedule.id}/recommendations`}>
                    <Sparkles className="w-4 h-4 mr-2" /> Assign Students
                  </Link>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
