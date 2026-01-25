"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();
  const isActive = (p: string) => pathname === p;

  return (
    <header className="bg-white border-b relative z-20">
      <div className="w-full px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 text-2xl font-bold text-emerald-900">
          <svg
            className="w-14 h-14 flex-shrink-0 self-end translate-y-1"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <g fill="none" fillRule="evenodd">
              <path d="M0 0h24v24H0z" />
              <ellipse cx="6" cy="18" rx="2.8" ry="2.0" fill="#34d399" />
              <ellipse cx="9.5" cy="11" rx="3.8" ry="3.2" fill="#34d399" />
              <circle cx="14.2" cy="6.5" r="1.05" fill="#34d399" />
              <circle cx="11.8" cy="5.9" r="0.95" fill="#34d399" />
              <circle cx="9.6" cy="5.4" r="0.8" fill="#34d399" />
              <circle cx="7.4" cy="5.9" r="0.65" fill="#34d399" />
              <circle cx="5.2" cy="6.9" r="0.55" fill="#34d399" />
            </g>
          </svg>
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
