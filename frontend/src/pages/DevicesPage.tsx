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

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    devicesApi.list().then((res) => setDevices(res.data.devices)).finally(() => setLoading(false));
  }, []);

  const handleRemove = async (id: string) => {
    if (!confirm('Unregister this device from your account?')) return;
    await devicesApi.remove(id);
    setDevices((prev) => prev.filter((d) => d.id !== id));
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

              {device.status !== 'active' && (
                <p className="mt-4 text-xs leading-relaxed text-muted">
                  Linked to your account. The frame will show Online once the Pi is running the poll client with its
                  API key.
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
