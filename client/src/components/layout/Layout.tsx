import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, FileText, PlusCircle, Users, Menu, X, WifiOff } from 'lucide-react';
import { ErrorBoundary } from '../ui/ErrorBoundary';

const navLinks = [
  { to: '/incidents', label: 'My Incidents', icon: FileText },
  { to: '/incidents/new', label: 'Report Incident', icon: PlusCircle },
  { to: '/check-ins', label: 'Safety Check-In', icon: Users },
];

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-sm">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-slate-900 tracking-tight">RakshaSphere</span>
            <span className="hidden sm:inline-block ml-2 px-1.5 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-800 rounded">
              Phase 7 Hardened
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                location.pathname.startsWith(to)
                  ? 'bg-rose-50 text-rose-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Mobile menu button */}
        <button
          className="sm:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="sm:hidden border-t border-slate-100 bg-white px-4 pb-4 pt-2 space-y-1">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                location.pathname.startsWith(to)
                  ? 'bg-rose-50 text-rose-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-5 mt-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
        <span>RakshaSphere © 2026 — Privacy-Conscious Safety Platform</span>
        <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-medium">
          Zero-Knowledge Vault • Tenant-Isolated Architecture
        </span>
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
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      {!isOnline && (
        <div className="bg-amber-500 text-white text-xs font-semibold py-2 px-4 text-center flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          <span>You are currently offline. Changes may not be saved until your connection is restored.</span>
        </div>
      )}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}
