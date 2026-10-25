import { Link } from 'react-router-dom';
import {
  Shield,
  FileText,
  PlusCircle,
  Lock,
  Brain,
  Users,
  CheckCircle2,
  LayoutDashboard,
  ArrowRight,
  Fingerprint,
  Scale,
} from 'lucide-react';
import { Button, Card } from '../../components/ui';
import { useAuth } from '../auth/AuthContext';

export function HomePage() {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="space-y-10 py-2">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-slate-900 rounded-3xl text-white p-8 sm:p-12 lg:p-16 border border-slate-800 shadow-xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 text-xs font-semibold border border-indigo-400/20">
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span>Privacy-First Women's Safety &amp; Incident Response</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Understand digital threats.<br />
            Preserve evidence.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-sky-300">
              Take informed action.
            </span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            RakshaSphere helps survivors document online harassment, correlate cross-platform stalker rings with ThreatLink, and prepare tamper-evident legal dossiers with absolute zero-knowledge privacy.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link to="/dashboard">
              <Button size="lg" variant="primary" leftIcon={<LayoutDashboard className="w-4 h-4" />}>
                Safety Dashboard
              </Button>
            </Link>
            <Link to="/incidents/new">
              <Button
                size="lg"
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                leftIcon={<PlusCircle className="w-4 h-4" />}
              >
                Report Incident
              </Button>
            </Link>
            <Link to="/check-ins">
              <Button
                size="lg"
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                leftIcon={<Users className="w-4 h-4 text-sky-400" />}
              >
                Safety Check-In
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Dynamic Session Banner */}
      {isAuthenticated && user ? (
        <div className="flex items-center justify-between gap-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-emerald-950">
                Active Tenant Session: {user.name} ({user.email})
              </p>
              <p className="text-xs text-emerald-800 mt-0.5">
                All incident telemetry, encrypted evidence, and activity logs are strictly isolated to your user ID.
              </p>
            </div>
          </div>
          <Link to="/dashboard" className="hidden sm:block">
            <Button size="sm" variant="outline" className="border-emerald-300 text-emerald-900 bg-white">
              Open Dashboard
            </Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-subtle">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">
              <Lock className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900">Sign in for Private Safety Access</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Sign in or create an account to record incidents, store encrypted screenshots, and track cyber crime complaints.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
            <Link to="/login">
              <Button size="sm" variant="outline">
                Sign In
              </Button>
            </Link>
            <Link to="/register">
              <Button size="sm" variant="primary">
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Feature Pillars */}
      <div>
        <div className="mb-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Integrated Defense Subsystems
          </h2>
          <p className="text-xs text-slate-500">
            Engineered around zero-knowledge cryptography, cross-platform correlation, and victim agency.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card 1 */}
          <Card hoverable className="p-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Incident Intake &amp; Identifiers</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Log structured threats with cross-platform handles, phone numbers, and timeline metadata without exposing private identity.
              </p>
            </div>
            <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
              <Link to="/incidents" className="flex items-center gap-1 hover:text-indigo-700">
                <span>View Incidents</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>

          {/* Card 2 */}
          <Card hoverable className="p-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">ThreatLink Correlation Engine</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Automatically detects serial harassers who change handles between Instagram, WhatsApp, and Telegram by correlating digital identifiers.
              </p>
            </div>
            <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-rose-600">
              <Link to="/dashboard" className="flex items-center gap-1 hover:text-rose-700">
                <span>Threat Telemetry</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>

          {/* Card 3 */}
          <Card hoverable className="p-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Fingerprint className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Zero-Knowledge Evidence Vault</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Client-side AES-256-GCM encryption with SHA-256 tamper-evident checksums. Plaintext files never exist in database storage.
              </p>
            </div>
            <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-purple-600">
              <Link to="/incidents" className="flex items-center gap-1 hover:text-purple-700">
                <span>Secure Storage</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>

          {/* Card 4 */}
          <Card hoverable className="p-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <Scale className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Legal Complaints &amp; Case Pipeline</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Drafts formal cybercrime complaints referencing IT Act sections and tracks case filing status with official investigation PDF dossiers.
              </p>
            </div>
            <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-teal-600">
              <Link to="/incidents" className="flex items-center gap-1 hover:text-teal-700">
                <span>Case Pipeline</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>

          {/* Card 5 */}
          <Card hoverable className="p-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Consent-Driven Safety Check-Ins</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Dual-channel check-in system supporting manual WhatsApp/SMS intents and automated transactional email dispatch with strict recipient consent.
              </p>
            </div>
            <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-sky-600">
              <Link to="/check-ins" className="flex items-center gap-1 hover:text-sky-700">
                <span>Safety Check-In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>

          {/* Card 6 */}
          <Card hoverable className="p-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <Brain className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Deterministic Safety Indicators</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Pattern-based threat indicators with curated emergency playbooks, risk scoring, and verified emergency escalation contacts.
              </p>
            </div>
            <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700">
              <Link to="/dashboard" className="flex items-center gap-1 hover:text-slate-900">
                <span>Safety Analytics</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
