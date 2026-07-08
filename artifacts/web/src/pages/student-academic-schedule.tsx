import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';

interface AcademicSchedule {
  id: string;
  studentId: string;
  subject: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  semester: string;
  schoolYear: string;
  createdAt: string;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS: Record<string, string> = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
};

const DAY_ORDER = Object.fromEntries(DAYS.map((d, i) => [d, i]));

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('authToken');
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

const emptyForm = { subject: '', dayOfWeek: 'monday', startTime: '08:00', endTime: '09:00', semester: '', schoolYear: '' };

export function StudentAcademicSchedulePage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: entries = [], isLoading } = useQuery<AcademicSchedule[]>({
    queryKey: ['academic-schedules'],
    queryFn: async () => {
      const res = await fetch('/api/academic-schedules', { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to load');
      return res.json();
    },
  });

  const sorted = [...entries].sort((a, b) =>
    (DAY_ORDER[a.dayOfWeek] ?? 7) - (DAY_ORDER[b.dayOfWeek] ?? 7) || a.startTime.localeCompare(b.startTime)
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<AcademicSchedule | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<AcademicSchedule | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['academic-schedules'] });

  const set = (k: keyof typeof emptyForm) => (v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.subject.trim()) throw new Error('Subject is required');
      if (form.startTime >= form.endTime) throw new Error('End time must be after start time');

      if (editEntry) {
        const res = await fetch(`/api/academic-schedules/${editEntry.id}`, {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      } else {
        const res = await fetch('/api/academic-schedules', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      }
    },
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      toast({ title: editEntry ? 'Updated' : 'Added', description: `"${form.subject}" saved.` });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/academic-schedules/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
    },
    onSuccess: () => { invalidate(); setDeleteTarget(null); toast({ title: 'Removed' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const openCreate = () => { setEditEntry(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (e: AcademicSchedule) => {
    setEditEntry(e);
    setForm({ subject: e.subject, dayOfWeek: e.dayOfWeek, startTime: e.startTime, endTime: e.endTime, semester: e.semester, schoolYear: e.schoolYear });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="w-7 h-7" /> Academic Schedule
          </h2>
          <p className="text-muted-foreground mt-1">
            Add your class schedule so the system can detect conflicts with clinical duties.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Class
        </Button>
      </div>

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
                  <TableHead>Subject</TableHead>
                  <TableHead>Day</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>School Year</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                      No classes added yet. Click "Add Class" to start.
                    </TableCell>
                  </TableRow>
                ) : sorted.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.subject}</TableCell>
                    <TableCell>{DAY_LABELS[e.dayOfWeek] ?? e.dayOfWeek}</TableCell>
                    <TableCell className="text-muted-foreground">{e.startTime} – {e.endTime}</TableCell>
                    <TableCell className="text-muted-foreground">{e.semester || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{e.schoolYear || '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(e)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(e)} className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editEntry ? 'Edit Class' : 'Add Class'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Subject <span className="text-destructive">*</span></Label>
              <Input className="mt-1" value={form.subject} onChange={e => set('subject')(e.target.value)} placeholder="e.g. Anatomy & Physiology" autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Day of Week</Label>
                <Select value={form.dayOfWeek} onValueChange={set('dayOfWeek')}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAYS.map(d => <SelectItem key={d} value={d}>{DAY_LABELS[d]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Time</Label>
                <Input className="mt-1" type="time" value={form.startTime} onChange={e => set('startTime')(e.target.value)} />
              </div>
              <div>
                <Label>End Time</Label>
                <Input className="mt-1" type="time" value={form.endTime} onChange={e => set('endTime')(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Semester</Label>
                <Input className="mt-1" value={form.semester} onChange={e => set('semester')(e.target.value)} placeholder="e.g. 1st Sem" />
              </div>
              <div>
                <Label>School Year</Label>
                <Input className="mt-1" value={form.schoolYear} onChange={e => set('schoolYear')(e.target.value)} placeholder="e.g. 2025-2026" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              {editEntry ? 'Save Changes' : 'Add Class'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove "{deleteTarget?.subject}"?</AlertDialogTitle>
            <AlertDialogDescription>This class entry will be deleted from your academic schedule.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />} Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
