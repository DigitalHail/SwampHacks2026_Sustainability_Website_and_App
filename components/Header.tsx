"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();
  const isActive = (p: string) => pathname === p;

  return (
    <header className="bg-white border-b relative z-[200]" style={{ backgroundColor: '#ffffff' }}>
      <div className="w-full px-4 py-1 flex items-center justify-between">
        <div className="flex items-center gap-3 text-2xl font-bold text-emerald-900">
          <Image
            src="/images/New GatorGreen.PNG"
            alt="GatorGreen Logo"
            width={64}
            height={80}
            className="h-20 w-16 flex-shrink-0"
          />
          <span>GatorGreen</span>
        </div>
        <nav className="flex gap-4">
          <Link href="/" className={isActive("/") ? "text-emerald-600 font-semibold" : "text-black"}>
            Home
          </Link>
          <Link
            href="/map"
            className={isActive("/map") ? "text-emerald-600 font-semibold" : "text-black"}
          >
            Map
          </Link>
          <Link
            href="/extension"
            className={isActive("/extension") ? "text-emerald-600 font-semibold" : "text-black"}
          >
            Extension
          </Link>
          <Link
            href="/our-team"
            className={isActive("/our-team") ? "text-emerald-600 font-semibold" : "text-black"}
          >
            Our Team
          </Link>
        </nav>
      </div>
    </header>
  );
}
