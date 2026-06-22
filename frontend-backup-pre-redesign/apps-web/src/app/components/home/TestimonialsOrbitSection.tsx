"use client";

import * as React from "react";
import Image, { type StaticImageData } from "next/image";
import { AnimatePresence, motion } from "framer-motion";

import RedditLogo from "@/assets/testimonials/reddit_logo.png";
import RedditImg from "@/assets/testimonials/reddit_img.png";
import ZoomLogo from "@/assets/testimonials/zoom_logo.png";
import ZoomImg from "@/assets/testimonials/zoom_img.png";
import WhatsappLogo from "@/assets/testimonials/whatsapp_logo.png";
import WhatsappImg from "@/assets/testimonials/whatsapp_img.png";
import AsanaLogo from "@/assets/testimonials/asana_logo.png";
import AsanaImg from "@/assets/testimonials/asana_img.png";
import TelegramLogo from "@/assets/testimonials/telegram_logo.png";
import TelegramImg from "@/assets/testimonials/telegram_img.png";
import circle from "@/assets/testimonials/circle.png";
import { cx } from "@/lib/helpers";

type ImgSrc = string | StaticImageData;

type TestimonialSlide = {
  key: string;
  quote: string;
  name: string;
  role: string;
  company: string;
  accent: string;
  productImage: ImgSrc;
  orbitIcon: ImgSrc;
  orbitIconAlt: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function useElementSize<T extends HTMLElement>() {
  const ref = React.useRef<T | null>(null);
  const [width, setWidth] = React.useState<number>(0);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0].contentRect.width);
      if (w > 0) setWidth(w);
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, width };
}

/**
 * Wider arc so some logos sit off-canvas on desktop (card clips them), matching the screenshot.
 */
function buildArcAngles(count: number, startDeg = -140, endDeg = 140) {
  if (count <= 1) return [0];
  const step = (endDeg - startDeg) / (count - 1);
  return Array.from({ length: count }, (_, i) => startDeg + i * step);
}

function OrbitNav({
  slides,
  activeIndex,
  onSelect,
  rotationDeg,
  circleImage,
  size,
  pad,
  activeSize,
  idleSize,
}: {
  slides: TestimonialSlide[];
  activeIndex: number;
  onSelect: (i: number) => void;
  rotationDeg: number;
  circleImage: ImgSrc;
  size: number; // OUTER box size (includes bubble safe-area)
  pad: number; // ring inset inside safe-area
  activeSize: number;
  idleSize: number;
}) {
  const angles = React.useMemo(() => buildArcAngles(slides.length), [slides.length]);

  return (
    <div
      className="relative"
      style={
        {
          width: size,
          height: size,
          ["--orbit-size" as any]: `${size}px`,
          ["--orbit-pad" as any]: `${pad}px`,
          ["--active-size" as any]: `${activeSize}px`,
          ["--idle-size" as any]: `${idleSize}px`,
          // safe-area keeps bubbles inside the box on mobile
          ["--orbit-safe" as any]: "calc((var(--active-size) / 2) + 10px)",
          // ring sits inside safe-area
          ["--ring-inset" as any]: "calc(var(--orbit-safe) + var(--orbit-pad))",
          // orbit radius based on INNER circle (outer /2 minus ring inset)
          ["--orbit-radius" as any]: "calc((var(--orbit-size) / 2) - var(--ring-inset))",
        } as React.CSSProperties
      }
    >
      {/* ring line (authoritative) */}
      <div className="pointer-events-none absolute inset-[var(--ring-inset)] rounded-full border border-[rgba(232,33,37,0.18)]" />

      {/* rotate orbit so active lands on spotlight (rightmost / 0deg) */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: rotationDeg }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        style={{ transformOrigin: "50% 50%" }}
      >
        {slides.map((s, i) => {
          const angle = angles[i];
          const isActive = i === activeIndex;

          return (
            <div
              key={s.key}
              className="absolute left-1/2 top-1/2"
              style={
                {
                  transformOrigin: "0 0",
                  transform: `rotate(${angle}deg) translateX(var(--orbit-radius))`,
                } as React.CSSProperties
              }
            >
              {/* center bubble exactly on ring */}
              <div style={{ transform: "translate(-50%, -50%)" }}>
                <motion.button
                  type="button"
                  onClick={() => onSelect(i)}
                  className={cx(
                    "relative grid place-items-center rounded-full",
                    "border transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
                  )}
                  style={{ zIndex: isActive ? 3 : 1 }}
                  animate={{
                    rotate: -(rotationDeg + angle),
                    width: isActive ? activeSize : idleSize,
                    height: isActive ? activeSize : idleSize,
                    backgroundColor: "white",
                    borderColor: isActive ? "transparent" : "rgba(0,0,0,0.08)",
                    boxShadow: isActive
                      ? "0 18px 42px rgba(0,0,0,0.16)"
                      : "0 10px 22px rgba(0,0,0,0.08)",
                  }}
                  transition={{ type: "spring", stiffness: 320, damping: 26 }}
                  aria-current={isActive ? "true" : undefined}
                  aria-label={`Show testimonial: ${s.company}`}
                >
                  <motion.span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full"
                    animate={{
                      opacity: isActive ? 1 : 0,
                      boxShadow: isActive ? `0 0 0 10px ${hexToRgba(s.accent, 0.12)}` : "none",
                    }}
                    transition={{ duration: 0.25 }}
                  />

                  <div
                    className="relative"
                    style={{
                      width: Math.round((isActive ? activeSize : idleSize) * 0.46),
                      height: Math.round((isActive ? activeSize : idleSize) * 0.46),
                    }}
                  >
                    <Image
                      src={s.orbitIcon}
                      alt={s.orbitIconAlt}
                      fill
                      className={cx("object-contain")}
                      sizes="64px"
                    />
                  </div>
                </motion.button>
              </div>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}

export default function TestimonialsOrbitSection({
  title = "Testimonials",
  slides = DEFAULT_SLIDES,
  autoMs = 2000,
  circleImage = circle,
}: {
  title?: string;
  slides?: TestimonialSlide[];
  autoMs?: number;
  circleImage?: ImgSrc;
}) {
  const usedSlides = React.useMemo(() => slides.slice(0, 5), [slides]);

  const [active, setActive] = React.useState(() => {
    const idx = usedSlides.findIndex((s) => s.company.toLowerCase() === "reddit");
    return idx >= 0 ? idx : 0;
  });
  const [paused, setPaused] = React.useState(false);

  const count = usedSlides.length;
  const angles = React.useMemo(() => buildArcAngles(count), [count]);

  const rotationDeg = React.useMemo(() => {
    const spotlightDeg = 0;
    return spotlightDeg - angles[clamp(active, 0, count - 1)];
  }, [active, angles, count]);

  React.useEffect(() => {
    if (paused || count <= 1) return;
    const id = window.setInterval(() => setActive((p) => (p + 1) % count), autoMs);
    return () => window.clearInterval(id);
  }, [paused, autoMs, count]);

  const slide = usedSlides[clamp(active, 0, count - 1)];

  // MOBILE orbit size measured from available width so it never exceeds the card
  const { ref: mobileOrbitWrapRef, width: mobileWrapW } = useElementSize<HTMLDivElement>();
  const mobileSize = clamp(mobileWrapW || 280, 240, 300); // outer box
  const mobileActive = 60;
  const mobileIdle = 38;

  return (
    <section className="container">
      <div className="padding-section-md">
        <h3 className="text-black">{title}</h3>

        <div
          className={cx(
            "mt-10 overflow-hidden rounded-[18px] border border-black/10 bg-white",
            "shadow-[0_18px_50px_rgba(0,0,0,0.06)]"
          )}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="grid min-h-[360px] grid-cols-1 lg:grid-cols-[260px_1fr_460px]">
            {/* LEFT ORBIT (desktop): clipped by card */}
            <div className="relative hidden lg:block">
              <div className="absolute left-[-210px] top-1/2 -translate-y-1/2">
                <OrbitNav
                  slides={usedSlides}
                  activeIndex={active}
                  rotationDeg={rotationDeg}
                  onSelect={setActive}
                  circleImage={circleImage}
                  size={420}
                  pad={18}
                  activeSize={72}
                  idleSize={42}
                />
              </div>
            </div>

            {/* MOBILE ORBIT: always fits */}
            <div className="px-6 pt-8 lg:hidden">
              <div
                ref={mobileOrbitWrapRef}
                className="mx-auto w-full"
                style={{ maxWidth: "min(300px, calc(100vw - 48px))" }}
              >
                <div className="mx-auto w-fit">
                  <OrbitNav
                    slides={usedSlides}
                    activeIndex={active}
                    rotationDeg={rotationDeg}
                    onSelect={setActive}
                    circleImage={circleImage}
                    size={mobileSize}
                    pad={12}
                    activeSize={mobileActive}
                    idleSize={mobileIdle}
                  />
                </div>
              </div>
            </div>

            {/* CENTER COPY */}
            <div className="flex items-center px-6 pb-10 pt-6 sm:px-8 lg:px-10 lg:py-12">
              <AnimatePresence mode="wait">
                <motion.div
                  key={slide.key}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                >
                  <div className="max-w-[560px] text1 text-black/90">“{slide.quote}”</div>

                  <div className="mt-7">
                    <h5 style={{ color: slide.accent }}>{slide.name}</h5>
                    <div className="mt-2 text2 text-black/65">
                      {slide.role} at <span className="font-semibold text-black">{slide.company}</span>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* RIGHT IMAGE PANEL */}
            <div className="relative min-h-[260px] sm:min-h-[320px] lg:min-h-0">
              <div
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(circle_at_25%_40%, ${hexToRgba(slide.accent, 0.12)}, rgba(255,255,255,0) 62%)`,
                }}
              />

              <AnimatePresence mode="wait">
                <motion.div
                  key={`${slide.key}-img`}
                  className="absolute inset-0"
                  initial={{ opacity: 0, scale: 0.985 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.99 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                >
                  <Image
                    src={slide.productImage}
                    alt={`${slide.company} merch`}
                    fill
                    className="object-contain"
                    sizes="(max-width: 1024px) 100vw, 460px"
                    priority={false}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const DEFAULT_SLIDES: TestimonialSlide[] = [
  {
    key: "whatsapp",
    quote:
      "Swaggeroo turned our onboarding kits around in record time. The quality blew our new hires away and the whole process was effortless.",
    name: "Sarah Mitchell",
    role: "Head of People Operations",
    company: "WhatsApp",
    accent: "#25D366",
    orbitIcon: WhatsappLogo,
    orbitIconAlt: "WhatsApp",
    productImage: WhatsappImg,
  },
  {
    key: "zoom",
    quote:
      "From design mockups to delivery, the team handled everything. Our branded merch finally looks as premium as our product.",
    name: "David Chen",
    role: "Employer Brand Lead",
    company: "Zoom",
    accent: "#2D8CFF",
    orbitIcon: ZoomLogo,
    orbitIconAlt: "Zoom",
    productImage: ZoomImg,
  },
  {
    key: "reddit",
    quote:
      "We ordered event swag for 2,000 attendees and not a single detail slipped. Reliable, fast, and genuinely great to work with.",
    name: "Priya Sharma",
    role: "Events Marketing Manager",
    company: "Reddit",
    accent: "#FF4500",
    orbitIcon: RedditLogo,
    orbitIconAlt: "Reddit",
    productImage: RedditImg,
  },
  {
    key: "telegram",
    quote:
      "Shipping to our remote team across 14 countries used to be a nightmare. Swaggeroo made it a single, simple workflow.",
    name: "Marcus Lee",
    role: "Operations Director",
    company: "Telegram",
    accent: "#229ED9",
    orbitIcon: TelegramLogo,
    orbitIconAlt: "Telegram",
    productImage: TelegramImg,
  },
  {
    key: "asana",
    quote:
      "Managing inventory and reorders from one dashboard saves us hours every month. It's become an essential part of our brand toolkit.",
    name: "Elena Rossi",
    role: "Brand Manager",
    company: "Asana",
    accent: "#F06A6A",
    orbitIcon: AsanaLogo,
    orbitIconAlt: "Asana",
    productImage: AsanaImg,
  },
];