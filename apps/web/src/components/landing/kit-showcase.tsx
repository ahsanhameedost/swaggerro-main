"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { UserPlus, Ticket, Gift, Headphones, ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

type Kit = {
  key: string;
  label: string; // short vertical label (collapsed)
  name: string; // full title (expanded)
  tagline: string;
  image: string;
  href: string;
  Icon: LucideIcon;
};

// Curated, ready-made packs. Each opens Pack Studio so shoppers can start from a
// kit and make it their own (no fake product pages / dead links).
const KITS: Kit[] = [
  {
    key: "new-hire",
    label: "New Hire",
    name: "New Hire Kit",
    tagline: "Tee, bottle & notebook to welcome the team on day one.",
    image: "/banner/kit-new-hire.webp",
    href: "/swag-pack",
    Icon: UserPlus,
  },
  {
    key: "event",
    label: "Events",
    name: "Event Kit",
    tagline: "Backpacks, totes & tees that make your booth stand out.",
    image: "/banner/kit-event.webp",
    href: "/swag-pack",
    Icon: Ticket,
  },
  {
    key: "client-gift",
    label: "Client Gifts",
    name: "Client Gift Set",
    tagline: "Premium drinkware that says thank you in style.",
    image: "/banner/kit-client-gift.webp",
    href: "/swag-pack",
    Icon: Gift,
  },
  {
    key: "tech",
    label: "Tech Pack",
    name: "Tech Pack",
    tagline: "Chargers, speakers & desk gear that earn their keep.",
    image: "/banner/kit-tech.webp",
    href: "/swag-pack",
    Icon: Headphones,
  },
];

export function KitShowcase() {
  const root = useRef<HTMLDivElement>(null);
  const bars = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      // Kit bars — parallax float as the section scrolls past.
      if (bars.current) {
        gsap.fromTo(
          bars.current,
          { yPercent: 12 },
          {
            yPercent: -10,
            ease: "none",
            scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: 0.8 },
          },
        );
      }
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      className="relative overflow-hidden border-y border-border/60 bg-muted/30 py-20 sm:py-24"
    >
      <div className="mx-auto mb-10 max-w-site px-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Ready-made kits</p>
        <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Curated packs, done for you
        </h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Skip the guesswork — start from a kit built for the moment, then make it yours in Pack
          Studio.
        </p>
      </div>

      {/* Kit bars — full-width hover-expand row (desktop) */}
      <div ref={bars} className="mx-auto hidden h-80 max-w-site items-stretch gap-2.5 px-6 lg:flex">
        {KITS.map((k, ki) => {
          const isActive = active === ki;
          return (
            <Link
              key={k.key}
              href={k.href}
              onMouseEnter={() => setActive(ki)}
              onFocus={() => setActive(ki)}
              aria-label={`${k.name}: ${k.tagline}`}
              className={cn(
                "relative overflow-hidden rounded-2xl bg-navy ring-1 transition-[flex-grow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                isActive ? "ring-white/20" : "ring-white/10",
              )}
              style={{ flexGrow: isActive ? 6 : 1, flexBasis: 0 }}
            >
              <Image
                src={k.image}
                alt=""
                fill
                sizes="(min-width:1024px) 640px, 100vw"
                className="object-cover transition-transform duration-700 ease-out"
                style={{ transform: isActive ? "scale(1)" : "scale(1.05)" }}
              />
              {/* bluish gradient from bottom-left → mid, so the photo stays visible top-right */}
              <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top_right,rgba(9,19,52,0.95),rgba(14,58,140,0.5)_30%,transparent_58%)]" />
              {/* warm gold touch anchored to the bottom-left corner */}
              <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_75%_at_0%_100%,rgba(255,196,40,0.45),transparent_55%)]" />
              {/* keep collapsed bars a touch darker so the centered label stays legible */}
              <span
                className={cn(
                  "pointer-events-none absolute inset-0 bg-black transition-opacity duration-500",
                  isActive ? "opacity-0" : "opacity-30",
                )}
              />

              {/* active: title + tagline */}
              <span
                className={cn(
                  "absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 transition-opacity duration-500",
                  isActive ? "opacity-100" : "opacity-0",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate font-display text-2xl font-bold text-white">
                    {k.name}
                  </span>
                  <span className="mt-1 line-clamp-2 max-w-md text-sm text-white/80">
                    {k.tagline}
                  </span>
                </span>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-navy">
                  <ArrowRight className="size-5" />
                </span>
              </span>

              {/* collapsed: vertical icon + label */}
              <span
                className={cn(
                  "absolute inset-0 flex flex-col items-center justify-center gap-3 drop-shadow-[0_2px_6px_rgba(0,0,0,0.75)] transition-opacity duration-300",
                  isActive ? "pointer-events-none opacity-0" : "opacity-100",
                )}
              >
                <k.Icon className="size-6 text-white/90" />
                <span className="[writing-mode:vertical-rl] rotate-180 text-xs font-medium uppercase tracking-wider text-white/80">
                  {k.label}
                </span>
              </span>
            </Link>
          );
        })}
      </div>

      {/* Mobile / tablet — kit cards */}
      <div className="mx-auto grid max-w-site grid-cols-1 gap-3 px-6 sm:grid-cols-2 lg:hidden">
        {KITS.map((k) => (
          <Link
            key={k.key}
            href={k.href}
            className="group relative overflow-hidden rounded-2xl bg-navy ring-1 ring-white/10"
          >
            <div className="relative aspect-[16/9]">
              <Image src={k.image} alt="" fill sizes="50vw" className="object-cover" />
              <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top_right,rgba(9,19,52,0.92),rgba(14,58,140,0.45)_32%,transparent_60%)]" />
              <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(75%_80%_at_0%_100%,rgba(255,196,40,0.4),transparent_58%)]" />
              <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-4">
                <div className="flex items-center gap-2">
                  <k.Icon className="size-4 text-white/90" />
                  <span className="font-display text-lg font-bold text-white">{k.name}</span>
                </div>
                <span className="text-xs text-white/75">{k.tagline}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
