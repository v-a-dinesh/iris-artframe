import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { IconDevices } from '../components/icons';
import { imagesApi, devicesApi } from '../api/client';
import type { Device, Image } from '../types';
import axios from 'axios';

export default function ImageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [image, setImage] = useState<Image | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [displaying, setDisplaying] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([imagesApi.get(id!), devicesApi.list()])
      .then(([img, dev]) => {
        setImage(img.data.image);
        setDevices(dev.data.devices);
        if (dev.data.devices.length > 0) setSelectedDevice(dev.data.devices[0].id);
      })
      .catch(() => setError('Image not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDisplay = async () => {
    if (!selectedDevice || !id) return;
    setDisplaying(true);
    setError('');
    setMessage('');
    try {
      const res = await devicesApi.display(selectedDevice, id);
      setMessage(res.data.message || 'Display job queued successfully');
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : 'Failed to queue display';
      setError(msg || 'Failed to queue display');
    } finally {
      setDisplaying(false);
    }
  };

  const copyLink = () => {
    if (!image) return;
    navigator.clipboard.writeText(image.public_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!id || !confirm('Delete this artwork permanently?')) return;
    await imagesApi.remove(id);
    window.location.href = '/gallery';
  };

  if (loading) {
    return (
      <AppLayout>
        <LoadingSpinner />
      </AppLayout>
    );
  }

  if (!image) {
    return (
      <AppLayout>
        <div className="alert-error text-center">{error || 'Artwork not found'}</div>
        <Link to="/gallery" className="btn-secondary mt-4 inline-flex">
          Back to gallery
        </Link>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card ring-1 ring-iris-500/10 dark:border-ink-700/50 dark:bg-ink-900/50">
            <img
              src={image.public_url}
              alt={image.original_filename}
              className="w-full object-contain"
            />
          </div>
        </div>

        <div className="space-y-5 lg:col-span-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-accent-gold">Artwork</p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-heading">
              {image.original_filename}
            </h1>
            <p className="mt-2 text-sm text-muted">
              Added {new Date(image.created_at).toLocaleString()} ·{' '}
              {(image.file_size / 1024).toFixed(0)} KB
            </p>
          </div>

          <div className="card">
            <p className="label mb-0">Public link</p>
            <p className="mb-3 text-xs text-subtle">Share or use for device display</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input readOnly className="input-field min-w-0 flex-1 text-xs" value={image.public_url} />
              <button onClick={copyLink} className="btn-secondary shrink-0 px-4 sm:w-auto">
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {devices.length > 0 ? (
            <div className="card border-iris-500/20 shadow-glow">
              <p className="label mb-0">Display on frame</p>
              <p className="mb-4 text-xs text-subtle">Push this artwork to your E-Ink display</p>
              <select
                className="input-field"
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
              >
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name || d.device_id}
                  </option>
                ))}
              </select>
              <button onClick={handleDisplay} className="btn-primary mt-4 w-full" disabled={displaying}>
                {displaying ? 'Sending to frame...' : 'Display on frame'}
              </button>
              {message && <div className="alert-success mt-4">{message}</div>}
              {error && <div className="alert-error mt-4">{error}</div>}
            </div>
          ) : (
            <div className="card flex items-start gap-4">
              <div className="rounded-xl bg-iris-500/15 p-3 text-iris-400">
                <IconDevices className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium text-heading">No frame connected</p>
                <p className="mt-1 text-sm text-muted">
                  Link a device first to display this artwork.
                </p>
                <Link to="/devices/add" className="btn-secondary mt-4 inline-flex text-sm">
                  Connect device
                </Link>
              </div>
            </div>
          )}

          <button onClick={handleDelete} className="btn-danger w-full">
            Delete artwork
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
