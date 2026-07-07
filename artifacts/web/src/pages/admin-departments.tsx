import { useState } from 'react';
import { Link, useRoute } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Pencil, FolderOpen } from 'lucide-react';

interface Department {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

const HOSPITAL_NAMES: Record<string, string> = {
  'h-001': 'Metro General Hospital',
  'h-002': "St. Luke's Medical Center",
  'h-003': 'Philippine General Hospital',
  'h-004': 'Makati Medical Center',
  'h-005': 'The Medical City',
};

const MOCK_DEPARTMENTS: Record<string, Department[]> = {
  'h-001': [
    { id: 'd-001', name: 'Delivery Room', code: 'DR', isActive: true },
    { id: 'd-002', name: 'Medical-Surgical Ward', code: 'MSW', isActive: true },
    { id: 'd-003', name: 'Pediatrics', code: 'PED', isActive: true },
    { id: 'd-004', name: 'Intensive Care Unit', code: 'ICU', isActive: false },
  ],
  'h-002': [
    { id: 'd-005', name: 'OB-Gynecology', code: 'OBG', isActive: true },
    { id: 'd-006', name: 'Emergency Room', code: 'ER', isActive: true },
    { id: 'd-007', name: 'Cardiology', code: 'CARD', isActive: true },
  ],
};

const emptyForm = { name: '', code: '', isActive: true };

export function AdminDepartmentsPage() {
  const { toast } = useToast();
  const [, params] = useRoute('/admin/hospitals/:id/departments');
  const hospitalId = params?.id ?? 'h-001';
  const hospitalName = HOSPITAL_NAMES[hospitalId] ?? 'Unknown Hospital';

  const [departments, setDepartments] = useState<Department[]>(MOCK_DEPARTMENTS[hospitalId] ?? []);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Department | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);

  const handleAdd = () => {
    const newDept: Department = { id: `d-${Date.now()}`, name: form.name, code: form.code, isActive: form.isActive };
    setDepartments(prev => [...prev, newDept]);
    setForm(emptyForm);
    setAddOpen(false);
    toast({ title: 'Department added', description: `${form.name} has been added.` });
  };

  const handleEdit = () => {
    if (!editTarget) return;
    setDepartments(prev => prev.map(d => d.id === editTarget.id ? { ...d, name: editForm.name, code: editForm.code } : d));
    setEditOpen(false);
    toast({ title: 'Department updated', description: `${editForm.name} has been updated.` });
  };

  const toggleActive = (id: string) => {
    setDepartments(prev => prev.map(d => d.id === id ? { ...d, isActive: !d.isActive } : d));
  };

  const openEdit = (d: Department) => {
    setEditTarget(d);
    setEditForm({ name: d.name, code: d.code, isActive: d.isActive });
    setEditOpen(true);
  };

  const DeptForm = ({ values, onChange }: { values: typeof emptyForm; onChange: (v: typeof emptyForm) => void }) => (
    <div className="space-y-3">
      <div>
        <Label>Department Name</Label>
        <Input className="mt-1" value={values.name} onChange={e => onChange({ ...values, name: e.target.value })} placeholder="e.g. Delivery Room" />
      </div>
      <div>
        <Label>Code</Label>
        <Input className="mt-1" value={values.code} onChange={e => onChange({ ...values, code: e.target.value.toUpperCase() })} placeholder="e.g. DR" maxLength={6} />
      </div>
      <div className="flex items-center gap-3 pt-1">
        <Switch checked={values.isActive} onCheckedChange={v => onChange({ ...values, isActive: v })} />
        <Label>Active</Label>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/hospitals"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Departments</h2>
          <p className="text-muted-foreground mt-1">{hospitalName}</p>
        </div>
        <div className="ml-auto">
          <Button onClick={() => setAddOpen(true)}><Plus className="w-4 h-4 mr-2" />Add Department</Button>
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add Department</DialogTitle></DialogHeader>
          <DeptForm values={form} onChange={setForm} />
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.name || !form.code}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Edit Department</DialogTitle></DialogHeader>
          <DeptForm values={editForm} onChange={setEditForm} />
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-0">
          {departments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <FolderOpen className="w-10 h-10 mb-3 opacity-40" />
              <p className="font-medium">No departments yet</p>
              <p className="text-sm mt-1">Click "Add Department" to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">{d.code}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {d.isActive
                        ? <Badge className="bg-emerald-500 text-white">Active</Badge>
                        : <Badge variant="secondary">Inactive</Badge>}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch checked={d.isActive} onCheckedChange={() => toggleActive(d.id)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(d)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
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
