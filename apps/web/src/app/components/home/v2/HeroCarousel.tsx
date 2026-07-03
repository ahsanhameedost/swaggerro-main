"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ChevronLeft, ChevronRight, TrendingDown, Truck } from "lucide-react";

// Decorative product imagery for the hero rail (assets live in /public/products).
const RAIL = [
  { src: "/products/classic-cotton-tee-cobalt.webp", alt: "Classic Cotton Tee", href: "/shop/classic-cotton-tee" },
  { src: "/products/insulated-tumbler-branded.webp", alt: "Insulated Tumbler", href: "/shop/insulated-tumbler" },
  { src: "/products/laptop-backpack-branded.webp", alt: "Commuter Backpack", href: "/shop/laptop-backpack" },
  { src: "/products/hardcover-notebook.webp", alt: "Hardcover Notebook", href: "/shop/hardcover-notebook" },
  { src: "/products/premium-hoodie-branded.webp", alt: "Premium Fleece Hoodie", href: "/shop/premium-hoodie" },
  { src: "/products/stainless-water-bottle-branded.webp", alt: "Stainless Water Bottle", href: "/shop/stainless-water-bottle" },
  { src: "/products/bluetooth-speaker-branded.webp", alt: "Bluetooth Speaker", href: "/shop/bluetooth-speaker" },
  { src: "/products/canvas-tote.webp", alt: "Heavyweight Canvas Tote", href: "/shop/canvas-tote" },
  { src: "/products/ceramic-mug.webp", alt: "Ceramic Camp Mug", href: "/shop/ceramic-mug" },
  { src: "/products/wireless-charging-pad.webp", alt: "Wireless Charging Pad", href: "/shop/wireless-charging-pad" },
  { src: "/products/quarter-zip-pullover.webp", alt: "Quarter-Zip Pullover", href: "/shop/quarter-zip-pullover" },
  { src: "/products/bamboo-pen-set.webp", alt: "Bamboo Pen Set", href: "/shop/bamboo-pen-set" },
];

type FeatureSlide = {
  eyebrow: string;
  titleA: string;
  highlight: string;
  titleB?: string;
  body: string;
  bg: string;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
};

const FEATURE_SLIDES: FeatureSlide[] = [
  {
    eyebrow: "Mockup Studio",
    titleA: "Your logo,",
    highlight: "flawlessly",
    titleB: "applied",
    body: "Drop your logo onto any product and get a photoreal proof in seconds — embroidery, print, or engrave, exactly as it'll ship.",
    bg: "/slider/slide-mockup.webp",
    primary: { label: "Open Mockup Studio", href: "/mockup" },
    secondary: { label: "Browse products", href: "/shop" },
  },
  {
    eyebrow: "Pack Studio",
    titleA: "Swag that feels like",
    highlight: "magic",
    body: "Build a curated pack, watch volume pricing drop as you scale, and send one claim link — we handle sizes, proofs, and shipping.",
    bg: "/slider/slide-pack.webp",
    primary: { label: "Build a pack", href: "/studio" },
    secondary: { label: "How it works", href: "/how-it-works" },
  },
];

const SLIDE_COUNT = FEATURE_SLIDES.length + 1; // slide 0 = product hero
const AUTOPLAY_MS = 6000;

export default function HeroCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = useCallback((i: number) => setActive(((i % SLIDE_COUNT) + SLIDE_COUNT) % SLIDE_COUNT), []);

  useEffect(() => {
    if (paused) return;
    timer.current = setInterval(() => setActive((a) => (a + 1) % SLIDE_COUNT), AUTOPLAY_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [paused]);

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(currentColor_1px,transparent_1px)] [background-size:22px_22px] text-border/55 [mask-image:linear-gradient(to_bottom,black,transparent_88%)]"
      />

      <div
        className="relative"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Slide 0 — product hero (defines the height) */}
        <div
          className={`transition-opacity duration-700 ${active === 0 ? "opacity-100" : "opacity-0"}`}
          aria-hidden={active !== 0}
        >
          <div className="mx-auto max-w-site px-6 pt-12 text-center sm:pt-16">
            <h1 className="mx-auto max-w-4xl font-display text-[2.75rem] leading-[0.98] font-bold tracking-[-0.035em] text-balance text-foreground sm:text-6xl lg:text-7xl">
              Swag your team will <span className="text-primary">actually wear</span>.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground">
              Shop hundreds of products, drop in your logo, and order in bulk — volume pricing that
              drops as you scale, with a free proof before anything prints.
            </p>
          </div>

          {/* Centered, responsive product rail (auto-scrolling marquee) */}
          <div className="mt-10 w-full sm:mt-12">
            <div className="hero-arch relative w-full overflow-hidden">
              <div className="tm-track flex w-max gap-4 px-4 sm:gap-6" style={{ ["--tm-duration" as string]: "48s" }}>
                {[...RAIL, ...RAIL].map((p, i) => (
                  <Link
                    key={`${p.href}-${i}`}
                    aria-label={p.alt}
                    href={p.href}
                    className="group/card w-[9.5rem] shrink-0 sm:w-[12rem] lg:w-[13.5rem]"
                  >
                    <div className="overflow-hidden rounded-3xl border-2 border-white bg-card shadow-[0_18px_40px_-16px_rgba(13,27,61,0.35)] ring-1 ring-black/5 transition-transform duration-300 ease-out group-hover/card:-translate-y-1.5">
                      <div className="relative aspect-square">
                        <img
                          alt={p.alt}
                          loading="lazy"
                          className="absolute inset-0 size-full object-cover"
                          src={p.src}
                        />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-site px-6 pt-2 pb-14 text-center">
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:mt-8 sm:flex-row">
              <Link
                href="/shop"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-navy px-7 text-base font-medium text-navy-foreground shadow-brand transition-all hover:bg-primary hover:text-primary-foreground"
              >
                Shop the catalog <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/studio"
                className="inline-flex h-12 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-6 text-base font-medium transition-all hover:bg-muted hover:text-foreground"
              >
                Build a pack
              </Link>
            </div>
            <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <Check className="size-4 text-primary" /> Free proof before print
              </li>
              <li className="flex items-center gap-1.5">
                <TrendingDown className="size-4 text-primary" /> Volume pricing
              </li>
              <li className="flex items-center gap-1.5">
                <Truck className="size-4 text-primary" /> Ships to 120+ countries
              </li>
            </ul>
          </div>
        </div>

        {/* Feature slides (Mockup / Pack) — overlay slide 0 */}
        {FEATURE_SLIDES.map((s, idx) => {
          const isActive = active === idx + 1;
          return (
            <div
              key={s.eyebrow}
              className={`absolute inset-0 transition-opacity duration-700 ${isActive ? "opacity-100" : "pointer-events-none opacity-0"}`}
              aria-hidden={!isActive}
            >
              <div className="relative h-full w-full overflow-hidden">
                <div className="absolute inset-0 bg-navy" />
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${s.bg})` }} />
                <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/75 to-navy/5" />
                <div className="relative mx-auto flex h-full max-w-site items-center py-6 pr-6 pl-8 sm:pl-20">
                  <div className="max-w-xl text-left">
                    <p className="text-xs font-semibold tracking-[0.14em] text-highlight uppercase">{s.eyebrow}</p>
                    <h2 className="mt-3 font-display text-4xl leading-[1.02] font-bold tracking-[-0.03em] text-balance text-white sm:text-5xl lg:text-6xl">
                      {s.titleA} <span className="text-highlight">{s.highlight}</span>
                      {s.titleB ? ` ${s.titleB}` : ""}
                    </h2>
                    <p className="mt-4 max-w-md text-lg leading-relaxed text-pretty text-white/80">{s.body}</p>
                    <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                      <Link
                        href={s.primary.href}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-7 text-base font-medium text-navy transition-all hover:bg-white/90"
                      >
                        {s.primary.label} <ArrowRight className="size-4" />
                      </Link>
                      <Link
                        href={s.secondary.href}
                        className="inline-flex h-12 items-center justify-center gap-1.5 rounded-lg border border-white/40 bg-transparent px-6 text-base font-medium text-white transition-all hover:bg-white/10"
                      >
                        {s.secondary.label}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Controls */}
        <button
          type="button"
          aria-label="Previous slide"
          onClick={() => go(active - 1)}
          className="absolute top-1/2 left-3 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/70 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background sm:left-5"
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          type="button"
          aria-label="Next slide"
          onClick={() => go(active + 1)}
          className="absolute top-1/2 right-3 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/70 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background sm:right-5"
        >
          <ChevronRight className="size-5" />
        </button>
        <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-background/70 px-3 py-2 shadow-sm backdrop-blur">
          {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              aria-current={active === i}
              onClick={() => go(i)}
              className={`h-2 rounded-full transition-all ${active === i ? "w-6 bg-primary" : "w-2 bg-foreground/25 hover:bg-foreground/40"}`}
            />
          ))}
        </div>
      </div>

      {/* Marquee ribbon */}
      <div className="border-y border-border/60 bg-navy py-3 text-white sm:py-4">
        <div className="tm-marquee overflow-hidden">
          <div className="tm-track flex w-max items-center gap-6 whitespace-nowrap text-sm font-semibold tracking-wide uppercase sm:text-base" style={{ ["--tm-duration" as string]: "40s" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className="flex items-center gap-6">
                <span>Custom Swag</span>
                <span className="text-highlight">✦</span>
                <span>Volume Pricing</span>
                <span className="text-highlight">✦</span>
                <span>Free Proofs</span>
                <span className="text-highlight">✦</span>
                <span>Ships Worldwide</span>
                <span className="text-highlight">✦</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
