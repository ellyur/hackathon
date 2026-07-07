import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Settings, MapPin, Bell, Shield, Save, Loader2 } from 'lucide-react';

export function AdminSettingsPage() {
  const { toast } = useToast();
  const [savingSection, setSavingSection] = useState<string | null>(null);

  // General Settings
  const [general, setGeneral] = useState({
    institutionName: 'Philippine College of Nursing',
    academicYear: '2024-2025',
    contactEmail: 'admin@clinicalflow.com',
  });

  // Attendance Settings
  const [attendance, setAttendance] = useState({
    gpsRadius: '100',
    gracePeriodMinutes: '15',
    faceVerificationRequired: true,
    gpsVerificationRequired: true,
  });

  // Notification Settings
  const [notifications, setNotifications] = useState({
    emailOnCaseSubmission: true,
    inAppOnCaseSubmission: true,
    emailOnCaseVerified: true,
    inAppOnCaseVerified: true,
    emailOnCaseRejected: true,
    inAppOnCaseRejected: true,
    emailOnScheduleAssigned: false,
    inAppOnScheduleAssigned: true,
    emailOnAttendanceMissed: true,
    inAppOnAttendanceMissed: true,
    emailOnSystemAnnouncement: true,
    inAppOnSystemAnnouncement: true,
  });

  // Session Settings
  const [session, setSession] = useState({
    sessionTimeout: '8h',
    maxLoginAttempts: '5',
  });

  const handleSave = async (section: string, label: string) => {
    setSavingSection(section);
    await new Promise(r => setTimeout(r, 800));
    setSavingSection(null);
    toast({ title: 'Settings saved', description: `${label} have been updated successfully.` });
  };

  const SectionSaveButton = ({ section, label }: { section: string; label: string }) => (
    <Button
      size="sm"
      className="gap-2"
      disabled={savingSection === section}
      onClick={() => handleSave(section, label)}
    >
      {savingSection === section
        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving...</>
        : <><Save className="w-3.5 h-3.5" />Save</>}
    </Button>
  );

  const NotifRow = ({ label, emailKey, inAppKey }: { label: string; emailKey: keyof typeof notifications; inAppKey: keyof typeof notifications }) => (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Switch
            checked={notifications[emailKey] as boolean}
            onCheckedChange={v => setNotifications(prev => ({ ...prev, [emailKey]: v }))}
          />
          <span className="text-xs text-muted-foreground w-14">Email</span>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={notifications[inAppKey] as boolean}
            onCheckedChange={v => setNotifications(prev => ({ ...prev, [inAppKey]: v }))}
          />
          <span className="text-xs text-muted-foreground w-14">In-App</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">System Settings</h2>
        <p className="text-muted-foreground mt-1">Configure system-wide behavior and preferences for ClinicalFlow.</p>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">General Settings</CardTitle>
            </div>
            <SectionSaveButton section="general" label="General settings" />
          </div>
          <CardDescription>Basic institution and program information.</CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Institution Name</Label>
              <Input
                className="mt-1"
                value={general.institutionName}
                onChange={e => setGeneral(p => ({ ...p, institutionName: e.target.value }))}
              />
            </div>
            <div>
              <Label>Academic Year</Label>
              <Input
                className="mt-1"
                value={general.academicYear}
                onChange={e => setGeneral(p => ({ ...p, academicYear: e.target.value }))}
                placeholder="2024-2025"
              />
            </div>
          </div>
          <div>
            <Label>Contact Email</Label>
            <Input
              className="mt-1"
              type="email"
              value={general.contactEmail}
              onChange={e => setGeneral(p => ({ ...p, contactEmail: e.target.value }))}
            />
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
            <SectionSaveButton section="attendance" label="Attendance settings" />
          </div>
          <CardDescription>Configure GPS, verification, and grace period rules for attendance tracking.</CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>GPS Radius (meters)</Label>
              <Input
                className="mt-1"
                type="number"
                min="10"
                value={attendance.gpsRadius}
                onChange={e => setAttendance(p => ({ ...p, gpsRadius: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground mt-1">Students must be within this distance of the hospital to clock in.</p>
            </div>
            <div>
              <Label>Grace Period (minutes)</Label>
              <Input
                className="mt-1"
                type="number"
                min="0"
                value={attendance.gracePeriodMinutes}
                onChange={e => setAttendance(p => ({ ...p, gracePeriodMinutes: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground mt-1">Minutes after shift start before marking as late.</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border rounded-lg px-4">
              <div>
                <p className="text-sm font-medium">Face Verification Required</p>
                <p className="text-xs text-muted-foreground">Students must complete face scan to time-in.</p>
              </div>
              <Switch
                checked={attendance.faceVerificationRequired}
                onCheckedChange={v => setAttendance(p => ({ ...p, faceVerificationRequired: v }))}
              />
            </div>
            <div className="flex items-center justify-between py-2 border rounded-lg px-4">
              <div>
                <p className="text-sm font-medium">GPS Verification Required</p>
                <p className="text-xs text-muted-foreground">Enforce location check during time-in.</p>
              </div>
              <Switch
                checked={attendance.gpsVerificationRequired}
                onCheckedChange={v => setAttendance(p => ({ ...p, gpsVerificationRequired: v }))}
              />
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
            <SectionSaveButton section="notifications" label="Notification settings" />
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
            <SectionSaveButton section="session" label="Session settings" />
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
              <Input
                className="mt-1"
                type="number"
                min="1"
                max="20"
                value={session.maxLoginAttempts}
                onChange={e => setSession(p => ({ ...p, maxLoginAttempts: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground mt-1">Account is locked after this many consecutive failed logins.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
