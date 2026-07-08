import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Pencil, Trash2, Pin } from 'lucide-react';

type TargetRole = 'all' | 'student' | 'ci' | 'scheduler' | 'admin';

interface Announcement {
  id: string;
  title: string;
  body: string;
  targetRole: TargetRole;
  expiresAt: string;
  isPinned: boolean;
  createdAt: string;
}

const initialAnnouncements: Announcement[] = [
  { id: '1', title: 'Semester Schedule Update', body: 'Please review the updated rotation schedules for Q4 2024.', targetRole: 'student', expiresAt: '2024-11-30', isPinned: true, createdAt: 'Oct 1, 2024' },
  { id: '2', title: 'CI Evaluation Deadline', body: 'All CI evaluations must be submitted by October 25, 2024.', targetRole: 'ci', expiresAt: '2024-10-25', isPinned: false, createdAt: 'Oct 5, 2024' },
  { id: '3', title: 'System Maintenance — Oct 20', body: 'ClinicalFlow will undergo scheduled maintenance on October 20 from 2–4 AM.', targetRole: 'all', expiresAt: '2024-10-20', isPinned: true, createdAt: 'Oct 10, 2024' },
  { id: '4', title: 'New Makeup Duty Policy', body: 'Refer to the updated policy document for makeup duty assignment procedures.', targetRole: 'scheduler', expiresAt: '2024-12-31', isPinned: false, createdAt: 'Oct 12, 2024' },
  { id: '5', title: 'Holiday Rotation Adjustments', body: 'Rotation schedules for the upcoming holidays have been adjusted. Check your schedules.', targetRole: 'student', expiresAt: '2024-11-15', isPinned: false, createdAt: 'Oct 14, 2024' },
];

const roleColors: Record<TargetRole, string> = {
  all: 'bg-purple-500',
  student: 'bg-blue-500',
  ci: 'bg-teal-500',
  scheduler: 'bg-amber-500',
  admin: 'bg-red-500',
};

const emptyForm = { title: '', body: '', targetRole: 'all' as TargetRole, expiresAt: '', isPinned: false };

export function ManageAnnouncementsPage() {
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(ann: Announcement) {
    setEditingId(ann.id);
    setForm({ title: ann.title, body: ann.body, targetRole: ann.targetRole, expiresAt: ann.expiresAt, isPinned: ann.isPinned });
    setDialogOpen(true);
  }

  function handlePublish() {
    if (!form.title.trim() || !form.body.trim()) return;

    if (editingId) {
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === editingId ? { ...a, ...form } : a))
      );
      toast({ title: 'Announcement Updated', description: `"${form.title}" has been updated.` });
    } else {
      const newAnn: Announcement = {
        id: Date.now().toString(),
        ...form,
        createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      };
      setAnnouncements((prev) => [newAnn, ...prev]);
      toast({ title: 'Announcement Published', description: `"${form.title}" is now live.` });
    }
    setDialogOpen(false);
  }

  function handleDelete(id: string) {
    const ann = announcements.find((a) => a.id === id);
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    setDeleteId(null);
    toast({ title: 'Announcement Deleted', description: `"${ann?.title}" has been removed.`, variant: 'destructive' });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Manage Announcements</h2>
          <p className="text-muted-foreground mt-1">Create and manage system-wide announcements for all roles.</p>
        </div>
        <Button onClick={openNew}>
          <PlusCircle className="h-4 w-4 mr-2" />
          New Announcement
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Title</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Pinned</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {announcements.map((ann) => (
                <TableRow key={ann.id}>
                  <TableCell>
                    <p className="font-medium">{ann.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{ann.body}</p>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${roleColors[ann.targetRole]} hover:opacity-80 text-white capitalize`}>
                      {ann.targetRole}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {ann.isPinned ? (
                      <Badge variant="warning" className="gap-1">
                        <Pin className="h-3 w-3" />
                        Pinned
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{ann.expiresAt || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{ann.createdAt}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(ann)} className="h-8 w-8">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteId(ann.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {announcements.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No announcements yet. Create one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Announcement' : 'New Announcement'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Update the announcement details below.' : 'Fill in the details to publish a new announcement.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="Announcement title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Body</label>
              <Textarea
                placeholder="Announcement content..."
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Target Role</label>
                <Select value={form.targetRole} onValueChange={(v) => setForm({ ...form, targetRole: v as TargetRole })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="ci">Clinical Instructor</SelectItem>
                    <SelectItem value="scheduler">Scheduler</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Expires At</label>
                <Input
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="pinned"
                checked={form.isPinned}
                onCheckedChange={(checked) => setForm({ ...form, isPinned: !!checked })}
              />
              <label htmlFor="pinned" className="text-sm font-medium cursor-pointer">
                Pin this announcement
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePublish} disabled={!form.title.trim() || !form.body.trim()}>
              {editingId ? 'Save Changes' : 'Publish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this announcement? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
