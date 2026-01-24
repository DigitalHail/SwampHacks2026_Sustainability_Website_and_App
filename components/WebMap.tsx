"use client";

import React from "react";
import { useLocation } from "../hooks/useLocation";

export function WebMapComponent() {
  const { location, error: locationError, loading } = useLocation();

  if (loading) {
    return (
      <div className="flex justify-center items-center w-full h-full p-5 bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
          <p className="mt-4 text-base text-gray-800">Getting your location...</p>
        </div>
      </div>
    );
  }

  if (locationError || !location) {
    return (
      <div className="flex justify-center items-center w-full h-full p-5 bg-gray-50">
        <div className="text-center">
          <h2 className="text-lg font-bold text-red-600 mb-2">Location Error</h2>
          <p className="text-sm text-gray-700 mb-3">
            {locationError || "Unable to get location"}
          </p>
          <p className="text-xs text-gray-600 italic">
            Please enable location permissions in your browser settings
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center w-full h-full p-5 bg-gray-50">
      <div className="bg-white p-5 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Your Location</h2>
        <p className="text-sm text-gray-700 mb-2 font-mono">
          Latitude: {location.latitude.toFixed(4)}
        </p>
        <p className="text-sm text-gray-700 mb-3 font-mono">
          Longitude: {location.longitude.toFixed(4)}
        </p>
        <p className="text-xs text-gray-600 italic">
          Map view will be available in the next update
        </p>
      </div>
    </div>
  );
}

