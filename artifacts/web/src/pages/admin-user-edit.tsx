import { useEffect } from 'react';
import { Link, useRoute, useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useGetUser, useUpdateUser } from '@workspace/api-client-react';

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  isActive: z.boolean(),
  // student-only
  section: z.string().optional(),
  yearLevel: z.coerce.number().optional(),
  // password reset (optional)
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine(d => !d.newPassword || d.newPassword.length >= 8, {
  message: 'Password must be at least 8 characters',
  path: ['newPassword'],
}).refine(d => d.newPassword === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export function AdminUserEditPage() {
  const [, params] = useRoute('/admin/users/:id/edit');
  const userId = params?.id ?? '';
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: user, isLoading, isError } = useGetUser(userId, { query: { enabled: !!userId } } as any);
  const updateUser = useUpdateUser();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      isActive: true,
      section: '',
      yearLevel: undefined,
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Populate form once user data loads
  useEffect(() => {
    if (!user) return;
    form.reset({
      firstName: (user as any).firstName ?? '',
      lastName: (user as any).lastName ?? '',
      phone: (user as any).phone ?? '',
      isActive: (user as any).isActive ?? true,
      section: (user as any).studentProfile?.section ?? (user as any).section ?? '',
      yearLevel: (user as any).studentProfile?.yearLevel ?? (user as any).yearLevel ?? undefined,
      newPassword: '',
      confirmPassword: '',
    });
  }, [user]);

  const onSubmit = async (data: FormData) => {
    try {
      const payload: Record<string, unknown> = {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || undefined,
        isActive: data.isActive,
      };
      if (data.newPassword) payload.password = data.newPassword;
      if (data.section !== undefined) payload.section = data.section;
      if (data.yearLevel !== undefined) payload.yearLevel = data.yearLevel;

      await updateUser.mutateAsync({ id: userId, data: payload as any });
      toast({ title: 'User updated', description: `${data.firstName} ${data.lastName} has been updated.` });
      navigate('/admin/users');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update user';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const role: string = (user as any)?.role ?? '';
  const isStudent = role === 'student';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-md" />
          <div className="space-y-1">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Card><CardContent className="pt-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </CardContent></Card>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/users"><ArrowLeft className="w-4 h-4 mr-1" />Back</Link>
        </Button>
        <p className="text-destructive">User not found or failed to load.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/users"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Edit User</h2>
          <p className="text-muted-foreground mt-1">
            {(user as any).firstName} {(user as any).lastName} · <span className="capitalize">{role}</span>
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Update the user's personal details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="firstName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="lastName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">{(user as any).email}</p>
                <p className="text-xs text-muted-foreground">Email cannot be changed after account creation.</p>
              </div>

              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                  <FormControl><Input placeholder="09171234567" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="isActive" render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div>
                    <FormLabel className="text-base">Active Account</FormLabel>
                    <FormDescription>Inactive users cannot log in to the system.</FormDescription>
                  </div>
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Student-only profile fields */}
          {isStudent && (
            <Card>
              <CardHeader>
                <CardTitle>Student Profile</CardTitle>
                <CardDescription>Academic details for this student account.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="section" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Section</FormLabel>
                      <FormControl><Input placeholder="A" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="yearLevel" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year Level</FormLabel>
                      <Select
                        onValueChange={v => field.onChange(Number(v))}
                        value={field.value?.toString() ?? ''}
                      >
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">1st Year</SelectItem>
                          <SelectItem value="2">2nd Year</SelectItem>
                          <SelectItem value="3">3rd Year</SelectItem>
                          <SelectItem value="4">4th Year</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Password reset */}
          <Card>
            <CardHeader>
              <CardTitle>Reset Password</CardTitle>
              <CardDescription>Leave blank to keep the current password.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="newPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl><Input type="password" placeholder="Min. 8 characters" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl><Input type="password" placeholder="Repeat password" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          <Separator />

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/users">Cancel</Link>
            </Button>
            <Button type="submit" disabled={updateUser.isPending}>
              {updateUser.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
