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
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, CalendarClock } from 'lucide-react';
import {
  useCreateSlot,
  useListHospitals,
  useListDepartments,
} from '@workspace/api-client-react';

const schema = z.object({
  hospitalId: z.string().min(1, 'Hospital is required'),
  departmentId: z.string().min(1, 'Department is required'),
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

  const { data: hospitals = [], isLoading: loadingHospitals } = useListHospitals();
  const { data: departments = [], isLoading: loadingDepts } = useListDepartments(selectedHospital, {
    query: { enabled: !!selectedHospital } as any,
  });

  const createSlot = useCreateSlot();

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

  async function onSubmit(data: FormValues) {
    try {
      await createSlot.mutateAsync({
        data: {
          hospitalId: data.hospitalId,
          departmentId: data.departmentId,
          dutyDate: data.date,
          startTime: data.startTime,
          endTime: data.endTime,
          maxStudents: data.maxStudents,
          isMakeup: data.isMakeup,
          description: data.description || undefined,
        },
      });
      toast({ title: 'Duty slot created', description: 'Students can now apply for this slot.' });
      setLocation('/slots');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create slot';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/slots" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to Slots
        </Link>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Create Duty Slot</h2>
        <p className="text-muted-foreground mt-1">Open a new clinical duty slot for student applications.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5" /> Slot Details
          </CardTitle>
          <CardDescription>Students will see this slot in the available slots list and may apply.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Hospital */}
            <div className="space-y-2">
              <Label>Hospital <span className="text-destructive">*</span></Label>
              <Select
                disabled={loadingHospitals}
                onValueChange={(val) => {
                  setSelectedHospital(val);
                  setValue('hospitalId', val, { shouldValidate: true });
                  setValue('departmentId', '', { shouldValidate: false });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingHospitals ? 'Loading...' : 'Select hospital'} />
                </SelectTrigger>
                <SelectContent>
                  {hospitals.map((h) => (
                    <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.hospitalId && <p className="text-xs text-destructive">{errors.hospitalId.message}</p>}
            </div>

            {/* Department */}
            <div className="space-y-2">
              <Label>Department <span className="text-destructive">*</span></Label>
              <Select
                disabled={!selectedHospital || loadingDepts}
                onValueChange={(val) => setValue('departmentId', val, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!selectedHospital ? 'Select hospital first' : loadingDepts ? 'Loading...' : 'Select department'} />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.departmentId && <p className="text-xs text-destructive">{errors.departmentId.message}</p>}
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Duty Date <span className="text-destructive">*</span></Label>
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

            {/* Makeup */}
            <div className="flex items-center gap-3">
              <Controller
                control={control}
                name="isMakeup"
                render={({ field }) => (
                  <Checkbox
                    id="isMakeup"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="isMakeup" className="cursor-pointer">
                This is a makeup duty slot
                {isMakeup && <span className="ml-2 text-xs text-amber-600 font-medium">Students flagged for makeup will be prioritised</span>}
              </Label>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea
                id="description"
                placeholder="Any additional notes for students..."
                rows={3}
                {...register('description')}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" asChild>
                <Link href="/slots">Cancel</Link>
              </Button>
              <Button type="submit" disabled={createSlot.isPending}>
                {createSlot.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : 'Create Slot'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
