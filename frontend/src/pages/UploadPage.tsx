import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import PageHeader from '../components/ui/PageHeader';
import { IconUpload } from '../components/icons';
import { imagesApi } from '../api/client';
import axios from 'axios';

const ALLOWED_UPLOAD_TYPES = ['image/jpeg', 'image/png'];

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFile = (f: File | undefined) => {
    if (!f) return;
    if (!ALLOWED_UPLOAD_TYPES.includes(f.type)) {
      setError('Please select a JPG, JPEG, or PNG image');
      return;
    }
    const ext = f.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? '';
    if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
      setError('Please select a JPG, JPEG, or PNG image');
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError('');
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const res = await imagesApi.upload(file, (e) => {
        if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
      });
      navigate(`/gallery/${res.data.image.id}`);
    } catch (err) {
      const message = axios.isAxiosError(err) ? err.response?.data?.message : 'Upload failed';
      setError(message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader title="Upload Artwork" subtitle="JPG, JPEG, or PNG · Max 10MB" />

      <div className="mx-auto max-w-xl">
        <div
          className={`card cursor-pointer border-2 border-dashed text-center transition-all duration-300 ${
            dragging
              ? 'border-iris-400 bg-iris-500/10 shadow-glow'
              : 'border-ink-300 hover:border-iris-400/50 hover:bg-ink-100/50 dark:border-ink-600/60 dark:hover:border-iris-500/40 dark:hover:bg-ink-800/30'
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleFile(e.target.files?.[0])}
          />

          {preview ? (
            <div className="relative mx-auto max-w-sm overflow-hidden rounded-xl ring-1 ring-ink-600/50">
              <img src={preview} alt="Preview" className="max-h-72 w-full object-contain" />
            </div>
          ) : (
            <div className="py-16">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-iris-500/15 text-iris-400 ring-1 ring-iris-500/20">
                <IconUpload className="h-10 w-10" />
              </div>
              <p className="font-display text-xl font-semibold text-heading">
                Drop your artwork here
              </p>
              <p className="mt-2 text-sm text-muted">or click to browse files</p>
            </div>
          )}
        </div>

        {file && (
          <div className="mt-4 flex flex-col gap-3 rounded-xl bg-ink-100 px-4 py-3 ring-1 ring-ink-200 dark:bg-ink-900/60 dark:ring-ink-700/50 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-heading">{file.name}</p>
              <p className="text-xs text-muted">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                setPreview(null);
              }}
              className="btn-ghost self-start text-xs text-muted sm:self-auto"
            >
              Remove
            </button>
          </div>
        )}

        {error && <div className="alert-error mt-4">{error}</div>}

        {loading && (
          <div className="mt-6">
            <div className="flex justify-between text-xs text-muted">
              <span>Uploading...</span>
              <span>{progress}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-iris-600 to-iris-400 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <button
          onClick={handleUpload}
          className="btn-primary mt-8 w-full"
          disabled={!file || loading}
        >
          {loading ? 'Uploading...' : 'Upload to gallery'}
        </button>
      </div>
    </AppLayout>
  );
}
