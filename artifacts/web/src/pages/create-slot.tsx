import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Loader2, CalendarClock } from 'lucide-react';

const HOSPITALS = [
  { id: 'h1', name: "St. Luke's Medical Center" },
  { id: 'h2', name: 'General Hospital' },
  { id: 'h3', name: 'Medical City' },
];

const DEPARTMENTS: Record<string, { id: string; name: string }[]> = {
  h1: [
    { id: 'd1', name: 'Intensive Care Unit (ICU)' },
    { id: 'd2', name: 'Emergency Room (ER)' },
    { id: 'd3', name: 'Operating Room (OR)' },
  ],
  h2: [
    { id: 'd4', name: 'OB-Gyn / Delivery Room' },
    { id: 'd5', name: 'Pediatrics Ward' },
    { id: 'd6', name: 'Emergency Room (ER)' },
  ],
  h3: [
    { id: 'd7', name: 'Intensive Care Unit (ICU)' },
    { id: 'd8', name: 'Operating Room (OR)' },
    { id: 'd9', name: 'Pediatrics Ward' },
  ],
};

const schema = z.object({
  hospital: z.string().min(1, 'Hospital is required'),
  department: z.string().min(1, 'Department is required'),
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  maxStudents: z.coerce.number().min(1).max(20),
  isMakeup: z.boolean(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function CreateSlotPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedHospital, setSelectedHospital] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      maxStudents: 5,
      isMakeup: false,
    },
  });

  const isMakeup = watch('isMakeup');

  function onSubmit(_data: FormValues) {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast({ title: 'Duty slot created', description: 'Students can now apply for this slot.' });
      setLocation('/slots');
    }, 1200);
  }

  const departments = selectedHospital ? (DEPARTMENTS[selectedHospital] ?? []) : [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/slots" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to Slots
        </Link>
        <h2 className="text-3xl font-bold tracking-tight">Create Duty Slot</h2>
        <p className="text-muted-foreground mt-1">Open a new clinical duty slot for student applications.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5" /> Slot Details
          </CardTitle>
          <CardDescription>
            Students will see this slot in the available slots list and may apply.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Hospital */}
            <div className="space-y-2">
              <Label>Hospital <span className="text-destructive">*</span></Label>
              <Select
                onValueChange={(val) => {
                  setSelectedHospital(val);
                  setValue('hospital', val);
                  setValue('department', '');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select hospital..." />
                </SelectTrigger>
                <SelectContent>
                  {HOSPITALS.map((h) => (
                    <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.hospital && <p className="text-xs text-destructive">{errors.hospital.message}</p>}
            </div>

            {/* Department */}
            <div className="space-y-2">
              <Label>Department <span className="text-destructive">*</span></Label>
              <Select
                disabled={!selectedHospital}
                onValueChange={(val) => setValue('department', val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedHospital ? 'Select department...' : 'Select a hospital first'} />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.department && <p className="text-xs text-destructive">{errors.department.message}</p>}
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Date <span className="text-destructive">*</span></Label>
              <Input id="date" type="date" {...register('date')} />
              {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
            </div>

            {/* Start / End Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time <span className="text-destructive">*</span></Label>
                <Input id="startTime" type="time" {...register('startTime')} />
                {errors.startTime && <p className="text-xs text-destructive">{errors.startTime.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time <span className="text-destructive">*</span></Label>
                <Input id="endTime" type="time" {...register('endTime')} />
                {errors.endTime && <p className="text-xs text-destructive">{errors.endTime.message}</p>}
              </div>
            </div>

            {/* Max Students */}
            <div className="space-y-2">
              <Label htmlFor="maxStudents">Max Students <span className="text-destructive">*</span></Label>
              <Input id="maxStudents" type="number" min={1} max={20} {...register('maxStudents')} />
              {errors.maxStudents && <p className="text-xs text-destructive">{errors.maxStudents.message}</p>}
            </div>

            {/* Is Makeup */}
            <div className="flex items-start gap-3 rounded-lg border p-4 bg-muted/30">
              <Controller
                name="isMakeup"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="isMakeup"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="mt-0.5"
                  />
                )}
              />
              <div className="flex-1">
                <Label htmlFor="isMakeup" className="cursor-pointer font-medium flex items-center gap-2">
                  Makeup Slot
                  {isMakeup && (
                    <Badge className="bg-amber-500 text-white hover:bg-amber-600 text-xs">MAKEUP ELIGIBLE</Badge>
                  )}
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Makeup slots are prioritized for students who have missed previous duties and need to make up hours.
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Description / Notes <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Any special instructions, requirements, or notes for students applying..."
                rows={3}
                {...register('description')}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" asChild>
                <Link href="/slots">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                ) : (
                  'Create Slot'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
