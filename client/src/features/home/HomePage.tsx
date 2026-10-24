import { Link } from 'react-router-dom';
import { Shield, FileText, PlusCircle, Lock, AlertTriangle, Brain, ClipboardList, Users } from 'lucide-react';
import { Button } from '../../components/ui';

export function HomePage() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="bg-gradient-to-br from-rose-900 to-slate-900 rounded-2xl text-white p-8 sm:p-10">
        <div className="max-w-xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-rose-200 text-xs border border-white/10">
            <Shield className="w-3.5 h-3.5" /> Privacy-first safety response platform
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Understand threats.<br />Preserve evidence.<br />Take informed action.
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            RakshaSphere helps you document harassment, correlate incidents, and access verified reporting channels — all with your privacy protected.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link to="/incidents/new">
              <Button size="lg" className="bg-rose-500 hover:bg-rose-400">
                <PlusCircle className="w-4 h-4" /> Report Incident
              </Button>
            </Link>
            <Link to="/incidents">
              <Button size="lg" variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-white/20">
                <FileText className="w-4 h-4" /> View My Incidents
              </Button>
            </Link>
            <Link to="/check-ins">
              <Button size="lg" variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-white/20">
                <Users className="w-4 h-4" /> Safety Check-In
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Limitation notice */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-amber-800">
          <span className="font-semibold">Development mode:</span> This instance uses demo authentication only.
          Incidents are isolated per demo user ID stored in session. Do not enter real personal information in this version.
        </p>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-2">
          <div className="p-2 bg-rose-50 w-fit rounded-lg"><FileText className="w-5 h-5 text-rose-600" /></div>
          <h3 className="font-semibold text-slate-900">Incident Intake</h3>
          <p className="text-xs text-slate-500 leading-relaxed">Record threats with structured details &amp; identifiers.</p>
          <span className="inline-block text-xs px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full font-medium">Phase 1 — Active</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-2">
          <div className="p-2 bg-rose-50 w-fit rounded-lg"><Shield className="w-5 h-5 text-rose-600" /></div>
          <h3 className="font-semibold text-slate-800">ThreatLink</h3>
          <p className="text-xs text-slate-500 leading-relaxed">Exact-match pattern correlation across own records.</p>
          <span className="inline-block text-xs px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full font-medium">Phase 2 — Active</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-2">
          <div className="p-2 bg-indigo-50 w-fit rounded-lg"><Brain className="w-5 h-5 text-indigo-600" /></div>
          <h3 className="font-semibold text-slate-800">Analysis &amp; Playbooks</h3>
          <p className="text-xs text-slate-500 leading-relaxed">Rule safety indicators, curated playbooks &amp; consented AI.</p>
          <span className="inline-block text-xs px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full font-medium">Phase 3 — Active</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-2">
          <div className="p-2 bg-indigo-50 w-fit rounded-lg"><Lock className="w-5 h-5 text-indigo-600" /></div>
          <h3 className="font-semibold text-slate-800">Evidence Vault</h3>
          <p className="text-xs text-slate-500 leading-relaxed">Store tamper-evident encrypted evidence with SHA-256.</p>
          <span className="inline-block text-xs px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full font-medium">Phase 4 — Active</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-2">
          <div className="p-2 bg-teal-50 w-fit rounded-lg"><ClipboardList className="w-5 h-5 text-teal-700" /></div>
          <h3 className="font-semibold text-slate-800">Action Center</h3>
          <p className="text-xs text-slate-500 leading-relaxed">Verified reporting directories, complaint drafts &amp; case tracking.</p>
          <span className="inline-block text-xs px-2 py-0.5 bg-teal-100 text-teal-800 rounded-full font-medium">Phase 5 — Active</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-2">
          <div className="p-2 bg-sky-50 w-fit rounded-lg"><Users className="w-5 h-5 text-sky-700" /></div>
          <h3 className="font-semibold text-slate-800">Safety Check-In</h3>
          <p className="text-xs text-slate-500 leading-relaxed">Consent-based trusted contacts, prepared check-in messages &amp; optional location snapshot.</p>
          <span className="inline-block text-xs px-2 py-0.5 bg-sky-100 text-sky-800 rounded-full font-medium">Phase 6 — Active</span>
        </div>
      </div>
    </div>
  );
}
