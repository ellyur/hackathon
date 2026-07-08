import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, BookOpen, Loader2 } from 'lucide-react';
import { useListClinicalCases, useCreateClinicalCase, useUpdateClinicalCase } from '@workspace/api-client-react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

function getAuthToken() { return localStorage.getItem('authToken'); }
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options?.headers },
    credentials: 'include',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.error ?? res.statusText), { inUse: json.inUse ?? false });
  return json as T;
}

function useDeleteClinicalCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<{ message: string }>(`/api/cases/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cases'] }),
  });
}

const CATEGORIES = ['Delivery Room', 'Medical-Surgical', 'Pediatrics', 'OB', 'ICU'] as const;
type Category = typeof CATEGORIES[number];

const CATEGORY_COLORS: Record<string, string> = {
  'Delivery Room': 'bg-orange-100 text-orange-700 border-orange-200',
  'Medical-Surgical': 'bg-blue-100 text-blue-700 border-blue-200',
  'Pediatrics': 'bg-amber-100 text-amber-700 border-amber-200',
  'OB': 'bg-sky-100 text-sky-700 border-sky-200',
  'ICU': 'bg-red-100 text-red-700 border-red-200',
};

const emptyForm = { name: '', description: '', category: 'Delivery Room' as string, requiredCount: '1', hourValue: '', isActive: true };

export function AdminCasesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: cases = [], isLoading } = useListClinicalCases();
  const createMutation = useCreateClinicalCase();
  const updateMutation = useUpdateClinicalCase();

  const deleteMutation = useDeleteClinicalCase();

  const [tab, setTab] = useState('All');
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [editTargetId, setEditTargetId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);

  const filtered = tab === 'All' ? cases : cases.filter(c => c.category === tab);

  const handleAdd = () => {
    createMutation.mutate(
      {
        data: {
          name: form.name,
          description: form.description || undefined,
          category: form.category,
          requiredCount: Number(form.requiredCount),
          hourValue: form.hourValue ? Number(form.hourValue) : undefined,
          isActive: form.isActive,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries();
          setForm(emptyForm);
          setAddOpen(false);
          toast({ title: 'Case added', description: `${form.name} has been added to the library.` });
        },
        onError: () => toast({ title: 'Error', description: 'Failed to add case.', variant: 'destructive' }),
      },
    );
  };

  const handleEdit = () => {
    if (!editTargetId) return;
    updateMutation.mutate(
      {
        id: editTargetId,
        data: {
          name: editForm.name,
          description: editForm.description || undefined,
          category: editForm.category,
          requiredCount: Number(editForm.requiredCount),
          hourValue: editForm.hourValue ? Number(editForm.hourValue) : undefined,
          isActive: editForm.isActive,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries();
          setEditOpen(false);
          toast({ title: 'Case updated', description: `${editForm.name} has been updated.` });
        },
        onError: () => toast({ title: 'Error', description: 'Failed to update case.', variant: 'destructive' }),
      },
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        toast({ title: 'Case deleted', description: `${deleteTarget.name} has been removed.` });
      },
      onError: (e: any) => {
        setDeleteTarget(null);
        if (e?.inUse) {
          toast({
            title: 'Cannot delete — case is in use',
            description: 'This case appears in student records. Deactivate it using the toggle instead.',
            variant: 'destructive',
          });
        } else {
          toast({ title: 'Error', description: e?.message ?? 'Failed to delete case.', variant: 'destructive' });
        }
      },
    });
  };

  const toggleActive = (c: typeof cases[number]) => {
    updateMutation.mutate(
      { id: c.id, data: { name: c.name, category: c.category, requiredCount: c.requiredCount, isActive: !c.isActive } },
      {
        onSuccess: () => queryClient.invalidateQueries(),
        onError: () => toast({ title: 'Error', description: 'Failed to update status.', variant: 'destructive' }),
      },
    );
  };

  const openEdit = (c: typeof cases[number]) => {
    setEditTargetId(c.id);
    setEditForm({
      name: c.name,
      description: c.description ?? '',
      category: c.category,
      requiredCount: String(c.requiredCount),
      hourValue: (c as any).hourValue != null ? String((c as any).hourValue) : '',
      isActive: c.isActive,
    });
    setEditOpen(true);
  };

  const CaseForm = ({ values, onChange }: { values: typeof emptyForm; onChange: (v: typeof emptyForm) => void }) => (
    <div className="space-y-3">
      <div>
        <Label>Case Name</Label>
        <Input className="mt-1" value={values.name} onChange={e => onChange({ ...values, name: e.target.value })} placeholder="e.g. Normal Spontaneous Delivery" />
      </div>
      <div>
        <Label>Description</Label>
        <Input className="mt-1" value={values.description} onChange={e => onChange({ ...values, description: e.target.value })} placeholder="Brief description" />
      </div>
      <div>
        <Label>Category</Label>
        <Select value={values.category} onValueChange={v => onChange({ ...values, category: v })}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Required Count</Label>
        <Input className="mt-1" type="number" min="1" value={values.requiredCount} onChange={e => onChange({ ...values, requiredCount: e.target.value })} />
      </div>
      <div>
        <Label>Hour Value <span className="text-muted-foreground text-xs">(reference only — does not add Duty Hours)</span></Label>
        <Input className="mt-1" type="number" min="0" step="0.5" value={values.hourValue} onChange={e => onChange({ ...values, hourValue: e.target.value })} placeholder="e.g. 4" />
      </div>
      <div className="flex items-center gap-3 pt-1">
        <Switch checked={values.isActive} onCheckedChange={v => onChange({ ...values, isActive: v })} />
        <Label>Active</Label>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Clinical Cases Library</h2>
          <p className="text-muted-foreground mt-1">Define cases students must complete during clinical rotations.</p>
        </div>
        <Button onClick={() => setAddOpen(true)}><Plus className="w-4 h-4 mr-2" />Add Case</Button>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the case from the library. If it has been used in any student records, deletion will be blocked and you can deactivate it instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add Clinical Case</DialogTitle></DialogHeader>
          <CaseForm values={form} onChange={setForm} />
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.name || createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Case'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Edit Clinical Case</DialogTitle></DialogHeader>
          <CaseForm values={editForm} onChange={setEditForm} />
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Card>
          <CardContent className="pt-4 pb-0 px-4">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="All">All ({cases.length})</TabsTrigger>
                {CATEGORIES.map(c => (
                  <TabsTrigger key={c} value={c}>{c} ({cases.filter(x => x.category === c).length})</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardContent>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Required Count</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{c.description}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${CATEGORY_COLORS[c.category] ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                        {c.category}
                      </span>
                    </TableCell>
                    <TableCell className="text-center font-mono font-medium">{c.requiredCount}</TableCell>
                    <TableCell className="text-center">
                      {c.isActive
                        ? <Badge className="bg-emerald-500 text-white">Active</Badge>
                        : <Badge variant="secondary">Inactive</Badge>}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch checked={c.isActive} onCheckedChange={() => toggleActive(c)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget({ id: c.id, name: c.name })}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">No cases in this category.</TableCell>
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
