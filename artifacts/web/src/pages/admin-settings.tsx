import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Settings, MapPin, Bell, Shield, Save, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ── API helpers ───────────────────────────────────────────────────────────────

function getAuthToken() { return localStorage.getItem('authToken'); }
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options?.headers },
    credentials: 'include',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? res.statusText);
  return json as T;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface SystemSettings {
  institutionName: string; academicYear: string; contactEmail: string;
  gpsRadius: number; gracePeriodMinutes: number;
  faceVerificationRequired: boolean; gpsVerificationRequired: boolean;
  emailOnCaseSubmission: boolean; inAppOnCaseSubmission: boolean;
  emailOnCaseVerified: boolean; inAppOnCaseVerified: boolean;
  emailOnCaseRejected: boolean; inAppOnCaseRejected: boolean;
  emailOnScheduleAssigned: boolean; inAppOnScheduleAssigned: boolean;
  emailOnAttendanceMissed: boolean; inAppOnAttendanceMissed: boolean;
  emailOnSystemAnnouncement: boolean; inAppOnSystemAnnouncement: boolean;
  sessionTimeout: string; maxLoginAttempts: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AdminSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: remote, isLoading } = useQuery<SystemSettings>({
    queryKey: ['system-settings'],
    queryFn: () => apiFetch<SystemSettings>('/api/settings'),
    staleTime: 60_000,
  });

  const saveMutation = useMutation({
    mutationFn: (patch: Partial<SystemSettings>) =>
      apiFetch<SystemSettings>('/api/settings', { method: 'PATCH', body: JSON.stringify(patch) }),
    onSuccess: (data) => {
      queryClient.setQueryData(['system-settings'], data);
    },
  });

  // Local draft state — separate per section so saves are isolated
  const [general, setGeneral] = useState({ institutionName: '', academicYear: '', contactEmail: '' });
  const [attendance, setAttendance] = useState({ gpsRadius: '100', gracePeriodMinutes: '15', faceVerificationRequired: true, gpsVerificationRequired: true });
  const [notifications, setNotifications] = useState({
    emailOnCaseSubmission: true, inAppOnCaseSubmission: true,
    emailOnCaseVerified: true, inAppOnCaseVerified: true,
    emailOnCaseRejected: true, inAppOnCaseRejected: true,
    emailOnScheduleAssigned: false, inAppOnScheduleAssigned: true,
    emailOnAttendanceMissed: true, inAppOnAttendanceMissed: true,
    emailOnSystemAnnouncement: true, inAppOnSystemAnnouncement: true,
  });
  const [session, setSession] = useState({ sessionTimeout: '8h', maxLoginAttempts: '5' });
  const [savingSection, setSavingSection] = useState<string | null>(null);

  // Populate local state once remote data arrives
  useEffect(() => {
    if (!remote) return;
    setGeneral({ institutionName: remote.institutionName, academicYear: remote.academicYear, contactEmail: remote.contactEmail });
    setAttendance({ gpsRadius: String(remote.gpsRadius), gracePeriodMinutes: String(remote.gracePeriodMinutes), faceVerificationRequired: remote.faceVerificationRequired, gpsVerificationRequired: remote.gpsVerificationRequired });
    setNotifications({
      emailOnCaseSubmission: remote.emailOnCaseSubmission, inAppOnCaseSubmission: remote.inAppOnCaseSubmission,
      emailOnCaseVerified: remote.emailOnCaseVerified, inAppOnCaseVerified: remote.inAppOnCaseVerified,
      emailOnCaseRejected: remote.emailOnCaseRejected, inAppOnCaseRejected: remote.inAppOnCaseRejected,
      emailOnScheduleAssigned: remote.emailOnScheduleAssigned, inAppOnScheduleAssigned: remote.inAppOnScheduleAssigned,
      emailOnAttendanceMissed: remote.emailOnAttendanceMissed, inAppOnAttendanceMissed: remote.inAppOnAttendanceMissed,
      emailOnSystemAnnouncement: remote.emailOnSystemAnnouncement, inAppOnSystemAnnouncement: remote.inAppOnSystemAnnouncement,
    });
    setSession({ sessionTimeout: remote.sessionTimeout, maxLoginAttempts: String(remote.maxLoginAttempts) });
  }, [remote]);

  const handleSave = async (section: string, label: string, patch: Partial<SystemSettings>) => {
    setSavingSection(section);
    try {
      await saveMutation.mutateAsync(patch);
      toast({ title: 'Settings saved', description: `${label} updated successfully.` });
    } catch (e: any) {
      toast({ title: 'Save failed', description: e?.message ?? 'Unexpected error', variant: 'destructive' });
    } finally {
      setSavingSection(null);
    }
  };

  const SectionSaveButton = ({ section, label, patch }: { section: string; label: string; patch: Partial<SystemSettings> }) => (
    <Button size="sm" className="gap-2" disabled={savingSection === section} onClick={() => handleSave(section, label, patch)}>
      {savingSection === section ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving...</> : <><Save className="w-3.5 h-3.5" />Save</>}
    </Button>
  );

  const NotifRow = ({ label, emailKey, inAppKey }: { label: string; emailKey: keyof typeof notifications; inAppKey: keyof typeof notifications }) => (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Switch checked={notifications[emailKey] as boolean} onCheckedChange={v => setNotifications(p => ({ ...p, [emailKey]: v }))} />
          <span className="text-xs text-muted-foreground w-14">Email</span>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={notifications[inAppKey] as boolean} onCheckedChange={v => setNotifications(p => ({ ...p, [inAppKey]: v }))} />
          <span className="text-xs text-muted-foreground w-14">In-App</span>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div><Skeleton className="h-9 w-56" /><Skeleton className="h-4 w-80 mt-2" /></div>
        {[1, 2, 3, 4].map(i => <Card key={i}><CardContent className="pt-6 space-y-4">{Array.from({ length: 3 }).map((_, j) => <Skeleton key={j} className="h-10 w-full" />)}</CardContent></Card>)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">System Settings</h2>
        <p className="text-muted-foreground mt-1">Configure system-wide behavior and preferences for SIPAG.</p>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">General Settings</CardTitle>
            </div>
            <SectionSaveButton section="general" label="General settings" patch={{ institutionName: general.institutionName, academicYear: general.academicYear, contactEmail: general.contactEmail }} />
          </div>
          <CardDescription>Basic institution and program information.</CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Institution Name</Label>
              <Input className="mt-1" value={general.institutionName} onChange={e => setGeneral(p => ({ ...p, institutionName: e.target.value }))} />
            </div>
            <div>
              <Label>Academic Year</Label>
              <Input className="mt-1" value={general.academicYear} onChange={e => setGeneral(p => ({ ...p, academicYear: e.target.value }))} placeholder="2024-2025" />
            </div>
          </div>
          <div>
            <Label>Contact Email</Label>
            <Input className="mt-1" type="email" value={general.contactEmail} onChange={e => setGeneral(p => ({ ...p, contactEmail: e.target.value }))} />
          </div>
        </CardContent>
      </Card>

      {/* Attendance Settings */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Attendance Settings</CardTitle>
            </div>
            <SectionSaveButton section="attendance" label="Attendance settings" patch={{ gpsRadius: Number(attendance.gpsRadius), gracePeriodMinutes: Number(attendance.gracePeriodMinutes), faceVerificationRequired: attendance.faceVerificationRequired, gpsVerificationRequired: attendance.gpsVerificationRequired }} />
          </div>
          <CardDescription>Configure GPS, verification, and grace period rules for attendance tracking.</CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>GPS Radius (meters)</Label>
              <Input className="mt-1" type="number" min="10" value={attendance.gpsRadius} onChange={e => setAttendance(p => ({ ...p, gpsRadius: e.target.value }))} />
              <p className="text-xs text-muted-foreground mt-1">Students must be within this distance of the hospital to clock in.</p>
            </div>
            <div>
              <Label>Grace Period (minutes)</Label>
              <Input className="mt-1" type="number" min="0" value={attendance.gracePeriodMinutes} onChange={e => setAttendance(p => ({ ...p, gracePeriodMinutes: e.target.value }))} />
              <p className="text-xs text-muted-foreground mt-1">Minutes after shift start before marking as late.</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border rounded-lg px-4">
              <div>
                <p className="text-sm font-medium">Face Verification Required</p>
                <p className="text-xs text-muted-foreground">Students must complete face scan to time-in.</p>
              </div>
              <Switch checked={attendance.faceVerificationRequired} onCheckedChange={v => setAttendance(p => ({ ...p, faceVerificationRequired: v }))} />
            </div>
            <div className="flex items-center justify-between py-2 border rounded-lg px-4">
              <div>
                <p className="text-sm font-medium">GPS Verification Required</p>
                <p className="text-xs text-muted-foreground">Enforce location check during time-in.</p>
              </div>
              <Switch checked={attendance.gpsVerificationRequired} onCheckedChange={v => setAttendance(p => ({ ...p, gpsVerificationRequired: v }))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Notification Settings</CardTitle>
            </div>
            <SectionSaveButton section="notifications" label="Notification settings" patch={notifications} />
          </div>
          <CardDescription>Choose which events trigger email and in-app notifications.</CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4 space-y-1 divide-y">
          <NotifRow label="Case Submission" emailKey="emailOnCaseSubmission" inAppKey="inAppOnCaseSubmission" />
          <NotifRow label="Case Verified" emailKey="emailOnCaseVerified" inAppKey="inAppOnCaseVerified" />
          <NotifRow label="Case Rejected" emailKey="emailOnCaseRejected" inAppKey="inAppOnCaseRejected" />
          <NotifRow label="Schedule Assigned" emailKey="emailOnScheduleAssigned" inAppKey="inAppOnScheduleAssigned" />
          <NotifRow label="Attendance Missed" emailKey="emailOnAttendanceMissed" inAppKey="inAppOnAttendanceMissed" />
          <NotifRow label="System Announcements" emailKey="emailOnSystemAnnouncement" inAppKey="inAppOnSystemAnnouncement" />
        </CardContent>
      </Card>

      {/* Session Settings */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Session Settings</CardTitle>
            </div>
            <SectionSaveButton section="session" label="Session settings" patch={{ sessionTimeout: session.sessionTimeout, maxLoginAttempts: Number(session.maxLoginAttempts) }} />
          </div>
          <CardDescription>Configure authentication timeouts and security thresholds.</CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Session Timeout</Label>
              <Select value={session.sessionTimeout} onValueChange={v => setSession(p => ({ ...p, sessionTimeout: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">1 hour</SelectItem>
                  <SelectItem value="4h">4 hours</SelectItem>
                  <SelectItem value="8h">8 hours</SelectItem>
                  <SelectItem value="24h">24 hours</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Users will be logged out after this period of inactivity.</p>
            </div>
            <div>
              <Label>Max Login Attempts</Label>
              <Input className="mt-1" type="number" min="1" max="20" value={session.maxLoginAttempts} onChange={e => setSession(p => ({ ...p, maxLoginAttempts: e.target.value }))} />
              <p className="text-xs text-muted-foreground mt-1">Account is locked after this many consecutive failed logins.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
