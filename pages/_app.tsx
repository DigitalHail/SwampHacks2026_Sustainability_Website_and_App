import type { AppProps } from 'next/app'
import Head from 'next/head'
import Header from '../components/Header'
import '../styles/globals.css'

export default function MyApp({ Component, pageProps }: AppProps) {
  // create a small SVG favicon colored to match WattWise (emerald)
  const svg = `
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
      <!-- simple stylized foot silhouette -->
      <path d='M48 16c-3-4-8-6-12-5-3 1-5 3-6 6-1 2-4 3-6 3-3 0-6 2-8 5-3 4-4 10-2 15 2 6 7 10 13 12 6 2 13 1 18-3 5-4 8-11 7-18-1-6-4-11-4-15z' fill='#34d399' stroke='#0f5132' stroke-width='0.6'/>
      <!-- toe accents -->
      <g fill='%23ffffff' opacity='0.95' font-family='Arial, sans-serif' font-weight='700' font-size='22' text-anchor='middle'>
        <text x='50%' y='54%' dominant-baseline='middle'>W</text>
      </g>
    </svg>`
  const favicon = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`

  return (
    <>
      <Head>
        <link rel="icon" href={favicon} />
      </Head>
      <Header />
      <main className="pt-4">
        <Component {...pageProps} />
      </main>
    </>
  )
}
