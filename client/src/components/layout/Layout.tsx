import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Shield,
  FileText,
  PlusCircle,
  Users,
  Menu,
  X,
  WifiOff,
  LogOut,
  LogIn,
  User as UserIcon,
  LayoutDashboard,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { useAuth } from '../../features/auth/AuthContext';
import { Button } from '../ui';

const navLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/incidents', label: 'My Incidents', icon: FileText },
  { to: '/incidents/new', label: 'Report Incident', icon: PlusCircle },
  { to: '/check-ins', label: 'Safety Check-In', icon: Users },
  { to: '/activity', label: 'Activity Log', icon: Activity },
];

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Security Pill */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 group-hover:bg-indigo-700 transition-colors flex items-center justify-center text-white shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 tracking-tight text-base leading-none">
                RakshaSphere
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase pt-0.5">
                Safety &amp; Response
              </span>
            </div>
          </Link>

          <div className="hidden lg:flex items-center gap-1.5 ml-2 px-2.5 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Client-Side Encrypted Vault</span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
          {navLinks.map(({ to, label, icon: Icon }) => {
            const isActive =
              to === '/incidents'
                ? location.pathname === '/incidents'
                : location.pathname.startsWith(to);

            return (
              <Link
                key={to}
                to={to}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150
                  ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-bold shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }
                `}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Desktop Auth Controls */}
        <div className="hidden sm:flex items-center gap-2.5">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div
                className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg font-medium"
                title={`Signed in as ${user.email}`}
              >
                <UserIcon className="w-3.5 h-3.5 text-indigo-600" />
                <span className="max-w-[130px] truncate">{user.name || user.email}</span>
                {user.isEmailVerified && (
                  <span title="Verified email" className="inline-flex items-center ml-0.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  </span>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-xs text-slate-600 hover:text-rose-700 hover:bg-rose-50 border-slate-200"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="outline" size="sm" className="text-xs">
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm" variant="primary" className="text-xs">
                  <span>Register</span>
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white/95 backdrop-blur-md px-4 pb-4 pt-3 space-y-2 shadow-lg animate-fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Navigation
            </span>
            <span className="px-2 py-0.5 text-[10px] bg-emerald-50 text-emerald-700 font-medium rounded-full border border-emerald-200">
              Encrypted
            </span>
          </div>

          <div className="space-y-1">
            {navLinks.map(({ to, label, icon: Icon }) => {
              const isActive =
                to === '/incidents'
                  ? location.pathname === '/incidents'
                  : location.pathname.startsWith(to);

              return (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMenuOpen(false)}
                  className={`
                    flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition
                    ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 font-bold'
                        : 'text-slate-600 hover:bg-slate-100'
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>

          {/* Mobile Auth Controls */}
          <div className="pt-3 border-t border-slate-100">
            {isAuthenticated && user ? (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-medium truncate">
                    <UserIcon className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                    <span className="truncate">{user.name} ({user.email})</span>
                  </div>
                  {user.isEmailVerified && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-semibold">
                      Verified
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-1">
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
                >
                  <span>Create Account</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200/90 bg-white py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
            <Shield className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">RakshaSphere Platform © 2026</p>
            <p className="text-[11px] text-slate-400">
              Client-Side Encrypted Evidence Vault • Forensic Integrity Checksums
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="text-[11px] bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5" title="Direct national emergency helplines. RakshaSphere is a safety-tech documentation platform and does not dispatch emergency services.">
            <span>Direct Helplines:</span>
            <a href="tel:112" className="text-rose-900 underline hover:text-rose-950 font-bold">112 (Police)</a>
            <span>•</span>
            <a href="tel:1930" className="text-rose-900 underline hover:text-rose-950 font-bold">1930 (Cyber Crime)</a>
          </div>
          <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-lg text-[11px] font-medium">
            Multi-Tenant Isolated Architecture
          </span>
        </div>
      </div>
    </footer>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70 antialiased selection:bg-indigo-500 selection:text-white">
      <Header />
      {!isOnline && (
        <div
          role="status"
          className="bg-amber-600 text-white text-xs font-medium py-2 px-4 text-center flex items-center justify-center gap-2 shadow-xs"
        >
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          <span>You are currently offline. Changes may not be saved until your connection is restored.</span>
        </div>
      )}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}
