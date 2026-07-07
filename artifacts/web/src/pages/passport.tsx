import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, Circle, Clock, FileCheck, Plus, Stethoscope } from 'lucide-react';
import { Link } from 'wouter';
import { useGetStudentPassport } from '@workspace/api-client-react';

export function ClinicalPassportPage() {
  // Use a hardcoded mock ID if no real API is available since this is a demo
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: passport, isLoading } = useGetStudentPassport('usr_student', { query: { enabled: false } as any });

  // Mock data for demo since the API might not be fully seeded
  const mockCategories = [
    {
      category: 'Delivery Room',
      completionRate: 80,
      cases: [
        { caseId: '1', caseName: 'Normal Spontaneous Delivery', required: 5, completed: 4, verified: 4, remaining: 1, status: 'in_progress' },
        { caseId: '2', caseName: 'Assist in Caesarean Section', required: 2, completed: 2, verified: 2, remaining: 0, status: 'complete' },
      ]
    },
    {
      category: 'Medical-Surgical',
      completionRate: 40,
      cases: [
        { caseId: '3', caseName: 'IV Insertion', required: 10, completed: 4, verified: 2, remaining: 6, status: 'deficient' },
        { caseId: '4', caseName: 'Foley Catheter Insertion', required: 5, completed: 5, verified: 3, remaining: 0, status: 'in_progress' },
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Clinical Passport</h2>
          <p className="text-muted-foreground mt-1">Track your required clinical cases and procedures.</p>
        </div>
        <Button asChild>
          <Link href="/passport/submit">
            <Plus className="w-4 h-4 mr-2" />
            Submit New Case
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overall Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">58%</div>
            <Progress value={58} className="mt-3" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Verified Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">11</div>
            <p className="text-xs text-muted-foreground mt-1">Out of 22 required</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">4</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting CI verification</p>
          </CardContent>
        </Card>
      </div>

      {mockCategories.map((cat, i) => (
        <Card key={i} className="shadow-sm">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-primary" />
                {cat.category}
              </CardTitle>
              <Badge variant="outline" className="font-semibold bg-background">{cat.completionRate}% Complete</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/10 hover:bg-muted/10">
                  <TableHead className="w-[300px]">Case / Procedure</TableHead>
                  <TableHead className="text-center">Required</TableHead>
                  <TableHead className="text-center">Completed</TableHead>
                  <TableHead className="text-center">Verified</TableHead>
                  <TableHead className="text-center">Remaining</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cat.cases.map((c, j) => (
                  <TableRow key={j}>
                    <TableCell className="font-medium">{c.caseName}</TableCell>
                    <TableCell className="text-center text-muted-foreground">{c.required}</TableCell>
                    <TableCell className="text-center">{c.completed}</TableCell>
                    <TableCell className="text-center text-emerald-600 font-semibold">{c.verified}</TableCell>
                    <TableCell className="text-center">{c.remaining}</TableCell>
                    <TableCell className="text-right">
                      {c.status === 'complete' && <Badge className="bg-emerald-500 hover:bg-emerald-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Complete</Badge>}
                      {c.status === 'in_progress' && <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> In Progress</Badge>}
                      {c.status === 'deficient' && <Badge variant="destructive"><Circle className="w-3 h-3 mr-1" /> Deficient</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
