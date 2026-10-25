import { useNavigate } from 'react-router-dom';
import { PlatformType, IncidentType, CaseStatus } from '@rakshasphere/shared';
import { Layers, ShieldAlert, CheckCircle, Scale } from 'lucide-react';

interface CategoryDistributionChartProps {
  byPlatform: Record<PlatformType, number>;
  byIncidentType: Record<IncidentType, number>;
  byCaseStatus: Record<CaseStatus, number>;
}

const PLATFORM_LABELS: Record<string, string> = {
  INSTAGRAM: 'Instagram',
  WHATSAPP: 'WhatsApp',
  TELEGRAM: 'Telegram',
  TWITTER_X: 'X (Twitter)',
  FACEBOOK: 'Facebook',
  SMS: 'SMS',
  EMAIL: 'Email',
  OTHER: 'Other Platforms',
};

const INCIDENT_TYPE_LABELS: Record<string, string> = {
  HARASSMENT: 'Harassment',
  DOXXING: 'Doxxing / Info Exposure',
  IMPERSONATION: 'Impersonation',
  BLACKMAIL: 'Blackmail / Extortion',
  STALKING: 'Cyberstalking',
  FINANCIAL_SCAM: 'Financial Scam',
  OTHER: 'Other Incidents',
};

export function CategoryDistributionChart({
  byPlatform,
  byIncidentType,
  byCaseStatus,
}: CategoryDistributionChartProps) {
  const navigate = useNavigate();

  const totalPlatformIncidents = Object.values(byPlatform).reduce((a, b) => a + b, 0);
  const totalTypeIncidents = Object.values(byIncidentType).reduce((a, b) => a + b, 0);
  const totalCases = Object.values(byCaseStatus).reduce((a, b) => a + b, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Platform Distribution Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3 text-xs">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" /> By Channel / Platform
            </span>
            <span className="text-slate-400 font-mono text-[11px]">
              {totalPlatformIncidents} total
            </span>
          </div>

          <div className="space-y-2.5">
            {Object.entries(byPlatform)
              .filter(([_, count]) => count > 0)
              .map(([platform, count]) => {
                const pct =
                  totalPlatformIncidents > 0
                    ? Math.round((count / totalPlatformIncidents) * 100)
                    : 0;
                return (
                  <div
                    key={platform}
                    onClick={() => navigate('/incidents')}
                    className="group cursor-pointer text-xs space-y-1 hover:opacity-80 transition"
                  >
                    <div className="flex justify-between text-slate-700">
                      <span className="font-medium group-hover:text-rose-600">
                        {PLATFORM_LABELS[platform] || platform}
                      </span>
                      <span className="text-slate-500 font-mono">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}

            {totalPlatformIncidents === 0 && (
              <p className="text-xs text-slate-400 italic py-6 text-center">
                No platform records to display.
              </p>
            )}
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-4 border-t border-slate-100 pt-2">
          Click any platform row to view related incident records.
        </p>
      </div>

      {/* Incident Type Breakdown */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3 text-xs">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" /> Harassment Modality
            </span>
            <span className="text-slate-400 font-mono text-[11px]">{totalTypeIncidents} total</span>
          </div>

          <div className="space-y-2.5">
            {Object.entries(byIncidentType)
              .filter(([_, count]) => count > 0)
              .map(([type, count]) => {
                const pct =
                  totalTypeIncidents > 0 ? Math.round((count / totalTypeIncidents) * 100) : 0;
                const isHighRisk = ['BLACKMAIL', 'STALKING', 'DOXXING'].includes(type);
                return (
                  <div
                    key={type}
                    onClick={() => navigate('/incidents')}
                    className="group cursor-pointer text-xs space-y-1 hover:opacity-80 transition"
                  >
                    <div className="flex justify-between text-slate-700">
                      <span className="font-medium group-hover:text-rose-600 flex items-center gap-1">
                        {INCIDENT_TYPE_LABELS[type] || type}
                        {isHighRisk && (
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
                        )}
                      </span>
                      <span className="text-slate-500 font-mono">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          isHighRisk ? 'bg-rose-600' : 'bg-slate-700'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}

            {totalTypeIncidents === 0 && (
              <p className="text-xs text-slate-400 italic py-6 text-center">
                No incident classifications recorded.
              </p>
            )}
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-4 border-t border-slate-100 pt-2 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" /> High-risk extortion
          &amp; exposure indicators highlighted.
        </p>
      </div>

      {/* Case Resolution Status Funnel */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3 text-xs">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-teal-600" /> Legal Case Tracking Pipeline
            </span>
            <span className="text-slate-400 font-mono text-[11px]">{totalCases} tracked</span>
          </div>

          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-100 rounded-lg text-xs">
              <span className="font-medium text-slate-700">Filed / Reported</span>
              <span className="font-mono font-bold text-slate-900">
                {byCaseStatus['REPORTED'] || 0}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-900">
              <span className="font-medium">Under Review by Authorities</span>
              <span className="font-mono font-bold">{byCaseStatus['UNDER_REVIEW'] || 0}</span>
            </div>

            <div className="flex items-center justify-between p-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-900">
              <span className="font-medium">Active Investigation / In Progress</span>
              <span className="font-mono font-bold">{byCaseStatus['IN_PROGRESS'] || 0}</span>
            </div>

            <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-xs text-emerald-900">
              <span className="font-medium flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Resolved / Closed
              </span>
              <span className="font-mono font-bold">
                {(byCaseStatus['RESOLVED'] || 0) + (byCaseStatus['CLOSED'] || 0)}
              </span>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-slate-400 mt-4 border-t border-slate-100 pt-2">
          Tracking official portals (NCCRP, NCW, State Cyber Cells).
        </p>
      </div>
    </div>
  );
}
