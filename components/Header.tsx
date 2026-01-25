"use client"

import Link from 'next/link'
import { useRouter } from 'next/router'

export default function Header() {
  const router = useRouter()
  const isActive = (p: string) => router.pathname === p

  return (
    <header className="bg-white border-b">
      <div className="w-full px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 text-2xl font-bold text-emerald-900">
          <svg className="w-9 h-9 flex-shrink-0 self-end translate-y-1" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <rect x='8' y='8' width='48' height='28' rx='3' fill='#34d399'/>
            <rect x='12' y='12' width='40' height='20' rx='2' fill='#b7f5d7'/>
            <rect x='6' y='38' width='52' height='6' rx='1' fill='#34d399'/>
          </svg>
          <span>WattWise</span>
        </div>
        <nav className="flex gap-4">
          <Link href="/" className={isActive('/') ? 'text-emerald-600 font-semibold' : 'text-black'}>Home</Link>
          <Link href="/settings" className={isActive('/settings') ? 'text-emerald-600 font-semibold' : 'text-black'}>Settings</Link>
        </nav>
      </div>
    </header>
  )
}
