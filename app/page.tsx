"use client";

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
    <main className="flex flex-col min-h-screen bg-white">
      {/* Hero */}
      <div className="w-full max-w-7xl h-screen mx-auto flex items-center justify-center">
        <div className="mx-4 md:mx-8 rounded-3xl bg-emerald-50/95 shadow-xl p-10 md:p-20 lg:p-32 text-center w-full">
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold mb-6 text-emerald-900">GatorGreen</h1>
          <p className="text-2xl md:text-3xl lg:text-4xl font-extrabold mb-8 leading-tight text-emerald-600">
            Environmental opportunities and sustainability platform
          </p>
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <Link href="/map" className="inline-block">
              <span className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-lg md:text-xl inline-block">
                Open Map
              </span>
            </Link>
            <Link href="/extension" className="inline-block">
              <span className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-lg md:text-xl inline-block">
                Install Chrome Extension
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Animated info band + fading box */}
      <div ref={sectionRef}>
        <div
          className={`w-full h-[25vh] flex items-center justify-center rounded-t-2xl transition-opacity duration-1000 ease-in-out ${
            visible ? "bg-emerald-600 opacity-100" : "bg-emerald-600 opacity-0"
          }`}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white">What is GatorGreen?</h2>
        </div>

        <section className="w-full flex items-center justify-center py-12">
          <div className="w-full px-0">
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
      className={`mx-auto bg-white rounded-2xl p-8 shadow-xl w-full transition-opacity duration-1000 ease-in-out ${
        visible ? "opacity-100 delay-300" : "opacity-0"
      }`}
      style={{ maxWidth: "100%" }}
    >
      <p className="text-lg md:text-xl text-emerald-900 leading-relaxed">
        GatorGreen helps you find and track eco-friendly opportunities, learn practical tips, and see your impact over time.
      </p>
    </div>
  );
}

function Footprints({ targetRef }: { targetRef: React.RefObject<HTMLElement | null> }) {
  const [count, setCount] = useState(0);
  const max = 12;

  useEffect(() => {
    const onScroll = () => {
      const el = targetRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      let progress = (vh - rect.top) / (vh + rect.height);
      progress = Math.max(0, Math.min(1, progress));
      const newCount = Math.round(progress * max);
      setCount(newCount);
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
    <div className="fixed right-8 top-1/4 flex flex-col gap-4 z-50 pointer-events-none">
      {Array.from({ length: max }).map((_, i) => {
        const isVisible = i < count;
        const isLeft = i % 2 === 0;
        const offset = isLeft ? -10 : 10;
        const angle = isLeft ? -12 : 12;
        const transform = `scaleY(-1) ${isLeft ? "scaleX(-1)" : ""} translateX(${offset}px) rotate(${angle}deg)`;
        return (
          <svg
            key={i}
            className={`w-12 h-12 transition-opacity duration-500 ease-out ${isVisible ? "opacity-100" : "opacity-0"}`}
            style={{ transform }}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <g fill="none" fillRule="evenodd">
              <path d="M0 0h24v24H0z" />
              <ellipse cx="6" cy="15" rx="2.8" ry="2.0" fill="#34d399" />
              <ellipse cx="10.5" cy="9.8" rx="3.8" ry="3.2" fill="#34d399" />
              <circle cx="14.0" cy="6.4" r="1.0" fill="#34d399" />
              <circle cx="12.2" cy="5.6" r="0.9" fill="#34d399" />
              <circle cx="10.0" cy="6.0" r="0.75" fill="#34d399" />
            </g>
          </svg>
        );
      })}
    </div>
  );
}
