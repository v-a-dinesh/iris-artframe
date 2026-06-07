import { useState, type FormEvent } from 'react';
import AuthLayout, { AuthLink } from '../components/AuthLayout';
import PasswordInput from '../components/ui/PasswordInput';
import { useAuth } from '../context/AuthContext';
import { getSavedLoginEmail, saveLoginEmail, useAutofillSync } from '../hooks/useAutofillSync';
import { redirectAfterLogin, tryStoreLoginCredential } from '../utils/saveLoginCredential';
import axios from 'axios';

export default function LoginPage() {
  const [email, setEmail] = useState(getSavedLoginEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  useAutofillSync([
    { id: 'login-email', setValue: setEmail },
    { id: 'login-password', setValue: setPassword },
  ]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const trimmedEmail = email.trim();
    const loginPassword = password;

    try {
      await login(trimmedEmail, loginPassword);
      saveLoginEmail(trimmedEmail);

      // Explicit save prompt (required for React SPAs — client-side navigate alone won't trigger Chrome).
      await tryStoreLoginCredential(trimmedEmail, loginPassword);

      // Full page load so Chrome's built-in password manager also recognizes success.
      redirectAfterLogin('/dashboard');
      return;
    } catch (err) {
      const message = axios.isAxiosError(err) ? err.response?.data?.message : 'Login failed';
      setError(message || 'Login failed');
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your Iris Art Frame account">
      <form
        onSubmit={handleSubmit}
        className="space-y-5"
        autoComplete="on"
        method="post"
        action="/login"
        name="login"
      >
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
