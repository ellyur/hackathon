import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Loader2, GraduationCap, Clock } from 'lucide-react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';

function getAuthToken(): string | null { return localStorage.getItem('authToken'); }
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers },
    credentials: 'include',
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
  return res.json();
}

interface AcademicYearSetting {
  id: string;
  schoolYear: string;
  semester: string;
  requiredTotalDutyHours: number;
  createdAt: string;
  updatedAt: string;
}

const emptyForm = { schoolYear: '', semester: '', requiredTotalDutyHours: '500' };

export function AdminAcademicYearSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AcademicYearSetting | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);

  const { data: settings = [], isLoading } = useQuery<AcademicYearSetting[]>({
    queryKey: ['academic-year-settings'],
    queryFn: () => apiFetch('/api/academic-year-settings'),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof emptyForm) =>
      apiFetch<AcademicYearSetting>('/api/academic-year-settings', {
        method: 'POST',
        body: JSON.stringify({ ...data, requiredTotalDutyHours: Number(data.requiredTotalDutyHours) }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-year-settings'] });
      setForm(emptyForm);
      setAddOpen(false);
      toast({ title: 'Setting added', description: 'Academic year duty hours requirement has been saved.' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof emptyForm }) =>
      apiFetch<AcademicYearSetting>(`/api/academic-year-settings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...data, requiredTotalDutyHours: Number(data.requiredTotalDutyHours) }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-year-settings'] });
      setEditOpen(false);
      toast({ title: 'Setting updated' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/academic-year-settings/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-year-settings'] });
      toast({ title: 'Setting deleted' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const openEdit = (s: AcademicYearSetting) => {
    setEditTarget(s);
    setEditForm({ schoolYear: s.schoolYear, semester: s.semester, requiredTotalDutyHours: String(s.requiredTotalDutyHours) });
    setEditOpen(true);
  };

  const SettingForm = ({ values, onChange }: { values: typeof emptyForm; onChange: (v: typeof emptyForm) => void }) => (
    <div className="space-y-4">
      <div>
        <Label>School Year <span className="text-destructive">*</span></Label>
        <Input
          className="mt-1"
          value={values.schoolYear}
          onChange={e => onChange({ ...values, schoolYear: e.target.value })}
          placeholder="e.g. 2026-2027"
        />
        <p className="text-xs text-muted-foreground mt-1">Must match the student's Academic Year exactly.</p>
      </div>
      <div>
        <Label>Semester <span className="text-destructive">*</span></Label>
        <Input
          className="mt-1"
          value={values.semester}
          onChange={e => onChange({ ...values, semester: e.target.value })}
          placeholder="e.g. Semester 1"
        />
      </div>
      <div>
        <Label>Required Total Duty Hours <span className="text-destructive">*</span></Label>
        <Input
          className="mt-1"
          type="number"
          min="0"
          step="10"
          value={values.requiredTotalDutyHours}
          onChange={e => onChange({ ...values, requiredTotalDutyHours: e.target.value })}
          placeholder="e.g. 500"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Students in this school year must accumulate this many Duty Hours to complete their clinical requirements.
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Academic Year Settings</h2>
          <p className="text-muted-foreground mt-1">
            Configure required Duty Hours per school year and semester. These settings drive the Duty Hours progress
            shown on each student's Clinical Passport.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add Setting
        </Button>
      </div>

      {/* Explanation card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-700">
              <strong>Duty Hours</strong> are independent from Clinical Cases. Each school year may have different
              total hour requirements. The system automatically uses the setting that matches a student's Academic Year.
              If no setting is found for a student's year, the default value on their profile is used instead.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" /> Add Academic Year Setting
            </DialogTitle>
          </DialogHeader>
          <SettingForm values={form} onChange={setForm} />
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={!form.schoolYear || !form.semester || !form.requiredTotalDutyHours || createMutation.isPending}
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Setting'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4" /> Edit Academic Year Setting
            </DialogTitle>
          </DialogHeader>
          <SettingForm values={editForm} onChange={setEditForm} />
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              onClick={() => editTarget && updateMutation.mutate({ id: editTarget.id, data: editForm })}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School Year</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead className="text-center">Required Duty Hours</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settings.map(s => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{s.schoolYear}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{s.semester}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-bold font-mono text-primary">{s.requiredTotalDutyHours}</span>
                      <span className="text-muted-foreground text-xs ml-1">hrs</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(s.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {settings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                      <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p>No academic year settings configured yet.</p>
                      <p className="text-xs mt-1">Add a setting to define required Duty Hours per school year.</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
