interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const isOnline = status === 'active';
  const label = isOnline ? 'Online' : 'Offline';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
        isOnline
          ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
          : 'bg-ink-200/80 text-ink-600 ring-1 ring-ink-300/80 dark:bg-ink-700/80 dark:text-ink-300 dark:ring-ink-600/50'
      }`}
      title={isOnline ? 'Frame is connected' : 'Frame not connected — hardware has not reported dynamic IP recently'}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-ink-400'}`} />
      {label}
    </span>
  );
}
