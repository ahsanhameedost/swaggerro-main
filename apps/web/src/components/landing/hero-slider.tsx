"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Check, Truck, TrendingDown, ChevronLeft, ChevronRight } from "lucide-react";
import { HeroCarousel } from "@/components/landing/hero-carousel";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ImageSlide = {
  img: string;
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  cta: { label: string; href: string };
  secondary?: { label: string; href: string };
};

// Backgrounds live in /public/slider — the navy base shows if one is missing.
const IMAGE_SLIDES: ImageSlide[] = [
  {
    img: "/slider/slide-mockup.webp",
    eyebrow: "Mockup Studio",
    title: (
      <>
        Your logo,{" "}
        <span className="text-highlight">flawlessly</span> applied
      </>
    ),
    subtitle:
      "Drop your logo onto any product and get a photoreal proof in seconds: embroidery, print, or engrave, exactly as it'll ship.",
    cta: { label: "Open Mockup Studio", href: "/mockup" },
    secondary: { label: "Browse products", href: "/shop" },
  },
  {
    img: "/slider/slide-pack.webp",
    eyebrow: "Pack Studio",
    title: (
      <>
        Swag that feels like <span className="text-highlight">magic</span>
      </>
    ),
    subtitle:
      "Build a curated pack, watch volume pricing drop as you scale, and send one claim link. We handle sizes, proofs, and shipping.",
    cta: { label: "Build a pack", href: "/studio" },
    secondary: { label: "How it works", href: "/how-it-works" },
  },
];

const COUNT = 1 + IMAGE_SLIDES.length;

export function HeroSlider() {
  const [active, setActive] = useState(0);
  const hover = useRef(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      if (!hover.current) setActive((a) => (a + 1) % COUNT);
    }, 6500);
    return () => clearInterval(id);
  }, []);

  const go = (i: number) => setActive(((i % COUNT) + COUNT) % COUNT);

  return (
    <div
      className="relative"
      onMouseEnter={() => (hover.current = true)}
      onMouseLeave={() => (hover.current = false)}
    >
      {/* ── Slide 1 — current design, kept in flow so it sets the slider height ── */}
      <div
        className={cn(
          "transition-opacity duration-700",
          active === 0 ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={active !== 0}
      >
        <div className="mx-auto max-w-site px-6 pt-12 text-center sm:pt-16">
          {/* Branding tagline (#46) — placeholder wording pending client's exact copy. */}
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
            <span className="text-primary">✦</span> Custom branded swag, done right
          </span>
          <h1 className="mx-auto max-w-4xl font-display text-[2.75rem] leading-[0.98] font-bold tracking-[-0.035em] text-balance text-white sm:text-6xl lg:text-7xl">
            Swag your team will <span className="text-white">actually wear</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-pretty text-white/75">
            Shop hundreds of products, drop in your logo, and order in bulk, with volume pricing
            that drops as you scale and a free proof before anything prints.
          </p>
        </div>

        <div className="mt-10 w-full sm:mt-12">
          <HeroCarousel />
        </div>

        <div className="mx-auto max-w-site px-6 pt-2 pb-14 text-center">
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:mt-8 sm:flex-row">
            <Link
              href="/shop"
              className={cn(buttonVariants({ size: "lg" }), "h-12 gap-2 px-7 text-base shadow-brand")}
            >
              Shop the catalog <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/studio"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-12 border-white/30 bg-transparent px-6 text-base text-white hover:bg-white/10 hover:text-white",
              )}
            >
              Build a pack
            </Link>
          </div>

          <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/75">
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

      {/* ── Image slides — overlay the slider area ── */}
      {IMAGE_SLIDES.map((s, idx) => {
        const i = idx + 1;
        return (
          <div
            key={s.img}
            className={cn(
              "absolute inset-0 transition-opacity duration-700",
              active === i ? "opacity-100" : "pointer-events-none opacity-0",
            )}
            aria-hidden={active !== i}
          >
            <div className="relative h-full w-full overflow-hidden">
              <div className="absolute inset-0 bg-navy" />
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${s.img})` }}
              />
              {/* left scrim for legible text over the imagery */}
              <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/75 to-navy/5" />

              <div className="relative mx-auto flex h-full max-w-site items-center py-6 pr-6 pl-16 sm:pl-20">
                <div className="max-w-xl text-left">
                  <p className="text-xs font-semibold tracking-[0.14em] text-highlight uppercase">
                    {s.eyebrow}
                  </p>
                  <h2 className="mt-3 font-display text-4xl leading-[1.02] font-bold tracking-[-0.03em] text-balance text-white sm:text-5xl lg:text-6xl">
                    {s.title}
                  </h2>
                  <p className="mt-4 max-w-md text-lg leading-relaxed text-pretty text-white/80">
                    {s.subtitle}
                  </p>
                  <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                    <Link
                      href={s.cta.href}
                      className={cn(
                        buttonVariants({ size: "lg" }),
                        "h-12 gap-2 bg-white px-7 text-base text-navy hover:bg-white/90 hover:text-navy",
                      )}
                    >
                      {s.cta.label} <ArrowRight className="size-4" />
                    </Link>
                    {s.secondary ? (
                      <Link
                        href={s.secondary.href}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "lg" }),
                          "h-12 border-white/40 bg-transparent px-6 text-base text-white hover:bg-white/10 hover:text-white",
                        )}
                      >
                        {s.secondary.label}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* ── Controls ── */}
      <button
        type="button"
        onClick={() => go(active - 1)}
        aria-label="Previous slide"
        className="absolute top-1/2 left-3 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/70 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background sm:left-5"
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        type="button"
        onClick={() => go(active + 1)}
        aria-label="Next slide"
        className="absolute top-1/2 right-3 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/70 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background sm:right-5"
      >
        <ChevronRight className="size-5" />
      </button>

      <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-background/70 px-3 py-2 shadow-sm backdrop-blur">
        {Array.from({ length: COUNT }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => go(i)}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={active === i}
            className={cn(
              "h-2 rounded-full transition-all",
              active === i ? "w-6 bg-primary" : "w-2 bg-white/30 hover:bg-white/50",
            )}
          />
        ))}
      </div>
    </div>
  );
}
