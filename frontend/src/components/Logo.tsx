import { Link } from 'react-router-dom';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  linkTo?: string;
  className?: string;
  variant?: 'default' | 'on-dark';
}

const sizes = {
  sm: { icon: 32, title: 'text-base', subtitle: 'text-[10px]' },
  md: { icon: 40, title: 'text-lg', subtitle: 'text-xs' },
  lg: { icon: 56, title: 'text-2xl', subtitle: 'text-sm' },
};

function LogoMark({ size }: { size: number }) {
  const gradientId = `logo-${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden="true" className="rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/10">
      <defs>
        <linearGradient id={`${gradientId}-iris`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
        <linearGradient id={`${gradientId}-gold`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f5e6c8" />
          <stop offset="100%" stopColor="#d4af37" />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="104" height="104" rx="20" stroke={`url(#${gradientId}-gold)`} strokeWidth="3" fill="var(--logo-bg, #ffffff)" />
      <rect x="18" y="18" width="84" height="84" rx="12" stroke={`url(#${gradientId}-iris)`} strokeWidth="2" fill="none" opacity="0.6" />
      <path d="M60 32 C48 42 42 52 42 60 C42 68 48 78 60 88 C72 78 78 68 78 60 C78 52 72 42 60 32Z" fill={`url(#${gradientId}-iris)`} opacity="0.9" />
      <path d="M60 38 C54 44 50 52 50 60 C50 68 54 76 60 82 C66 76 70 68 70 60 C70 52 66 44 60 38Z" fill="var(--logo-inner, #f0f0f8)" />
      <circle cx="60" cy="60" r="6" fill={`url(#${gradientId}-gold)`} />
      <path d="M60 24 L62 34 L60 32 L58 34 Z" fill={`url(#${gradientId}-iris)`} />
      <path d="M36 60 L46 58 L44 60 L46 62 Z" fill={`url(#${gradientId}-iris)`} opacity="0.7" />
      <path d="M84 60 L74 62 L76 60 L74 58 Z" fill={`url(#${gradientId}-iris)`} opacity="0.7" />
    </svg>
  );
}

export default function Logo({ size = 'md', showText = true, linkTo, className = '', variant = 'default' }: LogoProps) {
  const s = sizes[size];
  const titleClass = variant === 'on-dark' ? 'text-white' : 'text-heading font-semibold';
  const subtitleClass = variant === 'on-dark' ? 'text-gold-300' : 'text-accent-gold';

  const content = (
    <div className={`flex items-center gap-3 ${className}`}>
      <LogoMark size={s.icon} />
      {showText && (
        <div className="leading-tight">
          <div className={`font-display tracking-wide ${titleClass} ${s.title}`}>
            Iris
          </div>
          <div className={`font-sans font-medium uppercase tracking-[0.2em] ${subtitleClass} ${s.subtitle}`}>
            Art Frame
          </div>
        </div>
      )}
    </div>
  );

  if (linkTo) {
    return (
      <Link to={linkTo} className="transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
