"use client";

import type * as L from "leaflet";
import React, { useRef, useState } from "react";
import {
    MapContainer,
    Marker,
    Popup,
    TileLayer,
    useMap,
    useMapEvents,
} from "react-leaflet";
import { useLocation } from "../hooks/useLocation";

// Leaflet icon setup is performed client-side via dynamic import in an effect below.

interface Location {
  name: string;
  lat: number;
  lng: number;
}


function MapUpdater({ location, onMapClick }: { location: Location | null; onMapClick: (e: L.LeafletMouseEvent) => void }) {
  const map = useMap();

  useMapEvents({
    click: onMapClick,
  });

  React.useEffect(() => {
    if (location) {
      map.setView([location.lat, location.lng], 13);
    }
  }, [location, map]);

  return null;
}

export function MapComponent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [markers, setMarkers] = useState<Location[]>([
    { name: "San Francisco", lat: 37.7749, lng: -122.4194 },
  ]);
  const [isLeafletReady, setIsLeafletReady] = useState(false);
  const mapRef = useRef(null);
  const { location, error: locationError, loading: locationLoading } = useLocation();

  // Client-only Leaflet icon fix to avoid SSR 'window is not defined'.
  React.useEffect(() => {
    let isMounted = true;
    (async () => {
      const leaflet = await import("leaflet");
      if (!isMounted) return;
      delete (leaflet.Icon.Default.prototype as any)._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      setIsLeafletReady(true);
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}`
      );
      const results = await response.json();

      if (results.length > 0) {
        const result = results[0];
        const newLocation: Location = {
          name: result.display_name,
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
        };
        setSelectedLocation(newLocation);
        setMarkers([newLocation]);
      } else {
        alert("Location not found. Try another search.");
      }
    } catch (error) {
      console.error("Search error:", error);
      alert("Error searching for location");
    }
  };

  const handleMapClick = (e: L.LeafletMouseEvent) => {
    const newLocation: Location = {
      name: `Lat: ${e.latlng.lat.toFixed(4)}, Lng: ${e.latlng.lng.toFixed(4)}`,
      lat: e.latlng.lat,
      lng: e.latlng.lng,
    };
    setMarkers([newLocation]);
    setSelectedLocation(newLocation);
  };

  const handleUseMyLocation = () => {
    if (!location) return;
    const newLocation: Location = {
      name: "My Location",
      lat: location.latitude,
      lng: location.longitude,
    };
    setMarkers([newLocation]);
    setSelectedLocation(newLocation);
  };

  return (
    <div className="w-full h-screen flex flex-col">
      {/* Search Bar */}
      <div className="bg-white shadow-md p-4 z-10 flex-shrink-0">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for a destination..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-semibold"
          >
            Search
          </button>
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={locationLoading || !!locationError}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-semibold disabled:opacity-50"
          >
            Use My Location
          </button>
        </form>
        {locationError && (
          <p className="text-xs text-red-600 mt-2">{locationError}</p>
        )}
        {selectedLocation && (
          <p className="text-sm text-gray-600 mt-2">
            📍 {selectedLocation.name}
          </p>
        )}
      </div>

      {/* Map Container */}
      <div style={{ height: "calc(100vh - 120px)", width: "100%" }}>
        {!isLeafletReady ? (
          <div className="flex items-center justify-center w-full h-full bg-gray-100">
            <div className="text-gray-600 text-xl">Loading map...</div>
          </div>
        ) : (
          <MapContainer
            center={[37.7749, -122.4194]}
            zoom={4}
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%" }}
            ref={mapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {markers.map((marker, idx) => (
              <Marker key={idx} position={[marker.lat, marker.lng]}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{marker.name}</p>
                    <p className="text-gray-600">
                      Lat: {marker.lat.toFixed(4)}, Lng: {marker.lng.toFixed(4)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}

            <MapUpdater location={selectedLocation} onMapClick={handleMapClick} />
          </MapContainer>
        )}
      </div>
    </div>
  );
}
