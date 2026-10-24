import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Trash2,
  AlertTriangle,
  Info,
  MapPin,
  MapPinOff,
  Send,
  Shield,
  Ban,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { TrustedContact, CheckIn } from '@rakshasphere/shared';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/Loading';

const CONSENT_BADGE: Record<string, { label: string; cls: string }> = {
  PENDING:   { label: 'Consent Pending', cls: 'bg-amber-100 text-amber-800' },
  CONSENTED: { label: 'Consented',       cls: 'bg-emerald-100 text-emerald-800' },
  DECLINED:  { label: 'Declined',        cls: 'bg-slate-100 text-slate-600' },
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  ACTIVE:    { label: 'Active',    cls: 'bg-blue-100 text-blue-800' },
  COMPLETED: { label: 'Safe ✓',   cls: 'bg-emerald-100 text-emerald-800' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-slate-100 text-slate-600' },
  OVERDUE:   { label: 'Overdue',   cls: 'bg-rose-100 text-rose-800' },
};

const DELIVERY_BADGE: Record<string, { label: string; cls: string }> = {
  PREPARED:      { label: 'Prepared (not sent)',                 cls: 'bg-amber-50 text-amber-700' },
  OPENED_IN_APP: { label: 'Opened in app (delivery unconfirmed)', cls: 'bg-blue-50 text-blue-700' },
  CONFIRMED:     { label: 'Confirmed (external provider verified)', cls: 'bg-emerald-50 text-emerald-700' },
};

type Tab = 'contacts' | 'checkin';

export const CheckInSection: React.FC = () => {
  const [tab, setTab] = useState<Tab>('contacts');

  // Contacts state
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [contactError, setContactError] = useState<string | null>(null);

  // New contact form
  const [showContactForm, setShowContactForm] = useState(false);
  const [cName, setCName] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [savingContact, setSavingContact] = useState(false);

  // Check-ins state
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loadingCheckIns, setLoadingCheckIns] = useState(true);
  const [checkInError, setCheckInError] = useState<string | null>(null);

  // New check-in form
  const [showCheckInForm, setShowCheckInForm] = useState(false);
  const [ciContactId, setCiContactId] = useState('');
  const [ciMessage, setCiMessage] = useState('I am safe. This is a scheduled safety check-in from RakshaSphere.');
  const [ciLocationEnabled, setCiLocationEnabled] = useState(false);
  const [ciLat, setCiLat] = useState<number | null>(null);
  const [ciLon, setCiLon] = useState<number | null>(null);
  const [ciDueAt, setCiDueAt] = useState('');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [savingCheckIn, setSavingCheckIn] = useState(false);

  // Helpers
  const fetchContacts = useCallback(async () => {
    setLoadingContacts(true);
    setContactError(null);
    try {
      const data = await apiClient.contacts.list();
      setContacts(data);
    } catch (err) {
      setContactError(err instanceof Error ? err.message : 'Failed to load contacts');
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  const fetchCheckIns = useCallback(async () => {
    setLoadingCheckIns(true);
    setCheckInError(null);
    try {
      const data = await apiClient.checkIns.list();
      setCheckIns(data);
    } catch (err) {
      setCheckInError(err instanceof Error ? err.message : 'Failed to load check-ins');
    } finally {
      setLoadingCheckIns(false);
    }
  }, []);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);
  useEffect(() => { if (tab === 'checkin') fetchCheckIns(); }, [tab, fetchCheckIns]);

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName.trim()) return;
    setSavingContact(true);
    setContactError(null);
    try {
      await apiClient.contacts.create({ name: cName.trim(), phone: cPhone.trim() || undefined, email: cEmail.trim() || undefined });
      setCName(''); setCPhone(''); setCEmail('');
      setShowContactForm(false);
      await fetchContacts();
    } catch (err) {
      setContactError(err instanceof Error ? err.message : 'Failed to save contact');
    } finally {
      setSavingContact(false);
    }
  };

  const handleUpdateConsent = async (contactId: string, status: 'CONSENTED' | 'DECLINED') => {
    try {
      await apiClient.contacts.updateConsent(contactId, { consentStatus: status });
      await fetchContacts();
    } catch (err) {
      setContactError(err instanceof Error ? err.message : 'Failed to update consent');
    }
  };

  const handleDeleteContact = async (id: string, name: string) => {
    if (!window.confirm(`Remove "${name}" from trusted contacts?`)) return;
    try {
      await apiClient.contacts.delete(id);
      await fetchContacts();
    } catch (err) {
      setContactError(err instanceof Error ? err.message : 'Failed to remove contact');
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }
    setGettingLocation(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Round to 4 decimal places (~11m precision) - minimum necessary
        setCiLat(Math.round(pos.coords.latitude * 10000) / 10000);
        setCiLon(Math.round(pos.coords.longitude * 10000) / 10000);
        setGettingLocation(false);
      },
      (err) => {
        setGettingLocation(false);
        if (err.code === GeolocationPositionError.PERMISSION_DENIED) {
          setLocationError('Location permission was denied. You can continue without location sharing.');
        } else if (err.code === GeolocationPositionError.POSITION_UNAVAILABLE) {
          setLocationError('Location is currently unavailable. Check your device GPS or network.');
        } else {
          setLocationError('Could not obtain location. Proceeding without location sharing.');
        }
        setCiLocationEnabled(false);
        setCiLat(null);
        setCiLon(null);
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleClearLocation = () => {
    setCiLat(null);
    setCiLon(null);
    setCiLocationEnabled(false);
    setLocationError(null);
  };

  const selectedContact = contacts.find(c => c.id === ciContactId);

  const handleCreateCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ciContactId || !ciMessage.trim()) return;
    if (ciLocationEnabled && (ciLat === null || ciLon === null)) {
      setCheckInError('Please obtain your location first, or disable location sharing.');
      return;
    }

    setSavingCheckIn(true);
    setCheckInError(null);
    try {
      const newCI: CheckIn = await apiClient.checkIns.create({
        contactId: ciContactId,
        message: ciMessage.trim(),
        locationSharingEnabled: ciLocationEnabled,
        ...(ciLocationEnabled && ciLat !== null && ciLon !== null ? { latitudeSnapshot: ciLat, longitudeSnapshot: ciLon } : {}),
        ...(ciDueAt ? { dueAt: new Date(ciDueAt).toISOString() } : {}),
      });

      // Build the WhatsApp/SMS-share URL with the prepared message
      const contact = contacts.find(c => c.id === ciContactId);
      let shareText = newCI.message;
      if (newCI.locationSharingEnabled && newCI.latitudeSnapshot != null && newCI.longitudeSnapshot != null) {
        shareText += `\n\nMy approximate location: https://maps.google.com/?q=${newCI.latitudeSnapshot},${newCI.longitudeSnapshot}`;
      }

      const shareUrl = contact?.phone
        ? `https://wa.me/${contact.phone.replace(/\D/g,'')}?text=${encodeURIComponent(shareText)}`
        : null;

      // Acknowledge that we're opening the external app
      await apiClient.checkIns.acknowledgeDelivery(newCI.id);

      if (shareUrl) {
        window.open(shareUrl, '_blank', 'noopener,noreferrer');
      } else {
        navigator.clipboard?.writeText(shareText).catch(() => {});
        alert(`Message prepared and copied:\n\n${shareText}\n\nSend it manually via WhatsApp, SMS, or any messaging app.`);
      }

      setCiMessage('I am safe. This is a scheduled safety check-in from RakshaSphere.');
      setCiContactId('');
      setCiLocationEnabled(false);
      setCiLat(null); setCiLon(null);
      setCiDueAt('');
      setShowCheckInForm(false);
      await fetchCheckIns();
    } catch (err) {
      setCheckInError(err instanceof Error ? err.message : 'Failed to create check-in');
    } finally {
      setSavingCheckIn(false);
    }
  };

  const handleMarkSafe = async (id: string) => {
    try {
      await apiClient.checkIns.complete(id);
      await fetchCheckIns();
    } catch (err) {
      setCheckInError(err instanceof Error ? err.message : 'Failed to mark safe arrival');
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Cancel this check-in?')) return;
    try {
      await apiClient.checkIns.cancel(id);
      await fetchCheckIns();
    } catch (err) {
      setCheckInError(err instanceof Error ? err.message : 'Failed to cancel check-in');
    }
  };

  return (
    <Card className="border-sky-200 shadow-sm overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-sky-50 to-slate-50 border-b border-sky-100 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-sky-700" />
            <h2 className="text-base font-semibold text-slate-800">Safety Check-In</h2>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800">
            Phase 6 — Consent-Based
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Manually initiate safety check-ins with explicitly consenting trusted contacts. All sharing is user-initiated and optional.
        </p>
      </CardHeader>

      <CardBody className="space-y-4">

        {/* Emergency Notice — Always Visible */}
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold">For Immediate Physical Danger</p>
            <p className="leading-relaxed text-[11px]">
              Contact local emergency services directly: <strong>112</strong> (India) or your local emergency number.
              RakshaSphere check-ins are <strong>not a substitute for emergency services</strong> and cannot guarantee rescue or delivery.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 text-xs font-medium">
          <button
            type="button"
            onClick={() => setTab('contacts')}
            className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 ${
              tab === 'contacts' ? 'border-sky-600 text-sky-700 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Trusted Contacts ({contacts.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('checkin')}
            className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 ${
              tab === 'checkin' ? 'border-sky-600 text-sky-700 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Check-Ins</span>
          </button>
        </div>

        {/* CONTACTS TAB */}
        {tab === 'contacts' && (
          <div className="space-y-4">
            {/* Consent Explanation */}
            <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 text-[11px] text-sky-900 leading-relaxed flex items-start gap-2">
              <Info className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sky-900 mb-0.5">Explicit Consent Required</p>
                <p>
                  Adding a person here does <strong>not</strong> send them any message automatically.
                  You must obtain their verbal or written consent outside this app, then mark them as "Consented" below.
                  You are responsible for ensuring your contact understands they may receive a safety message via WhatsApp, SMS, or another app.
                </p>
              </div>
            </div>

            {contactError && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" /><span>{contactError}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Your Trusted Contacts</h3>
              <Button
                type="button"
                variant="primary"
                onClick={() => setShowContactForm(!showContactForm)}
                className="text-xs py-1 px-2.5 h-auto flex items-center gap-1 bg-sky-600 hover:bg-sky-700"
              >
                <Plus className="w-3.5 h-3.5" />{showContactForm ? 'Cancel' : 'Add Contact'}
              </Button>
            </div>

            {/* Add Contact Form */}
            {showContactForm && (
              <form onSubmit={handleCreateContact} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-800">Add New Trusted Contact</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Full Name *</label>
                    <input required type="text" value={cName} onChange={e => setCName(e.target.value)} maxLength={100}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-sky-500"
                      placeholder="e.g., Priya Sharma" />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Phone (for WhatsApp/SMS)</label>
                    <input type="tel" value={cPhone} onChange={e => setCPhone(e.target.value)} maxLength={30}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-sky-500"
                      placeholder="+91 98765 43210" />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Email (optional)</label>
                    <input type="email" value={cEmail} onChange={e => setCEmail(e.target.value)} maxLength={200}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-sky-500"
                      placeholder="priya@example.com" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  ⓘ This contact will not receive any message until you explicitly initiate a check-in. Consent status starts as "Pending" — update it after obtaining offline consent.
                </p>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="secondary" onClick={() => setShowContactForm(false)} className="text-xs py-1 px-3">Cancel</Button>
                  <Button type="submit" variant="primary" disabled={savingContact || !cName.trim()} className="text-xs py-1 px-3 bg-sky-600 hover:bg-sky-700">
                    {savingContact ? 'Saving...' : 'Save Contact'}
                  </Button>
                </div>
              </form>
            )}

            {/* Contact List */}
            {loadingContacts ? (
              <div className="py-6 flex justify-center"><LoadingSpinner size="md" /></div>
            ) : contacts.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                No trusted contacts added yet. Add someone you trust and obtain their consent before sending any check-in.
              </div>
            ) : (
              <div className="space-y-3">
                {contacts.map(c => {
                  const badge = CONSENT_BADGE[c.consentStatus];
                  return (
                    <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-800">{c.name}</span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500">
                            {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                            {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {c.consentStatus !== 'CONSENTED' && (
                            <button type="button" onClick={() => handleUpdateConsent(c.id, 'CONSENTED')}
                              className="text-[11px] text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded px-2 py-0.5 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />Mark Consented
                            </button>
                          )}
                          {c.consentStatus !== 'DECLINED' && (
                            <button type="button" onClick={() => handleUpdateConsent(c.id, 'DECLINED')}
                              className="text-[11px] text-slate-500 border border-slate-200 hover:bg-slate-100 rounded px-2 py-0.5 flex items-center gap-1">
                              <Ban className="w-3 h-3" />Declined
                            </button>
                          )}
                          <button type="button" onClick={() => handleDeleteContact(c.id, c.name)}
                            className="text-slate-400 hover:text-rose-600 p-1" title="Remove contact">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {c.consentStatus === 'CONSENTED' && c.consentGivenAt && (
                        <p className="text-[10px] text-emerald-700">Consent recorded: {new Date(c.consentGivenAt).toLocaleDateString()}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* CHECK-IN TAB */}
        {tab === 'checkin' && (
          <div className="space-y-4">
            {checkInError && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" /><span>{checkInError}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Safety Check-Ins</h3>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={fetchCheckIns}
                  className="text-xs py-1 px-2.5 h-auto flex items-center gap-1 border-slate-200">
                  <RefreshCw className="w-3.5 h-3.5" />Refresh
                </Button>
                <Button type="button" variant="primary" onClick={() => setShowCheckInForm(!showCheckInForm)}
                  className="text-xs py-1 px-2.5 h-auto flex items-center gap-1 bg-sky-600 hover:bg-sky-700">
                  <Plus className="w-3.5 h-3.5" />{showCheckInForm ? 'Cancel' : 'New Check-In'}
                </Button>
              </div>
            </div>

            {/* New Check-In Form */}
            {showCheckInForm && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                <h4 className="text-xs font-bold text-slate-800">Create a Safety Check-In</h4>

                {contacts.filter(c => c.consentStatus === 'CONSENTED').length === 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                    <p className="font-semibold mb-0.5">No Consented Contacts</p>
                    <p>Go to the <button type="button" className="underline" onClick={() => setTab('contacts')}>Trusted Contacts</button> tab to add contacts and mark them as consented before creating a check-in.</p>
                  </div>
                )}

                <form onSubmit={handleCreateCheckIn} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Send To (Consented Contact) *</label>
                    <select required value={ciContactId} onChange={e => setCiContactId(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-sky-500">
                      <option value="">Select a consented contact…</option>
                      {contacts.filter(c => c.consentStatus === 'CONSENTED').map(c => (
                        <option key={c.id} value={c.id}>{c.name}{c.phone ? ` (${c.phone})` : ''}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Message *</label>
                    <textarea rows={3} required value={ciMessage} onChange={e => setCiMessage(e.target.value)} maxLength={2000}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-sky-500"
                      placeholder="I am safe. Expected to arrive by 10pm." />
                    <p className="text-[10px] text-slate-400 mt-0.5">This message will be prepared and opened in WhatsApp or shown for manual copy. RakshaSphere does not transmit it directly.</p>
                  </div>

                  {/* Location sharing — explicit opt-in only */}
                  <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-sky-600" />
                        <span className="text-xs font-semibold text-slate-800">Share Approximate Location (Optional)</span>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={ciLocationEnabled}
                          onChange={e => {
                            setCiLocationEnabled(e.target.checked);
                            if (!e.target.checked) { setCiLat(null); setCiLon(null); setLocationError(null); }
                          }}
                          className="w-3.5 h-3.5 accent-sky-600" />
                        <span className="text-[11px] text-slate-600">Include location</span>
                      </label>
                    </div>

                    {ciLocationEnabled && (
                      <div className="space-y-2 pl-1">
                        <div className="bg-sky-50 border border-sky-100 rounded p-2 text-[11px] text-sky-800 leading-relaxed">
                          <p className="font-semibold mb-0.5">What will be shared:</p>
                          <ul className="list-disc list-inside space-y-0.5 text-sky-700">
                            <li>Approximate coordinates (rounded to ~11m precision)</li>
                            <li>A Google Maps link appended to your message</li>
                            <li>Sent only to: <strong>{selectedContact?.name || 'selected contact'}</strong></li>
                          </ul>
                          <p className="mt-1 text-sky-600">Your location is <strong>not</strong> stored by RakshaSphere beyond this check-in record.</p>
                        </div>

                        {ciLat !== null && ciLon !== null ? (
                          <div className="flex items-center gap-2 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2">
                            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>Location captured: {ciLat}, {ciLon}</span>
                            <button type="button" onClick={handleClearLocation}
                              className="ml-auto text-slate-500 hover:text-rose-600 flex items-center gap-1">
                              <MapPinOff className="w-3.5 h-3.5" />Clear
                            </button>
                          </div>
                        ) : (
                          <Button type="button" variant="secondary" onClick={handleGetLocation} disabled={gettingLocation}
                            className="text-xs py-1 px-3 h-auto flex items-center gap-1.5 border-sky-200 text-sky-700">
                            <MapPin className="w-3.5 h-3.5" />
                            {gettingLocation ? 'Getting location…' : 'Get My Current Location'}
                          </Button>
                        )}

                        {locationError && (
                          <p className="text-[11px] text-rose-600 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />{locationError}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Expected Safe Arrival Time (Optional)</label>
                    <input type="datetime-local" value={ciDueAt} onChange={e => setCiDueAt(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-sky-500" />
                    <p className="text-[10px] text-slate-400 mt-0.5">No automated alert will be sent. This is a reference time stored locally for your records.</p>
                  </div>

                  {/* Message preview before sending */}
                  {ciContactId && ciMessage && (
                    <div className="bg-slate-800 rounded-lg p-3 text-[11px] text-slate-100 font-mono space-y-1">
                      <p className="text-slate-400 text-[10px] uppercase tracking-wider mb-1">Message Preview (will be opened in external app):</p>
                      <p className="leading-relaxed whitespace-pre-wrap">{ciMessage}{ciLocationEnabled && ciLat !== null ? `\n\nMy approximate location: https://maps.google.com/?q=${ciLat},${ciLon}` : ''}</p>
                      {selectedContact?.phone && (
                        <p className="text-sky-400 pt-1 flex items-center gap-1"><ExternalLink className="w-3 h-3" />Will open WhatsApp for {selectedContact.name} ({selectedContact.phone})</p>
                      )}
                    </div>
                  )}

                  <div className="bg-amber-50 border border-amber-200 rounded p-2.5 text-[11px] text-amber-800 leading-relaxed">
                    <p className="font-semibold mb-0.5">Delivery Disclaimer</p>
                    <p>Clicking "Prepare & Open" opens the WhatsApp or SMS app with a pre-filled message. RakshaSphere cannot confirm delivery. Delivery is your responsibility through the external messaging app.</p>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={() => setShowCheckInForm(false)} className="text-xs py-1 px-3">Cancel</Button>
                    <Button type="submit" variant="primary"
                      disabled={savingCheckIn || !ciContactId || !ciMessage.trim() || (ciLocationEnabled && (ciLat === null || ciLon === null))}
                      className="text-xs py-1 px-3 bg-sky-600 hover:bg-sky-700 flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5" />{savingCheckIn ? 'Preparing…' : 'Prepare & Open →'}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Check-In List */}
            {loadingCheckIns ? (
              <div className="py-6 flex justify-center"><LoadingSpinner size="md" /></div>
            ) : checkIns.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                No check-ins yet. Create your first check-in above.
              </div>
            ) : (
              <div className="space-y-3">
                {checkIns.map(ci => {
                  const sBadge = STATUS_BADGE[ci.status] || STATUS_BADGE.ACTIVE;
                  const dBadge = DELIVERY_BADGE[ci.deliveryState] || DELIVERY_BADGE.PREPARED;
                  return (
                    <div key={ci.id} className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-800">To: {ci.contactName}</span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sBadge.cls}`}>{sBadge.label}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${dBadge.cls}`}>{dBadge.label}</span>
                            {ci.locationSharingEnabled && <span className="text-[10px] text-sky-700 flex items-center gap-0.5"><MapPin className="w-3 h-3" />Location included</span>}
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-1">{ci.message}</p>
                        </div>

                        {ci.status === 'ACTIVE' && (
                          <div className="flex items-center gap-1.5">
                            <button type="button" onClick={() => handleMarkSafe(ci.id)}
                              className="text-[11px] text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded px-2 py-0.5 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />Mark Safe
                            </button>
                            <button type="button" onClick={() => handleCancel(ci.id)}
                              className="text-[11px] text-slate-500 border border-slate-200 hover:bg-slate-100 rounded px-2 py-0.5 flex items-center gap-1">
                              <XCircle className="w-3 h-3" />Cancel
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="bg-amber-50 border border-amber-100 rounded p-2 text-[10px] text-amber-800 leading-relaxed">
                        {ci.deliveryDisclaimer}
                      </div>

                      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(ci.createdAt).toLocaleString()}</span>
                        {ci.dueAt && <span>Expected: {new Date(ci.dueAt).toLocaleString()} (visual reference, no automated alert)</span>}
                        {ci.completedAt && <span className="text-emerald-700">Marked safe: {new Date(ci.completedAt).toLocaleString()}</span>}
                        {ci.cancelledAt && <span>Cancelled: {new Date(ci.cancelledAt).toLocaleString()}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
};
