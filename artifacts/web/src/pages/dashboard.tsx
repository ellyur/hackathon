import { useAuth } from '@/hooks/use-auth';
import { Redirect } from 'wouter';
import { StudentDashboard } from './student-dashboard';
import { CIDashboard } from './ci-dashboard';
import { SchedulerDashboard } from './scheduler-dashboard';
import { AdminDashboard } from './admin-dashboard';

export function Dashboard() {
  const { user } = useAuth();

  if (!user) {
    return <Redirect to="/login" />;
  }

  switch (user.role) {
    case 'student':
      return <StudentDashboard />;
    case 'ci':
      return <CIDashboard />;
    case 'scheduler':
      return <SchedulerDashboard />;
    case 'admin':
      return <AdminDashboard />;
    default:
      return <div>Unknown role</div>;
  }
}
