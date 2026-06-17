import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import AppLayout from '../components/AppLayout';
import PageHeader from '../components/ui/PageHeader';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import StatusBadge from '../components/ui/StatusBadge';
import PrintLabel from '../components/PrintLabel';
import DeviceEditForm, { deviceToEditValues, type DeviceEditValues } from '../components/DeviceEditForm';
import { IconAdmin, IconQr } from '../components/icons';
import { adminApi } from '../api/client';
import type { Device, ProvisionResult } from '../types';
import axios from 'axios';

export default function AdminPage() {
  const [mac, setMac] = useState('');
  const [name, setName] = useState('');
  const [staticIp, setStaticIp] = useState('');
  const [devices, setDevices] = useState<Device[]>([]);
  const [result, setResult] = useState<ProvisionResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<DeviceEditValues>({
    name: '',
    dynamic_ip: '',
    wifi_name: '',
    status: 'inactive',
  });
  const [adminSaveError, setAdminSaveError] = useState('');
  const [adminSaving, setAdminSaving] = useState(false);

  const loadDevices = () => {
    setListLoading(true);
    adminApi
      .listDevices()
      .then((res) => setDevices(res.data.devices))
      .finally(() => setListLoading(false));
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const handleProvision = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const res = await adminApi.provision({ 
        mac, 
        name: name || undefined,
        static_ip: staticIp,
      });
      setResult(res.data);
      setMac('');
      setName('');
      setStaticIp('');
      loadDevices();
    } catch (err) {
      const message = axios.isAxiosError(err) ? err.response?.data?.message : 'Provisioning failed';
      setError(message || 'Provisioning failed');
    } finally {
      setLoading(false);
    }
  };

  const handleReprintQr = async (deviceId: string) => {
    try {
      const res = await adminApi.getQr(deviceId);
      setResult(res.data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const message = axios.isAxiosError(err) ? err.response?.data?.message : 'Failed to generate QR';
      setError(message || 'Failed to generate QR');
    }
  };

  const startAdminEdit = (device: Device) => {
    setEditingId(device.id);
    setEditValues(deviceToEditValues(device));
    setAdminSaveError('');
  };

  const handleAdminSave = async (deviceId: string) => {
    setAdminSaveError('');
    setAdminSaving(true);
    try {
      await adminApi.updateDevice(deviceId, {
        name: editValues.name.trim() || undefined,
        dynamic_ip: editValues.dynamic_ip.trim() || null,
        wifi_name: editValues.wifi_name.trim() || null,
        status: editValues.status as 'active' | 'inactive',
      });
      setEditingId(null);
      loadDevices();
    } catch (err) {
      const message = axios.isAxiosError(err) ? err.response?.data?.message : 'Failed to update device';
      setAdminSaveError(message || 'Failed to update device');
    } finally {
      setAdminSaving(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Device Provisioning"
        subtitle="Register frames by MAC address and generate printable QR labels"
        action={
          <span className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold-400/20 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-800 ring-1 ring-gold-400/30 dark:bg-gold-400/15 dark:text-gold-300 sm:w-auto">
            <IconAdmin className="h-4 w-4" />
            Admin
          </span>
        }
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <form onSubmit={handleProvision} className="card space-y-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-iris-500/15 p-3 text-iris-400">
              <IconQr className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-heading">Provision new device</h2>
              <p className="text-sm text-muted">Enter MAC address and static IP to generate the QR label</p>
            </div>
          </div>

          {error && <div className="alert-error">{error}</div>}

          <div>
            <label className="label">MAC address</label>
            <input
              className="input-field font-mono"
              value={mac}
              onChange={(e) => setMac(e.target.value)}
              placeholder="B8:27:EB:12:34:56"
              required
            />
            <p className="mt-2 text-xs text-subtle">AA:BB:CC:DD:EE:FF or AABBCCDDEEFF</p>
          </div>

          <div>
            <label className="label">
              Label name <span className="text-subtle">(optional)</span>
            </label>
            <input
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Frame #001"
            />
          </div>

          <div>
            <label className="label">Static IP</label>
            <input
              className="input-field font-mono"
              value={staticIp}
              onChange={(e) => setStaticIp(e.target.value)}
              placeholder="192.168.1.100"
              type="text"
              required
            />
            <p className="mt-1 text-xs text-subtle">Unique IP assigned at provisioning — stored in QR and never changes</p>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Generating...' : 'Generate QR label'}
          </button>
        </form>

        {result && (
          <div className="card border-gold-400/20 shadow-glow-gold">
            <h2 className="no-print font-display text-xl font-semibold text-heading">Printable label</h2>
            <p className="no-print mt-1 text-sm text-muted">
              Preview — attach to the physical frame after printing. In the print dialog, set{' '}
              <strong>Margins: None</strong> and turn off <strong>Headers and footers</strong>.
            </p>

            <div className="mt-6 print-label-preview">
              <PrintLabel
                mac={result.device?.mac ?? result.device?.device_id ?? ''}
                deviceName={result.device?.name}
                staticIp={result.device?.static_ip}
                qrDataUrl={result.qr_data_url}
              />
            </div>

            {createPortal(
              <div id="print-label-portal">
                <PrintLabel
                  mac={result.device?.mac ?? result.device?.device_id ?? ''}
                  deviceName={result.device?.name}
                  staticIp={result.device?.static_ip}
                  qrDataUrl={result.qr_data_url}
                />
              </div>,
              document.body
            )}

            <button type="button" onClick={() => window.print()} className="btn-primary no-print mt-5 w-full">
              Print label
            </button>
          </div>
        )}
      </div>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-heading">All provisioned devices</h2>
        <p className="mt-1 text-sm text-muted">{devices.length} device(s) registered</p>

        {listLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="card mt-6 overflow-hidden p-0">
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <table className="min-w-[640px] w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-200 bg-ink-100/80 text-left text-xs uppercase tracking-wider text-muted dark:border-ink-700/50 dark:bg-ink-800/40">
                    <th className="px-4 py-4 font-semibold sm:px-6">MAC address</th>
                    <th className="px-4 py-4 font-semibold sm:px-6">Name</th>
                    <th className="px-4 py-4 font-semibold sm:px-6">Network</th>
                    <th className="px-4 py-4 font-semibold sm:px-6">WiFi</th>
                    <th className="px-4 py-4 font-semibold sm:px-6">Status</th>
                    <th className="px-4 py-4 font-semibold sm:px-6">Owners</th>
                    <th className="px-4 py-4 font-semibold sm:px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-200 dark:divide-ink-800/50">
                  {devices.map((d) => (
                    <tr key={d.id} className="transition-colors hover:bg-ink-100/80 dark:hover:bg-ink-800/30">
                      <td className="px-4 py-4 font-mono text-iris-600 dark:text-iris-300 sm:px-6">{d.device_id}</td>
                      <td className="px-4 py-4 text-body sm:px-6">{d.name || '—'}</td>
                      <td className="px-4 py-4 sm:px-6">
                        <div className="space-y-1 text-xs text-muted">
                          <div>Static: {d.static_ip || '—'}</div>
                          <div>Dynamic: {d.dynamic_ip || '—'}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-body sm:px-6">{d.wifi_name || '—'}</td>
                      <td className="px-4 py-4 sm:px-6">
                        <StatusBadge status={d.status} />
                      </td>
                      <td className="px-4 py-4 text-muted sm:px-6">{d.owner_count ?? 0}</td>
                      <td className="px-4 py-4 sm:px-6">
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => startAdminEdit(d)}
                            className="text-left font-medium text-iris-600 transition-colors hover:text-iris-500 dark:text-iris-400 dark:hover:text-iris-300"
                          >
                            Edit device
                          </button>
                          <button
                            onClick={() => handleReprintQr(d.id)}
                            className="text-left font-medium text-iris-600 transition-colors hover:text-iris-500 dark:text-iris-400 dark:hover:text-iris-300"
                          >
                            Reprint QR
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card max-h-[90vh] w-full max-w-md overflow-y-auto">
            <h3 className="font-display text-lg font-semibold text-heading">Edit device</h3>
            <p className="mt-1 text-sm text-muted">Update name, network details, and status</p>
            <div className="mt-5">
              <DeviceEditForm
                values={editValues}
                onChange={setEditValues}
                onSave={() => handleAdminSave(editingId)}
                onCancel={() => setEditingId(null)}
                saving={adminSaving}
                error={adminSaveError}
              />
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
