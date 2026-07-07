import { useState } from 'react';
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
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Loader2, Pencil, Trash2 } from 'lucide-react';

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

const CIS = [
  { id: 'ci1', name: 'Dr. James Wilson' },
  { id: 'ci2', name: 'Dr. Sarah Smith' },
  { id: 'ci3', name: 'Dr. Maria Santos' },
  { id: 'ci4', name: 'Dr. Robert Lee' },
];

// Mock pre-filled data for the schedule being edited
const MOCK_SCHEDULE = {
  title: 'Morning ICU Rotation',
  hospital: 'h1',
  department: 'd1',
  ci: 'ci1',
  date: '2024-10-20',
  startTime: '08:00',
  endTime: '16:00',
  maxStudents: 8,
};

const schema = z.object({
  title: z.string().optional(),
  hospital: z.string().min(1, 'Hospital is required'),
  department: z.string().min(1, 'Department is required'),
  ci: z.string().min(1, 'Clinical Instructor is required'),
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  maxStudents: z.coerce.number().min(1).max(20),
});

type FormValues = z.infer<typeof schema>;

export function EditSchedulePage() {
  const [, params] = useRoute('/schedules/:id/edit');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedHospital, setSelectedHospital] = useState(MOCK_SCHEDULE.hospital);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: MOCK_SCHEDULE,
  });

  function onSubmit(_data: FormValues) {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast({ title: 'Schedule updated', description: 'Your changes have been saved.' });
      setLocation('/schedules');
    }, 1200);
  }

  function handleCancelSchedule() {
    setIsCancelling(true);
    setTimeout(() => {
      setIsCancelling(false);
      toast({
        title: 'Schedule cancelled',
        description: 'The schedule has been cancelled and students notified.',
        variant: 'destructive',
      });
      setLocation('/schedules');
    }, 1000);
  }

  const departments = selectedHospital ? (DEPARTMENTS[selectedHospital] ?? []) : [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/schedules" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to Schedules
        </Link>
        <h2 className="text-3xl font-bold tracking-tight">Edit Schedule</h2>
        <p className="text-muted-foreground mt-1">
          Editing schedule {params?.id ?? ''} — changes will notify assigned students.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5" /> Schedule Details
          </CardTitle>
          <CardDescription>Update the fields below and save.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input id="title" placeholder="e.g., Morning ICU Rotation" {...register('title')} />
            </div>

            {/* Hospital */}
            <div className="space-y-2">
              <Label>Hospital <span className="text-destructive">*</span></Label>
              <Select
                defaultValue={MOCK_SCHEDULE.hospital}
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
                defaultValue={MOCK_SCHEDULE.department}
                disabled={!selectedHospital}
                onValueChange={(val) => setValue('department', val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department..." />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.department && <p className="text-xs text-destructive">{errors.department.message}</p>}
            </div>

            {/* Clinical Instructor */}
            <div className="space-y-2">
              <Label>Clinical Instructor <span className="text-destructive">*</span></Label>
              <Select
                defaultValue={MOCK_SCHEDULE.ci}
                onValueChange={(val) => setValue('ci', val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Assign a CI..." />
                </SelectTrigger>
                <SelectContent>
                  {CIS.map((ci) => (
                    <SelectItem key={ci.id} value={ci.id}>{ci.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.ci && <p className="text-xs text-destructive">{errors.ci.message}</p>}
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

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" asChild>
                <Link href="/schedules">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save Changes'}
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
              <Button variant="destructive" disabled={isCancelling}>
                {isCancelling ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cancelling...</> : 'Cancel This Schedule'}
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
