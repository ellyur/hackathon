import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Award, Search, Trophy, Star, Medal, Filter } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import type { AuthUser } from '@workspace/api-client-react';
import { useQuery } from '@tanstack/react-query';
import { useCertificates, type Certificate, type CertType } from '@/hooks/use-certificates';
import { CertificateCard, CertificateViewerModal, certTypeLabel } from '@/components/certificate-viewer';
import type { PassportData } from '@/hooks/use-certificates';

function getAuthToken(): string | null { return localStorage.getItem('authToken'); }
async function apiFetch<T>(path: string): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(path, { headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: 'include' });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
  return res.json();
}

const TYPE_FILTERS: { value: CertType | 'all'; label: string }[] = [
  { value: 'all',              label: 'All' },
  { value: 'clinical_hours',   label: 'Clinical Hours' },
  { value: 'ward_completion',  label: 'Ward Completion' },
  { value: 'academic_year',    label: 'Academic Year' },
];

export function CertificatesPage() {
  const { user: rawUser } = useAuth();
  const user = rawUser as AuthUser | undefined;
  const userId = user?.id ?? '';

  const { data: passport, isLoading } = useQuery<PassportData>({
    queryKey: ['student-passport', userId],
    queryFn: () => apiFetch(`/api/students/${userId}/passport`),
    enabled: !!userId,
    staleTime: 30_000,
  });

  const allCerts = useCertificates(passport, user);

  const [search, setSearch]       = useState('');
  const [typeFilter, setTypeFilter] = useState<CertType | 'all'>('all');
  const [viewing, setViewing]     = useState<Certificate | null>(null);

  const filtered = useMemo(() => {
    return allCerts.filter(c => {
      const matchType   = typeFilter === 'all' || c.type === typeFilter;
      const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) ||
        (c.wardName?.toLowerCase().includes(search.toLowerCase()) ?? false);
      return matchType && matchSearch;
    });
  }, [allCerts, search, typeFilter]);

  const byType = useMemo(() => ({
    clinical_hours:  allCerts.filter(c => c.type === 'clinical_hours').length,
    ward_completion: allCerts.filter(c => c.type === 'ward_completion').length,
    academic_year:   allCerts.filter(c => c.type === 'academic_year').length,
  }), [allCerts]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading certificates…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">My Certificates</h2>
        <p className="text-muted-foreground mt-1">
          Your earned clinical achievement certificates — each is downloadable as a PDF.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-sm col-span-2 md:col-span-1">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Award className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{allCerts.length}</p>
                <p className="text-xs text-muted-foreground">Total Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Medal className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{byType.clinical_hours}</p>
                <p className="text-xs text-muted-foreground">Hours Milestones</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{byType.ward_completion}</p>
                <p className="text-xs text-muted-foreground">Ward Completions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                <Star className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{byType.academic_year}</p>
                <p className="text-xs text-muted-foreground">Academic Year</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search certificates…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
              {TYPE_FILTERS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setTypeFilter(f.value)}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                    typeFilter === f.value
                      ? 'bg-primary text-white border-primary'
                      : 'border-border text-muted-foreground hover:border-primary hover:text-primary'
                  }`}
                >
                  {f.label}
                  {f.value !== 'all' && (
                    <span className="ml-1 opacity-60">
                      ({byType[f.value as CertType] ?? 0})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Certificate grid */}
      {allCerts.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Award className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <h3 className="font-semibold text-lg mb-1">No certificates yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Complete clinical hours milestones, finish ward rotations, or complete an academic year to earn your first certificate.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-12 text-center text-muted-foreground">
            No certificates match your search.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Group by type */}
          {(['clinical_hours', 'ward_completion', 'academic_year'] as CertType[]).map(type => {
            const group = filtered.filter(c => c.type === type);
            if (group.length === 0) return null;

            const groupLabels: Record<CertType, { label: string; desc: string }> = {
              clinical_hours:  { label: 'Clinical Hours Milestones', desc: 'Earned by reaching duty hour milestones' },
              ward_completion: { label: 'Ward Completion Certificates', desc: 'Earned by completing all required cases in a ward' },
              academic_year:   { label: 'Academic Year Achievements', desc: 'Earned upon completing all rotation requirements' },
            };
            const info = groupLabels[type];

            return (
              <div key={type} className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">{info.label}</h3>
                  <p className="text-sm text-muted-foreground">{info.desc}</p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.map(cert => (
                    <CertificateCard key={cert.id} cert={cert} onView={setViewing} />
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* How certificates are earned */}
      <Card className="shadow-sm border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">How Certificates Are Awarded</CardTitle>
          <CardDescription>Certificates are automatically generated when verified milestones are reached.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-medium">
                <Medal className="w-4 h-4 text-yellow-500" /> Clinical Hours
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Earned at 25%, 50%, 75%, and 100% of your required clinical duty hours (Bronze → Silver → Gold → Excellence).
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-medium">
                <Trophy className="w-4 h-4 text-green-600" /> Ward Completion
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Awarded when all required cases for a specific ward rotation are verified by your Clinical Instructor and Scheduler.
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-medium">
                <Star className="w-4 h-4 text-violet-500" /> Academic Year
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Granted upon completing all clinical rotation requirements for the academic year, marking your full clinical completion.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Certificate viewer modal */}
      <CertificateViewerModal cert={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
