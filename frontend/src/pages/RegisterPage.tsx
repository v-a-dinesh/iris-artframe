import { useState, type FormEvent, type ChangeEvent } from 'react';
import AuthLayout, { AuthLink } from '../components/AuthLayout';
import PasswordInput from '../components/ui/PasswordInput';
import { useAuth } from '../context/AuthContext';
import { saveLoginEmail } from '../hooks/useAutofillSync';
import { redirectAfterLogin, tryStoreLoginCredential } from '../utils/saveLoginCredential';
import axios from 'axios';
import type { RegisterForm } from '../types';

export default function RegisterPage() {
  const [form, setForm] = useState<RegisterForm>({ name: '', email: '', password: '', mobile: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      const email = form.email.trim();
      saveLoginEmail(email);
      await tryStoreLoginCredential(email, form.password);
      redirectAfterLogin('/dashboard');
      return;
    } catch (err) {
      const message = axios.isAxiosError(err) ? err.response?.data?.message : 'Registration failed';
      setError(message || 'Registration failed');
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Create account" subtitle="Start curating art for your digital frames">
      <form onSubmit={handleSubmit} className="space-y-5" autoComplete="on">
        {error && <div className="alert-error">{error}</div>}
        <div>
          <label className="label" htmlFor="register-name">Full name</label>
          <input id="register-name" name="name" className="input-field" value={form.name} onChange={handleChange} placeholder="Jane Doe" required autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="register-email">Email address</label>
          <input id="register-email" name="email" type="email" className="input-field" value={form.email} onChange={handleChange} placeholder="you@example.com" required autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="register-mobile">Mobile <span className="text-subtle">(optional)</span></label>
          <input id="register-mobile" name="mobile" type="tel" className="input-field" value={form.mobile} onChange={handleChange} placeholder="+91 98765 43210" autoComplete="tel" />
        </div>
        <div>
          <label className="label" htmlFor="register-password">Password</label>
          <PasswordInput
            id="register-password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Min. 6 characters"
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account? <AuthLink to="/login">Sign in</AuthLink>
      </p>
    </AuthLayout>
  );
}
