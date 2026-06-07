import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout, { AuthLink } from '../components/AuthLayout';
import { authApi } from '../api/client';
import axios from 'axios';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.resetPassword({
        email: email.trim(),
        new_password: newPassword,
      });
      setSuccess(res.data.message || 'Password updated. You can sign in now.');
    } catch (err) {
      const message = axios.isAxiosError(err) ? err.response?.data?.message : 'Password reset failed';
      setError(message || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Reset password" subtitle="Set a new password for your account">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <div className="alert-error">{error}</div>}
        {success && (
          <div className="alert-success">
            {success}{' '}
            <AuthLink to="/login" className="underline">
              Sign in
            </AuthLink>
          </div>
        )}

        <div>
          <label className="label">Email address</label>
          <input
            type="email"
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </div>
        <div>
          <label className="label">New password</label>
          <input
            type="password"
            className="input-field"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Min. 6 characters"
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="label">Confirm password</label>
          <input
            type="password"
            className="input-field"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat new password"
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading || !!success}>
          {loading ? 'Updating...' : 'Update password'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Remembered it?{' '}
        <Link to="/login" className="font-semibold text-iris-600 hover:text-iris-500 dark:text-iris-400">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
