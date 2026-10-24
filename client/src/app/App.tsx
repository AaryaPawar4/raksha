import { useState, useEffect } from 'react';
import { Shield, Activity, Lock, AlertTriangle, CheckCircle2, Server, ArrowRight } from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { HealthCheckData } from '@rakshasphere/shared';

export function App() {
  const [health, setHealth] = useState<HealthCheckData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getHealth();
      setHealth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to backend server');
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-md shadow-rose-200">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900">RakshaSphere</span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-xs font-medium bg-rose-100 text-rose-800 rounded-full">
                Phase 0 Setup
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            <Lock className="w-3.5 h-3.5 text-slate-600" />
            <span>Client-side Privacy Protected</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="bg-gradient-to-r from-rose-900 to-slate-900 rounded-2xl text-white p-8 sm:p-10 shadow-xl relative overflow-hidden">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-200 text-xs font-medium border border-rose-400/20">
              <span>Privacy-conscious women&apos;s safety response platform</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Actionable threat correlation, evidence preservation &amp; safety response.
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              RakshaSphere helps users evaluate digital threats, link repeated harassment incidents with exact identifiers,
              preserve tamper-evident evidence in an encrypted vault, and access verified complaint reporting channels.
            </p>
          </div>
        </div>

        {/* System Health Status Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Backend API Connectivity</h2>
                <p className="text-xs text-slate-500">Monitored through standardized GET /health contract</p>
              </div>
            </div>
            <button
              onClick={fetchHealth}
              disabled={loading}
              className="inline-flex items-center justify-center space-x-2 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition disabled:opacity-50"
            >
              <Activity className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Checking...' : 'Check Connection'}</span>
            </button>
          </div>

          <div className="mt-4">
            {loading ? (
              <div className="flex items-center space-x-2 text-slate-500 text-sm py-2">
                <Activity className="w-4 h-4 animate-spin text-rose-600" />
                <span>Contacting backend at standard endpoint...</span>
              </div>
            ) : health ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg text-sm">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium">Backend is online and responding via standardized envelope!</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-400 block font-medium">Service</span>
                    <span className="text-slate-800 font-mono font-semibold">{health.service}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Version</span>
                    <span className="text-slate-800 font-mono font-semibold">{health.version}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Environment</span>
                    <span className="text-slate-800 font-mono font-semibold">{health.environment}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Timestamp</span>
                    <span className="text-slate-800 font-mono text-[11px] truncate block">{health.timestamp}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start space-x-2 text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2.5 rounded-lg text-sm">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
                <div>
                  <span className="font-semibold block">Cannot connect to backend server</span>
                  <span className="text-xs text-amber-700 block mt-0.5">{error}</span>
                  <span className="text-xs text-slate-500 block mt-1">
                    Ensure the backend is running via <code className="bg-amber-100 px-1 py-0.5 rounded">npm run dev:server</code>.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Phase Architecture Roadmap */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 mb-1">Architecture &amp; Implementation Phases</h2>
          <p className="text-xs text-slate-500 mb-4">Phased execution adhering to approved RakshaSphere specifications</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-rose-200 bg-rose-50/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Phase 0 • Active</span>
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              </div>
              <h3 className="font-semibold text-slate-900 text-sm">Alignment &amp; Setup</h3>
              <p className="text-xs text-slate-600 mt-1">
                Monorepo skeleton, React + Express, MVC structure, health check endpoint, environment validation.
              </p>
            </div>

            <div className="border border-slate-200 bg-slate-50/50 rounded-lg p-4 opacity-75">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Phase 1 • Pending</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <h3 className="font-semibold text-slate-900 text-sm">Intake &amp; Error Handling</h3>
              <p className="text-xs text-slate-600 mt-1">
                Secure incident intake form, strict request validation, ownership boundaries, and empty/loading states.
              </p>
            </div>

            <div className="border border-slate-200 bg-slate-50/50 rounded-lg p-4 opacity-75">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Phase 2 • Pending</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <h3 className="font-semibold text-slate-900 text-sm">ThreatLink Correlation</h3>
              <p className="text-xs text-slate-600 mt-1">
                Identifier normalization, exact-match graph linking across user&apos;s own records, and explainable edges.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span>RakshaSphere © 2026 — Privacy-Conscious Women&apos;s Safety Platform</span>
          <div className="flex items-center space-x-4">
            <span>MVC Layered Architecture</span>
            <span>•</span>
            <span>Zero Unconsented Tracking</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
