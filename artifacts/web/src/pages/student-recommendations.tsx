import { useState, useMemo } from 'react';
import { Link, useRoute } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Info, Sparkles, UserPlus, UserMinus,
  CheckCircle2, Loader2, Save, AlertTriangle, TrendingUp, TrendingDown,
  Search, X,
} from 'lucide-react';
import {
  useGetRecommendations,
  useGetRecommendationExplanation,
  useGetSchedule,
  useUpdateSchedule,
} from '@workspace/api-client-react';
import type { StudentRecommendation } from '@workspace/api-client-react';

function getAuthToken() { return localStorage.getItem('authToken'); }
async function apiFetch<T>(path: string): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(path, { headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: 'include' });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
  return res.json();
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-500';
}
function progressColor(score: number) {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}
function initials(firstName?: string, lastName?: string) {
  return `${(firstName?.[0] ?? '').toUpperCase()}${(lastName?.[0] ?? '').toUpperCase()}`;
}
function scoreRating(score: number) {
  if (score >= 85) return { label: 'Excellent', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  if (score >= 70) return { label: 'Good', color: 'bg-blue-100 text-blue-700 border-blue-200' };
  if (score >= 55) return { label: 'Fair', color: 'bg-amber-100 text-amber-700 border-amber-200' };
  return { label: 'Low Priority', color: 'bg-red-100 text-red-700 border-red-200' };
}

// ── Explanation Sheet ─────────────────────────────────────────────────────────

function ExplanationSheet({
  rec, scheduleId, isAssigned, onToggle, onClose,
}: {
  rec: StudentRecommendation;
  scheduleId: string;
  isAssigned: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const { data, isLoading } = useGetRecommendationExplanation(
    { studentId: rec.studentId, scheduleId },
    { query: { enabled: true } },
  );

  const positives = rec.reasons.filter((r) => r.applied && r.weight > 0);
  const negatives = rec.reasons.filter((r) => r.applied && r.weight < 0);
  const neutral   = rec.reasons.filter((r) => !r.applied);

  const name = `${rec.student?.firstName ?? ''} ${rec.student?.lastName ?? ''}`.trim();
  const profile = rec.student?.studentProfile;
  const rating = scoreRating(rec.score);

  return (
    <SheetContent className="w-full sm:max-w-md overflow-y-auto">
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" /> Why This Student?
        </SheetTitle>
      </SheetHeader>

      <div className="mt-6 space-y-5">
        {/* Student info */}
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-base">
              {initials(rec.student?.firstName, rec.student?.lastName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-base">{name}</p>
            <p className="text-sm text-muted-foreground">
              {profile?.studentNumber ?? '—'}
              {profile?.yearLevel ? ` · Year ${profile.yearLevel}` : ''}
              {profile?.section ? ` · Section ${profile.section}` : ''}
            </p>
          </div>
        </div>

        <Separator />

        {/* Score summary */}
        <div className="text-center space-y-2">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border font-semibold text-sm ${rating.color}`}>
            <Sparkles className="w-3.5 h-3.5" /> {rating.label}
          </div>
          <div className="flex items-center justify-center gap-1">
            <span className={`text-5xl font-black ${scoreColor(rec.score)}`}>{rec.score}</span>
            <span className="text-xl text-muted-foreground font-medium mt-2">/100</span>
          </div>
          <p className="text-xs text-muted-foreground">AI Recommendation Score</p>
          <div className="relative h-3 rounded-full bg-muted overflow-hidden mx-4">
            <div
              className={`absolute left-0 top-0 h-full rounded-full transition-all ${progressColor(rec.score)}`}
              style={{ width: `${rec.score}%` }}
            />
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xl font-bold">{rec.student?.attendanceRate ?? '—'}<span className="text-sm font-normal">%</span></p>
            <p className="text-xs text-muted-foreground mt-0.5">Attendance Rate</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className={`text-xl font-bold ${(rec.student?.absenceCount ?? 0) > 3 ? 'text-red-500' : ''}`}>{rec.student?.absenceCount ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Absences</p>
          </div>
        </div>

        <Separator />

        {/* Score Breakdown — spec format */}
        <div className="space-y-2">
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <Info className="w-4 h-4 text-muted-foreground" /> Score Breakdown
          </p>

          {positives.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> Positive Factors
              </div>
              <div className="divide-y">
                {positives.map((r) => (
                  <div key={r.criterion} className="flex items-center justify-between px-3 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="text-sm text-muted-foreground truncate">{r.description ?? r.criterion}</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-600 shrink-0 ml-3">+{r.weight}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {negatives.length > 0 && (
            <div className="border border-red-100 rounded-lg overflow-hidden">
              <div className="bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5" /> Penalty Factors
              </div>
              <div className="divide-y">
                {negatives.map((r) => (
                  <div key={r.criterion} className="flex items-center justify-between px-3 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span className="text-sm text-muted-foreground truncate">{r.description ?? r.criterion}</span>
                    </div>
                    <span className="text-sm font-bold text-red-500 shrink-0 ml-3">{r.weight}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total score row */}
          <div className="flex items-center justify-between px-3 py-3 rounded-lg bg-muted/50 font-semibold">
            <span className="text-sm">Total Score</span>
            <span className={`text-lg font-black ${scoreColor(rec.score)}`}>{rec.score}</span>
          </div>

          {neutral.length > 0 && (
            <details className="text-xs text-muted-foreground cursor-pointer">
              <summary className="hover:text-foreground py-1">{neutral.length} criteria not applied (click to expand)</summary>
              <ul className="mt-1 space-y-1 pl-4 list-disc text-muted-foreground/70">
                {neutral.map((r) => <li key={r.criterion}>{r.criterion}</li>)}
              </ul>
            </details>
          )}
        </div>

        {/* LLM explanation */}
        {(isLoading || data?.explanation) && (
          <>
            <Separator />
            <div>
              <p className="text-sm font-semibold mb-2">AI Summary</p>
              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Generating…
                </div>
              ) : (
                <p className="text-sm text-muted-foreground leading-relaxed bg-muted/40 rounded-md p-3">
                  {data?.explanation}
                </p>
              )}
            </div>
          </>
        )}

        <Separator />

        {/* Action */}
        <Button
          className="w-full gap-2"
          variant={isAssigned ? 'outline' : 'default'}
          onClick={() => { onToggle(); onClose(); }}
        >
          {isAssigned
            ? <><UserMinus className="w-4 h-4" /> Remove from Schedule</>
            : <><UserPlus className="w-4 h-4" /> Add to Schedule</>}
        </Button>
      </div>
    </SheetContent>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function StudentRecommendationsPage() {
  const [, params] = useRoute('/schedules/:id/recommendations');
  const scheduleId = params?.id ?? '';
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedRec, setSelectedRec] = useState<StudentRecommendation | null>(null);
  const [pendingIds, setPendingIds] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiMode, setAiMode] = useState(false);

  // ── Filter / sort state (manual mode) ────────────────────────────────────
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState('all');
  const [filterSection, setFilterSection] = useState('all');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'year' | 'section'>('name-asc');

  const { data: schedule, isLoading: loadingSchedule } = useGetSchedule(scheduleId, {
    query: { enabled: !!scheduleId },
  });

  // All students — always loaded for manual assignment
  const { data: allStudents = [], isLoading: loadingStudents } = useQuery<any[]>({
    queryKey: ['students'],
    queryFn: () => apiFetch<any[]>('/api/students'),
    staleTime: 60_000,
  });

  // AI recommendations — only fetched when scheduler clicks "Get AI Suggestions"
  const { data: recommendations = [], isLoading: loadingRecs } = useGetRecommendations(
    { scheduleId },
    { query: { enabled: aiMode && !!scheduleId } },
  );

  const updateSchedule = useUpdateSchedule();

  const serverIds: string[] = (schedule as unknown as { studentIds?: string[] })?.studentIds ?? [];
  const assignedIds = pendingIds ?? serverIds;
  const isDirty = pendingIds !== null;

  function toggle(studentId: string) {
    const base = pendingIds ?? serverIds;
    setPendingIds(base.includes(studentId) ? base.filter(id => id !== studentId) : [...base, studentId]);
  }

  async function saveAssignments() {
    if (!pendingIds) return;
    setSaving(true);
    try {
      await updateSchedule.mutateAsync({ id: scheduleId, data: { studentIds: pendingIds } });
      queryClient.invalidateQueries();
      setPendingIds(null);
      toast({ title: 'Assignments saved', description: `${pendingIds.length} student(s) assigned.` });
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  // ── Derived filter options + filtered+sorted list ────────────────────────
  const availableSections = useMemo(() => {
    const s = new Set<string>();
    for (const st of allStudents) {
      const sec = st.studentProfile?.section;
      if (sec) s.add(sec);
    }
    return [...s].sort();
  }, [allStudents]);

  const filteredStudents = useMemo(() => {
    let list = [...allStudents];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((s: any) => {
        const name = `${s.firstName} ${s.lastName}`.toLowerCase();
        const num = (s.studentProfile?.studentNumber ?? '').toLowerCase();
        return name.includes(q) || num.includes(q);
      });
    }
    if (filterYear !== 'all') {
      list = list.filter((s: any) => String(s.studentProfile?.yearLevel) === filterYear);
    }
    if (filterSection !== 'all') {
      list = list.filter((s: any) => s.studentProfile?.section === filterSection);
    }
    list.sort((a: any, b: any) => {
      if (sortBy === 'name-asc') return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      if (sortBy === 'name-desc') return `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`);
      if (sortBy === 'year') return (a.studentProfile?.yearLevel ?? 0) - (b.studentProfile?.yearLevel ?? 0);
      if (sortBy === 'section') return (a.studentProfile?.section ?? '').localeCompare(b.studentProfile?.section ?? '');
      return 0;
    });
    return list;
  }, [allStudents, search, filterYear, filterSection, sortBy]);

  const scheduleAny = schedule as unknown as {
    hospital?: { name: string };
    department?: { name: string };
    dutyDate?: string;
    startTime?: string;
    endTime?: string;
  } | undefined;

  const scheduleLabel = scheduleAny
    ? [
        scheduleAny.hospital?.name,
        scheduleAny.department?.name,
        scheduleAny.dutyDate,
        scheduleAny.startTime && scheduleAny.endTime ? `${scheduleAny.startTime} – ${scheduleAny.endTime}` : undefined,
      ].filter(Boolean).join(' · ')
    : `Schedule #${scheduleId}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <Link href="/schedules" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-3">
            <ArrowLeft className="w-4 h-4" /> Back to Schedules
          </Link>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Assign Students</h2>
          <p className="text-muted-foreground mt-1 text-sm">{scheduleLabel}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Button
            variant={aiMode ? 'default' : 'outline'}
            className="gap-2"
            onClick={() => setAiMode(v => !v)}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            {aiMode ? 'Hide AI Suggestions' : 'Get AI Suggestions'}
          </Button>
          {isDirty && (
            <Button onClick={saveAssignments} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save {pendingIds?.length ?? 0} Assignment{(pendingIds?.length ?? 0) !== 1 ? 's' : ''}
            </Button>
          )}
        </div>
      </div>

      {/* AI explanation callout — only when AI mode is on */}
      {aiMode && (
        <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
          <CardContent className="flex gap-3 pt-4 pb-4">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                <Sparkles className="w-4 h-4" /> How the AI Score Works
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                Students start at 50 points. Positive factors: missing clinical cases <strong>(+30)</strong>,
                no schedule conflict <strong>(+25)</strong>, remaining duty days <strong>(+15)</strong>,
                good attendance &gt;95% <strong>(+15)</strong>, balanced section distribution <strong>(+10)</strong>,
                makeup duty needed <strong>(+10)</strong>. Penalties apply for absences and lates.
                Click <em>Why?</em> to see the full breakdown per student.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assigned count */}
      {!loadingSchedule && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>
            <span className="font-medium text-foreground">{assignedIds.length}</span> student{assignedIds.length !== 1 ? 's' : ''} assigned
            {isDirty && <span className="text-amber-600 ml-2">· unsaved changes</span>}
          </span>
        </div>
      )}

      {/* ── AI MODE: Ranked Recommendations ────────────────────── */}
      {aiMode && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" /> AI-Ranked Students
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {loadingRecs || loadingSchedule ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Analyzing students…
              </div>
            ) : recommendations.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">No students available for this schedule.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Rank</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead className="hidden md:table-cell">Year / Section</TableHead>
                    <TableHead>AI Score</TableHead>
                    <TableHead className="hidden sm:table-cell">Attendance</TableHead>
                    <TableHead className="hidden sm:table-cell">Absences</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recommendations.map((rec, idx) => {
                    const isAssigned = assignedIds.includes(rec.studentId);
                    const hasConflict = rec.reasons.some(r => r.criterion === 'No Schedule Conflict' && !r.applied);
                    const profile = rec.student?.studentProfile;
                    const rating = scoreRating(rec.score);

                    return (
                      <TableRow
                        key={rec.studentId}
                        className={[
                          'transition-colors',
                          isAssigned ? 'bg-emerald-50/60 dark:bg-emerald-950/20' : '',
                          hasConflict ? 'opacity-60' : '',
                        ].filter(Boolean).join(' ')}
                      >
                        <TableCell>
                          <span className="font-bold text-muted-foreground">#{idx + 1}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {initials(rec.student?.firstName, rec.student?.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm leading-tight">
                                {rec.student?.firstName} {rec.student?.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">{profile?.studentNumber ?? '—'}</p>
                            </div>
                            {isAssigned && (
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0 h-4">Assigned</Badge>
                            )}
                            {hasConflict && (
                              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">Conflict</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {profile?.yearLevel ? `Year ${profile.yearLevel}` : '—'}
                            {profile?.section ? ` · ${profile.section}` : ''}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 min-w-[80px]">
                            <div className="flex items-center gap-1.5">
                              <span className={`font-bold text-sm ${scoreColor(rec.score)}`}>{rec.score}</span>
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${rating.color}`}>
                                {rating.label}
                              </Badge>
                            </div>
                            <div className="relative h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`absolute left-0 top-0 h-full rounded-full transition-all ${progressColor(rec.score)}`}
                                style={{ width: `${rec.score}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="text-sm">{rec.student?.attendanceRate != null ? `${rec.student.attendanceRate}%` : '—'}</span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className={`text-sm ${(rec.student?.absenceCount ?? 0) > 3 ? 'text-red-600 font-medium' : ''}`}>
                            {rec.student?.absenceCount ?? 0}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelectedRec(rec)}>
                              Why?
                            </Button>
                            <Button
                              size="sm"
                              variant={isAssigned ? 'outline' : 'default'}
                              className={`h-7 text-xs gap-1 ${isAssigned ? 'text-red-600 border-red-200 hover:bg-red-50' : ''}`}
                              disabled={hasConflict && !isAssigned}
                              onClick={() => toggle(rec.studentId)}
                            >
                              {isAssigned ? <><UserMinus className="w-3.5 h-3.5" /> Remove</> : <><UserPlus className="w-3.5 h-3.5" /> Assign</>}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── MANUAL MODE: All Students ───────────────────────────── */}
      {!aiMode && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  All Students
                  {!loadingStudents && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      {filteredStudents.length} of {allStudents.length}
                    </span>
                  )}
                </CardTitle>
              </div>
              {/* Filter + sort bar */}
              <div className="flex flex-wrap gap-2">
                {/* Search */}
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search name or student no."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                  {search && (
                    <button type="button" onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {/* Year filter */}
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger className="h-8 text-sm w-[110px]">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    <SelectItem value="1">Year 1</SelectItem>
                    <SelectItem value="2">Year 2</SelectItem>
                    <SelectItem value="3">Year 3</SelectItem>
                    <SelectItem value="4">Year 4</SelectItem>
                  </SelectContent>
                </Select>
                {/* Section filter */}
                <Select value={filterSection} onValueChange={setFilterSection}>
                  <SelectTrigger className="h-8 text-sm w-[120px]">
                    <SelectValue placeholder="Section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {availableSections.map(sec => (
                      <SelectItem key={sec} value={sec}>Section {sec}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Sort */}
                <Select value={sortBy} onValueChange={v => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="h-8 text-sm w-[140px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-asc">Name A → Z</SelectItem>
                    <SelectItem value="name-desc">Name Z → A</SelectItem>
                    <SelectItem value="year">Year Level</SelectItem>
                    <SelectItem value="section">Section</SelectItem>
                  </SelectContent>
                </Select>
                {/* Clear filters */}
                {(search || filterYear !== 'all' || filterSection !== 'all' || sortBy !== 'name-asc') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-muted-foreground"
                    onClick={() => { setSearch(''); setFilterYear('all'); setFilterSection('all'); setSortBy('name-asc'); }}
                  >
                    <X className="w-3.5 h-3.5 mr-1" /> Clear
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {loadingStudents || loadingSchedule ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading students…
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                {allStudents.length === 0 ? 'No students found.' : 'No students match the current filters.'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead className="hidden md:table-cell">Student No.</TableHead>
                    <TableHead className="hidden md:table-cell">Year / Section</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student: any) => {
                    const isAssigned = assignedIds.includes(student.id);
                    const profile = student.studentProfile;
                    return (
                      <TableRow key={student.id} className={isAssigned ? 'bg-emerald-50/60 dark:bg-emerald-950/20' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {initials(student.firstName, student.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{student.firstName} {student.lastName}</p>
                            </div>
                            {isAssigned && (
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0 h-4">Assigned</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {profile?.studentNumber ?? '—'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {profile?.yearLevel ? `Year ${profile.yearLevel}` : '—'}
                          {profile?.section ? ` · ${profile.section}` : ''}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={isAssigned ? 'outline' : 'default'}
                            className={`h-7 text-xs gap-1 ${isAssigned ? 'text-red-600 border-red-200 hover:bg-red-50' : ''}`}
                            onClick={() => toggle(student.id)}
                          >
                            {isAssigned
                              ? <><UserMinus className="w-3.5 h-3.5" /> Remove</>
                              : <><UserPlus className="w-3.5 h-3.5" /> Assign</>}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Floating save bar */}
      {isDirty && (
        <div className="fixed bottom-6 right-6 z-50">
          <Card className="shadow-lg border-amber-200 bg-amber-50 dark:bg-amber-950/40">
            <CardContent className="flex items-center gap-4 py-3 px-4">
              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                {pendingIds?.length ?? 0} student{(pendingIds?.length ?? 0) !== 1 ? 's' : ''} assigned · unsaved
              </span>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setPendingIds(null)}>Discard</Button>
              <Button size="sm" className="h-7 text-xs gap-1" onClick={saveAssignments} disabled={saving}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Explanation Sheet */}
      <Sheet open={!!selectedRec} onOpenChange={(open) => { if (!open) setSelectedRec(null); }}>
        {selectedRec && (
          <ExplanationSheet
            rec={selectedRec}
            scheduleId={scheduleId}
            isAssigned={assignedIds.includes(selectedRec.studentId)}
            onToggle={() => toggle(selectedRec.studentId)}
            onClose={() => setSelectedRec(null)}
          />
        )}
      </Sheet>
    </div>
  );
}
