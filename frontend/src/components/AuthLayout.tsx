import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';
import ThemeToggle from './ui/ThemeToggle';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="bg-texture relative flex min-h-screen">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 overflow-hidden bg-auth-gradient lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute inset-0 bg-mesh-gradient-dark" />
        <div className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-iris-600/20 blur-3xl animate-float" />
        <div className="pointer-events-none absolute -right-16 bottom-1/4 h-64 w-64 rounded-full bg-gold-400/10 blur-3xl animate-pulse-soft" />

        <div className="relative z-10">
          <Logo size="lg" linkTo="/login" variant="on-dark" />
        </div>

        <div className="relative z-10 max-w-md animate-slide-up">
          <h2 className="font-display text-5xl font-light leading-tight text-white">
            Curate art.
            <br />
            <span className="gradient-text font-semibold">Frame your world.</span>
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-ink-300">
            Iris Art Frame connects your digital gallery to stunning E-Ink displays — upload,
            share, and showcase with elegance.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4">
            {[
              { label: 'Upload', desc: 'JPG & PNG' },
              { label: 'Connect', desc: 'QR pairing' },
              { label: 'Display', desc: 'Instant push' },
            ].map((item) => (
              <div key={item.label} className="glass-panel border-white/10 bg-white/5 p-4 text-center">
                <p className="text-sm font-semibold text-gold-300">{item.label}</p>
                <p className="mt-1 text-xs text-ink-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-ink-500">
          © {new Date().getFullYear()} Iris Art Frame · Premium E-Ink Experience
        </p>
      </div>

      {/* Form panel */}
      <div className="relative flex w-full flex-col items-center justify-center px-4 py-12 sm:px-6 lg:w-1/2" style={{ backgroundColor: 'var(--app-bg)', color: 'var(--app-text)' }}>
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>

        <div className="mb-8 lg:hidden">
          <Logo size="md" />
        </div>

        <div className="w-full max-w-md animate-slide-up">
          <div className="card border-iris-500/10 shadow-glow">
            <h2 className="font-display text-3xl font-semibold text-heading">{title}</h2>
            {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
            <div className="mt-8">{children}</div>
          </div>

          <p className="mt-6 text-center text-xs text-subtle">
            By continuing, you agree to our terms of service
          </p>
        </div>
      </div>
    </div>
  );
}

export function AuthLink({ to, children, className = '' }: { to: string; children: ReactNode; className?: string }) {
  return (
    <Link to={to} className={`font-semibold text-iris-600 transition-colors hover:text-iris-500 dark:text-iris-400 dark:hover:text-iris-300 ${className}`}>
      {children}
    </Link>
  );
}
