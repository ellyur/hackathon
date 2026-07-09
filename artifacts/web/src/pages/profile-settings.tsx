import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera, Loader2, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useUpdateUser, getGetMeQueryKey } from '@workspace/api-client-react';
import type { AuthUser } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
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

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      phone: user?.phone ?? '',
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
      // Update localStorage + React Query cache so sidebar avatar refreshes immediately
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
      // Reset input so same file can be re-selected
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
        },
      });
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      toast({ title: 'Profile updated successfully.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile';
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

  const isStudent = user?.role === 'student';
  const studentProfile = user?.studentProfile;

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
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />

              {/* Avatar circle */}
              <div className="relative group">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-border shadow-sm">
                  {currentAvatar ? (
                    <img
                      src={currentAvatar}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold select-none">
                      {initials}
                    </div>
                  )}
                </div>
                {/* Hover overlay */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer disabled:cursor-wait focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-label="Change profile photo"
                  title="Change profile photo"
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
                {avatarUploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
                {avatarUploading ? 'Uploading…' : 'Change Photo'}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                JPG, PNG or GIF · Max 5 MB
              </p>
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
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input value={user?.email ?? ''} disabled className="bg-muted" />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
                  </FormItem>
                  <FormField control={profileForm.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl><Input placeholder="09171234567" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
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

      {/* Student Info (read-only) */}
      {isStudent && studentProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Academic Profile</CardTitle>
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
