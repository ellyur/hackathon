import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';

type ListType = 'section' | 'year_level' | 'semester' | 'school_year';

interface AcademicItem {
  id: string;
  type: ListType;
  label: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

const TAB_CONFIG: { type: ListType; label: string; placeholder: string }[] = [
  { type: 'section', label: 'Sections', placeholder: 'e.g. 3-A' },
  { type: 'year_level', label: 'Year Levels', placeholder: 'e.g. Year 3' },
  { type: 'semester', label: 'Semesters', placeholder: 'e.g. 1st Semester' },
  { type: 'school_year', label: 'School Years', placeholder: 'e.g. 2025-2026' },
];

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('authToken');
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

function useAcademicItems(type: ListType) {
  return useQuery<AcademicItem[]>({
    queryKey: ['academic-lists', type],
    queryFn: async () => {
      const res = await fetch(`/api/academic-lists?type=${type}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to load');
      return res.json();
    },
  });
}

function ItemTab({ type, placeholder }: { type: ListType; placeholder: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useAcademicItems(type);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<AcademicItem | null>(null);
  const [label, setLabel] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [deleteTarget, setDeleteTarget] = useState<AcademicItem | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['academic-lists', type] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editItem) {
        const res = await fetch(`/api/academic-lists/${editItem.id}`, {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify({ label, sortOrder: Number(sortOrder) }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      } else {
        const res = await fetch('/api/academic-lists', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ type, label, sortOrder: Number(sortOrder) }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      }
    },
    onSuccess: () => { invalidate(); setDialogOpen(false); toast({ title: editItem ? 'Updated' : 'Created', description: `"${label}" saved.` }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const toggleMutation = useMutation({
    mutationFn: async (item: AcademicItem) => {
      const res = await fetch(`/api/academic-lists/${item.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/academic-lists/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
    },
    onSuccess: () => { invalidate(); setDeleteTarget(null); toast({ title: 'Deleted' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const openCreate = () => { setEditItem(null); setLabel(''); setSortOrder('0'); setDialogOpen(true); };
  const openEdit = (item: AcademicItem) => { setEditItem(item); setLabel(item.label); setSortOrder(String(item.sortOrder)); setDialogOpen(true); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1.5" /> Add
        </Button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead className="text-center w-20">Order</TableHead>
                  <TableHead className="text-center w-24">Active</TableHead>
                  <TableHead className="text-right w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No items yet. Add one above.</TableCell></TableRow>
                ) : items.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.label}</TableCell>
                    <TableCell className="text-center text-muted-foreground">{item.sortOrder}</TableCell>
                    <TableCell className="text-center">
                      <Switch checked={item.isActive} onCheckedChange={() => toggleMutation.mutate(item)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(item)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
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
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? 'Edit Item' : 'Add Item'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Label</Label>
              <Input className="mt-1" value={label} onChange={e => setLabel(e.target.value)} placeholder={placeholder} autoFocus />
            </div>
            <div>
              <Label>Sort Order</Label>
              <Input className="mt-1" type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} placeholder="0" />
              <p className="text-xs text-muted-foreground mt-1">Lower numbers appear first.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!label.trim() || saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              {editItem ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.label}"?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone. Student profiles referencing this value will keep their existing text.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function AdminAcademicPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="w-7 h-7" /> Academic Management
        </h2>
        <p className="text-muted-foreground mt-1">Manage the structured lists used across student profiles and scheduling filters.</p>
      </div>

      <Tabs defaultValue="section">
        <TabsList>
          {TAB_CONFIG.map(t => (
            <TabsTrigger key={t.type} value={t.type}>{t.label}</TabsTrigger>
          ))}
        </TabsList>
        {TAB_CONFIG.map(t => (
          <TabsContent key={t.type} value={t.type} className="mt-4">
            <ItemTab type={t.type} placeholder={t.placeholder} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
