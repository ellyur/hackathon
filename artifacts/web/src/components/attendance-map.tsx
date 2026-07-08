/**
 * Live GPS attendance map — shows the student's moving position relative
 * to the assigned hospital with a coloured attendance-radius circle.
 * Uses Leaflet + OpenStreetMap. No API key required.
 */
import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import '../lib/leaflet-init';

// ── Custom marker icons ───────────────────────────────────────────────────────

/** Blue pulsing dot for the student's live position */
const studentIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:18px;height:18px;border-radius:50%;
    background:#3b82f6;border:3px solid white;
    box-shadow:0 0 0 3px rgba(59,130,246,0.4);
    animation:pulse 2s infinite;
  "></div>
  <style>@keyframes pulse{0%,100%{box-shadow:0 0 0 3px rgba(59,130,246,0.4)}50%{box-shadow:0 0 0 8px rgba(59,130,246,0.1)}}</style>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

/** Red hospital cross icon */
const hospitalIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:28px;height:28px;border-radius:50%;
    background:#ef4444;border:3px solid white;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 2px 6px rgba(0,0,0,0.3);
    font-size:14px;line-height:1;color:white;font-weight:bold;
  ">+</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// ── Auto-fit bounds ───────────────────────────────────────────────────────────

function MapAutoFit({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length < 2) return;
    try {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 17 });
    } catch {
      // bounds may be invalid if positions are identical
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions[0]?.[0], positions[0]?.[1], positions[1]?.[0], positions[1]?.[1]]);
  return null;
}

// ── Props ─────────────────────────────────────────────────────────────────────

export type GpsZoneStatus = 'outside' | 'approaching' | 'inside' | 'no-hospital';

export interface AttendanceMapProps {
  hospitalLat: number;
  hospitalLng: number;
  attendanceRadius: number;
  studentLat: number | null;
  studentLng: number | null;
  status: GpsZoneStatus;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AttendanceMap({
  hospitalLat,
  hospitalLng,
  attendanceRadius,
  studentLat,
  studentLng,
  status,
}: AttendanceMapProps) {
  const hasHospital = hospitalLat !== 0 || hospitalLng !== 0;
  const hasStudent = studentLat !== null && studentLng !== null;

  const circleColor = status === 'inside' ? '#22c55e' : status === 'approaching' ? '#f59e0b' : '#ef4444';

  const defaultCenter: [number, number] = hasHospital
    ? [hospitalLat, hospitalLng]
    : hasStudent
    ? [studentLat!, studentLng!]
    : [14.5995, 120.9842];

  const fitPositions = useMemo<[number, number][]>(() => {
    const pts: [number, number][] = [];
    if (hasHospital) pts.push([hospitalLat, hospitalLng]);
    if (hasStudent) pts.push([studentLat!, studentLng!]);
    return pts;
  }, [hasHospital, hospitalLat, hospitalLng, hasStudent, studentLat, studentLng]);

  return (
    <MapContainer
      center={defaultCenter}
      zoom={15}
      style={{ height: '280px', width: '100%' }}
      zoomControl={true}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Hospital marker + attendance radius circle */}
      {hasHospital && (
        <>
          <Marker position={[hospitalLat, hospitalLng]} icon={hospitalIcon} />
          <Circle
            center={[hospitalLat, hospitalLng]}
            radius={attendanceRadius}
            pathOptions={{ color: circleColor, fillColor: circleColor, fillOpacity: 0.12, weight: 2 }}
          />
        </>
      )}

      {/* Student live position */}
      {hasStudent && (
        <>
          <Marker position={[studentLat!, studentLng!]} icon={studentIcon} />
          {/* Route line */}
          {hasHospital && (
            <Polyline
              positions={[[studentLat!, studentLng!], [hospitalLat, hospitalLng]]}
              pathOptions={{ color: '#6366f1', weight: 2.5, dashArray: '6 6', opacity: 0.7 }}
            />
          )}
        </>
      )}

      {/* Auto-fit to show both markers */}
      <MapAutoFit positions={fitPositions} />
    </MapContainer>
  );
}
