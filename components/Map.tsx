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

interface POI {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: string;
  category: string;
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
  const [pois, setPois] = useState<POI[]>([]);
  const [loadingPOIs, setLoadingPOIs] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["shop", "amenity"]);
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

  const fetchNearbyPOIs = async (lat: number, lng: number, radius = 1000) => {
    setLoadingPOIs(true);
    try {
      // Build Overpass QL query for nearby places - each category is a separate query part
      const nodeQueries = selectedCategories.map(cat => `node["${cat}"](around:${radius},${lat},${lng});`).join('\n');
      const wayQueries = selectedCategories.map(cat => `way["${cat}"](around:${radius},${lat},${lng});`).join('\n');
      
      const query = `
        [out:json][timeout:25];
        (
          ${nodeQueries}
          ${wayQueries}
        );
        out center;
      `;

      console.log("Fetching POIs with query:", query);

      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: `data=${encodeURIComponent(query)}`,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      const data = await response.json();
      console.log("Overpass API response:", data);
      
      const newPOIs: POI[] = data.elements
        .filter((el: any) => {
          const hasCoords = (el.lat || el.center?.lat) && (el.lon || el.center?.lon);
          const hasName = el.tags?.name;
          return hasCoords && hasName;
        })
        .slice(0, 50) // Limit to 50 POIs
        .map((el: any) => ({
          id: `${el.type}-${el.id}`,
          name: el.tags.name,
          lat: el.lat || el.center?.lat,
          lng: el.lon || el.center?.lon,
          type: el.tags.shop || el.tags.amenity || el.tags.building || "place",
          category: el.tags.shop ? "shop" : el.tags.amenity ? "amenity" : "other",
        }));

      console.log("Parsed POIs:", newPOIs);
      setPois(newPOIs);
      
      if (newPOIs.length === 0) {
        alert("No places found nearby. Try a different location or zoom level.");
      }
    } catch (error) {
      console.error("Error fetching POIs:", error);
      alert("Failed to load nearby places");
    } finally {
      setLoadingPOIs(false);
    }
  };

  const handleLoadNearbyPlaces = () => {
    const center = selectedLocation || (location ? {
      lat: location.latitude,
      lng: location.longitude,
    } : null);

    if (!center) {
      alert("Please search for a location or use your location first");
      return;
    }

    fetchNearbyPOIs(center.lat, center.lng);
  };

  return (
    <div className="w-full h-screen flex flex-col">
      {/* Search Bar */}
      <div className="bg-white shadow-md p-4 z-10 flex-shrink-0">
        <form onSubmit={handleSearch} className="flex gap-2 mb-2">
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
        <div className="flex gap-2 items-center">
          <button
            type="button"
            onClick={handleLoadNearbyPlaces}
            disabled={loadingPOIs}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition font-semibold disabled:opacity-50"
          >
            {loadingPOIs ? "Loading..." : "Load Nearby Places"}
          </button>
          <span className="text-xs text-gray-600">
            {pois.length > 0 && `${pois.length} places found`}
          </span>
        </div>
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

            {pois.map((poi) => (
              <Marker key={poi.id} position={[poi.lat, poi.lng]}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{poi.name}</p>
                    <p className="text-gray-600 text-xs capitalize">{poi.type}</p>
                    <p className="text-gray-500 text-xs">
                      {poi.lat.toFixed(4)}, {poi.lng.toFixed(4)}
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
