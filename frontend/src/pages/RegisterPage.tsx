import { useState, type FormEvent, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout, { AuthLink } from '../components/AuthLayout';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import type { RegisterForm } from '../types';

export default function RegisterPage() {
  const [form, setForm] = useState<RegisterForm>({ name: '', email: '', password: '', mobile: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      const message = axios.isAxiosError(err) ? err.response?.data?.message : 'Registration failed';
      setError(message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Create account" subtitle="Start curating art for your digital frames">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <div className="alert-error">{error}</div>}
        <div>
          <label className="label">Full name</label>
          <input name="name" className="input-field" value={form.name} onChange={handleChange} placeholder="Jane Doe" required />
        </div>
        <div>
          <label className="label">Email address</label>
          <input name="email" type="email" className="input-field" value={form.email} onChange={handleChange} placeholder="you@example.com" required />
        </div>
        <div>
          <label className="label">Mobile <span className="text-subtle">(optional)</span></label>
          <input name="mobile" type="tel" className="input-field" value={form.mobile} onChange={handleChange} placeholder="+91 98765 43210" />
        </div>
        <div>
          <label className="label">Password</label>
          <input name="password" type="password" className="input-field" value={form.password} onChange={handleChange} placeholder="Min. 6 characters" required minLength={6} />
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
