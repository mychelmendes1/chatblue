"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export default function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-lp-darker/90 backdrop-blur-xl shadow-lg border-b border-white/10"
          : "bg-black/20 backdrop-blur-[20px] border-b border-white/20 shadow-[0px_2px_6px_rgba(0,0,0,0.25)]"
      }`}
    >
      <div className="max-w-[1440px] mx-auto px-[112px] h-[95px] flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-[13px]">
          <Image
            src="/landing/logo-symbol.svg"
            alt="LP com IA logo"
            width={45}
            height={33}
          />
          <div className="flex items-baseline">
            <span
              className="font-jakarta text-lp-gray-light"
              style={{ fontSize: "25.97px", fontWeight: 400, lineHeight: "25.97px", letterSpacing: "-0.52px" }}
            >
              LP
            </span>
            <span
              className="font-jakarta text-white"
              style={{ fontSize: "25.97px", fontWeight: 700, lineHeight: "25.97px", letterSpacing: "-0.52px" }}
            >
              comIA
            </span>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-5">
          <button className="font-jakarta text-white text-base font-semibold tracking-[-0.32px] px-6 py-3 rounded-lg border border-white/40 hover:bg-white/10 transition-colors">
            Ver demo
          </button>
          <button className="font-jakarta text-white text-base font-semibold tracking-[-0.32px] px-6 py-3 rounded-lg bg-lp-primary hover:bg-lp-primary/90 transition-colors">
            Começar grátis
          </button>
        </div>
      </div>
    </header>
  );
}
