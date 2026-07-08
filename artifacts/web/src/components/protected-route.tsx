import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  // When not authenticated, perform a hard navigation to /login.
  // A hard navigation (window.location.replace) works even inside
  // Canvas iframe previews where the History API may be restricted,
  // preventing the previously-blank white page.
  useEffect(() => {
    if (!isLoading && !user) {
      window.location.replace('/login');
    }
  }, [isLoading, user]);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    // Show a spinner while the hard navigation takes effect
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}
