import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, CalendarPlus } from 'lucide-react';
import {
  useCreateSchedule,
  useListHospitals,
  useListDepartments,
  useListUsers,
} from '@workspace/api-client-react';

const schema = z.object({
  title: z.string().optional(),
  hospitalId: z.string().min(1, 'Hospital is required'),
  departmentId: z.string().min(1, 'Department is required'),
  ciId: z.string().min(1, 'Clinical Instructor is required'),
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  gracePeriodMin: z.coerce.number().min(0).default(15),
  dutyHours: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function CreateSchedulePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedHospital, setSelectedHospital] = useState('');

  const { data: hospitals = [], isLoading: loadingHospitals } = useListHospitals();
  const { data: departments = [], isLoading: loadingDepts } = useListDepartments(selectedHospital, {
    query: { enabled: !!selectedHospital } as any,
  });
  const { data: allUsers = [], isLoading: loadingCIs } = useListUsers({ role: 'ci' });
  const ciList = allUsers.filter((u) => u.role === 'ci' && u.isActive);

  const createSchedule = useCreateSchedule();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { gracePeriodMin: 15 },
  });

  async function onSubmit(data: FormValues) {
    try {
      await createSchedule.mutateAsync({
        data: {
          title: data.title || undefined,
          hospitalId: data.hospitalId,
          departmentId: data.departmentId,
          ciId: data.ciId,
          dutyDate: data.date,
          startTime: data.startTime,
          endTime: data.endTime,
          gracePeriodMin: data.gracePeriodMin,
          dutyHours: data.dutyHours || undefined,
          notes: data.notes || undefined,
          studentIds: [],
        },
      });
      toast({ title: 'Schedule created successfully', description: 'The new rotation has been added.' });
      setLocation('/schedules');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create schedule';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/schedules" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to Schedules
        </Link>
        <h2 className="text-3xl font-bold tracking-tight">Create New Schedule</h2>
        <p className="text-muted-foreground mt-1">Set up a clinical rotation assignment for students.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarPlus className="w-5 h-5" /> Schedule Details
          </CardTitle>
          <CardDescription>All fields are required unless marked optional.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input id="title" placeholder="e.g. Morning ICU Rotation" {...register('title')} />
            </div>

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

            {/* CI */}
            <div className="space-y-2">
              <Label>Clinical Instructor <span className="text-destructive">*</span></Label>
              <Select
                disabled={loadingCIs}
                onValueChange={(val) => setValue('ciId', val, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingCIs ? 'Loading...' : 'Select clinical instructor'} />
                </SelectTrigger>
                <SelectContent>
                  {ciList.map((ci) => (
                    <SelectItem key={ci.id} value={ci.id}>{ci.firstName} {ci.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.ciId && <p className="text-xs text-destructive">{errors.ciId.message}</p>}
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

            {/* Grace Period */}
            <div className="space-y-2">
              <Label htmlFor="gracePeriodMin">Grace Period (minutes)</Label>
              <Input id="gracePeriodMin" type="number" min={0} max={60} {...register('gracePeriodMin')} />
            </div>

            {/* Duty Hours */}
            <div className="space-y-2">
              <Label htmlFor="dutyHours">
                Duty Hours <span className="text-destructive">*</span>
                <span className="text-muted-foreground text-xs ml-1">(official hours awarded upon completion)</span>
              </Label>
              <Input id="dutyHours" type="number" min={0} step={0.5} placeholder="e.g. 8" {...register('dutyHours')} />
              {errors.dutyHours && <p className="text-xs text-destructive">{errors.dutyHours.message}</p>}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input id="notes" placeholder="Any special instructions..." {...register('notes')} />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" asChild>
                <Link href="/schedules">Cancel</Link>
              </Button>
              <Button type="submit" disabled={createSchedule.isPending}>
                {createSchedule.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : 'Create Schedule'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
