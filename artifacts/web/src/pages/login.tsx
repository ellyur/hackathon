import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertCircle, Mail, Lock } from 'lucide-react';
import { useLogin } from '@workspace/api-client-react';
import { setAuthTokenGetter } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

export function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        if (data.token) {
          localStorage.setItem('authToken', data.token);
          setAuthTokenGetter(() => localStorage.getItem('authToken'));
        }
        localStorage.setItem('authUser', JSON.stringify(data));
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

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel — decorative navy brand panel ── */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, hsl(217 67% 20%) 0%, hsl(217 67% 32%) 100%)' }}
      >
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white -translate-x-1/2 translate-y-1/2" />
        </div>

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-4">
          <img
            src="/sipag-logo.png"
            alt="SIPAG"
            className="w-14 h-14 rounded-2xl object-contain shadow-xl ring-2 ring-white/20"
          />
          <div>
            <div className="text-3xl font-bold tracking-wide leading-none">SIPAG</div>
            <div className="text-white/60 text-xs font-medium tracking-widest uppercase mt-1">
              Smart Integrated Platform
            </div>
          </div>
        </div>

        {/* Hero copy */}
        <div className="relative space-y-6">
          <div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight">
              Empowering
              <br />
              <span style={{ color: 'hsl(32 93% 60%)' }}>Clinical Education</span>
              <br />
              Excellence
            </h1>
            <p className="mt-4 text-white/65 text-base leading-relaxed max-w-sm">
              A modern platform built for nursing schools, clinical instructors, and hospitals — managing rotations, attendance, and academic progress in one place.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2">
            {['Face Verification', 'GPS Attendance', 'Clinical Passport', 'Smart Scheduling'].map((f) => (
              <span
                key={f}
                className="px-3 py-1 rounded-full text-xs font-medium border border-white/20 text-white/80 bg-white/5"
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <div className="relative text-white/35 text-xs">
          © {new Date().getFullYear()} SIPAG · Smart Integrated Platform for Academic and Clinical Scheduling
        </div>
      </div>

      {/* ── Right panel — login form ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 bg-background">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <img src="/sipag-logo.png" alt="SIPAG" className="w-11 h-11 rounded-xl object-contain shadow" />
          <div>
            <div className="text-2xl font-bold" style={{ color: 'hsl(217 67% 27%)' }}>SIPAG</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
              Smart Integrated Platform
            </div>
          </div>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Sign in to your account</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Enter your credentials to access the portal
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="flex items-start gap-3 text-sm text-destructive bg-destructive/8 border border-destructive/20 rounded-xl p-3.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@institution.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  className="pl-10 h-11 rounded-xl border-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="pl-10 h-11 rounded-xl border-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all"
              disabled={loginMutation.isPending}
              data-testid="login-submit"
            >
              {loginMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Having trouble signing in?{' '}
            <a href="mailto:support@sipag.edu" className="text-primary hover:underline font-medium">
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
