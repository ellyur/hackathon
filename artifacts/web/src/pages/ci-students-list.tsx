import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Search, ExternalLink, Loader2 } from 'lucide-react';
import { useListSchedules } from '@workspace/api-client-react';
import { useState, useMemo } from 'react';

/** Deduplicate students across all CI schedules */
function extractStudents(schedules: any[]) {
  const seen = new Set<string>();
  const students: { id: string; firstName: string; lastName: string; section?: string; yearLevel?: number }[] = [];
  for (const s of schedules) {
    for (const student of (s.students ?? [])) {
      if (!seen.has(student.id)) {
        seen.add(student.id);
        students.push(student);
      }
    }
  }
  return students;
}

export function CIStudentsListPage() {
  const { data: allDuties = [], isLoading } = useListSchedules(undefined, { query: { staleTime: 60_000, refetchOnMount: true } as never });
  const [search, setSearch] = useState('');

  const students = useMemo(() => extractStudents(allDuties), [allDuties]);

  const filtered = search
    ? students.filter(s =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        (s.section ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : students;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Student Progress</h2>
        <p className="text-muted-foreground mt-1">Monitor the clinical passport and progress of your assigned students.</p>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by name or section..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Year Level</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>{search ? 'No students match your search.' : 'No assigned students found.'}</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(s => {
                  const name = `${s.firstName} ${s.lastName}`;
                  const initials = `${s.firstName[0]}${s.lastName[0]}`;
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {s.section ? <Badge variant="outline">{s.section}</Badge> : <span className="text-muted-foreground text-sm">—</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {s.yearLevel ? `Year ${s.yearLevel}` : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/ci/students/${s.id}`}>
                            <ExternalLink className="w-3.5 h-3.5 mr-1" /> View Progress
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
