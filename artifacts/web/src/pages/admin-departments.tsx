import { useState } from 'react';
import { Link, useRoute } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Pencil, Trash2, FolderOpen, Loader2, CalendarDays } from 'lucide-react';

interface Department {
  id: string;
  hospitalId: string;
  name: string;
  code: string;
  isActive: boolean;
  requiredDutyDays: number;
  requiredDutyHours: number;
}

interface Hospital {
  id: string;
  name: string;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('authToken');
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

const emptyForm = {
  name: '',
  code: '',
  requiredDutyDays: 0,
  requiredDutyHours: 0,
  isActive: true,
};
type DeptForm = typeof emptyForm;

function DeptFormFields({ values, onChange }: { values: DeptForm; onChange: (v: DeptForm) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label>Department / Ward Name <span className="text-destructive">*</span></Label>
          <Input
            className="mt-1"
            value={values.name}
            onChange={e => onChange({ ...values, name: e.target.value })}
            placeholder="e.g. Delivery Room"
          />
        </div>
        <div>
          <Label>Code</Label>
          <Input
            className="mt-1"
            value={values.code}
            onChange={e => onChange({ ...values, code: e.target.value.toUpperCase() })}
            placeholder="e.g. DR"
            maxLength={8}
          />
        </div>
        <div className="flex items-end pb-1">
          <div className="flex items-center gap-2">
            <Switch checked={values.isActive} onCheckedChange={v => onChange({ ...values, isActive: v })} />
            <Label>Active</Label>
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
          <CalendarDays className="w-3.5 h-3.5" /> Clinical Requirements
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Required Duty Days</Label>
            <Input
              className="mt-1"
              type="number"
              min={0}
              value={values.requiredDutyDays}
              onChange={e => onChange({ ...values, requiredDutyDays: Math.max(0, Number(e.target.value)) })}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground mt-1">Total days student must complete</p>
          </div>
          <div>
            <Label>Required Duty Hours</Label>
            <Input
              className="mt-1"
              type="number"
              min={0}
              value={values.requiredDutyHours}
              onChange={e => onChange({ ...values, requiredDutyHours: Math.max(0, Number(e.target.value)) })}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground mt-1">Hours (used internally)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminDepartmentsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, params] = useRoute('/admin/hospitals/:id/departments');
  const hospitalId = params?.id ?? '';

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Department | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [form, setForm] = useState<DeptForm>(emptyForm);
  const [editForm, setEditForm] = useState<DeptForm>(emptyForm);

  // Fetch hospital name
  const { data: hospitals = [] } = useQuery<Hospital[]>({
    queryKey: ['hospitals'],
    queryFn: async () => {
      const res = await fetch('/api/hospitals', { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to load hospitals');
      return res.json();
    },
  });
  const hospitalName = hospitals.find((h: Hospital) => h.id === hospitalId)?.name ?? hospitalId;

  // Fetch departments (including inactive for admin view)
  const { data: departments = [], isLoading } = useQuery<Department[]>({
    queryKey: ['departments', hospitalId],
    queryFn: async () => {
      const res = await fetch(`/api/hospitals/${hospitalId}/departments?includeInactive=true`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load departments');
      return res.json();
    },
    enabled: !!hospitalId,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['departments', hospitalId] });

  // CREATE
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/hospitals/${hospitalId}/departments`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to create');
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      setAddOpen(false);
      setForm(emptyForm);
      toast({ title: 'Department created', description: `${form.name} has been added.` });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // UPDATE
  const updateMutation = useMutation({
    mutationFn: async (values: DeptForm) => {
      if (!editTarget) return;
      const res = await fetch(`/api/hospitals/${hospitalId}/departments/${editTarget.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to update');
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      setEditOpen(false);
      toast({ title: 'Department updated', description: `${editForm.name} has been saved.` });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // TOGGLE ACTIVE
  const toggleMutation = useMutation({
    mutationFn: async (dept: Department) => {
      const res = await fetch(`/api/hospitals/${hospitalId}/departments/${dept.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ isActive: !dept.isActive }),
      });
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // DELETE (soft)
  const deleteMutation = useMutation({
    mutationFn: async (dept: Department) => {
      const res = await fetch(`/api/hospitals/${hospitalId}/departments/${dept.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to delete');
    },
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
      toast({ title: 'Department deactivated' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  function openEdit(d: Department) {
    setEditTarget(d);
    setEditForm({ name: d.name, code: d.code, requiredDutyDays: d.requiredDutyDays, requiredDutyHours: d.requiredDutyHours, isActive: d.isActive });
    setEditOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/hospitals"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Wards / Departments</h2>
          <p className="text-muted-foreground mt-1">{hospitalName}</p>
        </div>
        <div className="ml-auto">
          <Button onClick={() => { setForm(emptyForm); setAddOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />Add Ward
          </Button>
        </div>
      </div>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Ward / Department</DialogTitle></DialogHeader>
          <DeptFormFields values={form} onChange={setForm} />
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!form.name || createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              Add Ward
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Ward / Department</DialogTitle></DialogHeader>
          <DeptFormFields values={editForm} onChange={setEditForm} />
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              onClick={() => updateMutation.mutate(editForm)}
              disabled={!editForm.name || updateMutation.isPending}
            >
              {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This ward will be hidden from scheduling and new assignments. Existing duty records and verifications will remain intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : departments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <FolderOpen className="w-10 h-10 mb-3 opacity-40" />
              <p className="font-medium">No wards added yet</p>
              <p className="text-sm mt-1">Click "Add Ward" to configure clinical requirements.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ward Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-center">Duty Days</TableHead>
                  <TableHead className="text-center">Duty Hours</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((d: Department) => (
                  <TableRow key={d.id} className={!d.isActive ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">{d.code || '—'}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {d.requiredDutyDays > 0
                        ? <Badge className="bg-primary/10 text-primary border-primary/20">{d.requiredDutyDays}d</Badge>
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {d.requiredDutyHours > 0 ? `${d.requiredDutyHours}h` : '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      {d.isActive
                        ? <Badge className="bg-emerald-500 text-white">Active</Badge>
                        : <Badge variant="secondary">Inactive</Badge>}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={d.isActive}
                        onCheckedChange={() => toggleMutation.mutate(d)}
                        disabled={toggleMutation.isPending}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(d)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(d)}
                        >
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
    </div>
  );
}
