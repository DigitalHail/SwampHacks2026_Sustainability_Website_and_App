git"use client";

import dynamic from "next/dynamic";

const MapComponent = dynamic(
  () => import("@/components/Map").then((m) => m.MapComponent),
  { ssr: false }
);

export default function MapPage() {
  return (
    <div className="w-full h-screen">
      <MapComponent />
    </div>
  );
}
