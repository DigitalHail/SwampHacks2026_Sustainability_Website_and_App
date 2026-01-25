"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-blue-50">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-emerald-600 mb-4">GatorGreen</h1>
        <p className="text-xl text-gray-600 mb-8">Environmental opportunities and sustainability platform</p>
        <Link href="/map">
          <button className="px-8 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-semibold text-lg">
            Open Map
          </button>
        </Link>
      </div>
    </div>
  );
}
