import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, ArrowRight, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useAuth } from './AuthContext';
import { Button, Input, Card, CardBody, ErrorAlert, useToast } from '../../components/ui';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fromLocation = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  // If already logged in, redirect immediately
  if (isAuthenticated) {
    navigate(fromLocation, { replace: true });
  }

  const validate = (): boolean => {
    const errors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await login({
        email: email.trim().toLowerCase(),
        password,
      });
      toast.success('Signed in successfully.');
      navigate(fromLocation, { replace: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('demo-asha@rakshasphere.org');
    setPassword('SecurePassword123!');
    setFieldErrors({});
    setFormError(null);
    toast.info('Synthetic demo credentials filled. Ready to sign in.');
  };

  return (
    <div className="max-w-md mx-auto py-10 px-4 sm:px-0">
      <div className="text-center mb-8 space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white mx-auto shadow-md shadow-indigo-100">
          <Shield className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sign in to RakshaSphere</h1>
        <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
          Access your private incident records, encrypted evidence vault &amp; safety telemetry.
        </p>
      </div>

      <Card className="shadow-card border-slate-200/90">
        <CardBody className="p-6 sm:p-7">
          {formError && (
            <div className="mb-5">
              <ErrorAlert message={formError} onDismiss={() => setFormError(null)} />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              label="Email address"
              type="email"
              id="login-email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              error={fieldErrors.email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }}
              required
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="login-password"
              autoComplete="current-password"
              placeholder="••••••••••••"
              value={password}
              error={fieldErrors.password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 p-1 focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              required
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              size="lg"
              isLoading={isSubmitting}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In
            </Button>
          </form>

          {/* Synthetic Demo Helper (Development / Demo Environments Only) */}
          {(import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO === 'true') && (
            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    Quick Evaluation Demo
                  </span>
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-semibold">
                    Synthetic
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Use pre-configured synthetic persona <strong>Asha Verma</strong> with correlated incidents, case files, and consented contacts.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={handleFillDemo}
                  className="w-full text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                >
                  Auto-Fill Demo Credentials
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <p className="text-center text-xs text-slate-500 mt-6">
        Don't have an account?{' '}
        <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-700 underline">
          Create account
        </Link>
      </p>
    </div>
  );
}
