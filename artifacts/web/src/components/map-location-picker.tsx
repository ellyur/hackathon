/**
 * Interactive map for picking a GPS coordinate (hospital entrance / attendance point).
 * Uses Leaflet + OpenStreetMap tiles. No API key required.
 * Includes draggable marker, text search (Nominatim), current location button,
 * and automatic reverse geocoding when the marker moves.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import '../lib/leaflet-init';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, LocateFixed, Loader2 } from 'lucide-react';

// ── Philippines default center ────────────────────────────────────────────────
const DEFAULT_LAT = 14.5995;
const DEFAULT_LNG = 120.9842;
const DEFAULT_ZOOM = 15;

// ── Types ─────────────────────────────────────────────────────────────────────
export interface MapLocationValue {
  lat: number;
  lng: number;
  address: string;
}

interface Props {
  value: MapLocationValue;
  onChange: (v: MapLocationValue) => void;
  height?: number;
}

// ── Nominatim helpers ─────────────────────────────────────────────────────────
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en' } },
    );
    const d = await r.json() as { display_name?: string };
    return d.display_name ?? '';
  } catch {
    return '';
  }
}

async function geocodeSearch(query: string): Promise<Array<{ lat: string; lon: string; display_name: string }>> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
      { headers: { 'Accept-Language': 'en' } },
    );
    return r.json() as Promise<Array<{ lat: string; lon: string; display_name: string }>>;
  } catch {
    return [];
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** Recenter the map whenever the controlled center prop changes */
function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  const prevCenter = useRef<[number, number]>(center);
  useEffect(() => {
    if (prevCenter.current[0] !== center[0] || prevCenter.current[1] !== center[1]) {
      map.setView(center, DEFAULT_ZOOM);
      prevCenter.current = center;
    }
  }, [center, map]);
  return null;
}

/** Draggable marker — calls onMove on drag end, also on map click */
function DraggableMarker({ position, onMove }: { position: [number, number]; onMove: (pos: [number, number]) => void }) {
  const markerRef = useRef<L.Marker>(null);

  useMapEvents({
    click(e) { onMove([e.latlng.lat, e.latlng.lng]); },
  });

  const handlers = useMemo(
    () => ({
      dragend() {
        const m = markerRef.current;
        if (m) onMove([m.getLatLng().lat, m.getLatLng().lng]);
      },
    }),
    [onMove],
  );

  return <Marker draggable position={position} ref={markerRef} eventHandlers={handlers} />;
}

// ── Main component ────────────────────────────────────────────────────────────

export function MapLocationPicker({ value, onChange, height = 280 }: Props) {
  const lat = value.lat || DEFAULT_LAT;
  const lng = value.lng || DEFAULT_LNG;

  const [center, setCenter] = useState<[number, number]>([lat, lng]);
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ lat: string; lon: string; display_name: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external lat/lng into internal center when dialog opens with existing values
  useEffect(() => {
    if (value.lat && value.lng) setCenter([value.lat, value.lng]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMove = useCallback(async (pos: [number, number]) => {
    setCenter(pos);
    const address = await reverseGeocode(pos[0], pos[1]);
    onChange({ lat: pos[0], lng: pos[1], address });
  }, [onChange]);

  const handleSearchInput = (q: string) => {
    setSearchInput(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const results = await geocodeSearch(q);
      setSuggestions(results.slice(0, 5));
      setSearching(false);
    }, 500);
  };

  const handleSuggestionClick = (item: { lat: string; lon: string; display_name: string }) => {
    const pos: [number, number] = [parseFloat(item.lat), parseFloat(item.lon)];
    setCenter(pos);
    setSuggestions([]);
    setSearchInput('');
    onChange({ lat: pos[0], lng: pos[1], address: item.display_name });
  };

  const handleMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setCenter(p);
        const address = await reverseGeocode(p[0], p[1]);
        onChange({ lat: p[0], lng: p[1], address });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="space-y-2">
      {/* Search bar */}
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search hospital name or address…"
            className="pl-9 pr-3"
            value={searchInput}
            onChange={(e) => handleSearchInput(e.target.value)}
          />
          {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
          {suggestions.length > 0 && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-popover border rounded-md shadow-md z-[9999] max-h-48 overflow-y-auto">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent truncate"
                  onClick={() => handleSuggestionClick(s)}
                >
                  {s.display_name}
                </button>
              ))}
            </div>
          )}
        </div>
        <Button type="button" variant="outline" size="icon" onClick={handleMyLocation} title="My location" disabled={locating}>
          {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
        </Button>
      </div>

      {/* Map */}
      <div className="rounded-md overflow-hidden border">
        <MapContainer
          center={center}
          zoom={DEFAULT_ZOOM}
          style={{ height, width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapRecenter center={center} />
          <DraggableMarker position={center} onMove={handleMove} />
        </MapContainer>
      </div>
      <p className="text-xs text-muted-foreground">
        Click or drag the pin to the exact hospital entrance.
        Coordinates: <span className="font-mono">{lat.toFixed(6)}, {lng.toFixed(6)}</span>
      </p>
    </div>
  );
}
