import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { DevRoleSwitcher } from '@/components/dev-role-switcher';
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

const queryClient = new QueryClient();

// Scaffold for missing pages
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
              <Route path="/settings/profile"><PlaceholderPage title="Profile Settings" /></Route>

              {/* Student */}
              <Route path="/schedule"><PlaceholderPage title="My Schedule" /></Route>
              <Route path="/schedule/:id" component={TimeInSimulatorPage} />
              <Route path="/passport" component={ClinicalPassportPage} />
              <Route path="/passport/submit" component={SubmitCasePage} />
              <Route path="/attendance"><PlaceholderPage title="Attendance History" /></Route>
              <Route path="/slots" component={AvailableSlotsPage} />
              <Route path="/slots/my-applications"><PlaceholderPage title="My Applications" /></Route>

              {/* CI */}
              <Route path="/duties"><PlaceholderPage title="My Duties" /></Route>
              <Route path="/duties/:id/attendance" component={AttendanceRosterPage} />
              <Route path="/duties/:id/verify"><PlaceholderPage title="Verify Student Case" /></Route>

              {/* Scheduler */}
              <Route path="/schedules" component={MasterSchedulePage} />
              <Route path="/schedules/create"><PlaceholderPage title="Create Schedule" /></Route>
              <Route path="/schedules/:id/edit"><PlaceholderPage title="Edit Schedule" /></Route>
              <Route path="/schedules/:id/recommendations"><PlaceholderPage title="Student Recommendations" /></Route>
              <Route path="/students"><PlaceholderPage title="Student Roster" /></Route>
              <Route path="/students/:id"><PlaceholderPage title="Student Profile" /></Route>
              <Route path="/slots/create"><PlaceholderPage title="Create Slot" /></Route>
              <Route path="/slots/:id/applications"><PlaceholderPage title="Slot Applications" /></Route>
              <Route path="/makeup-duties"><PlaceholderPage title="Makeup Duties Queue" /></Route>
              <Route path="/case-gaps"><PlaceholderPage title="Case Gaps Matrix" /></Route>
              <Route path="/verifications"><PlaceholderPage title="Pending Verifications" /></Route>
              <Route path="/verifications/:id"><PlaceholderPage title="Review Verification" /></Route>
              <Route path="/announcements/manage"><PlaceholderPage title="Manage Announcements" /></Route>

              {/* Admin */}
              <Route path="/admin/users" component={AdminUsersPage} />
              <Route path="/admin/users/create"><PlaceholderPage title="Create User" /></Route>
              <Route path="/admin/hospitals"><PlaceholderPage title="Manage Hospitals" /></Route>
              <Route path="/admin/hospitals/:id/departments"><PlaceholderPage title="Manage Departments" /></Route>
              <Route path="/admin/cases"><PlaceholderPage title="Clinical Cases Library" /></Route>
              <Route path="/admin/recommendation-weights"><PlaceholderPage title="Recommendation Weights" /></Route>
              <Route path="/admin/analytics"><PlaceholderPage title="Full Analytics" /></Route>
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
          <DevRoleSwitcher />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
