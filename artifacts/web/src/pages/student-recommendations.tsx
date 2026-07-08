import { useState } from 'react';
import { Link, useRoute } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Info,
  Sparkles,
  UserPlus,
  UserMinus,
  CheckCircle2,
  Loader2,
  Save,
  AlertTriangle,
} from 'lucide-react';
import {
  useGetRecommendations,
  useGetRecommendationExplanation,
  useGetSchedule,
  useUpdateSchedule,
} from '@workspace/api-client-react';
import type { StudentRecommendation } from '@workspace/api-client-react';

// ── helpers ────────────────────────────────────────────────────────────────────

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

// ── Explanation sheet ──────────────────────────────────────────────────────────

function ExplanationSheet({
  rec,
  scheduleId,
  isAssigned,
  onToggle,
  onClose,
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

  return (
    <SheetContent className="w-full sm:max-w-md overflow-y-auto">
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" /> AI Recommendation
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
              {profile?.section ? ` · ${profile.section}` : ''}
            </p>
          </div>
        </div>

        <Separator />

        {/* Score stats */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className={`text-2xl font-bold ${scoreColor(rec.score)}`}>{rec.score}</p>
            <p className="text-xs text-muted-foreground mt-1">AI Score</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-2xl font-bold">{rec.student?.attendanceRate ?? '—'}<span className="text-sm font-normal">%</span></p>
            <p className="text-xs text-muted-foreground mt-1">Attendance</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-2xl font-bold">{rec.student?.absenceCount ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Absences</p>
          </div>
        </div>

        <Separator />

        {/* Explanation text */}
        <div>
          <p className="text-sm font-semibold mb-2 flex items-center gap-1">
            <Info className="w-4 h-4 text-muted-foreground" /> Why this student?
          </p>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Generating explanation…
            </div>
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {data?.explanation ?? 'No explanation available.'}
            </p>
          )}
        </div>

        {/* Scoring breakdown */}
        {(positives.length > 0 || negatives.length > 0) && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Scoring Breakdown</p>
            {positives.map((r) => (
              <div key={r.criterion} className="flex items-start gap-2 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">{r.description ?? r.criterion} <span className="text-emerald-600 font-medium">+{r.weight}</span></span>
              </div>
            ))}
            {negatives.map((r) => (
              <div key={r.criterion} className="flex items-start gap-2 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">{r.description ?? r.criterion} <span className="text-red-500 font-medium">{r.weight}</span></span>
              </div>
            ))}
            {neutral.length > 0 && (
              <details className="text-xs text-muted-foreground cursor-pointer">
                <summary className="hover:text-foreground">{neutral.length} criteria not applied</summary>
                <ul className="mt-1 space-y-1 pl-4 list-disc">
                  {neutral.map((r) => <li key={r.criterion}>{r.criterion}</li>)}
                </ul>
              </details>
            )}
          </div>
        )}

        <Separator />

        {/* Action */}
        <Button
          className="w-full gap-2"
          variant={isAssigned ? 'outline' : 'default'}
          onClick={() => { onToggle(); onClose(); }}
        >
          {isAssigned ? (
            <><UserMinus className="w-4 h-4" /> Remove from Schedule</>
          ) : (
            <><UserPlus className="w-4 h-4" /> Add to Schedule</>
          )}
        </Button>
      </div>
    </SheetContent>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export function StudentRecommendationsPage() {
  const [, params] = useRoute('/schedules/:id/recommendations');
  const scheduleId = params?.id ?? '';
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedRec, setSelectedRec] = useState<StudentRecommendation | null>(null);
  const [pendingIds, setPendingIds] = useState<string[] | null>(null); // null = not yet diverged from server
  const [saving, setSaving] = useState(false);

  // ── Data fetching ────────────────────────────────────────────────────────────
  const { data: schedule, isLoading: loadingSchedule } = useGetSchedule(scheduleId, {
    query: { enabled: !!scheduleId },
  });

  const { data: recommendations = [], isLoading: loadingRecs } = useGetRecommendations(
    { scheduleId },
    { query: { enabled: !!scheduleId } },
  );

  const updateSchedule = useUpdateSchedule();

  // Effective assigned list: user's pending changes or server's current list
  const serverIds: string[] = (schedule as unknown as { studentIds?: string[] })?.studentIds ?? [];
  const assignedIds = pendingIds ?? serverIds;
  const isDirty = pendingIds !== null;

  // ── Assign / remove ──────────────────────────────────────────────────────────
  function toggle(studentId: string) {
    const base = pendingIds ?? serverIds;
    if (base.includes(studentId)) {
      setPendingIds(base.filter((id) => id !== studentId));
    } else {
      setPendingIds([...base, studentId]);
    }
  }

  // ── Save all changes ─────────────────────────────────────────────────────────
  async function saveAssignments() {
    if (!pendingIds) return;
    setSaving(true);
    try {
      await updateSchedule.mutateAsync({ id: scheduleId, data: { studentIds: pendingIds } });
      queryClient.invalidateQueries();
      setPendingIds(null);
      toast({ title: 'Assignments saved', description: `${pendingIds.length} student(s) assigned to this schedule.` });
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  // ── Schedule header info ─────────────────────────────────────────────────────
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
        scheduleAny.startTime && scheduleAny.endTime
          ? `${scheduleAny.startTime} – ${scheduleAny.endTime}`
          : undefined,
      ]
        .filter(Boolean)
        .join(' · ')
    : `Schedule #${scheduleId}`;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <Link href="/schedules" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-3">
            <ArrowLeft className="w-4 h-4" /> Back to Schedules
          </Link>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-amber-500" /> Student Recommendations
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">{scheduleLabel}</p>
        </div>

        {isDirty && (
          <Button onClick={saveAssignments} disabled={saving} className="gap-2 shrink-0">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save {pendingIds?.length ?? 0} Assignment{(pendingIds?.length ?? 0) !== 1 ? 's' : ''}
          </Button>
        )}
      </div>

      {/* How it works callout */}
      <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
        <CardContent className="flex gap-3 pt-5 pb-5">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1">
              <Sparkles className="w-4 h-4" /> How the AI scores students
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              Each student gets a score (0–100) based on weighted criteria: <strong>needs a required clinical case (+40)</strong>,{' '}
              <strong>no schedule conflict (+25)</strong>, <strong>attendance above 95% (+20)</strong>,{' '}
              <strong>fewer completed hours (+15)</strong>, and <strong>needs makeup duty (+10)</strong>.
              Penalties apply for excessive absences or late records. Click <em>View Details</em> on any student to see the full breakdown.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Assigned count banner */}
      {!loadingSchedule && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>
            <span className="font-medium text-foreground">{assignedIds.length}</span> student{assignedIds.length !== 1 ? 's' : ''} currently assigned
            {isDirty && <span className="text-amber-600 ml-2">· unsaved changes</span>}
          </span>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ranked Student List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingRecs || loadingSchedule ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading recommendations…
            </div>
          ) : recommendations.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              No students available for this schedule.
            </div>
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
                  const hasConflict = rec.reasons.some(
                    (r) => r.criterion === 'No Existing Duty Conflict' && !r.applied,
                  );
                  const profile = rec.student?.studentProfile;

                  return (
                    <TableRow
                      key={rec.studentId}
                      className={[
                        'transition-colors',
                        isAssigned ? 'bg-emerald-50/60 dark:bg-emerald-950/20' : '',
                        hasConflict ? 'opacity-60' : '',
                      ].filter(Boolean).join(' ')}
                    >
                      {/* Rank */}
                      <TableCell>
                        <span className="font-bold text-muted-foreground">#{idx + 1}</span>
                      </TableCell>

                      {/* Student */}
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
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0 h-4">
                              Assigned
                            </Badge>
                          )}
                          {hasConflict && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                              Conflict
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Year / Section */}
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {profile?.yearLevel ? `Year ${profile.yearLevel}` : '—'}
                          {profile?.section ? ` · ${profile.section}` : ''}
                        </span>
                      </TableCell>

                      {/* Score */}
                      <TableCell>
                        <div className="space-y-1 min-w-[80px]">
                          <span className={`font-bold text-sm ${scoreColor(rec.score)}`}>{rec.score}</span>
                          <div className="relative h-2 w-20 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`absolute left-0 top-0 h-full rounded-full transition-all ${progressColor(rec.score)}`}
                              style={{ width: `${rec.score}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>

                      {/* Attendance */}
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-sm">
                          {rec.student?.attendanceRate != null ? `${rec.student.attendanceRate}%` : '—'}
                        </span>
                      </TableCell>

                      {/* Absences */}
                      <TableCell className="hidden sm:table-cell">
                        <span className={`text-sm ${(rec.student?.absenceCount ?? 0) > 3 ? 'text-red-600 font-medium' : ''}`}>
                          {rec.student?.absenceCount ?? 0}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => setSelectedRec(rec)}
                          >
                            View Details
                          </Button>
                          <Button
                            size="sm"
                            variant={isAssigned ? 'outline' : 'default'}
                            className={`h-7 text-xs gap-1 ${isAssigned ? 'text-red-600 border-red-200 hover:bg-red-50' : ''}`}
                            disabled={hasConflict && !isAssigned}
                            onClick={() => toggle(rec.studentId)}
                          >
                            {isAssigned ? (
                              <><UserMinus className="w-3.5 h-3.5" /> Remove</>
                            ) : (
                              <><UserPlus className="w-3.5 h-3.5" /> Assign</>
                            )}
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

      {/* Save bar */}
      {isDirty && (
        <div className="fixed bottom-6 right-6 z-50">
          <Card className="shadow-lg border-amber-200 bg-amber-50 dark:bg-amber-950/40">
            <CardContent className="flex items-center gap-4 py-3 px-4">
              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Unsaved changes · {pendingIds?.length ?? 0} student{(pendingIds?.length ?? 0) !== 1 ? 's' : ''} assigned
              </span>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setPendingIds(null)}>
                Discard
              </Button>
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
