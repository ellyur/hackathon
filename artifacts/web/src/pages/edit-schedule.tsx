import { useEffect, useState } from 'react';
import { Link, useLocation, useRoute } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Pencil, Trash2 } from 'lucide-react';
import {
  useGetSchedule,
  useUpdateSchedule,
  useCancelSchedule,
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

export function EditSchedulePage() {
  const [, params] = useRoute('/schedules/:id/edit');
  const scheduleId = params?.id ?? '';
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedHospital, setSelectedHospital] = useState('');

  const { data: schedule, isLoading: loadingSchedule } = useGetSchedule(scheduleId, {
    query: { enabled: !!scheduleId },
  });
  const { data: hospitals = [], isLoading: loadingHospitals } = useListHospitals();
  const { data: departments = [], isLoading: loadingDepts } = useListDepartments(
    selectedHospital || schedule?.hospitalId || '',
    { query: { enabled: !!(selectedHospital || schedule?.hospitalId) } }
  );
  const { data: allUsers = [], isLoading: loadingCIs } = useListUsers({ role: 'ci' });
  const ciList = allUsers.filter((u) => u.role === 'ci' && u.isActive);

  const updateSchedule = useUpdateSchedule();
  const cancelSchedule = useCancelSchedule();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { gracePeriodMin: 15 },
  });

  // Pre-fill form once schedule data arrives
  useEffect(() => {
    if (schedule) {
      reset({
        title: schedule.title ?? '',
        hospitalId: schedule.hospitalId ?? '',
        departmentId: schedule.departmentId ?? '',
        ciId: schedule.ciId ?? '',
        date: schedule.dutyDate,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        gracePeriodMin: schedule.gracePeriodMin,
        dutyHours: (schedule as any).dutyHours ?? undefined,
        notes: schedule.notes ?? '',
      });
      setSelectedHospital(schedule.hospitalId ?? '');
    }
  }, [schedule, reset]);

  async function onSubmit(data: FormValues) {
    try {
      await updateSchedule.mutateAsync({
        id: scheduleId,
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
        },
      });
      toast({ title: 'Schedule updated', description: 'Your changes have been saved.' });
      setLocation('/schedules');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update schedule';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  }

  async function handleCancelSchedule() {
    try {
      await cancelSchedule.mutateAsync({ id: scheduleId });
      toast({
        title: 'Schedule cancelled',
        description: 'The schedule has been cancelled and students notified.',
        variant: 'destructive',
      });
      setLocation('/schedules');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel schedule';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  }

  if (loadingSchedule) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Schedule not found.{' '}
        <Link href="/schedules" className="underline text-foreground">Back to schedules</Link>
      </div>
    );
  }

  const effectiveHospital = selectedHospital || schedule.hospitalId || '';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/schedules" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to Schedules
        </Link>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Pencil className="w-6 h-6" /> Edit Schedule
        </h2>
        <p className="text-muted-foreground mt-1">Update the details of this clinical rotation.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Schedule Details</CardTitle>
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
                value={effectiveHospital}
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
                disabled={!effectiveHospital || loadingDepts}
                value={schedule.departmentId}
                onValueChange={(val) => setValue('departmentId', val, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!effectiveHospital ? 'Select hospital first' : loadingDepts ? 'Loading...' : 'Select department'} />
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
                value={schedule.ciId}
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
                Duty Hours
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
              <Button type="submit" disabled={updateSchedule.isPending}>
                {updateSchedule.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Cancel Schedule */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="w-5 h-5" /> Danger Zone
          </CardTitle>
          <CardDescription>Cancelling a schedule will notify all assigned students and the CI.</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={cancelSchedule.isPending}>
                {cancelSchedule.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cancelling...</> : 'Cancel This Schedule'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel Schedule?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently cancel the schedule and notify all assigned students and the clinical instructor.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep Schedule</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive/90"
                  onClick={handleCancelSchedule}
                >
                  Yes, Cancel Schedule
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
