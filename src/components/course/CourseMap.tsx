/**
 * Course Map Integration
 *
 * Leaflet-based course map with player location,
 * hole markers, and yardage display.
 */

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Crosshair, MapPin } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/common/Card';
import type { Course, CourseHole } from '@/types/database';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const GREEN_ICON = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  className: 'tmgl-green-marker',
});

interface CourseMapProps {
  course: Course;
  holes: CourseHole[];
  center?: [number, number];
  className?: string;
}

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

function LocationButton({ onLocate }: { onLocate: () => void }) {
  return (
    <button
      onClick={onLocate}
      className="absolute top-2 right-2 z-[1000] bg-white rounded-lg shadow-lg p-2 hover:bg-gray-50 transition-colors"
      title="My Location"
    >
      <Crosshair className="w-5 h-5 text-tmgl-green-700" />
    </button>
  );
}

export function CourseMap({ course, holes, center, className = '' }: CourseMapProps) {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [selectedHole, setSelectedHole] = useState<number | null>(null);
  const mapRef = useRef<L.Map>(null);

  const defaultCenter: [number, number] = center ?? [33.6844, 73.0479]; // Islamabad fallback

  const handleLocate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(loc);
        mapRef.current?.setView(loc, 16);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="w-4 h-4 text-tmgl-green-700" />
          Course Map
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative h-[400px] rounded-b-xl overflow-hidden">
          <MapContainer
            center={defaultCenter}
            zoom={15}
            className="h-full w-full"
            ref={mapRef as never}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <RecenterMap center={userLocation ?? defaultCenter} />

            {course.location && (
              <Marker position={defaultCenter}>
                <Popup>
                  <strong>{course.name}</strong><br />
                  {course.location}
                </Popup>
              </Marker>
            )}

            {userLocation && (
              <Marker position={userLocation} icon={GREEN_ICON}>
                <Popup>You are here</Popup>
              </Marker>
            )}
          </MapContainer>

          <LocationButton onLocate={handleLocate} />
        </div>

        {holes.length > 0 && (
          <div className="p-3 border-t border-tmgl-charcoal-100">
            <p className="text-xs font-semibold text-tmgl-charcoal-500 uppercase tracking-wide mb-2">Yardage Chart</p>
            <div className="grid grid-cols-9 gap-1">
              {holes.slice(0, 18).map((h) => (
                <button
                  key={h.hole_number}
                  onClick={() => setSelectedHole(selectedHole === h.hole_number ? null : h.hole_number)}
                  className={`text-center p-1.5 rounded text-xs transition-colors ${
                    selectedHole === h.hole_number
                      ? 'bg-tmgl-green-700 text-white'
                      : 'bg-tmgl-charcoal-50 hover:bg-tmgl-charcoal-100 text-tmgl-charcoal-700'
                  }`}
                >
                  <div className="font-bold">{h.hole_number}</div>
                  <div className="text-[10px] text-tmgl-charcoal-400">P{h.par}</div>
                  {h.yardage && <div className="text-[10px] font-medium">{h.yardage}</div>}
                </button>
              ))}
            </div>
            {selectedHole && (() => {
              const hole = holes.find(h => h.hole_number === selectedHole);
              if (!hole) return null;
              return (
                <div className="mt-2 p-2 bg-tmgl-green-50 rounded-lg text-sm">
                  <span className="font-bold text-tmgl-green-800">Hole {hole.hole_number}</span>
                  <span className="mx-1.5 text-tmgl-charcoal-300">|</span>
                  <span className="text-tmgl-charcoal-600">Par {hole.par}</span>
                  {hole.yardage && (
                    <>
                      <span className="mx-1.5 text-tmgl-charcoal-300">|</span>
                      <span className="text-tmgl-charcoal-600">{hole.yardage} yds</span>
                    </>
                  )}
                  {hole.handicap_index && (
                    <>
                      <span className="mx-1.5 text-tmgl-charcoal-300">|</span>
                      <span className="text-tmgl-charcoal-600">HCP {hole.handicap_index}</span>
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
