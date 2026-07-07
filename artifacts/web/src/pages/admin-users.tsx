import { useState } from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Pencil, UserX, Search, ChevronLeft, ChevronRight } from 'lucide-react';

type Role = 'admin' | 'scheduler' | 'ci' | 'student';

interface MockUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

const MOCK_USERS: MockUser[] = [
  { id: 'u-001', firstName: 'Dr. Elena', lastName: 'Reyes', email: 'admin@clinicalflow.com', role: 'admin', isActive: true, createdAt: '2024-01-05' },
  { id: 'u-002', firstName: 'Maria', lastName: 'Santos', email: 'scheduler@clinicalflow.com', role: 'scheduler', isActive: true, createdAt: '2024-01-08' },
  { id: 'u-003', firstName: 'Ana', lastName: 'Dela Cruz', email: 'ana.dc@clinicalflow.com', role: 'ci', isActive: true, createdAt: '2024-01-10' },
  { id: 'u-004', firstName: 'Juan', lastName: 'Cruz', email: 'jcruz@student.edu', role: 'student', isActive: true, createdAt: '2024-02-01' },
  { id: 'u-005', firstName: 'Rosa', lastName: 'Mendoza', email: 'rmendoza@student.edu', role: 'student', isActive: true, createdAt: '2024-02-01' },
  { id: 'u-006', firstName: 'Carlos', lastName: 'Bautista', email: 'cbautista@student.edu', role: 'student', isActive: false, createdAt: '2024-02-03' },
  { id: 'u-007', firstName: 'Liza', lastName: 'Flores', email: 'lflores@clinicalflow.com', role: 'ci', isActive: true, createdAt: '2024-01-12' },
  { id: 'u-008', firstName: 'Pedro', lastName: 'Garcia', email: 'pgarcia@student.edu', role: 'student', isActive: true, createdAt: '2024-02-05' },
  { id: 'u-009', firstName: 'Nena', lastName: 'Villanueva', email: 'nvillanueva@clinicalflow.com', role: 'scheduler', isActive: false, createdAt: '2024-01-15' },
  { id: 'u-010', firstName: 'Ben', lastName: 'Torres', email: 'btorres@student.edu', role: 'student', isActive: true, createdAt: '2024-02-07' },
  { id: 'u-011', firstName: 'Grace', lastName: 'Aquino', email: 'gaquino@student.edu', role: 'student', isActive: true, createdAt: '2024-02-08' },
  { id: 'u-012', firstName: 'Rex', lastName: 'Domingo', email: 'rdomingo@student.edu', role: 'student', isActive: true, createdAt: '2024-02-10' },
];

const ROLE_COLORS: Record<Role, string> = {
  admin: 'bg-purple-100 text-purple-700 border-purple-200',
  scheduler: 'bg-blue-100 text-blue-700 border-blue-200',
  ci: 'bg-teal-100 text-teal-700 border-teal-200',
  student: 'bg-green-100 text-green-700 border-green-200',
};

export function AdminUsersPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState(MOCK_USERS);
  const PAGE_SIZE = 5;

  const filtered = users.filter(u => {
    const matchesSearch =
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDeactivate = (userId: string, name: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: false } : u));
    toast({ title: 'User deactivated', description: `${name} has been deactivated.` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Manage Users</h2>
          <p className="text-muted-foreground mt-1">View and manage all system accounts.</p>
        </div>
        <Button asChild>
          <Link href="/admin/users/create">
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                className="pl-9"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Select value={roleFilter} onValueChange={v => { setRoleFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="scheduler">Scheduler</SelectItem>
                <SelectItem value="ci">CI</SelectItem>
                <SelectItem value="student">Student</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map(user => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs bg-muted">
                          {user.firstName[0]}{user.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.firstName} {user.lastName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${ROLE_COLORS[user.role]}`}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {user.isActive
                      ? <Badge className="bg-emerald-500 text-white">Active</Badge>
                      : <Badge variant="secondary">Inactive</Badge>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.createdAt}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/admin/users/${user.id}/edit`}>
                          <Pencil className="w-4 h-4" />
                        </Link>
                      </Button>
                      {user.isActive && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <UserX className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Deactivate User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to deactivate <strong>{user.firstName} {user.lastName}</strong>? They will no longer be able to log in.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => handleDeactivate(user.id, `${user.firstName} ${user.lastName}`)}
                              >
                                Deactivate
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {paginated.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {paginated.length} of {filtered.length} users
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => (
                <Button
                  key={i + 1}
                  variant={page === i + 1 ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </Button>
              ))}
              <Button variant="outline" size="icon" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
