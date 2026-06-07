import { useEffect, useState, type FormEvent } from 'react';
import AuthLayout, { AuthLink } from '../components/AuthLayout';
import { IconEye, IconEyeOff } from '../components/icons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();

  useEffect(() => {
    localStorage.removeItem('iris-login-email');
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const form = e.currentTarget;
    const email = (form.elements.namedItem('username') as HTMLInputElement).value.trim();
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;

    try {
      await login(email, password);
      // Full page redirect so Chrome detects successful login and shows "Save password?"
      window.location.href = '/dashboard';
    } catch (err) {
      const message = axios.isAxiosError(err) ? err.response?.data?.message : 'Login failed';
      setError(message || 'Login failed');
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your Iris Art Frame account">
      <form
        id="login-form"
        name="login"
        onSubmit={handleSubmit}
        className="space-y-5"
        autoComplete="on"
        method="post"
        action="/login"
      >
        {error && <div className="alert-error">{error}</div>}

        <div>
          <label className="label" htmlFor="login-username">
            Email
          </label>
          <input
            id="login-username"
            name="username"
            type="text"
            className="input-field"
            placeholder="Enter your email"
            required
            autoComplete="username"
            spellCheck={false}
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="label mb-0" htmlFor="login-password">
              Password
            </label>
            <AuthLink to="/forgot-password" className="text-xs">
              Forgot password?
            </AuthLink>
          </div>
          <div className="relative">
            <input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              className="input-field pr-11"
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted transition-colors hover:text-heading focus:outline-none focus-visible:ring-2 focus-visible:ring-iris-500"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <IconEyeOff className="h-5 w-5" /> : <IconEye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        New to Iris Art Frame? <AuthLink to="/register">Create an account</AuthLink>
      </p>
    </AuthLayout>
  );
}
