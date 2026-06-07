import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout, { AuthLink } from '../components/AuthLayout';
import PasswordInput from '../components/ui/PasswordInput';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Remove legacy app-side email cache — Chrome manages saved logins.
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
      navigate('/dashboard');
    } catch (err) {
      const message = axios.isAxiosError(err) ? err.response?.data?.message : 'Login failed';
      setError(message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your Iris Art Frame account">
      <form onSubmit={handleSubmit} className="space-y-5" autoComplete="on">
        {error && <div className="alert-error">{error}</div>}
        <div>
          <label className="label" htmlFor="login-email">
            Email address
          </label>
          <input
            id="login-email"
            name="username"
            type="text"
            inputMode="email"
            className="input-field"
            placeholder="you@example.com"
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
          <PasswordInput
            id="login-password"
            name="password"
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />
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
