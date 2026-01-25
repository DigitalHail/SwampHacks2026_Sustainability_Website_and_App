import type { AppProps } from 'next/app'
import Head from 'next/head'
import Header from '../components/Header'
import '../styles/globals.css'

export default function MyApp({ Component, pageProps }: AppProps) {
  // small SVG favicon: laptop logo (screen + lighter inset + base)
  const svg = `
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
      <!-- screen outer -->
      <rect x='8' y='8' width='48' height='28' rx='3' fill='#34d399'/>
      <!-- inner screen (lighter) -->
      <rect x='12' y='12' width='40' height='20' rx='2' fill='#b7f5d7'/>
      <!-- hinge / base (match outer screen color) -->
      <rect x='6' y='38' width='52' height='6' rx='1' fill='#34d399'/>
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
