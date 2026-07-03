"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import "./hero-carousel.css";

type Product = { src: string; slug: string; label: string };

// Interleaved so adjacent cards aren't from the same category.
const PRODUCTS: Product[] = [
  { src: "/products/classic-cotton-tee-cobalt.webp", slug: "classic-cotton-tee", label: "Classic Cotton Tee" },
  { src: "/products/insulated-tumbler-branded.webp", slug: "insulated-tumbler", label: "Insulated Tumbler" },
  { src: "/products/laptop-backpack-branded.webp", slug: "laptop-backpack", label: "Commuter Backpack" },
  { src: "/products/hardcover-notebook.webp", slug: "hardcover-notebook", label: "Hardcover Notebook" },
  { src: "/products/premium-hoodie-branded.webp", slug: "premium-hoodie", label: "Premium Fleece Hoodie" },
  { src: "/products/stainless-water-bottle-branded.webp", slug: "stainless-water-bottle", label: "Stainless Water Bottle" },
  { src: "/products/bluetooth-speaker-branded.webp", slug: "bluetooth-speaker", label: "Bluetooth Speaker" },
  { src: "/products/canvas-tote.webp", slug: "canvas-tote", label: "Heavyweight Canvas Tote" },
  { src: "/products/ceramic-mug.webp", slug: "ceramic-mug", label: "Ceramic Camp Mug" },
  { src: "/products/wireless-charging-pad.webp", slug: "wireless-charging-pad", label: "Wireless Charging Pad" },
  { src: "/products/quarter-zip-pullover.webp", slug: "quarter-zip-pullover", label: "Quarter-Zip Pullover" },
  { src: "/products/bamboo-pen-set.webp", slug: "bamboo-pen-set", label: "Bamboo Pen Set" },
];

// Repeat the set so the rail always over-fills the widest viewport — this is
// what keeps the loop seamless and full-width (never bunched to one side with a
// gap) at every screen size, exactly like a marquee.
const TILES: Product[] = [...PRODUCTS, ...PRODUCTS, ...PRODUCTS];

/**
 * Full-width product rail that loops along a gentle arch. Each card's vertical
 * offset + tilt is a function of its live screen position, so the arch stays
 * fixed while the products glide through it. Pauses on hover; respects
 * reduced-motion (renders a static, still-centered arch).
 */
export function HeroCarousel() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const hover = useRef(false);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const n = TILES.length;

    let W = 0;
    let cardW = 200;
    let step = 224;
    let L = n * step;
    let depth = 80;
    let tilt = 14;
    let cx = 0;
    const PAD = 14;
    const SPEED = 60; // px / second

    const recalc = () => {
      W = wrap.clientWidth || wrap.getBoundingClientRect().width || window.innerWidth || 1;
      cardW = W < 640 ? 152 : W < 1024 ? 190 : 220;
      const gap = 24;
      step = cardW + gap;
      L = n * step;
      depth = W < 640 ? 46 : W < 1024 ? 66 : 86;
      tilt = W < 640 ? 11 : 14;
      cx = W / 2;
      wrap.style.setProperty("--card-w", `${cardW}px`);
      wrap.style.height = `${PAD + cardW + depth + 10}px`;
    };

    const place = (offset: number) => {
      const half = W * 0.55;
      // Start a card+buffer to the left of the canvas so a card fully clears the
      // edge (and finishes its fade) before it wraps back in from the right — no
      // popping. Because TILES over-fills the width, cards span the whole rail
      // and the arch apex stays centered on cx.
      const start = cardW + 48;
      for (let i = 0; i < n; i++) {
        const el = cardRefs.current[i];
        if (!el) continue;
        const x = (((i * step - offset + start) % L) + L) % L - start;
        const center = x + cardW / 2;
        const tc = Math.max(-1, Math.min(1, (center - cx) / half));
        const y = PAD + depth * tc * tc; // ∩ arch — apex centered, edges dip
        const rot = tilt * tc;
        el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rot}deg)`;
      }
    };

    let offset = 0;
    recalc();
    place(offset);
    wrap.style.opacity = "1";

    // Re-place on resize so the rail never gets stuck bunched to one side after
    // the window changes size (also covers the reduced-motion / no-rAF case).
    const ro = new ResizeObserver(() => {
      recalc();
      place(offset);
    });
    ro.observe(wrap);

    let raf = 0;
    let last = performance.now();
    const frame = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      if (!hover.current && !reduce) offset = (offset + SPEED * dt) % L;
      place(offset);
      raf = requestAnimationFrame(frame);
    };
    if (!reduce) raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="hero-arch group/rail relative min-h-[230px] w-full overflow-hidden opacity-0 transition-opacity duration-500 sm:min-h-[290px] lg:min-h-[330px]"
      onMouseEnter={() => (hover.current = true)}
      onMouseLeave={() => (hover.current = false)}
    >
      {TILES.map((p, i) => (
        <Link
          key={`${p.slug}-${i}`}
          ref={(el) => {
            cardRefs.current[i] = el;
          }}
          href={`/shop/${p.slug}`}
          aria-label={p.label}
          aria-hidden={i >= PRODUCTS.length}
          tabIndex={i >= PRODUCTS.length ? -1 : undefined}
          className="hero-arch-card group/card"
        >
          <div className="overflow-hidden rounded-3xl border-2 border-white bg-card shadow-[0_18px_40px_-16px_rgba(13,27,61,0.35)] ring-1 ring-black/5 transition-transform duration-300 ease-out group-hover/card:-translate-y-1.5">
            <div className="relative aspect-square">
              <Image
                src={p.src}
                alt={p.label}
                fill
                sizes="(min-width: 1024px) 240px, (min-width: 640px) 208px, 176px"
                className="object-cover"
              />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
