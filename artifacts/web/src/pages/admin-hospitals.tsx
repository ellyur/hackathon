import { useState } from 'react';
import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Building2, Plus, Pencil, ExternalLink, Loader2 } from 'lucide-react';
import { useListHospitals, useCreateHospital, useUpdateHospital } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

const emptyForm = { name: '', address: '', contactNumber: '', latitude: '', longitude: '', attendanceRadius: '100' };

export function AdminHospitalsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: hospitals = [], isLoading } = useListHospitals();
  const createMutation = useCreateHospital();
  const updateMutation = useUpdateHospital();

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTargetId, setEditTargetId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);

  const handleAdd = () => {
    createMutation.mutate(
      {
        data: {
          name: form.name,
          address: form.address || undefined,
          contactNumber: form.contactNumber || undefined,
          latitude: form.latitude ? Number(form.latitude) : undefined,
          longitude: form.longitude ? Number(form.longitude) : undefined,
          attendanceRadius: Number(form.attendanceRadius),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries();
          setForm(emptyForm);
          setAddOpen(false);
          toast({ title: 'Hospital added', description: `${form.name} has been added.` });
        },
        onError: () => toast({ title: 'Error', description: 'Failed to add hospital.', variant: 'destructive' }),
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
          address: editForm.address || undefined,
          contactNumber: editForm.contactNumber || undefined,
          latitude: editForm.latitude ? Number(editForm.latitude) : undefined,
          longitude: editForm.longitude ? Number(editForm.longitude) : undefined,
          attendanceRadius: Number(editForm.attendanceRadius),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries();
          setEditOpen(false);
          toast({ title: 'Hospital updated', description: `${editForm.name} has been updated.` });
        },
        onError: () => toast({ title: 'Error', description: 'Failed to update hospital.', variant: 'destructive' }),
      },
    );
  };

  const toggleActive = (h: typeof hospitals[number]) => {
    updateMutation.mutate(
      { id: h.id, data: { name: h.name, isActive: !h.isActive } },
      {
        onSuccess: () => queryClient.invalidateQueries(),
        onError: () => toast({ title: 'Error', description: 'Failed to update status.', variant: 'destructive' }),
      },
    );
  };

  const openEdit = (h: typeof hospitals[number]) => {
    setEditTargetId(h.id);
    setEditForm({
      name: h.name,
      address: h.address ?? '',
      contactNumber: h.contactNumber ?? '',
      latitude: h.latitude != null ? String(h.latitude) : '',
      longitude: h.longitude != null ? String(h.longitude) : '',
      attendanceRadius: String(h.attendanceRadius ?? 100),
    });
    setEditOpen(true);
  };

  const HospitalForm = ({ values, onChange }: { values: typeof emptyForm; onChange: (v: typeof emptyForm) => void }) => (
    <div className="space-y-3">
      <div>
        <Label>Hospital Name</Label>
        <Input className="mt-1" value={values.name} onChange={e => onChange({ ...values, name: e.target.value })} placeholder="e.g. Metro General Hospital" />
      </div>
      <div>
        <Label>Address</Label>
        <Input className="mt-1" value={values.address} onChange={e => onChange({ ...values, address: e.target.value })} placeholder="Full address" />
      </div>
      <div>
        <Label>Contact Number</Label>
        <Input className="mt-1" value={values.contactNumber} onChange={e => onChange({ ...values, contactNumber: e.target.value })} placeholder="02-XXXX-XXXX" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Latitude</Label>
          <Input className="mt-1" value={values.latitude} onChange={e => onChange({ ...values, latitude: e.target.value })} placeholder="14.5995" />
        </div>
        <div>
          <Label>Longitude</Label>
          <Input className="mt-1" value={values.longitude} onChange={e => onChange({ ...values, longitude: e.target.value })} placeholder="120.9842" />
        </div>
      </div>
      <div>
        <Label>Attendance Radius (meters)</Label>
        <Input className="mt-1" type="number" value={values.attendanceRadius} onChange={e => onChange({ ...values, attendanceRadius: e.target.value })} placeholder="100" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Manage Hospitals</h2>
          <p className="text-muted-foreground mt-1">Configure partner hospital facilities and settings.</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add Hospital</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Add Hospital</DialogTitle></DialogHeader>
            <HospitalForm values={form} onChange={setForm} />
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={!form.name || createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Hospital'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Hospital</DialogTitle></DialogHeader>
          <HospitalForm values={editForm} onChange={setEditForm} />
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hospital Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="text-center">Departments</TableHead>
                  <TableHead className="text-center">Radius (m)</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hospitals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">No hospitals found.</TableCell>
                  </TableRow>
                ) : hospitals.map(h => (
                  <TableRow key={h.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{h.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{h.address ?? '—'}</TableCell>
                    <TableCell className="text-center">{h.departments?.length ?? 0}</TableCell>
                    <TableCell className="text-center">{h.attendanceRadius ?? '—'}</TableCell>
                    <TableCell className="text-center">
                      <Switch checked={h.isActive} onCheckedChange={() => toggleActive(h)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(h)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/admin/hospitals/${h.id}/departments`}>
                            <ExternalLink className="w-4 h-4" />
                          </Link>
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
