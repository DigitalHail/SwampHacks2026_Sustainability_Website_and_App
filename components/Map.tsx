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

function MapRefSetter({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap();
  React.useEffect(() => {
    onReady(map);
  }, [map, onReady]);
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
  const [includeRepair, setIncludeRepair] = useState(true);
  const [includeVolunteer, setIncludeVolunteer] = useState(true);
  const [includeRecycling, setIncludeRecycling] = useState(true);
  const [includeParks, setIncludeParks] = useState(true);
  const [isLeafletReady, setIsLeafletReady] = useState(false);
  const mapRef = useRef(null);
  const [leafletMap, setLeafletMap] = useState<L.Map | null>(null);
  const [icons, setIcons] = useState<{ default?: L.Icon; repair?: L.Icon; volunteer?: L.Icon; recycling?: L.Icon; parks?: L.Icon }>({});
  const [listFilter, setListFilter] = useState<'all' | 'repair' | 'volunteer' | 'recycling' | 'parks'>('all');
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

      // Create colored icons for categories
      const shadowUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";
      const makeIcon = (color: "green" | "orange" | "blue" | "red") =>
        leaflet.icon({
          iconRetinaUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
          iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
          shadowUrl,
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        });

      setIcons({
        default: leaflet.Icon.Default.prototype as unknown as L.Icon,
        repair: makeIcon("orange"),
        volunteer: makeIcon("green"),
        recycling: makeIcon("blue"),
        parks: makeIcon("red"),
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

  const filteredPois = React.useMemo(() => {
    if (listFilter === 'all') return pois;
    return pois.filter(p => p.category === listFilter);
  }, [pois, listFilter]);

  const fetchNearbyPOIs = async (lat: number, lng: number, radius = 25000) => {
    setLoadingPOIs(true);
    try {
      // Build Overpass QL query: repair shops, volunteer places, and recycling centers, within a 5km radius
      const repairTags = [
        'shop="car_repair"',
        'shop="bicycle"',
        'shop="computer"',
        'shop="mobile_phone"',
        'shop="electronics"',
        'craft="electronics_repair"',
        'craft="watchmaker"',
        'craft="shoemaker"'
      ];
      const volunteerTags = [
        'office="charity"',
        'office="ngo"',
        'amenity="community_centre"',
        'amenity="social_facility"'
      ];
      const recyclingTags = [
        'amenity="recycling"',
        'recycling_type="centre"',
        'shop="scrap_metal"'
      ];
      const parksTags = [
        'leisure="park"',
        'leisure="garden"',
        'leisure="nature_reserve"'
      ];

      const makeParts = (tags: string[], kind: 'node'|'way'|'relation') =>
        tags.map(t => `${kind}[${t}](around:${radius},${lat},${lng});`).join('\n');

      const query = `
        [out:json][timeout:25];
        (
          ${includeRepair ? makeParts(repairTags, 'node') : ''}
          ${includeRepair ? makeParts(repairTags, 'way') : ''}
          ${includeRepair ? makeParts(repairTags, 'relation') : ''}
          ${includeVolunteer ? makeParts(volunteerTags, 'node') : ''}
          ${includeVolunteer ? makeParts(volunteerTags, 'way') : ''}
          ${includeVolunteer ? makeParts(volunteerTags, 'relation') : ''}
          ${includeRecycling ? makeParts(recyclingTags, 'node') : ''}
          ${includeRecycling ? makeParts(recyclingTags, 'way') : ''}
          ${includeRecycling ? makeParts(recyclingTags, 'relation') : ''}
          ${includeParks ? makeParts(parksTags, 'node') : ''}
          ${includeParks ? makeParts(parksTags, 'way') : ''}
          ${includeParks ? makeParts(parksTags, 'relation') : ''}
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
        .slice(0, 100)
        .map((el: any) => {
          const type = el.tags.shop || el.tags.amenity || el.tags.office || el.tags.craft || "place";
          const isRepair = (
            el.tags.shop === 'car_repair' ||
            el.tags.shop === 'bicycle' ||
            el.tags.shop === 'computer' ||
            el.tags.shop === 'mobile_phone' ||
            el.tags.shop === 'electronics' ||
            el.tags.craft === 'electronics_repair' ||
            el.tags.craft === 'watchmaker' ||
            el.tags.craft === 'shoemaker'
          );
          const isVolunteer = (
            el.tags.office === 'charity' ||
            el.tags.office === 'ngo' ||
            el.tags.amenity === 'community_centre' ||
            el.tags.amenity === 'social_facility'
          );
          const isRecycling = (
            el.tags.amenity === 'recycling' ||
            el.tags.recycling_type === 'centre' ||
            el.tags.shop === 'scrap_metal'
          );
          const isParks = (
            el.tags.leisure === 'park' ||
            el.tags.leisure === 'garden' ||
            el.tags.leisure === 'nature_reserve'
          );
          const category = isRepair ? 'repair' : isVolunteer ? 'volunteer' : isRecycling ? 'recycling' : isParks ? 'parks' : 'other';
          return ({
            id: `${el.type}-${el.id}`,
            name: el.tags.name,
            lat: el.lat || el.center?.lat,
            lng: el.lon || el.center?.lon,
            type,
            category,
          });
        });

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
        <div className="flex gap-2 items-center flex-wrap">
          <button
            type="button"
            onClick={handleLoadNearbyPlaces}
            disabled={loadingPOIs}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition font-semibold disabled:opacity-50"
          >
            {loadingPOIs ? "Loading..." : "Load Nearby Places of Sustainability"}
          </button>
          <label className="flex items-center gap-1 text-sm text-gray-700">
            <input type="checkbox" checked={includeRepair} onChange={(e) => setIncludeRepair(e.target.checked)} />
            Repair Shops
          </label>
          <label className="flex items-center gap-1 text-sm text-gray-700">
            <input type="checkbox" checked={includeVolunteer} onChange={(e) => setIncludeVolunteer(e.target.checked)} />
            Volunteering
          </label>
          <label className="flex items-center gap-1 text-sm text-gray-700">
            <input type="checkbox" checked={includeRecycling} onChange={(e) => setIncludeRecycling(e.target.checked)} />
            Recycling
          </label>
          <label className="flex items-center gap-1 text-sm text-gray-700">
            <input type="checkbox" checked={includeParks} onChange={(e) => setIncludeParks(e.target.checked)} />
            Parks
          </label>
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
      <div style={{ height: "calc(100vh - 120px)", width: "100%" }} className="relative">
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
              <Marker key={idx} position={[marker.lat, marker.lng]} icon={icons.default}>
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

            {pois.map((poi) => {
              const iconMap: { [key: string]: L.Icon | undefined } = {
                repair: icons.repair,
                volunteer: icons.volunteer,
                recycling: icons.recycling,
                parks: icons.parks,
              };
              return (
              <Marker key={poi.id} position={[poi.lat, poi.lng]} icon={iconMap[poi.category] || icons.default}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{poi.name}</p>
                    <p className="text-gray-600 text-xs capitalize">{poi.type}</p>
                    <p className="text-gray-500 text-xs">
                      {poi.lat.toFixed(4)}, {poi.lng.toFixed(4)}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <a
                        className="text-xs text-blue-600 hover:underline"
                        href={`https://www.google.com/maps?q=${poi.lat},${poi.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open in Google Maps
                      </a>
                      <a
                        className="text-xs text-blue-600 hover:underline"
                        href={`https://maps.apple.com/?ll=${poi.lat},${poi.lng}&q=${encodeURIComponent(poi.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open in Apple Maps
                      </a>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
            })}

            <MapUpdater location={selectedLocation} onMapClick={handleMapClick} />
            <MapRefSetter onReady={(m) => setLeafletMap(m)} />
          </MapContainer>
        )}
        {/* Sidebar list of places (overlayed above map) */}
        {pois.length > 0 && (
          <div className="absolute left-4 top-28 z-[1000] w-80 max-h-[60vh] overflow-y-auto bg-white/95 backdrop-blur rounded-lg shadow-lg border p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-emerald-800">Nearby Repair Shops & Volunteering</h3>
              <span className="text-xs text-gray-600">{filteredPois.length} shown</span>
            </div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <button
                className={`text-xs px-2 py-1 rounded border ${listFilter === 'all' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                onClick={() => setListFilter('all')}
              >
                All
              </button>
              <button
                className={`text-xs px-2 py-1 rounded border ${listFilter === 'repair' ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-orange-700 border-orange-300 hover:bg-orange-50'}`}
                onClick={() => setListFilter('repair')}
              >
                Repair Shops
              </button>
              <button
                className={`text-xs px-2 py-1 rounded border ${listFilter === 'volunteer' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-green-700 border-green-300 hover:bg-green-50'}`}
                onClick={() => setListFilter('volunteer')}
              >
                Volunteering
              </button>
              <button
                className={`text-xs px-2 py-1 rounded border ${listFilter === 'recycling' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'}`}
                onClick={() => setListFilter('recycling')}
              >
                Recycling
              </button>
              <button
                className={`text-xs px-2 py-1 rounded border ${listFilter === 'parks' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-700 border-red-300 hover:bg-red-50'}`}
                onClick={() => setListFilter('parks')}
              >
                Parks
              </button>
            </div>
            <ul className="space-y-2">
              {filteredPois.map((poi) => (
                <li key={poi.id} className="text-sm flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{poi.name}</div>
                    <div className="text-xs text-gray-600 capitalize">{poi.category} • {poi.type}</div>
                  </div>
                  <button
                    className={`text-xs px-2 py-1 rounded text-white ${
                      poi.category === 'repair' ? 'bg-orange-600 hover:bg-orange-700' :
                      poi.category === 'volunteer' ? 'bg-green-600 hover:bg-green-700' :
                      poi.category === 'recycling' ? 'bg-blue-600 hover:bg-blue-700' :
                      'bg-red-600 hover:bg-red-700'
                    }`}
                    onClick={() => leafletMap?.setView([poi.lat, poi.lng], 16)}
                  >
                    Zoom
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
