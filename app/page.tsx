"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function HomePage() {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            obs.disconnect();
          }
        });
      },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <main className="flex flex-col min-h-screen bg-white relative" style={{ isolation: 'isolate', backgroundColor: '#ffffff' }}>
      {/* Hero */}
      <div className="w-full max-w-7xl h-screen mx-auto flex items-center justify-center relative z-[100]">
        <div className="mx-4 md:mx-8 rounded-3xl shadow-xl p-10 md:p-20 lg:p-32 text-center w-full relative z-[100]" style={{ backgroundColor: 'rgba(236, 253, 245, 0.95)' }}>
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold mb-6 text-emerald-900">GatorGreen</h1>
          <p className="text-2xl md:text-3xl lg:text-4xl font-extrabold mb-8 leading-tight text-emerald-600">
            Environmental opportunities and sustainability platform
          </p>
          <div className="w-full flex flex-col sm:flex-row gap-4 items-center justify-center">
            <Link href="/map" className="inline-block">
              <span className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-lg md:text-xl inline-block">
                Open Map
              </span>
            </Link>
            <Link href="/extension" className="inline-block">
              <span className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-lg md:text-xl inline-block">
                Install Chrome Extension
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Powered By banner (moved above slabs) */}
      <div className="w-full flex justify-center items-center py-6 px-4 md:px-8 relative mt-[-160px]" style={{ zIndex: 2200 }}>
        <div className="max-w-5xl w-full bg-white rounded-2xl shadow-lg py-0 px-6 text-center overflow-hidden" style={{ zIndex: 2200, maxHeight: '400px' }}>
          <p className="text-4xl md:text-5xl font-extrabold text-emerald-900">Powered By</p>
          <div className="mt-0 flex flex-wrap items-center justify-center gap-4">
            <div className="h-[480px] flex items-center justify-center mt-4">
              <Image
                src="/images/Green Capital One.PNG"
                alt="Capital One"
                width={6250}
                height={2162}
                className="h-[480px] w-auto object-contain"
              />
            </div>
            <div className="h-[430px] flex items-center justify-center -mt-72">
              <Image
                src="/images/Green Gemini.PNG"
                alt="Gemini"
                width={5218}
                height={1997}
                className="h-[430px] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Animated info band + fading box */}
      <div ref={sectionRef} className="relative px-4 md:px-8 mb-12" style={{ zIndex: 2000, isolation: 'isolate' }}>
        <div
          className={`w-full h-[25vh] flex items-center justify-center rounded-t-2xl transition-opacity duration-1000 ease-in-out relative overflow-hidden ${
            visible ? "opacity-100" : "opacity-0"
          }`}
          style={{ backgroundColor: '#10b981', zIndex: 3000, position: 'relative' }}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white relative" style={{ zIndex: 2000 }}>What is GatorGreen?</h2>
        </div>

        <section className="w-full flex items-center justify-center py-12 relative overflow-hidden rounded-b-2xl -mt-1" style={{ backgroundColor: '#ffffff', zIndex: 2000, position: 'relative' }}>
          <div className="w-full px-0 relative" style={{ backgroundColor: '#ffffff', zIndex: 2000 }}>
            <FadingBox visible={visible} />
            <Footprints targetRef={sectionRef} />
          </div>
        </section>
      </div>
    </main>
  );
}

function FadingBox({ visible }: { visible: boolean }) {
  return (
    <div
      className={`mx-auto bg-white rounded-2xl p-8 shadow-xl w-full transition-opacity duration-1000 ease-in-out relative ${
        visible ? "opacity-100 delay-300" : "opacity-0"
      }`}
      style={{ maxWidth: "100%", zIndex: 3100 }}
    >
      <p className="text-2xl md:text-3xl text-emerald-900 leading-relaxed">
        Gator Green is a sustainability-focused venture which provides an interactive map that helps users discover nearby volunteering and community service opportunities. It also offers a Chrome extension called WattWise, which evaluates the sustainability of consumer products using factors such as carbon dioxide emissions, repairability, and AI-driven analysis.
        <br /><br />
        By tracking and managing a user's carbon footprint, the platform recommends more sustainable purchasing choices and raises awareness of the environmental impact of everyday consumer decisions.
      </p>
    </div>
  );
}

function Footprints({ targetRef }: { targetRef: React.RefObject<HTMLElement | null> }) {
  const [count, setCount] = useState(0);
  const [behindContent, setBehindContent] = useState(false);
  const max = 30;

  useEffect(() => {
    const onScroll = () => {
      // Start showing footprints as soon as user scrolls
      const scrollY = window.scrollY;
      const vh = window.innerHeight;
      
      // Check if footer is visible (prevent footprints from showing in footer)
      const footerElements = document.querySelector("footer");
      const isNearFooter = footerElements ? footerElements.getBoundingClientRect().top < vh : false;
      
      if (isNearFooter) {
        setCount(0); // Hide all footprints when near footer
        return;
      }
      
      let progress = scrollY / (vh * 3); // Adjust divisor to control how fast they appear
      progress = Math.max(0, Math.min(1, progress));
      const newCount = Math.round(progress * max);
      setCount(newCount);

      // Determine if footprints should be behind content
      const el = targetRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const contentTop = rect.top;
      const contentBottom = rect.bottom;
      const isInContentZone = contentTop < vh * 0.8 && contentBottom > vh * 0.2;
      setBehindContent(isInContentZone);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [targetRef]);

  return (
    <div className="fixed right-8 top-[10vh] flex flex-col gap-4 pointer-events-none" style={{ zIndex: -1 }}>
      {Array.from({ length: max }).map((_, i) => {
        const isVisible = i < count;
        const isLeft = i % 2 === 0;
        const offset = isLeft ? -10 : 10;
        const angle = isLeft ? -12 : 12;
        const transform = `scaleY(-1) ${isLeft ? "scaleX(-1)" : ""} translateX(${offset}px) rotate(${angle}deg)`;
        return (
          <svg
            key={i}
            className={`w-14 h-14 transition-opacity duration-500 ease-out ${isVisible ? "opacity-100" : "opacity-0"}`}
            style={{ transform }}
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
        );
      })}
    </div>
  );
}
