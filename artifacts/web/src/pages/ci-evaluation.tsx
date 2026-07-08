import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, ClipboardList, CheckCircle2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';

interface Schedule {
  id: string;
  title?: string;
  dutyDate: string;
  startTime: string;
  endTime: string;
  status: string;
  studentIds: string[];
  hospital?: { name: string };
  department?: { name: string };
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  studentProfile?: { studentNumber?: string; section?: string; yearLevel?: number };
}

interface Evaluation {
  id: string;
  scheduleId: string;
  studentId: string;
  rating: number;
  remarks?: string;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('authToken');
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          className="focus:outline-none"
        >
          <Star
            className={`w-6 h-6 transition-colors ${star <= (hovered || value) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
          />
        </button>
      ))}
      <span className="ml-2 text-sm text-muted-foreground self-center">
        {value > 0 ? ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][value] : 'Not rated'}
      </span>
    </div>
  );
}

function ScheduleEvaluationCard({ schedule }: { schedule: Schedule }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});

  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ['schedule-students', schedule.id],
    queryFn: async () => {
      if (!schedule.studentIds?.length) return [];
      const res = await fetch(
        `/api/users?ids=${schedule.studentIds.join(',')}`,
        { headers: authHeaders() }
      );
      // Fallback: fetch all and filter
      const allRes = await fetch('/api/students', { headers: authHeaders() });
      if (!allRes.ok) return [];
      const all: Student[] = await allRes.json();
      return all.filter(s => schedule.studentIds.includes(s.id));
    },
    enabled: expanded,
  });

  const { data: existingEvals = [] } = useQuery<Evaluation[]>({
    queryKey: ['evaluations', schedule.id],
    queryFn: async () => {
      const res = await fetch(`/api/evaluations?scheduleId=${schedule.id}`, { headers: authHeaders() });
      if (!res.ok) return [];
      return res.json();
    },
    onSuccess: (evals) => {
      const r: Record<string, number> = {};
      const rm: Record<string, string> = {};
      evals.forEach(e => { r[e.studentId] = e.rating; rm[e.studentId] = e.remarks ?? ''; });
      setRatings(r);
      setRemarks(rm);
    },
    enabled: expanded,
  });

  const submitMutation = useMutation({
    mutationFn: async ({ studentId }: { studentId: string }) => {
      const rating = ratings[studentId];
      if (!rating) throw new Error('Please select a rating before saving.');
      const res = await fetch('/api/evaluations', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ scheduleId: schedule.id, studentId, rating, remarks: remarks[studentId] ?? '' }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      return res.json();
    },
    onSuccess: (_, { studentId }) => {
      qc.invalidateQueries({ queryKey: ['evaluations', schedule.id] });
      toast({ title: 'Evaluation saved', description: 'Rating submitted successfully.' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const statusColor: Record<string, string> = {
    upcoming: 'bg-blue-100 text-blue-700',
    active: 'bg-green-100 text-green-700',
    completed: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-red-100 text-red-700',
  };

  const evaluatedCount = existingEvals.length;
  const totalStudents = schedule.studentIds?.length ?? 0;

  return (
    <Card>
      <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base">
                {schedule.hospital?.name ?? '—'} — {schedule.department?.name ?? '—'}
              </CardTitle>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[schedule.status] ?? ''}`}>
                {schedule.status}
              </span>
            </div>
            <CardDescription className="mt-0.5">
              {format(new Date(schedule.dutyDate), 'MMMM d, yyyy')} · {schedule.startTime}–{schedule.endTime} · {totalStudents} student{totalStudents !== 1 ? 's' : ''}
              {evaluatedCount > 0 && <span className="ml-2 text-emerald-600 font-medium">· {evaluatedCount}/{totalStudents} evaluated</span>}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" className="shrink-0 mt-0.5">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-4">
          {totalStudents === 0 ? (
            <p className="text-sm text-muted-foreground">No students assigned to this duty.</p>
          ) : students.length === 0 ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : students.map(student => {
            const existing = existingEvals.find(e => e.studentId === student.id);
            const savedRating = existing?.rating ?? 0;
            const currentRating = ratings[student.id] ?? savedRating;
            const currentRemarks = remarks[student.id] ?? existing?.remarks ?? '';
            const initials = `${student.firstName[0]}${student.lastName[0]}`.toUpperCase();

            return (
              <div key={student.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="w-9 h-9">
                    <AvatarFallback className="text-sm">{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{student.firstName} {student.lastName}</p>
                    <p className="text-xs text-muted-foreground">
                      {student.studentProfile?.studentNumber ?? '—'} · Yr {student.studentProfile?.yearLevel ?? '—'} · Sec {student.studentProfile?.section ?? '—'}
                    </p>
                  </div>
                  {existing && (
                    <Badge variant="secondary" className="ml-auto text-xs flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Evaluated
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Clinical Performance Rating</p>
                  <StarRating value={currentRating} onChange={v => setRatings(prev => ({ ...prev, [student.id]: v }))} />
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Remarks (optional)</p>
                  <Textarea
                    className="text-sm resize-none"
                    rows={2}
                    placeholder="Add comments about this student's performance…"
                    value={currentRemarks}
                    onChange={e => setRemarks(prev => ({ ...prev, [student.id]: e.target.value }))}
                  />
                </div>

                <Button
                  size="sm"
                  onClick={() => submitMutation.mutate({ studentId: student.id })}
                  disabled={submitMutation.isPending || !currentRating}
                  className="w-full"
                >
                  {submitMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                  {existing ? 'Update Evaluation' : 'Save Evaluation'}
                </Button>
              </div>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}

export function CIEvaluationPage() {
  const { data: schedules = [], isLoading } = useQuery<Schedule[]>({
    queryKey: ['ci-schedules'],
    queryFn: async () => {
      const res = await fetch('/api/schedules', { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to load schedules');
      return res.json();
    },
  });

  const evaluatable = schedules.filter(s => s.status === 'completed' || s.status === 'active');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Star className="w-7 h-7" /> Student Evaluations
        </h2>
        <p className="text-muted-foreground mt-1">Rate each student's clinical performance for your completed duties.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : evaluatable.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <ClipboardList className="w-10 h-10 text-muted-foreground" />
            <p className="text-muted-foreground">No completed duties to evaluate yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {evaluatable.map(s => <ScheduleEvaluationCard key={s.id} schedule={s} />)}
        </div>
      )}
    </div>
  );
}
