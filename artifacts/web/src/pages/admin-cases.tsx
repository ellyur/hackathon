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
import { Plus, Pencil, BookOpen } from 'lucide-react';

type Category = 'Delivery Room' | 'Medical-Surgical' | 'Pediatrics' | 'OB' | 'ICU';

interface ClinicalCase {
  id: string;
  name: string;
  description: string;
  category: Category;
  requiredCount: number;
  isActive: boolean;
}

const MOCK_CASES: ClinicalCase[] = [
  { id: 'c-001', name: 'Normal Spontaneous Delivery', description: 'Assist in normal vaginal delivery with maternal/fetal monitoring.', category: 'Delivery Room', requiredCount: 5, isActive: true },
  { id: 'c-002', name: 'Episiotomy Care', description: 'Post-delivery perineal wound care and assessment.', category: 'Delivery Room', requiredCount: 3, isActive: true },
  { id: 'c-003', name: 'Newborn Care', description: 'Initial newborn assessment, APGAR scoring and thermoregulation.', category: 'Delivery Room', requiredCount: 5, isActive: true },
  { id: 'c-004', name: 'Wound Dressing', description: 'Sterile wound dressing change using aseptic technique.', category: 'Medical-Surgical', requiredCount: 8, isActive: true },
  { id: 'c-005', name: 'IV Therapy', description: 'Intravenous line insertion and fluid management.', category: 'Medical-Surgical', requiredCount: 10, isActive: true },
  { id: 'c-006', name: 'Post-Op Monitoring', description: 'Post-operative vital signs and complication monitoring.', category: 'Medical-Surgical', requiredCount: 5, isActive: false },
  { id: 'c-007', name: 'Pediatric Vital Signs', description: 'Age-appropriate vital sign assessment for pediatric patients.', category: 'Pediatrics', requiredCount: 6, isActive: true },
  { id: 'c-008', name: 'Pediatric Medication Admin', description: 'Weight-based medication calculation and administration.', category: 'Pediatrics', requiredCount: 5, isActive: true },
  { id: 'c-009', name: 'Fever Management', description: 'Tepid sponge bath and antipyretic administration.', category: 'Pediatrics', requiredCount: 4, isActive: true },
  { id: 'c-010', name: 'Prenatal Assessment', description: 'Leopold\'s maneuver and fundal height measurement.', category: 'OB', requiredCount: 5, isActive: true },
  { id: 'c-011', name: 'Postpartum Care', description: 'Uterine involution assessment and lochia monitoring.', category: 'OB', requiredCount: 4, isActive: true },
  { id: 'c-012', name: 'Breastfeeding Support', description: 'Lactation support and proper latch technique education.', category: 'OB', requiredCount: 3, isActive: true },
  { id: 'c-013', name: 'Ventilator Care', description: 'Endotracheal tube care and ventilator parameter monitoring.', category: 'ICU', requiredCount: 3, isActive: true },
  { id: 'c-014', name: 'Hemodynamic Monitoring', description: 'Arterial line and CVP monitoring in critically ill patients.', category: 'ICU', requiredCount: 3, isActive: true },
  { id: 'c-015', name: 'Code Blue Response', description: 'Cardiopulmonary resuscitation and emergency response.', category: 'ICU', requiredCount: 2, isActive: false },
];

const CATEGORIES: Category[] = ['Delivery Room', 'Medical-Surgical', 'Pediatrics', 'OB', 'ICU'];
const CATEGORY_COLORS: Record<Category, string> = {
  'Delivery Room': 'bg-pink-100 text-pink-700 border-pink-200',
  'Medical-Surgical': 'bg-blue-100 text-blue-700 border-blue-200',
  'Pediatrics': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'OB': 'bg-purple-100 text-purple-700 border-purple-200',
  'ICU': 'bg-red-100 text-red-700 border-red-200',
};

const emptyForm = { name: '', description: '', category: 'Delivery Room' as Category, requiredCount: '1', isActive: true };

export function AdminCasesPage() {
  const { toast } = useToast();
  const [cases, setCases] = useState(MOCK_CASES);
  const [tab, setTab] = useState('All');
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ClinicalCase | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);

  const filtered = tab === 'All' ? cases : cases.filter(c => c.category === tab);

  const handleAdd = () => {
    const newCase: ClinicalCase = {
      id: `c-${Date.now()}`,
      name: form.name,
      description: form.description,
      category: form.category,
      requiredCount: Number(form.requiredCount),
      isActive: form.isActive,
    };
    setCases(prev => [...prev, newCase]);
    setForm(emptyForm);
    setAddOpen(false);
    toast({ title: 'Case added', description: `${form.name} has been added to the library.` });
  };

  const handleEdit = () => {
    if (!editTarget) return;
    setCases(prev => prev.map(c => c.id === editTarget.id
      ? { ...c, name: editForm.name, description: editForm.description, category: editForm.category, requiredCount: Number(editForm.requiredCount) }
      : c
    ));
    setEditOpen(false);
    toast({ title: 'Case updated', description: `${editForm.name} has been updated.` });
  };

  const toggleActive = (id: string) => {
    setCases(prev => prev.map(c => c.id === id ? { ...c, isActive: !c.isActive } : c));
  };

  const openEdit = (c: ClinicalCase) => {
    setEditTarget(c);
    setEditForm({ name: c.name, description: c.description, category: c.category, requiredCount: String(c.requiredCount), isActive: c.isActive });
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
        <Select value={values.category} onValueChange={v => onChange({ ...values, category: v as Category })}>
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

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add Clinical Case</DialogTitle></DialogHeader>
          <CaseForm values={form} onChange={setForm} />
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.name}>Add Case</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Edit Clinical Case</DialogTitle></DialogHeader>
          <CaseForm values={editForm} onChange={setEditForm} />
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${CATEGORY_COLORS[c.category]}`}>
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
                    <Switch checked={c.isActive} onCheckedChange={() => toggleActive(c.id)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
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
    </div>
  );
}
