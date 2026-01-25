import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

// Footprints effect: appears as user scrolls down the section and retracts when scrolling up.

export default function Home() {
  const sectionRef = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      })
    }, { threshold: 0.2 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <main className="flex flex-col min-h-screen bg-white p-6">
      <div className="w-full max-w-7xl h-screen mx-auto flex items-center justify-center">
        <div className="mx-4 md:mx-8 rounded-3xl bg-green-50/95 shadow-xl p-10 md:p-20 lg:p-32 text-center w-full">
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold mb-6 text-emerald-900">WattWise</h1>
          <p className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-8 leading-tight text-emerald-600">Track your eco-friendly actions and learn new tips.</p>
          <Link href="/settings" className="inline-block bg-green-600 hover:bg-green-700 text-white px-10 py-5 rounded-full text-lg md:text-xl">Get Started</Link>
        </div>
      </div>

      <div ref={sectionRef}>
        <div className={`w-full h-[25vh] flex items-center justify-center rounded-t-2xl transition-opacity duration-1000 ease-in-out ${
          visible ? 'bg-emerald-600 opacity-100' : 'bg-emerald-600 opacity-0'
        }`}>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white">What is WattWise?</h2>
        </div>

        <section className="w-full flex items-center justify-center py-12">
          <div className="w-full px-0">
            {/* fading text box - now full width to match the question band */}
            <FadingBox visible={visible} />
            <Footprints targetRef={sectionRef} />
          </div>
        </section>
      </div>
    </main>
  )
}

function FadingBox({ visible }: { visible: boolean }) {
  return (
    <div
      className={`mx-auto bg-white rounded-2xl p-8 shadow-xl w-full transition-opacity duration-1000 ease-in-out ${
        visible ? 'opacity-100 delay-300' : 'opacity-0'
      }`}
      style={{ maxWidth: '100%' }}
    >
      <p className="text-lg md:text-xl text-emerald-900 leading-relaxed">
        WattWise helps you track small eco-friendly actions and learn practical tips to reduce
        energy use. Log activities, see progress over time, and earn small rewards for consistent
        improvements.
      </p>
    </div>
  )
}

function Footprints({ targetRef }: { targetRef: React.RefObject<HTMLElement | null> }) {
  const [count, setCount] = useState(0)
  const max = 12

  useEffect(() => {
    const onScroll = () => {
      const el = targetRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight
      // progress: 0 when section top is below viewport, 1 when section top near top
      let progress = (vh - rect.top) / (vh + rect.height)
      progress = Math.max(0, Math.min(1, progress))
      const newCount = Math.round(progress * max)
      setCount(newCount)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [targetRef])

  return (
    <div className="fixed right-8 top-1/4 flex flex-col gap-4 z-50 pointer-events-none">
      {Array.from({ length: max }).map((_, i) => {
        const visible = i < count
        const isLeft = i % 2 === 0
        // offsets to stagger left/right feet
        const offset = isLeft ? -10 : 10
        const angle = isLeft ? -12 : 12
        const transform = `scaleY(-1) ${isLeft ? 'scaleX(-1)' : ''} translateX(${offset}px) rotate(${angle}deg)`

        return (
          <svg
            key={i}
            className={`w-12 h-12 transition-opacity duration-500 ease-out ${
              visible ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ transform }}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <g fill="none" fillRule="evenodd">
              <path d="M0 0h24v24H0z" />
              {/* heel */}
              <ellipse cx="6" cy="15" rx="2.8" ry="2.0" fill="#34d399" />
              {/* slimmer sole so toes show */}
              <ellipse cx="10.5" cy="9.8" rx="3.8" ry="3.2" fill="#34d399" />
              {/* toes (smaller and staggered) */}
              <circle cx="14.0" cy="6.4" r="1.0" fill="#34d399" />
              <circle cx="12.2" cy="5.6" r="0.9" fill="#34d399" />
              <circle cx="10.0" cy="6.0" r="0.75" fill="#34d399" />
            </g>
          </svg>
        )
      })}
    </div>
  )
}