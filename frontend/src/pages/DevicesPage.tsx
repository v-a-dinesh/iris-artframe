import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import PageHeader from '../components/ui/PageHeader';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import StatusBadge from '../components/ui/StatusBadge';
import { IconDevices, IconPlus, IconQr } from '../components/icons';
import { devicesApi } from '../api/client';
import type { Device } from '../types';
import axios from 'axios';

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dynamicIpInput, setDynamicIpInput] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadDevices = () => {
    setLoading(true);
    devicesApi
      .list()
      .then((res) => setDevices(res.data.devices))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const handleRemove = async (id: string) => {
    if (!confirm('Unregister this device from your account?')) return;
    await devicesApi.remove(id);
    setDevices((prev) => prev.filter((d) => d.id !== id));
  };

  const startEditDynamicIp = (device: Device) => {
    setEditingId(device.id);
    setDynamicIpInput(device.dynamic_ip || '');
    setSaveError('');
  };

  const handleSaveDynamicIp = async (deviceId: string) => {
    setSaveError('');
    setSaving(true);
    try {
      const res = await devicesApi.update(deviceId, { dynamic_ip: dynamicIpInput.trim() });
      setDevices((prev) => prev.map((d) => (d.id === deviceId ? res.data.device : d)));
      setEditingId(null);
      setDynamicIpInput('');
    } catch (err) {
      const message = axios.isAxiosError(err) ? err.response?.data?.message : 'Failed to update IP';
      setSaveError(message || 'Failed to update IP');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="My Devices"
        subtitle="E-Ink frames linked to your account"
        action={
          <Link to="/devices/add" className="btn-primary">
            <IconPlus className="h-4 w-4" />
            Add device
          </Link>
        }
      />

      {loading ? (
        <LoadingSpinner />
      ) : devices.length === 0 ? (
        <EmptyState
          icon={<IconDevices className="h-10 w-10" />}
          title="No frames yet"
          description="Scan the QR label on your Iris Art Frame to connect it to your account."
          action={
            <Link to="/devices/add" className="btn-primary">
              <IconQr className="h-4 w-4" />
              Scan QR code
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {devices.map((device) => (
            <div key={device.id} className="card-interactive group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-iris-600/30 to-iris-500/10 ring-1 ring-iris-500/20">
                    <IconDevices className="h-7 w-7 text-icon-iris" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-semibold text-heading">
                      {device.name || 'Unnamed Frame'}
                    </h3>
                    <p className="mt-1 font-mono text-xs text-accent-iris">{device.device_id}</p>
                  </div>
                </div>
                <StatusBadge status={device.status} />
              </div>

              <div className="mt-4 space-y-2 rounded-xl border border-ink-200/80 bg-ink-50/50 p-3 dark:border-ink-700/50 dark:bg-ink-900/30">
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Static IP</span>
                  <span className="font-mono text-body">{device.static_ip || '—'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Dynamic IP</span>
                  <span className="font-mono text-body">{device.dynamic_ip || '—'}</span>
                </div>
                {device.dynamic_ip_updated_at && (
                  <p className="text-xs text-subtle">
                    Dynamic IP updated {new Date(device.dynamic_ip_updated_at).toLocaleString()}
                  </p>
                )}
              </div>

              {editingId === device.id ? (
                <div className="mt-4 space-y-2">
                  <label className="label">Update dynamic IP manually</label>
                  <input
                    className="input-field font-mono text-sm"
                    value={dynamicIpInput}
                    onChange={(e) => setDynamicIpInput(e.target.value)}
                    placeholder="192.168.1.105"
                  />
                  {saveError && <p className="text-xs text-red-400">{saveError}</p>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn-primary flex-1 text-sm"
                      disabled={saving || !dynamicIpInput.trim()}
                      onClick={() => handleSaveDynamicIp(device.id)}
                    >
                      {saving ? 'Saving...' : 'Save dynamic IP'}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary text-sm"
                      onClick={() => {
                        setEditingId(null);
                        setSaveError('');
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => startEditDynamicIp(device)}
                  className="mt-4 text-xs font-medium text-iris-600 hover:text-iris-500 dark:text-iris-400"
                >
                  Update dynamic IP manually
                </button>
              )}

              {device.status !== 'active' && (
                <p className="mt-3 text-xs leading-relaxed text-muted">
                  Frame shows Online after the hardware reports its dynamic IP via the device API.
                </p>
              )}

              <div className="mt-6 flex items-center justify-between border-t border-ink-700/50 pt-4">
                <p className="text-xs text-muted">
                  Linked{' '}
                  {device.registered_at
                    ? new Date(device.registered_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '—'}
                </p>
                <button
                  onClick={() => handleRemove(device.id)}
                  className="text-xs font-medium text-red-400/80 transition-colors hover:text-red-300"
                >
                  Unregister
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
