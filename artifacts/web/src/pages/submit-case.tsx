import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, FileUp, Loader2 } from 'lucide-react';

function getAuthToken() { return localStorage.getItem('authToken'); }
async function apiFetch<T>(path: string): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
  return res.json();
}

interface ClinicalCase {
  id: string;
  name: string;
  category: string;
  requiredCount: number;
  isActive: boolean;
}

export function SubmitCasePage() {
  const { data: cases = [], isLoading: loadingCases } = useQuery<ClinicalCase[]>({
    queryKey: ['clinical-cases'],
    queryFn: () => apiFetch('/api/cases'),
    staleTime: 60_000,
  });

  // Group by category for <optgroup>-style display
  const casesByCategory = cases.reduce<Record<string, ClinicalCase[]>>((acc, c) => {
    if (!acc[c.category]) acc[c.category] = [];
    acc[c.category].push(c);
    return acc;
  }, {});
  const categories = Object.keys(casesByCategory).sort();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Submit Case Verification</h2>
        <p className="text-muted-foreground mt-1">Log a completed clinical procedure for CI review.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Case Details</CardTitle>
          <CardDescription>All submissions require CI approval to count towards your passport.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Case Type — driven by admin cases library */}
            <div className="space-y-2 col-span-2">
              <Label>Case Type / Procedure</Label>
              <Select disabled={loadingCases}>
                <SelectTrigger>
                  {loadingCases
                    ? <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-3.5 h-3.5 animate-spin" />Loading cases…</span>
                    : <SelectValue placeholder="Select a case type…" />
                  }
                </SelectTrigger>
                <SelectContent>
                  {categories.length === 0 && !loadingCases && (
                    <SelectItem value="__none" disabled>No cases configured yet</SelectItem>
                  )}
                  {categories.map((cat) => (
                    <div key={cat}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {cat}
                      </div>
                      {casesByCategory[cat].map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Notes / Patient Initials <span className="text-muted-foreground text-xs">(Optional)</span></Label>
              <Textarea placeholder="Brief description of the case, complications, etc. Do not include PHI." />
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Evidence / Photo <span className="text-muted-foreground text-xs">(Optional)</span></Label>
              <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer">
                <Camera className="w-8 h-8 mb-2" />
                <span className="font-medium text-sm">Click to upload photo</span>
                <span className="text-xs">Supported: JPG, PNG, PDF</span>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3 border-t bg-muted/20 p-6">
          <Button variant="ghost">Cancel</Button>
          <Button className="gap-2">
            <FileUp className="w-4 h-4" />
            Submit for Review
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
