import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  AlertTriangle,
  Scale,
  Users,
  PlusCircle,
  TrendingUp,
  RefreshCw,
  Calendar,
  Filter,
  ArrowRight,
  Download,
  CheckCircle2,
  Activity,
  ChevronRight,
} from 'lucide-react';
import { apiClient, ApiError, saveBlobAsFile } from '../../services/apiClient';
import {
  AnalyticsSummaryData,
  AnalyticsSummaryQuery,
} from '@rakshasphere/shared';
import { useAuth } from '../auth/AuthContext';
import {
  Button,
  IconButton,
  ErrorAlert,
  Card,
  CardSkeleton,
} from '../../components/ui';
import { IncidentTrendChart } from './IncidentTrendChart';
import { CategoryDistributionChart } from './CategoryDistributionChart';
import { SafetyLocationMap } from './SafetyLocationMap';

export function DashboardPage() {
  const { user } = useAuth();

  const [summary, setSummary] = useState<AnalyticsSummaryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // CSV export state
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [csvExportError, setCsvExportError] = useState<string | null>(null);
  const [csvExportSuccess, setCsvExportSuccess] = useState<string | null>(null);

  const handleExportIncidentsCsv = async () => {
    try {
      setIsExportingCsv(true);
      setCsvExportError(null);
      setCsvExportSuccess(null);
      const { blob, filename } = await apiClient.incidents.exportCsv();
      saveBlobAsFile(blob, 'RakshaSphere_Incidents.csv', filename);
      setCsvExportSuccess('Incidents CSV export downloaded.');
      setTimeout(() => setCsvExportSuccess(null), 4000);
    } catch (err) {
      setCsvExportError(err instanceof Error ? err.message : 'Export failed. Please try again.');
    } finally {
      setIsExportingCsv(false);
    }
  };

  // Filters state
  const [datePreset, setDatePreset] = useState<string>('ALL');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);

    const query: AnalyticsSummaryQuery = {};

    if (datePreset === '7D') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      query.startDate = d.toISOString();
    } else if (datePreset === '30D') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      query.startDate = d.toISOString();
    } else if (datePreset === '90D') {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      query.startDate = d.toISOString();
    } else if (datePreset === 'CUSTOM') {
      if (customStartDate) query.startDate = new Date(customStartDate).toISOString();
      if (customEndDate) {
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        query.endDate = end.toISOString();
      }
    }

    if (selectedPlatform) query.platform = selectedPlatform as any;
    if (selectedType) query.incidentType = selectedType as any;

    try {
      const data = await apiClient.analytics.getSummary(query);
      setSummary(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        setError('Cannot connect to backend server. Please verify the API is running.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load safety analytics');
      }
    } finally {
      setLoading(false);
    }
  }, [datePreset, customStartDate, customEndDate, selectedPlatform, selectedType]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const riskBadgeConfig = {
    HIGH: { label: 'High Alert', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
    MEDIUM: { label: 'Medium Concern', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
    LOW: { label: 'Low Alert', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  };

  const highCount = summary?.riskDistribution.high || 0;
  const mediumCount = summary?.riskDistribution.medium || 0;
  const riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' =
    highCount > 0 ? 'HIGH' : mediumCount > 0 ? 'MEDIUM' : 'LOW';
  const riskInfo = riskBadgeConfig[riskLevel];

  return (
    <div className="space-y-6">
      {/* Top Header & Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Safety Intelligence &amp; Action Dashboard
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time aggregate threat telemetry, encrypted evidence status, and verified legal pipelines for{' '}
            <strong className="text-slate-800 font-semibold">{user?.name || user?.email}</strong>.
          </p>
        </div>

        {/* Global Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link to="/incidents/new">
            <Button size="sm" variant="primary" leftIcon={<PlusCircle className="w-3.5 h-3.5" />}>
              Report Incident
            </Button>
          </Link>
          <Link to="/check-ins">
            <Button size="sm" variant="outline" leftIcon={<Users className="w-3.5 h-3.5 text-indigo-600" />}>
              Safety Check-In
            </Button>
          </Link>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportIncidentsCsv}
            isLoading={isExportingCsv}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export CSV
          </Button>
          <IconButton
            size="sm"
            variant="outline"
            onClick={fetchSummary}
            disabled={loading}
            aria-label="Refresh telemetry"
            title="Refresh dashboard metrics"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />}
          />
        </div>
      </div>

      {csvExportSuccess && (
        <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{csvExportSuccess}</span>
        </div>
      )}

      {csvExportError && (
        <ErrorAlert message={csvExportError} onDismiss={() => setCsvExportError(null)} />
      )}

      {/* Date & Filter Toolbar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-subtle flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-slate-700 flex items-center gap-1.5 pr-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" /> Time Horizon:
          </span>
          <div className="inline-flex rounded-xl border border-slate-200 p-0.5 bg-slate-50">
            {[
              { id: 'ALL', label: 'All Time' },
              { id: '7D', label: '7 Days' },
              { id: '30D', label: '30 Days' },
              { id: '90D', label: '90 Days' },
              { id: 'CUSTOM', label: 'Custom' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setDatePreset(p.id)}
                className={`px-3 py-1 rounded-lg font-medium text-xs transition-all ${
                  datePreset === p.id
                    ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {datePreset === 'CUSTOM' && (
            <div className="flex items-center gap-2 pl-2 sm:border-l border-slate-200">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            aria-label="Filter by platform"
            className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Platforms</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="TELEGRAM">Telegram</option>
            <option value="TWITTER_X">X (Twitter)</option>
            <option value="SMS">SMS</option>
            <option value="EMAIL">Email</option>
            <option value="OTHER">Other</option>
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            aria-label="Filter by incident type"
            className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Modalities</option>
            <option value="HARASSMENT">Harassment</option>
            <option value="DOXXING">Doxxing</option>
            <option value="BLACKMAIL">Blackmail</option>
            <option value="STALKING">Stalking</option>
            <option value="IMPERSONATION">Impersonation</option>
            <option value="FINANCIAL_SCAM">Financial Scam</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && <ErrorAlert message={error} onRetry={fetchSummary} />}

      {/* Loading Skeleton */}
      {loading && !summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {/* Primary KPI Grid */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Incidents */}
          <Link to="/incidents" className="group">
            <Card className="p-5 hover:border-indigo-300 hover:shadow-card transition-all duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Incidents
                </span>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {summary.overview.totalIncidents}
                </span>
                <span className="text-xs text-slate-500 font-medium">recorded</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-slate-100">
                <span className="text-slate-500">
                  <strong className="text-slate-800">{summary.overview.openIncidents}</strong> pending response
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition" />
              </div>
            </Card>
          </Link>

          {/* Card 2: Legal Cases Tracked */}
          <Link to="/incidents" className="group">
            <Card className="p-5 hover:border-indigo-300 hover:shadow-card transition-all duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Legal Cases
                </span>
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Scale className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {summary.overview.totalCases}
                </span>
                <span className="text-xs text-slate-500 font-medium">pipeline files</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-slate-100">
                <span className="text-slate-500">
                  <strong className="text-slate-800">{summary.overview.activeCases}</strong> active / review
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600 transition" />
              </div>
            </Card>
          </Link>

          {/* Card 3: Threat Severity Assessment */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Threat Severity
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2.5">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${riskInfo.cls}`}>
                {riskInfo.label}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-slate-100 text-slate-500">
              <span>High-risk items: <strong className="text-rose-700">{summary.riskDistribution.high}</strong></span>
              <span>Mod: <strong className="text-slate-700">{summary.riskDistribution.medium}</strong></span>
            </div>
          </Card>

          {/* Card 4: Safety Assets & Vault */}
          <Link to="/check-ins" className="group">
            <Card className="p-5 hover:border-indigo-300 hover:shadow-card transition-all duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Check-Ins &amp; Contacts
                </span>
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {summary.overview.totalCheckIns}
                </span>
                <span className="text-xs text-slate-500 font-medium">dispatches</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-slate-100">
                <span className="text-slate-500">
                  <strong className="text-slate-800">{summary.overview.activeCheckIns}</strong> active check-ins
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600 transition" />
              </div>
            </Card>
          </Link>
        </div>
      )}

      {/* Main Charts & Analytics Grid */}
      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 2 Cols: Incident Trend Time-Series */}
          <div className="lg:col-span-2">
            <IncidentTrendChart
              data={summary.incidentTrends}
            />
          </div>

          {/* 1 Col: Category & Channel Distribution */}
          <div className="lg:col-span-1">
            <CategoryDistributionChart
              byPlatform={summary.byPlatform}
              byIncidentType={summary.byIncidentType}
              byCaseStatus={summary.byCaseStatus}
            />
          </div>
        </div>
      )}

      {/* Geospatial Safety Map & Incident Overview */}
      <div className="grid grid-cols-1 gap-6">
        <SafetyLocationMap />
      </div>

      {/* Quick Action Matrix & Emergency Hub */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Hub 1: Incident Reporting & Evidence */}
        <Card className="p-5 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Incident Documentation</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Log threatening messages, stalker profiles, or blackmail attempts. Correlate identifiers automatically with ThreatLink.
            </p>
          </div>
          <div className="pt-4 mt-2 border-t border-slate-100">
            <Link to="/incidents/new">
              <Button size="sm" variant="outline" className="w-full justify-between" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Record New Incident
              </Button>
            </Link>
          </div>
        </Card>

        {/* Hub 2: Safety Check-In & Contacts */}
        <Card className="p-5 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Safety Check-In &amp; Contacts</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Coordinate manual WhatsApp/SMS intents or transactional email check-ins with explicit recipient consent.
            </p>
          </div>
          <div className="pt-4 mt-2 border-t border-slate-100">
            <Link to="/check-ins">
              <Button size="sm" variant="outline" className="w-full justify-between" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Manage Check-Ins
              </Button>
            </Link>
          </div>
        </Card>

        {/* Hub 3: User Activity Audit Trail */}
        <Card className="p-5 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Account Audit Trail</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Review tamper-evident security audit logs. Zero credentials or sensitive coordinates are ever logged.
            </p>
          </div>
          <div className="pt-4 mt-2 border-t border-slate-100">
            <Link to="/activity">
              <Button size="sm" variant="outline" className="w-full justify-between" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                View Activity Log
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
