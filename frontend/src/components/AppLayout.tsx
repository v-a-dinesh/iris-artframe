import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';
import ThemeToggle from './ui/ThemeToggle';
import {
  IconDashboard,
  IconDevices,
  IconGallery,
  IconAdmin,
  IconLogout,
} from './icons';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', Icon: IconDashboard },
  { to: '/devices', label: 'Devices', Icon: IconDevices },
  { to: '/gallery', label: 'Gallery', Icon: IconGallery },
];

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const allNavItems = [
    ...navItems,
    ...(isAdmin ? [{ to: '/admin', label: 'Admin', Icon: IconAdmin }] : []),
  ];

  return (
    <div className="app-shell bg-texture">
      <div className="pointer-events-none fixed inset-0 hidden bg-mesh-gradient-dark dark:block" />

      {/* Desktop sidebar */}
      <aside className="app-sidebar">
        <div className="border-b p-6" style={{ borderColor: 'var(--app-border)' }}>
          <Logo size="md" linkTo="/dashboard" />
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {allNavItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => (isActive ? 'nav-link-active' : 'nav-link')}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t p-4" style={{ borderColor: 'var(--app-border)' }}>
          <div
            className="mb-3 rounded-xl border p-4"
            style={{ backgroundColor: 'var(--app-surface-muted)', borderColor: 'var(--app-border)' }}
          >
            <p className="text-sm font-semibold text-heading">{user?.name}</p>
            <p className="mt-0.5 truncate text-xs text-muted">{user?.email}</p>
            {isAdmin && (
              <span className="mt-2 inline-block rounded-md bg-gold-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:bg-gold-400/15 dark:text-gold-300">
                Admin
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle showLabel className="flex-1 justify-start px-4" />
            <button
              onClick={handleLogout}
              className="nav-link flex-1 justify-start text-muted hover:text-red-600 dark:hover:text-red-300"
            >
              <IconLogout className="h-5 w-5" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="app-header-mobile">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <Logo size="sm" linkTo="/dashboard" />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button onClick={handleLogout} className="btn-ghost p-2" aria-label="Sign out">
              <IconLogout className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="relative lg:pl-72">
        <div className="page-container animate-fade-in">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="app-nav-mobile">
        <div className="flex justify-around px-2 py-2">
          {allNavItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium uppercase tracking-wider transition-all sm:px-4 ${
                  isActive ? 'text-accent-iris' : 'text-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`rounded-xl p-2 transition-all ${
                      isActive ? 'bg-iris-500/15 text-icon-iris shadow-glow' : ''
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="truncate">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
