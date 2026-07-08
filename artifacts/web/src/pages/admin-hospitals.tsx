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
import { Building2, Plus, Pencil, ExternalLink, Loader2, MapPin } from 'lucide-react';
import { useListHospitals, useCreateHospital, useUpdateHospital } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { MapLocationPicker, type MapLocationValue } from '@/components/map-location-picker';

// ── Form state ─────────────────────────────────────────────────────────────────

interface HospitalFormState {
  name: string;
  address: string;
  contactNumber: string;
  lat: number;
  lng: number;
  attendanceRadius: string;
}

const emptyForm: HospitalFormState = {
  name: '',
  address: '',
  contactNumber: '',
  lat: 0,
  lng: 0,
  attendanceRadius: '100',
};

// ── Hospital form component ────────────────────────────────────────────────────

function HospitalForm({
  values,
  onChange,
}: {
  values: HospitalFormState;
  onChange: (v: HospitalFormState) => void;
}) {
  const handleMapChange = (mv: MapLocationValue) => {
    onChange({ ...values, lat: mv.lat, lng: mv.lng, address: mv.address || values.address });
  };

  return (
    <div className="space-y-4">
      {/* Name */}
      <div>
        <Label>Hospital Name <span className="text-destructive">*</span></Label>
        <Input
          className="mt-1"
          value={values.name}
          onChange={e => onChange({ ...values, name: e.target.value })}
          placeholder="e.g. Metro General Hospital"
        />
      </div>

      {/* Contact Number */}
      <div>
        <Label>Contact Number</Label>
        <Input
          className="mt-1"
          value={values.contactNumber}
          onChange={e => onChange({ ...values, contactNumber: e.target.value })}
          placeholder="02-XXXX-XXXX"
        />
      </div>

      {/* Map picker */}
      <div>
        <Label className="flex items-center gap-1.5 mb-2">
          <MapPin className="w-4 h-4" /> Hospital Location
          <span className="text-muted-foreground text-xs font-normal">(drag pin or search)</span>
        </Label>
        <MapLocationPicker
          value={{ lat: values.lat, lng: values.lng, address: values.address }}
          onChange={handleMapChange}
          height={240}
        />
      </div>

      {/* Address (auto-filled by map, editable) */}
      <div>
        <Label>Address</Label>
        <Input
          className="mt-1"
          value={values.address}
          onChange={e => onChange({ ...values, address: e.target.value })}
          placeholder="Auto-filled from map, or type manually"
        />
      </div>

      {/* Attendance Radius */}
      <div>
        <Label>Attendance Radius (meters)</Label>
        <Input
          className="mt-1"
          type="number"
          min={10}
          max={5000}
          value={values.attendanceRadius}
          onChange={e => onChange({ ...values, attendanceRadius: e.target.value })}
          placeholder="100"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Students must be within this radius to time in. Default: 100 m.
        </p>
      </div>
    </div>
  );
}

// ── Page component ────────────────────────────────────────────────────────────

export function AdminHospitalsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: hospitals = [], isLoading } = useListHospitals();
  const createMutation = useCreateHospital();
  const updateMutation = useUpdateHospital();

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTargetId, setEditTargetId] = useState<string | null>(null);
  const [form, setForm] = useState<HospitalFormState>(emptyForm);
  const [editForm, setEditForm] = useState<HospitalFormState>(emptyForm);

  const handleAdd = () => {
    createMutation.mutate(
      {
        data: {
          name: form.name,
          address: form.address || undefined,
          contactNumber: form.contactNumber || undefined,
          latitude: form.lat || undefined,
          longitude: form.lng || undefined,
          attendanceRadius: Number(form.attendanceRadius) || 100,
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
          latitude: editForm.lat || undefined,
          longitude: editForm.lng || undefined,
          attendanceRadius: Number(editForm.attendanceRadius) || 100,
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
      lat: h.latitude ?? 0,
      lng: h.longitude ?? 0,
      attendanceRadius: String(h.attendanceRadius ?? 100),
    });
    setEditOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Manage Hospitals</h2>
          <p className="text-muted-foreground mt-1">Configure partner hospital facilities and GPS attendance zones.</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add Hospital</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Hospital</DialogTitle></DialogHeader>
          {editOpen && <HospitalForm values={editForm} onChange={setEditForm} />}
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
                  <TableHead className="text-center">GPS</TableHead>
                  <TableHead className="text-center">Departments</TableHead>
                  <TableHead className="text-center">Radius (m)</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hospitals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-10">No hospitals found.</TableCell>
                  </TableRow>
                ) : hospitals.map(h => (
                  <TableRow key={h.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{h.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{h.address ?? '—'}</TableCell>
                    <TableCell className="text-center">
                      {h.latitude && h.longitude ? (
                        <span className="text-xs text-emerald-600 font-medium flex items-center justify-center gap-1">
                          <MapPin className="w-3 h-3" /> Set
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
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
