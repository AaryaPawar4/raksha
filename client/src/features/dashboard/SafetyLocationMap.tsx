import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPoint } from '@rakshasphere/shared';
import { apiClient } from '../../services/apiClient';
import {
  Shield,
  Eye,
  MapPin,
  RefreshCw,
  AlertTriangle,
  Info,
  Navigation,
} from 'lucide-react';
import { Button, Card, CardHeader, CardBody } from '../../components/ui';

// Fix default Leaflet icon paths in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface SafetyLocationMapProps {
  initialPoints?: MapPoint[];
}

export function SafetyLocationMap({ initialPoints }: SafetyLocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [points, setPoints] = useState<MapPoint[]>(initialPoints || []);
  const [fuzzLocation, setFuzzLocation] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [privacyNotice, setPrivacyNotice] = useState<string>('');
  const [showPreciseConfirm, setShowPreciseConfirm] = useState<boolean>(false);

  // Manual location alternative state
  const [manualLat, setManualLat] = useState<string>('');
  const [manualLng, setManualLng] = useState<string>('');
  const [manualError, setManualError] = useState<string | null>(null);

  const fetchMapPoints = async (fuzz: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.analytics.getMapPoints(fuzz);
      setPoints(res.points);
      setPrivacyNotice(res.privacyNotice);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load safety location points');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMapPoints(fuzzLocation);
  }, [fuzzLocation]);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Default center on India / South Asia (default fallback)
    const map = L.map(mapContainerRef.current, {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update map markers when points or filters change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    const markersLayer = markersLayerRef.current;
    markersLayer.clearLayers();

    const filtered = points.filter((p) => {
      if (statusFilter === 'ALL') return true;
      return p.status === statusFilter;
    });

    if (filtered.length === 0) return;

    const bounds = L.latLngBounds([]);

    filtered.forEach((pt) => {
      bounds.extend([pt.lat, pt.lng]);

      const statusColor =
        pt.status === 'ACTIVE'
          ? '#e11d48'
          : pt.status === 'COMPLETED'
          ? '#059669'
          : '#475569';

      const customIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `
          <div style="background-color: ${statusColor}; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white;">
            <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 004 11c0 2.473.345 4.866.99 7.132" />
            </svg>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14],
      });

      const popupContent = `
        <div style="font-family: inherit; font-size: 12px; line-height: 1.5; padding: 2px;">
          <div style="font-weight: 700; color: #0f172a; margin-bottom: 3px;">
            ${pt.label}
          </div>
          <div style="display: flex; gap: 4px; margin-bottom: 6px;">
            <span style="background: #f1f5f9; color: #334155; font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 4px;">
              ${pt.status}
            </span>
            ${
              pt.isFuzzed
                ? '<span style="background: #e0f2fe; color: #0369a1; font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 4px;">Fuzzed (~1km)</span>'
                : '<span style="background: #fef3c7; color: #92400e; font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 4px;">Exact Coordinates</span>'
            }
          </div>
          <div style="color: #64748b; font-size: 11px;">
            Recorded: ${new Date(pt.timestamp).toLocaleDateString()}
          </div>
        </div>
      `;

      L.marker([pt.lat, pt.lng], { icon: customIcon })
        .addTo(markersLayer)
        .bindPopup(popupContent);
    });

    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
  }, [points, statusFilter]);

  const handleToggleFuzzing = () => {
    if (fuzzLocation) {
      // User is switching from Fuzzed to Precise: request explicit confirmation
      setShowPreciseConfirm(true);
    } else {
      setFuzzLocation(true);
    }
  };

  const confirmPreciseView = () => {
    setShowPreciseConfirm(false);
    setFuzzLocation(false);
  };

  const handleManualLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setManualError(null);
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setManualError('Latitude must be a valid number between -90 and 90.');
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setManualError('Longitude must be a valid number between -180 and 180.');
      return;
    }

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], 12);
      L.marker([lat, lng])
        .addTo(markersLayerRef.current!)
        .bindPopup(
          `<div style="font-size: 12px; font-weight: 600;">Manual Coordinates Preview<br/><span style="font-size: 10px; color: #64748b;">${lat.toFixed(4)}, ${lng.toFixed(4)}</span></div>`
        )
        .openPopup();
    }
  };

  return (
    <Card className="shadow-sm border-slate-200 overflow-hidden">
      <CardHeader className="bg-slate-50 border-b border-slate-200 py-3.5 px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-lg">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Privacy-Preserving Safety Corridors &amp; Check-In Map
              </h2>
              <p className="text-xs text-slate-500">
                Consented safety check-in snapshots • Tenant-isolated visualization
              </p>
            </div>
          </div>

          {/* Privacy & View Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleToggleFuzzing}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                fuzzLocation
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
              }`}
            >
              {fuzzLocation ? (
                <>
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Location Fuzzed (~1km)</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-amber-600" />
                  <span>Precise Snapshot</span>
                </>
              )}
            </button>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by check-in status"
              className="text-xs bg-white border border-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg font-medium focus:outline-none focus:ring-1 focus:ring-rose-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Check-Ins</option>
              <option value="COMPLETED">Completed</option>
            </select>

            <button
              type="button"
              onClick={() => fetchMapPoints(fuzzLocation)}
              disabled={loading}
              aria-label="Refresh safety location points"
              className="p-1.5 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardBody className="p-0 relative">
        {/* Real-time disclaimer banner */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-4 py-2 text-[11px] text-slate-600 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <span>
              <strong>Privacy Invariant:</strong> {privacyNotice || 'Points are obfuscated on overview maps to preserve residence privacy.'}
            </span>
          </div>
          <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-700 font-mono whitespace-nowrap">
            Static Snapshot View (Not Real-Time GPS)
          </span>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border-b border-rose-200 text-xs text-rose-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Map Container */}
        <div
          ref={mapContainerRef}
          className="w-full h-80 sm:h-96 bg-slate-100 z-0"
          style={{ minHeight: '340px' }}
        />

        {/* Empty State Overlay when no check-in points exist */}
        {!loading && points.length === 0 && (
          <div className="absolute inset-0 bg-slate-50/90 backdrop-blur-[1px] flex flex-col items-center justify-center p-6 text-center z-10">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-3">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              No Location Snapshots Recorded Yet
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mb-4 leading-relaxed">
              When you enable consented location sharing while starting a{' '}
              <strong>Safety Check-In</strong>, privacy-fuzzed pins will safely display here for emergency corridors.
            </p>
            <div className="flex items-center gap-2">
              <a href="/check-ins">
                <Button size="sm" className="text-xs bg-rose-600 hover:bg-rose-700 text-white">
                  Schedule Safety Check-In
                </Button>
              </a>
            </div>
          </div>
        )}

        {/* Manual Location Alternative Drawer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200">
          <details className="text-xs text-slate-600">
            <summary className="font-semibold text-slate-700 cursor-pointer hover:text-rose-600 select-none flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5" />
              <span>Manual Coordinate Lookup &amp; Privacy Testing Tool</span>
            </summary>
            <form onSubmit={handleManualLocationSubmit} className="mt-3 flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Latitude (e.g. 28.6139)"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs w-44"
              />
              <input
                type="text"
                placeholder="Longitude (e.g. 77.2090)"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs w-44"
              />
              <Button type="submit" size="sm" variant="secondary" className="text-xs">
                Center on Map
              </Button>
              {manualError && (
                <span className="text-rose-600 text-xs w-full block mt-1">{manualError}</span>
              )}
            </form>
          </details>
        </div>
      </CardBody>

      {/* Confirmation Modal for Precise Location Toggle */}
      {showPreciseConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Expose Precise Coordinates?</h3>
                <p className="text-xs text-slate-500">Privacy Warning</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed bg-amber-50 border border-amber-200 rounded-xl p-3">
              Fuzzing is currently active to protect your private location. Disabling fuzzing will display exact GPS coordinates captured during check-in. Only proceed if viewing on a private, secure screen.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowPreciseConfirm(false)}
              >
                Keep Fuzzed
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={confirmPreciseView}
                className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
              >
                Confirm Precise View
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
