import { useState } from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Stethoscope, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';
import { useForgotPassword } from '@workspace/api-client-react';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  const forgotPasswordMutation = useForgotPassword({
    mutation: {
      onSuccess: (data) => {
        setSubmittedMessage(data.message);
        setResetToken(data.resetToken ?? null);
      },
      onError: (err: { data?: { error?: string }; message?: string }) => {
        setError(err?.data?.error ?? err?.message ?? 'Something went wrong');
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email) {
      setError('Email is required');
      return;
    }
    forgotPasswordMutation.mutate({ data: { email } });
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
          <CardTitle className="text-2xl font-bold tracking-tight">Forgot your password?</CardTitle>
          <CardDescription>Enter your account email and we'll issue a reset link</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {submittedMessage ? (
            <div className="space-y-4">
              <div className="flex items-start gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{submittedMessage}</span>
              </div>
              {resetToken && (
                <div className="space-y-2 text-sm bg-muted/50 border rounded-lg p-3">
                  <p className="text-muted-foreground">
                    No email provider is connected yet, so here's your reset link directly:
                  </p>
                  <Link
                    href={`/reset-password?token=${resetToken}`}
                    className="inline-flex items-center gap-1.5 font-medium text-primary underline break-all"
                    data-testid="reset-link"
                  >
                    <KeyRound className="w-3.5 h-3.5 shrink-0" />
                    Reset my password
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
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
              <Button
                type="submit"
                className="w-full h-11 text-base shadow-sm"
                disabled={forgotPasswordMutation.isPending}
                data-testid="forgot-password-submit"
              >
                {forgotPasswordMutation.isPending ? 'Sending…' : 'Send reset link'}
              </Button>
            </form>
          )}

          <div className="text-center text-sm text-muted-foreground pt-2">
            <Link href="/login" className="underline hover:text-foreground">
              Back to sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
