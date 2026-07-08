import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { FileText, Users, ClipboardList, UserCheck, CalendarClock, TrendingUp, Download, Loader2 } from 'lucide-react';

interface ReportConfig {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const REPORTS: ReportConfig[] = [
  { id: 'student-progress', title: 'Student Progress Report', description: 'Per-student summary of duties attended, hours logged, and overall attendance rate.', icon: Users, color: 'text-blue-500 bg-blue-50' },
  { id: 'attendance-summary', title: 'Attendance Summary Report', description: 'Aggregated attendance records broken down by hospital and department, including present/absent/late rates.', icon: ClipboardList, color: 'text-primary bg-primary/10' },
  { id: 'case-compliance', title: 'Case Compliance Report', description: 'Analysis of case gap distribution — identifies which cases are most frequently incomplete across the student cohort.', icon: FileText, color: 'text-blue-700 bg-blue-50' },
  { id: 'ci-performance', title: 'Clinical Instructor Performance', description: 'CI schedule counts, completion rates, and upcoming/cancelled duties per instructor.', icon: UserCheck, color: 'text-orange-500 bg-orange-50' },
  { id: 'makeup-duty', title: 'Makeup Duty Status', description: 'All scheduled duties with status — useful for tracking completion across the cohort.', icon: CalendarClock, color: 'text-red-500 bg-red-50' },
  { id: 'completion-forecast', title: 'Program Completion Forecast', description: 'Projected graduation risk analysis — estimates which students are on track vs. at-risk of not completing requirements.', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
];

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('authToken');
  const h: Record<string, string> = {};
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

export function AdminReportsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [format, setFormat] = useState<Record<string, string>>({});
  const [dateFrom, setDateFrom] = useState<Record<string, string>>({});
  const [dateTo, setDateTo] = useState<Record<string, string>>({});

  const handleGenerate = async (reportId: string, reportTitle: string) => {
    setLoading(prev => ({ ...prev, [reportId]: true }));
    try {
      const fmt = format[reportId] ?? 'pdf';
      const from = dateFrom[reportId] ?? '';
      const to = dateTo[reportId] ?? '';

      const params = new URLSearchParams({ format: fmt });
      if (from) params.set('dateFrom', from);
      if (to) params.set('dateTo', to);

      const res = await fetch(`/api/reports/${reportId}?${params}`, {
        headers: authHeaders(),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to generate report' }));
        throw new Error(err.error ?? 'Failed to generate report');
      }

      // Trigger browser download
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = fmt === 'xlsx' ? 'xlsx' : fmt === 'csv' ? 'csv' : 'pdf';
      a.download = `${reportTitle.replace(/\s+/g, '-')}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast({
        title: 'Report downloaded',
        description: `${reportTitle} saved as ${fmt.toUpperCase()}.`,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong';
      toast({ title: 'Failed to generate report', description: msg, variant: 'destructive' });
    } finally {
      setLoading(prev => ({ ...prev, [reportId]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Generate Reports</h2>
        <p className="text-muted-foreground mt-1">Export program data in multiple formats for review and compliance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPORTS.map(report => {
          const Icon = report.icon;
          const isLoading = loading[report.id] ?? false;
          return (
            <Card key={report.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-lg ${report.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{report.title}</CardTitle>
                    <CardDescription className="mt-1 text-xs">{report.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-4 flex-1 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">From</Label>
                    <Input
                      type="date"
                      className="mt-1 text-sm h-8"
                      value={dateFrom[report.id] ?? ''}
                      onChange={e => setDateFrom(prev => ({ ...prev, [report.id]: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">To</Label>
                    <Input
                      type="date"
                      className="mt-1 text-sm h-8"
                      value={dateTo[report.id] ?? ''}
                      onChange={e => setDateTo(prev => ({ ...prev, [report.id]: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={format[report.id] ?? 'pdf'}
                    onValueChange={v => setFormat(prev => ({ ...prev, [report.id]: v }))}
                  >
                    <SelectTrigger className="h-8 text-sm flex-1">
                      <SelectValue placeholder="Format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    className="h-8 text-sm gap-1.5"
                    onClick={() => handleGenerate(report.id, report.title)}
                    disabled={isLoading}
                  >
                    {isLoading
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Generating…</>
                      : <><Download className="w-3.5 h-3.5" />Generate</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
