import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-white p-6">
      <div className="w-full max-w-7xl">
        <div className="mx-4 md:mx-8 rounded-3xl bg-green-50/95 shadow-xl p-10 md:p-20 lg:p-32 text-center">
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold mb-6 text-emerald-900">WattWise</h1>
          <p className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-8 leading-tight text-emerald-600">Track your eco-friendly actions and learn new tips.</p>
          <Link href="/settings" className="inline-block bg-green-600 hover:bg-green-700 text-white px-10 py-5 rounded-full text-lg md:text-xl">Get Started</Link>
        </div>
      </div>
    </main>
  )
}