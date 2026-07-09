import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera, Loader2, Car, MapPin } from 'lucide-react';
import { LocationAutocomplete } from '@/components/location-autocomplete';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useUpdateUser, getGetMeQueryKey } from '@workspace/api-client-react';
import type { AuthUser } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

const TRANSPORTATION_OPTIONS = [
  { value: 'Public Transportation', label: 'Public Transportation' },
  { value: 'Motorcycle', label: 'Motorcycle' },
  { value: 'Private Car', label: 'Private Car' },
  { value: 'Walking', label: 'Walking' },
];

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  emergencyContact: z.string().optional(),
});

const locationSchema = z.object({
  landmark: z.string().optional(),
  city: z.string().optional(),
  transportationMethod: z.string().optional(),
});

const passwordSchema = z
  .object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ProfileFormValues = z.infer<typeof profileSchema>;
type LocationFormValues = z.infer<typeof locationSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

/** Resize an image File to max 400×400 and return a JPEG base64 data URL. */
function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 400;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round((height / width) * MAX); width = MAX; }
        else { width = Math.round((width / height) * MAX); height = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}

export function ProfileSettingsPage() {
  const { user: rawUser } = useAuth();
  const user = rawUser as AuthUser | undefined;
  const { toast } = useToast();
  const updateUser = useUpdateUser();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const isStudent = user?.role === 'student';
  const studentProfile = user?.studentProfile as ({
    studentNumber?: string | null;
    yearLevel?: number | null;
    section?: string | null;
    program?: string | null;
    academicYear?: string | null;
    landmark?: string | null;
    city?: string | null;
    transportationMethod?: string | null;
    emergencyContact?: string | null;
  }) | undefined;

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      phone: user?.phone ?? '',
      emergencyContact: studentProfile?.emergencyContact ?? '',
    },
  });

  const locationForm = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      landmark: studentProfile?.landmark ?? '',
      city: studentProfile?.city ?? '',
      transportationMethod: studentProfile?.transportationMethod ?? '',
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const currentAvatar = avatarPreview ?? user?.avatarUrl ?? null;
  const initials = `${user?.firstName?.[0] ?? '?'}${user?.lastName?.[0] ?? '?'}`.toUpperCase();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please select an image file', variant: 'destructive' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Image must be under 5 MB', variant: 'destructive' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setAvatarUploading(true);
    try {
      const dataUrl = await resizeImage(file);
      setAvatarPreview(dataUrl);
      await updateUser.mutateAsync({ id: user.id, data: { avatarUrl: dataUrl } });
      const stored = localStorage.getItem('authUser');
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.avatarUrl = dataUrl;
        localStorage.setItem('authUser', JSON.stringify(parsed));
      }
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      toast({ title: 'Profile photo updated!' });
    } catch (err: unknown) {
      setAvatarPreview(null);
      const msg = err instanceof Error ? err.message : 'Failed to upload photo';
      toast({ title: 'Upload failed', description: msg, variant: 'destructive' });
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onSaveProfile = async (values: ProfileFormValues) => {
    if (!user) return;
    try {
      await updateUser.mutateAsync({
        id: user.id,
        data: {
          firstName: values.firstName,
          lastName: values.lastName,
          phone: values.phone || undefined,
          emergencyContact: values.emergencyContact || undefined,
        } as Parameters<typeof updateUser.mutateAsync>[0]['data'],
      });
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      toast({ title: 'Profile updated successfully.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const onSaveLocation = async (values: LocationFormValues) => {
    if (!user) return;
    try {
      await updateUser.mutateAsync({
        id: user.id,
        data: {
          landmark: values.landmark || undefined,
          city: values.city || undefined,
          transportationMethod: values.transportationMethod || undefined,
        } as Parameters<typeof updateUser.mutateAsync>[0]['data'],
      });
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      toast({ title: 'Location details saved.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update location';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const onSavePassword = async (values: PasswordFormValues) => {
    if (!user) return;
    try {
      await updateUser.mutateAsync({
        id: user.id,
        data: { password: values.newPassword },
      });
      passwordForm.reset();
      toast({ title: 'Password changed successfully.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change password';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Profile Settings</h2>
        <p className="text-muted-foreground mt-1">Manage your personal information and account security.</p>
      </div>

      {/* Profile card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Avatar column */}
            <div className="flex flex-col items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <div className="relative group">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-border shadow-sm">
                  {currentAvatar ? (
                    <img src={currentAvatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold select-none">
                      {initials}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer disabled:cursor-wait focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-label="Change profile photo"
                >
                  {avatarUploading ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                </button>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-xs"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                type="button"
              >
                {avatarUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                {avatarUploading ? 'Uploading…' : 'Change Photo'}
              </Button>
              <p className="text-xs text-muted-foreground text-center">JPG, PNG or GIF · Max 5 MB</p>
            </div>

            {/* Form column */}
            <div className="md:col-span-2">
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={profileForm.control} name="firstName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={profileForm.control} name="lastName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">Email Address</label>
                    <Input value={user?.email ?? ''} disabled className="bg-muted" />
                    <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
                  </div>
                  <FormField control={profileForm.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl><Input placeholder="09171234567" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  {isStudent && (
                    <FormField control={profileForm.control} name="emergencyContact" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Emergency Contact</FormLabel>
                        <FormControl><Input placeholder="Name and phone number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}
                  <div className="flex justify-end">
                    <Button type="submit" disabled={updateUser.isPending}>
                      {updateUser.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Save Changes
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Student Academic Profile (read-only) */}
      {isStudent && studentProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Academic Profile</CardTitle>
            <CardDescription className="text-xs">Managed by Admin only. Contact your administrator to update these.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Student No.</p>
                <p className="font-medium font-mono">{studentProfile.studentNumber}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Year Level</p>
                <p className="font-medium">{studentProfile.yearLevel ? `Year ${studentProfile.yearLevel}` : '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Section</p>
                <p className="font-medium">{studentProfile.section ?? '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Program</p>
                <p className="font-medium">{studentProfile.program ?? '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Location & Transportation (Students only, used for AI recommendations) */}
      {isStudent && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Location & Transportation
            </CardTitle>
            <CardDescription className="text-xs">
              Used by the AI recommendation engine to suggest fair and convenient duty assignments. Your exact address is never stored.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...locationForm}>
              <form onSubmit={locationForm.handleSubmit(onSaveLocation)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={locationForm.control} name="landmark" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nearest Landmark</FormLabel>
                      <FormControl>
                        <LocationAutocomplete
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          placeholder="e.g. SM North EDSA, Robinsons Novaliches"
                          mode="landmark"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">Type to search — select from the dropdown.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={locationForm.control} name="city" render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <LocationAutocomplete
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          placeholder="e.g. Quezon City, Caloocan"
                          mode="city"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">Type to search for your city or municipality.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={locationForm.control} name="transportationMethod" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      <Car className="w-3.5 h-3.5" />
                      Transportation Method
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="How do you usually travel?" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TRANSPORTATION_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">Used to estimate travel time to hospitals.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="flex justify-end">
                  <Button type="submit" disabled={updateUser.isPending}>
                    {updateUser.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Location Details
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onSavePassword)} className="space-y-4 max-w-md">
              <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl><Input type="password" placeholder="Min. 8 characters" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl><Input type="password" placeholder="Repeat new password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex justify-end">
                <Button type="submit" disabled={updateUser.isPending}>
                  {updateUser.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Change Password
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
