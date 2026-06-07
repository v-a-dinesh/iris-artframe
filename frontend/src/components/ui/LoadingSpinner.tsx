interface LoadingSpinnerProps {
  label?: string;
  fullPage?: boolean;
}

export default function LoadingSpinner({ label = 'Loading...', fullPage }: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${fullPage ? 'min-h-[50vh]' : 'py-20'}`}>
      <div className="relative">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-ink-600 border-t-iris-400" />
        <div className="absolute inset-0 h-12 w-12 animate-pulse-soft rounded-full bg-iris-500/20 blur-md" />
      </div>
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}
