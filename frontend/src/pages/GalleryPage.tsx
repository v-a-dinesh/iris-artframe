import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import PageHeader from '../components/ui/PageHeader';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import { IconGallery, IconUpload } from '../components/icons';
import { imagesApi } from '../api/client';
import type { Image } from '../types';

export default function GalleryPage() {
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    imagesApi.list().then((res) => setImages(res.data.images)).finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <PageHeader
        title="Gallery"
        subtitle={`${images.length} artwork${images.length !== 1 ? 's' : ''} in your collection`}
        action={
          <Link to="/gallery/upload" className="btn-primary w-full sm:w-auto">
            <IconUpload className="h-4 w-4" />
            Upload
          </Link>
        }
      />

      {loading ? (
        <LoadingSpinner />
      ) : images.length === 0 ? (
        <EmptyState
          icon={<IconGallery className="h-10 w-10" />}
          title="Your gallery is empty"
          description="Upload JPG or PNG artwork to display on your Iris Art Frames."
          action={
            <Link to="/gallery/upload" className="btn-primary">
              <IconUpload className="h-4 w-4" />
              Upload first artwork
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img, i) => (
            <Link
              key={img.id}
              to={`/gallery/${img.id}`}
              className="gallery-item group animate-slide-up"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <img src={img.public_url} alt={img.original_filename} />
              <div className="gallery-overlay" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-ink-950 to-transparent p-4">
                <p className="truncate text-sm font-medium text-white">{img.original_filename}</p>
                <p className="mt-0.5 text-xs text-ink-400">
                  {(img.file_size / 1024).toFixed(0)} KB
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
