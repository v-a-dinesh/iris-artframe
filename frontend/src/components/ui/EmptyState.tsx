import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="card flex flex-col items-center py-16 text-center animate-fade-in">
      {icon && (
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-iris-500/10 text-icon-iris ring-1 ring-iris-500/20">
          {icon}
        </div>
      )}
      <h3 className="font-display text-2xl font-semibold text-heading">{title}</h3>
      <p className="mt-2 max-w-sm text-body">{description}</p>
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}
