import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Stethoscope, AlertCircle } from 'lucide-react';
import { useLogin } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

export function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const loginMutation = useLogin({
    mutation: {
      onSuccess: () => {
        // Clear any stale mock role so real session takes over
        localStorage.removeItem('mockRole');
        queryClient.invalidateQueries();
        setLocation('/dashboard');
      },
      onError: (err: { data?: { error?: string }; message?: string }) => {
        setError(err?.data?.error ?? err?.message ?? 'Login failed');
      },
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email) {
      setError('Email is required');
      return;
    }
    loginMutation.mutate({ data: { email, password } });
  };

  const fillCredential = (role: string) => {
    setEmail(`${role}@clinicalflow.com`);
    setPassword('password123');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="mb-8 flex items-center gap-3 text-primary font-bold text-3xl tracking-tight">
        <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
          <Stethoscope className="w-7 h-7" />
        </div>
        ClinicalFlow
      </div>

      <Card className="w-full max-w-md shadow-xl border-border/50">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Sign in to your account</CardTitle>
          <CardDescription>Enter your email and password to access the portal</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 text-base shadow-sm"
              disabled={loginMutation.isPending}
              data-testid="login-submit"
            >
              {loginMutation.isPending ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col bg-muted/50 p-6 border-t rounded-b-xl gap-3">
          <div className="text-sm font-medium text-muted-foreground w-full mb-1">Demo Credentials:</div>
          <div className="grid grid-cols-2 gap-2 w-full text-xs">
            <button
              type="button"
              onClick={() => fillCredential('student')}
              className="p-2 border bg-card rounded text-left hover:border-primary transition-colors"
              data-testid="cred-student"
            >
              <div className="font-semibold text-foreground">Student</div>
              <div className="text-muted-foreground">student@clinicalflow.com</div>
            </button>
            <button
              type="button"
              onClick={() => fillCredential('ci')}
              className="p-2 border bg-card rounded text-left hover:border-primary transition-colors"
              data-testid="cred-ci"
            >
              <div className="font-semibold text-foreground">Instructor</div>
              <div className="text-muted-foreground">ci@clinicalflow.com</div>
            </button>
            <button
              type="button"
              onClick={() => fillCredential('scheduler')}
              className="p-2 border bg-card rounded text-left hover:border-primary transition-colors"
              data-testid="cred-scheduler"
            >
              <div className="font-semibold text-foreground">Scheduler</div>
              <div className="text-muted-foreground">scheduler@clinicalflow.com</div>
            </button>
            <button
              type="button"
              onClick={() => fillCredential('admin')}
              className="p-2 border bg-card rounded text-left hover:border-primary transition-colors"
              data-testid="cred-admin"
            >
              <div className="font-semibold text-foreground">Admin</div>
              <div className="text-muted-foreground">admin@clinicalflow.com</div>
            </button>
          </div>
          <div className="text-xs text-muted-foreground text-center mt-2 w-full">
            Password: password123
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
