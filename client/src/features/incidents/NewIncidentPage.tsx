import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Info, Tag, X, Plus } from 'lucide-react';
import { apiClient, ApiError } from '../../services/apiClient';
import { CreateIncidentDTO, IncidentType, PlatformType, ThreatIdentifier } from '@rakshasphere/shared';
import {
  Button, Input, Select, Textarea, Card, CardHeader, CardBody, CardFooter,
  ErrorAlert, SuccessAlert,
} from '../../components/ui';

type FormErrors = Partial<Record<keyof CreateIncidentDTO | 'root', string>>;

const INCIDENT_TYPES: { value: IncidentType; label: string }[] = [
  { value: 'HARASSMENT', label: 'Online Harassment' },
  { value: 'DOXXING', label: 'Doxxing (Personal info exposed)' },
  { value: 'IMPERSONATION', label: 'Impersonation / Fake Account' },
  { value: 'BLACKMAIL', label: 'Blackmail / Extortion' },
  { value: 'STALKING', label: 'Cyberstalking' },
  { value: 'FINANCIAL_SCAM', label: 'Financial Scam / Fraud' },
  { value: 'OTHER', label: 'Other' },
];

const PLATFORMS: { value: PlatformType; label: string }[] = [
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'TELEGRAM', label: 'Telegram' },
  { value: 'TWITTER_X', label: 'X (Twitter)' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'SMS', label: 'SMS / Phone Call' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'OTHER', label: 'Other / Multiple' },
];

const MAX_DESCRIPTION = 2000;

function validate(form: Partial<CreateIncidentDTO>): FormErrors {
  const errors: FormErrors = {};
  if (!form.title || form.title.trim().length < 3)
    errors.title = 'Title must be at least 3 characters.';
  if (form.title && form.title.length > 120)
    errors.title = 'Title cannot exceed 120 characters.';
  if (!form.incidentType)
    errors.incidentType = 'Please select an incident category.';
  if (!form.description || form.description.trim().length < 5)
    errors.description = 'Description must be at least 5 characters.';
  if (form.description && form.description.length > MAX_DESCRIPTION)
    errors.description = `Description cannot exceed ${MAX_DESCRIPTION} characters.`;
  if (!form.platform)
    errors.platform = 'Please select a platform.';
  return errors;
}

export function NewIncidentPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState<Partial<CreateIncidentDTO>>({
    title: '',
    incidentType: undefined,
    description: '',
    occurredAt: '',
    platform: undefined,
    identifiers: [],
  });
  const [newIdentType, setNewIdentType] = useState<ThreatIdentifier['type']>('USERNAME');
  const [newIdentValue, setNewIdentValue] = useState('');
  const [identError, setIdentError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [rootError, setRootError] = useState<string | null>(null);

  const updateField = <K extends keyof CreateIncidentDTO>(key: K, val: CreateIncidentDTO[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
    if (rootError) setRootError(null);
  };

  const handleAddIdentifier = () => {
    setIdentError(null);
    const val = newIdentValue.trim();
    if (!val) {
      setIdentError('Identifier value cannot be empty');
      return;
    }
    if (val.length > 256) {
      setIdentError('Identifier cannot exceed 256 characters');
      return;
    }
    const current = form.identifiers || [];
    setForm((prev) => ({
      ...prev,
      identifiers: [...current, { type: newIdentType, value: val }],
    }));
    setNewIdentValue('');
  };

  const handleRemoveIdentifier = (index: number) => {
    const current = form.identifiers || [];
    setForm((prev) => ({
      ...prev,
      identifiers: current.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setRootError(null);

    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateIncidentDTO = {
        title: form.title!.trim(),
        incidentType: form.incidentType!,
        description: form.description!.trim(),
        platform: form.platform!,
        occurredAt: form.occurredAt
          ? new Date(form.occurredAt).toISOString()
          : undefined,
        identifiers: form.identifiers && form.identifiers.length > 0 ? form.identifiers : undefined,
      };

      const incident = await apiClient.incidents.create(payload);
      setSuccessId(incident.id);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VALIDATION_ERROR') {
        setRootError('Some fields are invalid. Please check your entry and try again.');
      } else if (err instanceof ApiError && err.status === 0) {
        setRootError('Cannot connect to server. Ensure the backend is running.');
      } else {
        setRootError(
          err instanceof Error ? err.message : 'Failed to submit. Please try again.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successId) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <SuccessAlert message="Incident recorded successfully." />
        <Card>
          <CardBody className="flex flex-col sm:flex-row gap-3">
            <Button onClick={() => navigate(`/incidents/${successId}`)}>
              View Incident
            </Button>
            <Button variant="secondary" onClick={() => navigate('/incidents')}>
              Back to My Incidents
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setForm({ title: '', description: '', occurredAt: '' });
                setErrors({});
                setSuccessId(null);
              }}
            >
              Report Another
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-rose-600" />
          Report an Incident
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Your report is kept private. Fill in what you know — incomplete information is fine.
        </p>
      </div>

      {/* Privacy notice */}
      <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-blue-800">
          This information is stored on the server associated with your account only. Do not include
          highly sensitive personal details (e.g., full legal name, address) in the description unless necessary.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-800 text-sm">Incident Details</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            {rootError && (
              <ErrorAlert message={rootError} onRetry={() => setRootError(null)} />
            )}

            <Input
              label="Incident title"
              placeholder="e.g. Threatening messages from unknown account"
              value={form.title ?? ''}
              onChange={(e) => updateField('title', e.target.value)}
              error={errors.title}
              required
              maxLength={120}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Incident category"
                value={form.incidentType ?? ''}
                onChange={(e) => updateField('incidentType', e.target.value as IncidentType)}
                error={errors.incidentType}
                required
              >
                <option value="">Select category…</option>
                {INCIDENT_TYPES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>

              <Select
                label="Platform / Channel"
                value={form.platform ?? ''}
                onChange={(e) => updateField('platform', e.target.value as PlatformType)}
                error={errors.platform}
                required
              >
                <option value="">Select platform…</option>
                {PLATFORMS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </div>

            <Input
              label="When did this occur?"
              type="datetime-local"
              value={form.occurredAt ?? ''}
              onChange={(e) => updateField('occurredAt', e.target.value)}
              hint="Optional — leave blank if uncertain."
            />

            {/* Identifiers Section for ThreatLink */}
            <div className="pt-2 border-t border-slate-100">
              <label className="text-sm font-medium text-slate-700 block mb-1">
                Involved Threat Identifiers (Optional)
              </label>
              <p className="text-xs text-slate-500 mb-3">
                Handles, phone numbers, URLs, or emails linked to this threat. ThreatLink will use these to detect pattern correlations.
              </p>

              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={newIdentType}
                  onChange={(e) => setNewIdentType(e.target.value as ThreatIdentifier['type'])}
                  className="px-3 py-2 text-xs text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="USERNAME">Username / Handle</option>
                  <option value="PHONE">Phone Number</option>
                  <option value="EMAIL">Email Address</option>
                  <option value="URL">URL / Profile Link</option>
                  <option value="OTHER">Other Identifier</option>
                </select>

                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={newIdentValue}
                    onChange={(e) => {
                      setNewIdentValue(e.target.value);
                      if (identError) setIdentError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddIdentifier();
                      }
                    }}
                    placeholder="e.g. @harasser_handle or +919876543210"
                    className="flex-1 px-3 py-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <Button type="button" variant="secondary" size="sm" onClick={handleAddIdentifier}>
                    <Plus className="w-3.5 h-3.5" /> Add
                  </Button>
                </div>
              </div>

              {identError && <p className="text-xs text-red-600 mt-1">{identError}</p>}

              {/* Added Identifier Tags */}
              {form.identifiers && form.identifiers.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {form.identifiers.map((ident, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-slate-100 text-slate-800 border border-slate-200"
                    >
                      <Tag className="w-3 h-3 text-slate-500" />
                      <span className="font-semibold text-slate-500 text-[10px] uppercase">{ident.type}:</span>
                      <span className="font-mono">{ident.value}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveIdentifier(idx)}
                        className="text-slate-400 hover:text-red-600 ml-0.5"
                        aria-label="Remove identifier"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <Textarea
              label="Description"
              placeholder="Describe what happened. Include any usernames, URLs, or other identifying details you feel safe recording."
              value={form.description ?? ''}
              onChange={(e) => updateField('description', e.target.value)}
              error={errors.description}
              required
              maxLength={MAX_DESCRIPTION}
              currentLength={form.description?.length ?? 0}
              rows={5}
            />
          </CardBody>
          <CardFooter className="flex gap-3">
            <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting…' : 'Submit Report'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/incidents')}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
