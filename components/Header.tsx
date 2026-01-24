"use client"

import Link from 'next/link'
import { useRouter } from 'next/router'

export default function Header() {
  const router = useRouter()
  const isActive = (p: string) => router.pathname === p

  return (
    <header className="bg-white border-b">
      <div className="w-full px-4 py-3 flex items-center justify-between">
        <div className="text-2xl font-bold text-emerald-900">WattWise</div>
        <nav className="flex gap-4">
          <Link href="/" className={isActive('/') ? 'text-emerald-600 font-semibold' : 'text-black'}>Home</Link>
          <Link href="/settings" className={isActive('/settings') ? 'text-emerald-600 font-semibold' : 'text-black'}>Settings</Link>
        </nav>
      </div>
    </header>
  )
}
