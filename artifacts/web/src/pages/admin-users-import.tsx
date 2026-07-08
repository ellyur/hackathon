import { useState, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle2, XCircle, Loader2, Download, AlertTriangle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { getListUsersQueryKey } from '@workspace/api-client-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ImportRow {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  phone?: string;
  studentNumber?: string;
  yearLevel?: number;
  section?: string;
  program?: string;
  academicYear?: string;
  employeeId?: string;
  specialization?: string;
}

interface RowResult {
  row: number;
  name: string;
  email: string;
  status: 'ok' | 'error';
  error?: string;
}

// ── CSV helpers ───────────────────────────────────────────────────────────────

const EXPECTED_HEADERS = [
  'firstName', 'lastName', 'email', 'password', 'role',
  'phone', 'studentNumber', 'yearLevel', 'section', 'program',
  'academicYear', 'employeeId', 'specialization',
];

const REQUIRED = ['firstName', 'lastName', 'email', 'password', 'role'];
const VALID_ROLES = ['admin', 'scheduler', 'ci', 'student'];

function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
  });
  return { headers, rows };
}

function validateRow(raw: Record<string, string>, rowIndex: number): { row: ImportRow; error?: string } {
  for (const req of REQUIRED) {
    if (!raw[req]?.trim()) return { row: raw as any, error: `Missing required field: ${req}` };
  }
  if (!VALID_ROLES.includes(raw.role)) return { row: raw as any, error: `Invalid role: "${raw.role}". Must be admin, scheduler, ci, or student` };
  if (raw.password?.length < 8) return { row: raw as any, error: 'Password must be at least 8 characters' };
  if (!/^\S+@\S+\.\S+$/.test(raw.email)) return { row: raw as any, error: `Invalid email: ${raw.email}` };
  return {
    row: {
      firstName: raw.firstName, lastName: raw.lastName,
      email: raw.email.toLowerCase(), password: raw.password, role: raw.role,
      phone: raw.phone || undefined, studentNumber: raw.studentNumber || undefined,
      yearLevel: raw.yearLevel ? Number(raw.yearLevel) : undefined,
      section: raw.section || undefined, program: raw.program || undefined,
      academicYear: raw.academicYear || undefined, employeeId: raw.employeeId || undefined,
      specialization: raw.specialization || undefined,
    },
  };
}

function getAuthToken() { return localStorage.getItem('authToken'); }
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options?.headers },
    credentials: 'include',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? res.statusText);
  return json as T;
}

// ── Component ─────────────────────────────────────────────────────────────────

type Step = 'upload' | 'preview' | 'done';

export function AdminUsersImportPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [rowErrors, setRowErrors] = useState<Map<number, string>>(new Map());
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<RowResult[]>([]);

  const handleFile = (file: File) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers, rows: rawRows } = parseCsv(text);

      const missingHeaders = REQUIRED.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        toast({ title: 'Invalid CSV', description: `Missing columns: ${missingHeaders.join(', ')}`, variant: 'destructive' });
        return;
      }

      const parsed: ImportRow[] = [];
      const errors = new Map<number, string>();
      rawRows.forEach((raw, i) => {
        const { row, error } = validateRow(raw, i);
        parsed.push(row);
        if (error) errors.set(i, error);
      });

      setRows(parsed);
      setRowErrors(errors);
      setStep('preview');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    const validRows = rows.filter((_, i) => !rowErrors.has(i));
    if (validRows.length === 0) {
      toast({ title: 'No valid rows', description: 'Fix errors before importing.', variant: 'destructive' });
      return;
    }
    setImporting(true);
    try {
      const data = await apiFetch<{ created: number; failed: number; results: RowResult[] }>(
        '/api/users/import',
        { method: 'POST', body: JSON.stringify({ users: validRows }) }
      );
      setResults(data.results);
      setStep('done');
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      toast({ title: `${data.created} user${data.created !== 1 ? 's' : ''} imported`, description: data.failed > 0 ? `${data.failed} failed — see results.` : 'All users created successfully.' });
    } catch (e: any) {
      toast({ title: 'Import failed', description: e?.message ?? 'Unexpected error', variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const header = EXPECTED_HEADERS.join(',');
    const example = 'Juan,Cruz,juan@example.com,password123,student,09171234567,2024-00001,3,A,BSN,2024-2025,,';
    const blob = new Blob([`${header}\n${example}\n`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'clinicalflow-import-template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = rows.length - rowErrors.size;
  const errorCount = rowErrors.size;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/users"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Import Users</h2>
          <p className="text-muted-foreground mt-1">Bulk-create students, CIs, and schedulers from a CSV file.</p>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-3">
        {(['upload', 'preview', 'done'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <div className="h-px w-6 bg-border" />}
            <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${step === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
              {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" /> CSV Format
              </CardTitle>
              <CardDescription>
                Your file must include these columns (in any order): <code className="text-xs bg-muted px-1 rounded">{REQUIRED.join(', ')}</code>. Optional: phone, studentNumber, yearLevel, section, program, academicYear, employeeId, specialization.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
                <Download className="w-4 h-4" /> Download Template
              </Button>
            </CardContent>
          </Card>

          <Card
            className="border-2 border-dashed hover:border-primary/50 transition-colors cursor-pointer"
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <CardContent className="py-16 text-center space-y-3">
              <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Drop your CSV here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">.csv files only</p>
              </div>
            </CardContent>
          </Card>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{fileName}</span>
              <Badge className="bg-emerald-500 text-white">{validCount} valid</Badge>
              {errorCount > 0 && <Badge variant="destructive">{errorCount} errors</Badge>}
            </div>
            <Button variant="outline" size="sm" onClick={() => { setStep('upload'); setRows([]); setRowErrors(new Map()); }}>
              Change File
            </Button>
          </div>

          {errorCount > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                {errorCount} row{errorCount !== 1 ? 's' : ''} have errors and will be skipped. Fix the CSV and re-upload, or proceed to import only the valid rows.
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, i) => {
                      const err = rowErrors.get(i);
                      return (
                        <TableRow key={i} className={err ? 'bg-destructive/5' : ''}>
                          <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                          <TableCell className="font-medium">{row.firstName} {row.lastName}</TableCell>
                          <TableCell className="text-muted-foreground">{row.email}</TableCell>
                          <TableCell>
                            <span className="capitalize text-sm">{row.role}</span>
                          </TableCell>
                          <TableCell>
                            {err
                              ? <span className="text-xs text-destructive flex items-center gap-1"><XCircle className="w-3 h-3" />{err}</span>
                              : <span className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Ready</span>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setStep('upload'); setRows([]); setRowErrors(new Map()); }}>Back</Button>
            <Button onClick={handleImport} disabled={importing || validCount === 0} className="gap-2">
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Import {validCount} User{validCount !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Done */}
      {step === 'done' && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-muted-foreground">{r.email}</TableCell>
                      <TableCell>
                        {r.status === 'ok'
                          ? <span className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Created</span>
                          : <span className="text-xs text-destructive flex items-center gap-1"><XCircle className="w-3 h-3" />{r.error}</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setStep('upload'); setRows([]); setRowErrors(new Map()); setResults([]); }}>Import More</Button>
            <Button onClick={() => navigate('/admin/users')}>Back to Users</Button>
          </div>
        </div>
      )}
    </div>
  );
}
