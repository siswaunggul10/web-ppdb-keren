import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapPickerProps {
  onLocationSelect: (lat: number, lng: number) => void;
  initialLocation?: { lat: number; lng: number };
}

function LocationMarker({ onLocationSelect, initialLocation }: MapPickerProps) {
  const [position, setPosition] = useState<L.LatLng | null>(
    initialLocation ? new L.LatLng(initialLocation.lat, initialLocation.lng) : null
  );

  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

export default function MapPicker({ onLocationSelect, initialLocation }: MapPickerProps) {
  const defaultCenter = initialLocation || { lat: -6.200000, lng: 106.816666 };
  const [center, setCenter] = useState<{lat: number, lng: number}>(defaultCenter);
  const [mapKey, setMapKey] = useState(0); // To force re-render MapContainer when center changes drastically

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCenter({ lat: latitude, lng: longitude });
          onLocationSelect(latitude, longitude);
          setMapKey(prev => prev + 1);
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Tidak dapat mengambil lokasi saat ini. Pastikan izin lokasi diberikan.");
        }
      );
    } else {
      alert("Geolocation tidak didukung oleh browser ini.");
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleGetLocation}
        className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-3 rounded-md transition-colors flex items-center gap-2 border border-slate-300"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path><path d="M2 12h20"></path></svg>
        Gunakan Lokasi Saat Ini
      </button>
      <div className="h-[300px] w-full rounded-lg overflow-hidden border border-slate-300 z-0 relative">
        <MapContainer key={mapKey} center={[center.lat, center.lng]} zoom={15} scrollWheelZoom={false} className="h-full w-full z-0">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker onLocationSelect={onLocationSelect} initialLocation={center} />
        </MapContainer>
      </div>
    </div>
  );
}
