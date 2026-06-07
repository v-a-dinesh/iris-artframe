import { useState, useCallback, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import PageHeader from '../components/ui/PageHeader';
import QRScanner from '../components/QRScanner';
import { IconQr } from '../components/icons';
import { devicesApi } from '../api/client';
import axios from 'axios';

function parseDeviceId(raw: string): string {
  const trimmed = raw.trim();
  try {
    const parsed = JSON.parse(trimmed) as { device_id?: string };
    if (parsed.device_id) return parsed.device_id;
  } catch {
    // not JSON
  }
  const urlMatch = trimmed.match(/device_id=([A-Za-z0-9-]+)/);
  if (urlMatch) return urlMatch[1].toUpperCase();
  const irisMatch = trimmed.match(/IRIS-[A-F0-9]{12}/i);
  if (irisMatch) return irisMatch[0].toUpperCase();
  if (/^IRIS-[A-F0-9]{12}$/i.test(trimmed)) return trimmed.toUpperCase();
  throw new Error('Could not parse device ID');
}

export default function AddDevicePage() {
  const [deviceId, setDeviceId] = useState('');
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleScan = useCallback((text: string) => {
    try {
      const id = parseDeviceId(text);
      setDeviceId(id);
      setSuccess(`Scanned successfully: ${id}`);
      setError('');
    } catch {
      setError('Invalid QR code. Try manual entry.');
    }
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await devicesApi.register({ device_id: deviceId, name: name || undefined });
      navigate('/devices');
    } catch (err) {
      const message = axios.isAxiosError(err) ? err.response?.data?.message : 'Registration failed';
      setError(message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Connect a Frame"
        subtitle="Scan the QR label on your Iris Art Frame to link it"
      />

      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex gap-2 rounded-xl bg-ink-200/70 p-1 ring-1 ring-ink-300/60 dark:bg-ink-900/60 dark:ring-ink-700/50">
          {(['scan', 'manual'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                mode === m
                  ? 'bg-gradient-to-r from-iris-600 to-iris-500 text-white shadow-glow'
                  : 'text-muted hover:text-heading'
              }`}
            >
              {m === 'scan' ? 'Scan QR' : 'Manual entry'}
            </button>
          ))}
        </div>

        {mode === 'scan' && (
          <div className="card mb-6 overflow-hidden p-0">
            <div className="border-b px-4 py-3" style={{ borderColor: 'var(--app-border)', backgroundColor: 'var(--app-surface-muted)' }}>
              <p className="flex items-center gap-2 text-sm text-body">
                <IconQr className="h-4 w-4 text-icon-iris" />
                Point your camera at the frame label
              </p>
            </div>
            <div className="p-2">
              <QRScanner
                key="device-qr-scanner"
                onScan={handleScan}
                onError={(message) => setError(message || 'Could not access camera')}
              />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="card space-y-5">
          {error && <div className="alert-error">{error}</div>}
          {success && <div className="alert-success">{success}</div>}

          <div>
            <label className="label">Device ID</label>
            <input
              className="input-field font-mono"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value.toUpperCase())}
              placeholder="IRIS-B827EB123456"
              required
            />
          </div>
          <div>
            <label className="label">
              Nickname <span className="text-subtle">(optional)</span>
            </label>
            <input
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Living Room Frame"
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading || !deviceId}>
            {loading ? 'Connecting...' : 'Connect device'}
          </button>
        </form>
      </div>
    </AppLayout>
  );
}
