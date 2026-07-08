import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Component, type ReactNode } from 'react';

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8 text-center">
          <div className="space-y-3 max-w-md">
            <h2 className="text-xl font-semibold">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">{(this.state.error as Error).message}</p>
            <button className="text-sm underline" onClick={() => this.setState({ error: null })}>Try again</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { ProtectedRoute } from '@/components/protected-route';
import { AppShell } from '@/components/app-shell';

// Pages
import Landing from '@/pages/landing';
import { Login } from '@/pages/login';
import { ForgotPasswordPage } from '@/pages/forgot-password';
import { ResetPasswordPage } from '@/pages/reset-password';
import { Dashboard } from '@/pages/dashboard';
import { ClinicalPassportPage } from '@/pages/passport';
import { SubmitCasePage } from '@/pages/submit-case';
import { AvailableSlotsPage } from '@/pages/slots';
import { TimeInSimulatorPage } from '@/pages/time-in';
import { MasterSchedulePage } from '@/pages/master-schedule';
import { AttendanceRosterPage } from '@/pages/attendance-roster';
import { AdminUsersPage } from '@/pages/admin-users';
import { MySchedulePage } from '@/pages/my-schedule';
import { FaceSetupPage } from '@/pages/face-setup';
import { MyDutiesPage } from '@/pages/duties';
import { CreateSchedulePage } from '@/pages/create-schedule';
import { EditSchedulePage } from '@/pages/edit-schedule';
import { StudentRosterPage } from '@/pages/students';
import { StudentProfilePage } from '@/pages/student-profile';
import { CreateSlotPage } from '@/pages/create-slot';
import { SlotApplicationsPage } from '@/pages/slot-applications';
import { MakeupDutiesQueuePage } from '@/pages/makeup-duties';
import { CaseGapsMatrixPage } from '@/pages/case-gaps';
import { PendingVerificationsPage } from '@/pages/verifications';
import { ReviewVerificationPage } from '@/pages/review-verification';
import { CreateUserPage } from '@/pages/create-user';
import { AdminAnalyticsPage } from '@/pages/admin-analytics';
import { ProfileSettingsPage } from '@/pages/profile-settings';
import { NotificationsPage } from '@/pages/notifications';
import { AnnouncementsPage } from '@/pages/announcements';
import { AttendanceHistoryPage } from '@/pages/attendance-history';
import { MyApplicationsPage } from '@/pages/my-applications';
import { StudentRecommendationsPage } from '@/pages/student-recommendations';
import { VerifyCasePage } from '@/pages/verify-case';
import { ManageAnnouncementsPage } from '@/pages/manage-announcements';
import { AdminHospitalsPage } from '@/pages/admin-hospitals';
import { AdminDepartmentsPage } from '@/pages/admin-departments';
import { AdminCasesPage } from '@/pages/admin-cases';
import { RecommendationWeightsPage } from '@/pages/recommendation-weights';
import { AdminReportsPage } from '@/pages/admin-reports';
import { AdminAuditPage } from '@/pages/admin-audit';
import { AdminSettingsPage } from '@/pages/admin-settings';
import { AdminAcademicPage } from '@/pages/admin-academic';
import { AdminNotificationLogPage } from '@/pages/admin-notification-log';
import { CIEvaluationPage } from '@/pages/ci-evaluation';
import { StudentAcademicSchedulePage } from '@/pages/student-academic-schedule';

const queryClient = new QueryClient();

// Scaffold for remaining unimplemented pages
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="h-full flex items-center justify-center p-8 text-center text-muted-foreground border-2 border-dashed rounded-xl">
    <div className="space-y-2">
      <h2 className="text-xl font-medium text-foreground">{title}</h2>
      <p>This page is being implemented.</p>
    </div>
  </div>
);

function Router() {
  const [location] = useLocation();

  // Public pages — no auth required, no AppShell
  if (location === '/') return <Landing />;
  if (location === '/login') return <Login />;
  if (location === '/forgot-password') return <ForgotPasswordPage />;
  if (location === '/reset-password') return <ResetPasswordPage />;

  // Everything else is protected and rendered inside AppShell.
  // IMPORTANT: the Switch here is NOT nested inside a <Route>, so Wouter
  // never creates a nested base. Every inner Route matches the full path
  // exactly as expected.
  return (
    <ProtectedRoute>
      <AppShell>
        <Switch>
          <Route path="/dashboard" component={Dashboard} />

          <Route path="/notifications" component={NotificationsPage} />
          <Route path="/announcements" component={AnnouncementsPage} />
          <Route path="/settings/profile" component={ProfileSettingsPage} />

          {/* Student */}
          <Route path="/schedule" component={MySchedulePage} />
          <Route path="/schedule/:id" component={TimeInSimulatorPage} />
          <Route path="/profile/face-setup" component={FaceSetupPage} />
          <Route path="/passport" component={ClinicalPassportPage} />
          <Route path="/passport/submit" component={SubmitCasePage} />
          <Route path="/attendance" component={AttendanceHistoryPage} />
          <Route path="/slots" component={AvailableSlotsPage} />
          <Route path="/slots/my-applications" component={MyApplicationsPage} />

          {/* CI */}
          <Route path="/duties" component={MyDutiesPage} />
          <Route path="/duties/:id/attendance" component={AttendanceRosterPage} />
          <Route path="/duties/:id/verify" component={VerifyCasePage} />

          {/* Scheduler */}
          <Route path="/schedules" component={MasterSchedulePage} />
          <Route path="/schedules/create" component={CreateSchedulePage} />
          <Route path="/schedules/:id/edit" component={EditSchedulePage} />
          <Route path="/schedules/:id/recommendations" component={StudentRecommendationsPage} />
          <Route path="/students" component={StudentRosterPage} />
          <Route path="/students/:id" component={StudentProfilePage} />
          <Route path="/slots/create" component={CreateSlotPage} />
          <Route path="/slots/:id/applications" component={SlotApplicationsPage} />
          <Route path="/makeup-duties" component={MakeupDutiesQueuePage} />
          <Route path="/case-gaps" component={CaseGapsMatrixPage} />
          <Route path="/verifications" component={PendingVerificationsPage} />
          <Route path="/verifications/:id" component={ReviewVerificationPage} />
          <Route path="/announcements/manage" component={ManageAnnouncementsPage} />

          {/* Admin */}
          <Route path="/admin/users" component={AdminUsersPage} />
          <Route path="/admin/users/create" component={CreateUserPage} />
          <Route path="/admin/hospitals" component={AdminHospitalsPage} />
          <Route path="/admin/hospitals/:id/departments" component={AdminDepartmentsPage} />
          <Route path="/admin/cases" component={AdminCasesPage} />
          <Route path="/admin/recommendation-weights" component={RecommendationWeightsPage} />
          <Route path="/admin/analytics" component={AdminAnalyticsPage} />
          <Route path="/admin/reports" component={AdminReportsPage} />
          <Route path="/admin/audit" component={AdminAuditPage} />
          <Route path="/admin/settings" component={AdminSettingsPage} />
          <Route path="/admin/academic" component={AdminAcademicPage} />
          <Route path="/admin/notification-log" component={AdminNotificationLogPage} />
          <Route path="/evaluations" component={CIEvaluationPage} />
          <Route path="/academic-schedule" component={StudentAcademicSchedulePage} />

          <Route component={NotFound} />
        </Switch>
      </AppShell>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}

export default App;
