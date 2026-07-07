import { useState } from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Building2, Plus, Pencil, ExternalLink } from 'lucide-react';

interface Hospital {
  id: string;
  name: string;
  address: string;
  contactNumber: string;
  latitude: string;
  longitude: string;
  attendanceRadius: number;
  departmentsCount: number;
  isActive: boolean;
}

const MOCK_HOSPITALS: Hospital[] = [
  { id: 'h-001', name: 'Metro General Hospital', address: '123 Rizal Ave, Manila', contactNumber: '02-8123-4567', latitude: '14.5995', longitude: '120.9842', attendanceRadius: 100, departmentsCount: 6, isActive: true },
  { id: 'h-002', name: 'St. Luke\'s Medical Center', address: '279 E. Rodriguez Sr. Blvd, QC', contactNumber: '02-8789-7700', latitude: '14.6196', longitude: '121.0160', attendanceRadius: 150, departmentsCount: 8, isActive: true },
  { id: 'h-003', name: 'Philippine General Hospital', address: 'Taft Ave, Manila', contactNumber: '02-8554-8400', latitude: '14.5640', longitude: '120.9912', attendanceRadius: 200, departmentsCount: 10, isActive: true },
  { id: 'h-004', name: 'Makati Medical Center', address: '2 Amorsolo St, Makati', contactNumber: '02-8888-8999', latitude: '14.5547', longitude: '121.0244', attendanceRadius: 100, departmentsCount: 5, isActive: false },
  { id: 'h-005', name: 'The Medical City', address: 'Ortigas Ave, Pasig', contactNumber: '02-8988-1000', latitude: '14.5867', longitude: '121.0614', attendanceRadius: 120, departmentsCount: 7, isActive: true },
];

const emptyForm = { name: '', address: '', contactNumber: '', latitude: '', longitude: '', attendanceRadius: '100' };

export function AdminHospitalsPage() {
  const { toast } = useToast();
  const [hospitals, setHospitals] = useState(MOCK_HOSPITALS);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Hospital | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);

  const handleAdd = () => {
    const newHospital: Hospital = {
      id: `h-${Date.now()}`,
      name: form.name,
      address: form.address,
      contactNumber: form.contactNumber,
      latitude: form.latitude,
      longitude: form.longitude,
      attendanceRadius: Number(form.attendanceRadius),
      departmentsCount: 0,
      isActive: true,
    };
    setHospitals(prev => [...prev, newHospital]);
    setForm(emptyForm);
    setAddOpen(false);
    toast({ title: 'Hospital added', description: `${form.name} has been added.` });
  };

  const handleEdit = () => {
    if (!editTarget) return;
    setHospitals(prev => prev.map(h => h.id === editTarget.id
      ? { ...h, name: editForm.name, address: editForm.address, contactNumber: editForm.contactNumber, latitude: editForm.latitude, longitude: editForm.longitude, attendanceRadius: Number(editForm.attendanceRadius) }
      : h
    ));
    setEditOpen(false);
    toast({ title: 'Hospital updated', description: `${editForm.name} has been updated.` });
  };

  const toggleActive = (id: string) => {
    setHospitals(prev => prev.map(h => h.id === id ? { ...h, isActive: !h.isActive } : h));
  };

  const openEdit = (h: Hospital) => {
    setEditTarget(h);
    setEditForm({ name: h.name, address: h.address, contactNumber: h.contactNumber, latitude: h.latitude, longitude: h.longitude, attendanceRadius: String(h.attendanceRadius) });
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
              <Button onClick={handleAdd} disabled={!form.name}>Add Hospital</Button>
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
            <Button onClick={handleEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-0">
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
              {hospitals.map(h => (
                <TableRow key={h.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{h.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{h.address}</TableCell>
                  <TableCell className="text-center">{h.departmentsCount}</TableCell>
                  <TableCell className="text-center">{h.attendanceRadius}</TableCell>
                  <TableCell className="text-center">
                    <Switch checked={h.isActive} onCheckedChange={() => toggleActive(h.id)} />
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
        </CardContent>
      </Card>
    </div>
  );
}
