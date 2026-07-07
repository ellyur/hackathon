import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { ProtectedRoute } from '@/components/protected-route';
import { AppShell } from '@/components/app-shell';

// Pages
import Landing from '@/pages/landing';
import { Login } from '@/pages/login';
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
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      
      {/* Protected Routes wrapped in Shell */}
      <Route path="/:rest*">
        <ProtectedRoute>
          <AppShell>
            <Switch>
              <Route path="/dashboard" component={Dashboard} />
              
              <Route path="/notifications"><PlaceholderPage title="Notification Center" /></Route>
              <Route path="/announcements"><PlaceholderPage title="Announcements" /></Route>
              <Route path="/settings/profile" component={ProfileSettingsPage} />

              {/* Student */}
              <Route path="/schedule" component={MySchedulePage} />
              <Route path="/schedule/:id" component={TimeInSimulatorPage} />
              <Route path="/profile/face-setup" component={FaceSetupPage} />
              <Route path="/passport" component={ClinicalPassportPage} />
              <Route path="/passport/submit" component={SubmitCasePage} />
              <Route path="/attendance"><PlaceholderPage title="Attendance History" /></Route>
              <Route path="/slots" component={AvailableSlotsPage} />
              <Route path="/slots/my-applications"><PlaceholderPage title="My Applications" /></Route>

              {/* CI */}
              <Route path="/duties" component={MyDutiesPage} />
              <Route path="/duties/:id/attendance" component={AttendanceRosterPage} />
              <Route path="/duties/:id/verify"><PlaceholderPage title="Verify Student Case" /></Route>

              {/* Scheduler */}
              <Route path="/schedules" component={MasterSchedulePage} />
              <Route path="/schedules/create" component={CreateSchedulePage} />
              <Route path="/schedules/:id/edit" component={EditSchedulePage} />
              <Route path="/schedules/:id/recommendations"><PlaceholderPage title="Student Recommendations" /></Route>
              <Route path="/students" component={StudentRosterPage} />
              <Route path="/students/:id" component={StudentProfilePage} />
              <Route path="/slots/create" component={CreateSlotPage} />
              <Route path="/slots/:id/applications" component={SlotApplicationsPage} />
              <Route path="/makeup-duties" component={MakeupDutiesQueuePage} />
              <Route path="/case-gaps" component={CaseGapsMatrixPage} />
              <Route path="/verifications" component={PendingVerificationsPage} />
              <Route path="/verifications/:id" component={ReviewVerificationPage} />
              <Route path="/announcements/manage"><PlaceholderPage title="Manage Announcements" /></Route>

              {/* Admin */}
              <Route path="/admin/users" component={AdminUsersPage} />
              <Route path="/admin/users/create" component={CreateUserPage} />
              <Route path="/admin/hospitals"><PlaceholderPage title="Manage Hospitals" /></Route>
              <Route path="/admin/hospitals/:id/departments"><PlaceholderPage title="Manage Departments" /></Route>
              <Route path="/admin/cases"><PlaceholderPage title="Clinical Cases Library" /></Route>
              <Route path="/admin/recommendation-weights"><PlaceholderPage title="Recommendation Weights" /></Route>
              <Route path="/admin/analytics" component={AdminAnalyticsPage} />
              <Route path="/admin/reports"><PlaceholderPage title="Generate Reports" /></Route>
              <Route path="/admin/audit"><PlaceholderPage title="Audit Logs" /></Route>
              <Route path="/admin/settings"><PlaceholderPage title="System Settings" /></Route>

              <Route component={NotFound} />
            </Switch>
          </AppShell>
        </ProtectedRoute>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
