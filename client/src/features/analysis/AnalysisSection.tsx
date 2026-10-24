import { useState, useEffect, useCallback } from 'react';
import {
  Brain,
  Shield,
  AlertTriangle,
  ExternalLink,
  CheckCircle,
  HelpCircle,
  Sparkles,
  Lock,
  PhoneCall,
  RefreshCw,
} from 'lucide-react';
import { apiClient, ApiError } from '../../services/apiClient';
import {
  ThreatAnalysisResponse,
  SeverityLevel,
  SafetyIndicator,
} from '@rakshasphere/shared';
import { Card, CardHeader, CardBody, Button, LoadingSpinner, ErrorAlert } from '../../components/ui';

interface AnalysisSectionProps {
  incidentId: string;
}

const SEVERITY_BADGES: Record<SeverityLevel, { label: string; style: string }> = {
  CRITICAL: { label: 'Critical Risk', style: 'bg-red-100 text-red-800 border-red-200' },
  HIGH: { label: 'High Priority', style: 'bg-rose-100 text-rose-800 border-rose-200' },
  MEDIUM: { label: 'Moderate Concern', style: 'bg-amber-100 text-amber-800 border-amber-200' },
  LOW: { label: 'Low Severity', style: 'bg-blue-100 text-blue-800 border-blue-200' },
};

export function AnalysisSection({ incidentId }: AnalysisSectionProps) {
  const [analysis, setAnalysis] = useState<ThreatAnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);

  // Initial rule-based analysis (consent: false)
  const runRuleAnalysis = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.incidents.analyze(incidentId, {
        consentToAiProcessing: false,
      });
      setAnalysis(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        setError('Cannot connect to server to generate safety analysis.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to analyze incident.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [incidentId]);

  useEffect(() => {
    runRuleAnalysis();
  }, [runRuleAnalysis]);

  // Consented AI Analysis
  const handleRunAiAnalysis = async () => {
    if (!consentChecked) {
      alert('Please check the consent box to confirm that you authorize AI analysis.');
      return;
    }

    setIsAiLoading(true);
    setError(null);
    try {
      const data = await apiClient.incidents.analyze(incidentId, {
        consentToAiProcessing: true,
        consentTimestamp: new Date().toISOString(),
      });
      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI analysis failed.');
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-rose-50/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Safety Indicators &amp; Action Playbook
              <span className="text-[10px] uppercase font-semibold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                Phase 3
              </span>
            </h2>
            <p className="text-xs text-slate-500">Deterministic rules layer &amp; curated emergency playbooks</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={runRuleAnalysis} disabled={isLoading} className="text-slate-500">
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </CardHeader>

      <CardBody className="space-y-6">
        {/* Important Non-Substitute Disclaimer */}
        <div className="flex items-start gap-2.5 bg-blue-50/80 border border-blue-200/80 rounded-xl px-4 py-3 text-xs text-blue-900">
          <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">Safety &amp; Legal Notice</span>
            RakshaSphere provides structured safety guidance and evidence steps. It does{' '}
            <span className="underline font-medium">not replace police, legal counsel, or emergency medical help</span>.
          </div>
        </div>

        {isLoading ? (
          <LoadingSpinner message="Evaluating safety indicators and retrieving verified playbooks..." size="sm" />
        ) : error ? (
          <ErrorAlert message={error} onRetry={runRuleAnalysis} />
        ) : analysis ? (
          <div className="space-y-6">
            {/* Overall Severity Badge */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Assessed Threat Level:</span>
                <span
                  className={`px-2.5 py-0.5 text-xs font-bold uppercase rounded-full border ${
                    SEVERITY_BADGES[analysis.overallSeverity].style
                  }`}
                >
                  {SEVERITY_BADGES[analysis.overallSeverity].label}
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Mode: {analysis.analysisMode === 'AI_ASSISTED' ? 'AI Assisted + Rules' : 'Deterministic Rules Only'}
              </span>
            </div>

            {/* Section 1: Rule-Based Indicators */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Deterministic Safety Indicators ({analysis.ruleIndicators.length})
                </h3>
                <span className="text-[10px] text-slate-400">Zero External Data Transmission</span>
              </div>

              {analysis.ruleIndicators.length === 0 ? (
                <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-500">
                  No standard threat triggers detected in title or description.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {analysis.ruleIndicators.map((ind: SafetyIndicator) => (
                    <div
                      key={ind.id}
                      className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2 hover:border-slate-300 transition"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <h4 className="text-xs font-bold text-slate-900">{ind.name}</h4>
                        </div>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            SEVERITY_BADGES[ind.severity].style
                          }`}
                        >
                          {ind.severity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">{ind.explanation}</p>
                      <div className="flex items-start gap-1.5 text-[11px] text-slate-400 bg-slate-50 p-2 rounded-lg">
                        <HelpCircle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                        <span>{ind.uncertaintyNotes}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 2: Curated Action Playbook */}
            {analysis.playbook && (
              <div className="space-y-4 pt-3 border-t border-slate-100">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Curated Playbook: {analysis.playbook.title}
                    </h3>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                      v{analysis.playbook.version}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Structured safety and evidence preservation steps tailored for {analysis.incidentType}
                  </p>
                </div>

                {/* Immediate Safety Steps */}
                <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wide">
                    Immediate Safety Actions
                  </h4>
                  <ul className="space-y-1.5 text-xs text-rose-950">
                    {analysis.playbook.immediateSafetySteps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="font-bold text-rose-600">•</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Account Security & Evidence Preservation Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                    <h5 className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-600" /> Account Security &amp; Privacy
                    </h5>
                    <ul className="space-y-1 text-slate-600">
                      {analysis.playbook.accountSecuritySteps.map((step, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <CheckCircle className="w-3 h-3 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                    <h5 className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-slate-600" /> Evidence Preservation Steps
                    </h5>
                    <ul className="space-y-1 text-slate-600">
                      {analysis.playbook.evidencePreservationSteps.map((step, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <CheckCircle className="w-3 h-3 text-blue-600 flex-shrink-0 mt-0.5" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Verified Official Reporting Portals */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700">Verified Official Reporting Channels</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {analysis.playbook.officialReportingChannels.map((channel, idx) => (
                      <a
                        key={idx}
                        href={channel.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition flex flex-col justify-between group"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-slate-900 group-hover:text-rose-600 transition">
                              {channel.name}
                            </span>
                            <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-rose-500" />
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">{channel.scope}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{channel.notes}</p>
                        </div>
                        <div className="text-[10px] text-emerald-700 font-mono mt-2 pt-1 border-t border-slate-100">
                          ✓ Verified: {channel.verifiedDate}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>

                {/* Emergency Guidance */}
                <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                  <PhoneCall className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block mb-0.5">Emergency Assistance:</span>
                    {analysis.playbook.emergencyAssistanceGuidance}
                  </div>
                </div>
              </div>
            )}

            {/* Section 3: Consented AI-Assisted Deep Analysis */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Optional Consented AI Analysis
                  </h3>
                </div>
                {analysis.aiAnalysis && (
                  <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    AI Completed
                  </span>
                )}
              </div>

              {analysis.aiAnalysis ? (
                /* Render AI Output */
                <div className="bg-indigo-50/40 border border-indigo-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-indigo-100">
                    <span className="font-bold text-indigo-950">
                      Model Assessment ({analysis.aiAnalysis.modelMetadata.provider})
                    </span>
                    <span className="text-[11px] text-indigo-700 font-mono">
                      {analysis.aiAnalysis.modelMetadata.model}
                    </span>
                  </div>

                  {/* AI Indicators */}
                  {analysis.aiAnalysis.indicators.map((ind, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg border border-indigo-100 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">{ind.name}</span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border ${
                            SEVERITY_BADGES[ind.severity].style
                          }`}
                        >
                          {ind.severity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{ind.explanation}</p>
                    </div>
                  ))}

                  {/* AI Uncertainty Assessment */}
                  <div className="p-2.5 bg-white rounded-lg border border-indigo-100 text-xs">
                    <span className="font-semibold text-slate-700 block mb-0.5">
                      Model Uncertainty Assessment:
                    </span>
                    <p className="text-slate-600">{analysis.aiAnalysis.uncertaintyAssessment}</p>
                  </div>

                  {/* AI Steps */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-3 rounded-lg border border-indigo-100">
                      <span className="font-semibold text-slate-800 block mb-1">Recommended Next Steps:</span>
                      <ul className="space-y-1 text-slate-600">
                        {analysis.aiAnalysis.nextSteps.map((step, i) => (
                          <li key={i}>• {step}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-indigo-100">
                      <span className="font-semibold text-slate-800 block mb-1">Immediate Safety Actions:</span>
                      <ul className="space-y-1 text-slate-600">
                        {analysis.aiAnalysis.immediateSteps.map((step, i) => (
                          <li key={i}>• {step}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                /* AI Consent & Trigger Panel */
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="text-xs text-slate-600 space-y-1.5">
                    <p className="font-semibold text-slate-800">
                      Transparent Data Disclosure Before AI Analysis:
                    </p>
                    <p>
                      If you authorize AI analysis, a strictly minimized summary containing only{' '}
                      <span className="font-medium text-slate-800">incident category, platform, date, and description</span>{' '}
                      will be sent to Google Gemini to detect contextual threat indicators.
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      🔒 <span className="font-medium">Strict Privacy:</span> No account passwords, identity tokens, or location coordinates are ever transmitted.
                    </p>
                  </div>

                  {/* Status notice if provider was skipped or unconfigured */}
                  {analysis.providerStatus === 'AI_PROVIDER_NOT_CONFIGURED' && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                      Notice: AI Provider key is not configured in server environment. Analysis currently runs in offline deterministic mode.
                    </div>
                  )}

                  {/* Consent checkbox */}
                  <div className="flex items-start gap-2.5 pt-1">
                    <input
                      type="checkbox"
                      id="ai-consent-checkbox"
                      checked={consentChecked}
                      onChange={(e) => setConsentChecked(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                    />
                    <label htmlFor="ai-consent-checkbox" className="text-xs text-slate-700 leading-snug cursor-pointer">
                      I explicitly authorize processing a minimized summary of this incident for safety indicator analysis.
                    </label>
                  </div>

                  <Button
                    size="sm"
                    onClick={handleRunAiAnalysis}
                    disabled={!consentChecked || isAiLoading}
                    isLoading={isAiLoading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {isAiLoading ? 'Analyzing with AI…' : 'Run Consented AI Analysis'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
