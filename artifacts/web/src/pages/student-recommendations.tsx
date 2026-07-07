import { useState } from 'react';
import { Link, useRoute } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Info,
  Sparkles,
  UserPlus,
  BookOpen,
  Clock,
} from 'lucide-react';

interface Recommendation {
  rank: number;
  id: string;
  name: string;
  studentNumber: string;
  year: string;
  section: string;
  score: number;
  gapsCovered: number;
  hoursNeeded: number;
  explanation: string;
}

const RECOMMENDATIONS: Recommendation[] = [
  {
    rank: 1,
    id: 's1',
    name: 'Emma Thompson',
    studentNumber: '2021-00123',
    year: '3rd Year',
    section: 'Section A',
    score: 94,
    gapsCovered: 4,
    hoursNeeded: 12,
    explanation:
      'Emma has the highest gap-coverage score for this duty. She is missing NSD, IV Insertion, Foley Catheter, and NGT insertion — all of which are common procedures in the ICU. She has 12 clinical hours remaining to meet her weekly quota and has not had an ICU rotation in the past 3 weeks.',
  },
  {
    rank: 2,
    id: 's2',
    name: 'Michael Chang',
    studentNumber: '2021-00456',
    year: '3rd Year',
    section: 'Section B',
    score: 88,
    gapsCovered: 3,
    hoursNeeded: 8,
    explanation:
      'Michael needs 8 more hours and has 3 pending case gaps that overlap with expected ICU procedures. His last ICU duty was 2 weeks ago, making him overdue for rotation.',
  },
  {
    rank: 3,
    id: 's3',
    name: 'Sarah Miller',
    studentNumber: '2021-00789',
    year: '3rd Year',
    section: 'Section A',
    score: 82,
    gapsCovered: 3,
    hoursNeeded: 16,
    explanation:
      'Sarah has 16 hours needed and 3 gap cases. Her attendance has been consistent and she performs well in ICU settings based on prior CI evaluations.',
  },
  {
    rank: 4,
    id: 's4',
    name: 'David Wilson',
    studentNumber: '2021-00321',
    year: '3rd Year',
    section: 'Section C',
    score: 78,
    gapsCovered: 2,
    hoursNeeded: 10,
    explanation:
      'David has 2 gap cases covered and 10 hours needed. He has not been assigned to St. Luke\'s ICU yet this rotation period.',
  },
  {
    rank: 5,
    id: 's5',
    name: 'Jessica Taylor',
    studentNumber: '2021-00654',
    year: '3rd Year',
    section: 'Section B',
    score: 74,
    gapsCovered: 2,
    hoursNeeded: 8,
    explanation:
      'Jessica has 2 overlapping gap cases. She has completed most of her quota but benefits from additional ICU exposure for competency breadth.',
  },
  {
    rank: 6,
    id: 's6',
    name: 'Carlos Reyes',
    studentNumber: '2021-00987',
    year: '3rd Year',
    section: 'Section C',
    score: 69,
    gapsCovered: 1,
    hoursNeeded: 6,
    explanation:
      'Carlos has 1 gap case covered by this duty. He is close to his hour quota but still benefits from further ICU exposure.',
  },
  {
    rank: 7,
    id: 's7',
    name: 'Anna Nguyen',
    studentNumber: '2021-01100',
    year: '3rd Year',
    section: 'Section A',
    score: 63,
    gapsCovered: 1,
    hoursNeeded: 4,
    explanation:
      'Anna is near quota completion but has 1 case gap that could be addressed in this ICU slot. Low priority compared to higher-ranked students.',
  },
  {
    rank: 8,
    id: 's8',
    name: 'Ben Castillo',
    studentNumber: '2021-01234',
    year: '3rd Year',
    section: 'Section B',
    score: 55,
    gapsCovered: 0,
    hoursNeeded: 2,
    explanation:
      'Ben has nearly completed all required hours and cases. He is the lowest priority for this specific slot as his case gaps do not overlap with ICU procedures.',
  },
];

function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-500';
}

function progressColor(score: number) {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export function StudentRecommendationsPage() {
  const [, params] = useRoute('/schedules/:id/recommendations');
  const { toast } = useToast();
  const [selectedRec, setSelectedRec] = useState<Recommendation | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  function handleAdd(rec: Recommendation) {
    setAdded((prev) => new Set(prev).add(rec.id));
    toast({ title: `${rec.name} added to schedule`, description: 'Student has been notified.' });
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/schedules" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to Schedules
        </Link>
        <h2 className="text-3xl font-bold tracking-tight">Student Recommendations</h2>
        <p className="text-muted-foreground mt-1">
          Schedule #{params?.id ?? ''} · St. Luke's ICU · Oct 20, 2024 · 08:00 AM – 04:00 PM
        </p>
      </div>

      {/* Info callout */}
      <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
        <CardContent className="flex gap-3 pt-5 pb-5">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1">
              <Sparkles className="w-4 h-4" /> How recommendations work
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              Students are ranked by a composite score combining: <strong>clinical hour deficit</strong> (how many
              hours they still need), <strong>case gap coverage</strong> (how many of their missing cases this duty
              can fulfill), <strong>rotation recency</strong> (time since last similar duty), and
              <strong> department exposure balance</strong>. Higher scores mean this duty benefits the student more.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ranked Student List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Rank</TableHead>
                <TableHead>Student</TableHead>
                <TableHead className="hidden md:table-cell">Year / Section</TableHead>
                <TableHead>Score</TableHead>
                <TableHead className="hidden sm:table-cell">Gap Coverage</TableHead>
                <TableHead className="hidden sm:table-cell">Hours Needed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {RECOMMENDATIONS.map((rec) => (
                <TableRow key={rec.id}>
                  {/* Rank */}
                  <TableCell>
                    <span className="font-bold text-muted-foreground">#{rec.rank}</span>
                  </TableCell>

                  {/* Student */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {initials(rec.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm leading-tight">{rec.name}</p>
                        <p className="text-xs text-muted-foreground">{rec.studentNumber}</p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Year / Section */}
                  <TableCell className="hidden md:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {rec.year} · {rec.section}
                    </span>
                  </TableCell>

                  {/* Score */}
                  <TableCell>
                    <div className="space-y-1 min-w-[80px]">
                      <span className={`font-bold text-sm ${scoreColor(rec.score)}`}>{rec.score}</span>
                      <div className="relative h-2 w-20 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`absolute left-0 top-0 h-full rounded-full transition-all ${progressColor(rec.score)}`}
                          style={{ width: `${rec.score}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>

                  {/* Gap Coverage */}
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={rec.gapsCovered > 2 ? 'default' : 'secondary'} className="gap-1">
                      <BookOpen className="w-3 h-3" />
                      {rec.gapsCovered} case{rec.gapsCovered !== 1 ? 's' : ''}
                    </Badge>
                  </TableCell>

                  {/* Hours Needed */}
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline" className="gap-1">
                      <Clock className="w-3 h-3" />
                      {rec.hoursNeeded}h needed
                    </Badge>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedRec(rec)}
                      >
                        View Explanation
                      </Button>
                      <Button
                        size="sm"
                        disabled={added.has(rec.id)}
                        onClick={() => handleAdd(rec)}
                        className="gap-1"
                      >
                        <UserPlus className="w-4 h-4" />
                        {added.has(rec.id) ? 'Added' : 'Add'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Explanation Sheet */}
      <Sheet open={!!selectedRec} onOpenChange={(open) => { if (!open) setSelectedRec(null); }}>
        <SheetContent className="w-full sm:max-w-md">
          {selectedRec && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" /> Recommendation Explanation
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {initials(selectedRec.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{selectedRec.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedRec.studentNumber} · {selectedRec.year}</p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className={`text-2xl font-bold ${scoreColor(selectedRec.score)}`}>{selectedRec.score}</p>
                    <p className="text-xs text-muted-foreground mt-1">Overall Score</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-2xl font-bold">{selectedRec.gapsCovered}</p>
                    <p className="text-xs text-muted-foreground mt-1">Cases Covered</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-2xl font-bold">{selectedRec.hoursNeeded}h</p>
                    <p className="text-xs text-muted-foreground mt-1">Hours Needed</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-semibold mb-2 flex items-center gap-1">
                    <Info className="w-4 h-4 text-muted-foreground" /> Why this student?
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{selectedRec.explanation}</p>
                </div>

                <Button className="w-full gap-2 mt-2" onClick={() => handleAdd(selectedRec)} disabled={added.has(selectedRec.id)}>
                  <UserPlus className="w-4 h-4" />
                  {added.has(selectedRec.id) ? 'Already Added to Schedule' : 'Add to Schedule'}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
