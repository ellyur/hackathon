import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Info, Save, Brain } from 'lucide-react';

interface WeightConfig {
  key: string;
  label: string;
  description: string;
  value: number;
  color: string;
}

const INITIAL_WEIGHTS: WeightConfig[] = [
  { key: 'caseGapScore', label: 'Case Gap Score', description: 'Prioritizes students who are furthest behind on required clinical case completions.', value: 40, color: 'bg-purple-500' },
  { key: 'hoursNeeded', label: 'Hours Needed', description: 'Favors students with more remaining clinical hours to fulfill before program completion.', value: 30, color: 'bg-blue-500' },
  { key: 'attendanceRate', label: 'Attendance Rate', description: 'Considers historical attendance compliance — lower rates increase recommendation priority.', value: 20, color: 'bg-teal-500' },
  { key: 'yearLevel', label: 'Year Level', description: 'Higher-year students may receive priority for advanced rotation slots.', value: 10, color: 'bg-orange-500' },
];

export function RecommendationWeightsPage() {
  const { toast } = useToast();
  const [weights, setWeights] = useState(INITIAL_WEIGHTS);
  const [isSaving, setIsSaving] = useState(false);

  const total = weights.reduce((sum, w) => sum + w.value, 0);
  const isValid = total === 100;

  const handleChange = (key: string, value: number) => {
    setWeights(prev => prev.map(w => w.key === key ? { ...w, value } : w));
  };

  const handleSave = async () => {
    if (!isValid) return;
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setIsSaving(false);
    toast({ title: 'Weights saved', description: 'Recommendation algorithm weights have been updated.' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Recommendation Algorithm Weights</h2>
        <p className="text-muted-foreground mt-1">Control how students are ranked for duty slot recommendations.</p>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-lg border bg-blue-50 border-blue-200 text-blue-800">
        <Info className="w-5 h-5 mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-medium">How weights work</p>
          <p className="mt-0.5 text-blue-700">Weights determine how students are scored and ranked when the system generates duty slot recommendations. Adjust each factor's influence below. <strong>Total must equal exactly 100%.</strong></p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {weights.map(w => (
          <Card key={w.key} className="relative overflow-hidden">
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${w.color}`} />
            <CardHeader className="pb-2 pl-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{w.label}</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold tabular-nums">{w.value}<span className="text-sm font-normal text-muted-foreground">%</span></span>
                </div>
              </div>
              <CardDescription className="text-xs">{w.description}</CardDescription>
            </CardHeader>
            <CardContent className="pl-6 space-y-3">
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={w.value}
                onChange={e => handleChange(w.key, Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
              <Progress value={w.value} className="h-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator />

      <Card className={`border-2 ${isValid ? 'border-emerald-400 bg-emerald-50' : 'border-red-400 bg-red-50'}`}>
        <CardContent className="py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className={`w-6 h-6 ${isValid ? 'text-emerald-600' : 'text-red-500'}`} />
            <div>
              <p className={`font-semibold text-sm ${isValid ? 'text-emerald-800' : 'text-red-700'}`}>
                Total Weight: <span className="text-xl font-bold">{total}%</span>
              </p>
              <p className={`text-xs ${isValid ? 'text-emerald-600' : 'text-red-500'}`}>
                {isValid ? '✓ Weights are balanced and ready to save.' : `⚠ Weights must sum to 100%. Currently ${total > 100 ? total - 100 + '% over' : 100 - total + '% under'}.`}
              </p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={!isValid || isSaving} className="gap-2">
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Weights'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
