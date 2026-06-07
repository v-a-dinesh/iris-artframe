import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import PageHeader from '../components/ui/PageHeader';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { IconDevices, IconGallery, IconPlus, IconUpload } from '../components/icons';
import { devicesApi, imagesApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Device, Image } from '../types';

export default function DashboardPage() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([devicesApi.list(), imagesApi.list()])
      .then(([d, i]) => {
        setDevices(d.data.devices);
        setImages(i.data.images);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <LoadingSpinner label="Loading your gallery..." />
      </AppLayout>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <AppLayout>
      <PageHeader
        title={`${greeting}, ${user?.name?.split(' ')[0] || 'Artist'}`}
        subtitle="Your curated E-Ink gallery at a glance"
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div className="rounded-xl bg-iris-500/15 p-3 text-icon-iris ring-1 ring-iris-500/25">
              <IconDevices className="h-6 w-6" />
            </div>
            <span className="text-xs font-medium uppercase tracking-wider text-muted">Frames</span>
          </div>
          <p className="mt-6 font-sans text-5xl font-semibold tabular-nums text-heading">{devices.length}</p>
          <p className="mt-1 text-sm text-muted">Registered devices</p>
          <Link to="/devices/add" className="btn-secondary mt-6 w-full text-center">
            <IconPlus className="h-4 w-4" />
            Add device
          </Link>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div className="rounded-xl bg-gold-400/20 p-3 text-icon-gold ring-1 ring-gold-400/30">
              <IconGallery className="h-6 w-6" />
            </div>
            <span className="text-xs font-medium uppercase tracking-wider text-muted">Artworks</span>
          </div>
          <p className="mt-6 font-sans text-5xl font-semibold tabular-nums text-heading">{images.length}</p>
          <p className="mt-1 text-sm text-muted">Uploaded images</p>
          <Link to="/gallery/upload" className="btn-primary mt-6 w-full text-center">
            <IconUpload className="h-4 w-4" />
            Upload artwork
          </Link>
        </div>

        <div className="stat-card sm:col-span-2 xl:col-span-1">
          <p className="text-xs font-medium uppercase tracking-wider text-accent-gold">Quick access</p>
          <p className="mt-2 font-display text-xl font-semibold text-heading">Jump back in</p>
          <div className="mt-6 flex flex-col gap-3">
            <Link to="/devices" className="btn-secondary justify-start">
              <IconDevices className="h-4 w-4" />
              Manage devices
            </Link>
            <Link to="/gallery" className="btn-secondary justify-start">
              <IconGallery className="h-4 w-4" />
              Browse gallery
            </Link>
          </div>
        </div>
      </div>

      {images.length > 0 && (
        <section className="mt-12 animate-slide-up">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold text-heading">Recent artwork</h2>
              <p className="text-sm text-muted">Latest additions to your collection</p>
            </div>
            <Link to="/gallery" className="btn-ghost text-accent-iris">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {images.slice(0, 4).map((img) => (
              <Link key={img.id} to={`/gallery/${img.id}`} className="gallery-item group">
                <img src={img.public_url} alt={img.original_filename} />
                <div className="gallery-overlay" />
                <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 transition-opacity group-hover:opacity-100">
                  <p className="truncate text-xs font-medium text-white">{img.original_filename}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </AppLayout>
  );
}
