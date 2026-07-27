"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Shirt, CupSoda, ShoppingBag, Cpu, NotebookPen, Milk, Boxes, ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

type Category = { slug: string; name: string; description: string | null };
type Product = { slug: string; name: string; imageUrl: string | null; categorySlug: string | null };

const ICONS: Record<string, LucideIcon> = {
  apparel: Shirt,
  drinkware: CupSoda,
  bags: ShoppingBag,
  tech: Cpu,
  notebooks: NotebookPen,
  drinkbottles: Milk,
};

// Same category hero photos used by the CategoryBar section above.
const BANNER_IMAGES: Record<string, string> = {
  apparel: "/banner/category-apparel.webp",
  drinkware: "/banner/category-drinkware.webp",
  bags: "/banner/category-bags.webp",
  tech: "/banner/category-tech.webp",
  // Speaker shot for Accessories. Corporate has no dedicated photo, so it falls
  // back to one of its own product images (not the cups shot).
  accessories: "/banner/category-tech.webp",
};

export function CategoryShowcase({
  categories,
  products,
}: {
  categories: Category[];
  products: Product[];
}) {
  const root = useRef<HTMLDivElement>(null);
  const bars = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const cats = categories.map((c) => {
    const items = products.filter((p) => p.categorySlug === c.slug);
    const productImg = items.find((p) => p.imageUrl)?.imageUrl ?? null;
    return {
      ...c,
      count: items.length,
      bg: BANNER_IMAGES[c.slug] ?? productImg, // banner photo, else a product shot
      Icon: ICONS[c.slug] ?? Boxes,
    };
  });

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      // Category bars — parallax float as the section scrolls past
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
      {/* Category bars — full-width hover-expand row (desktop) */}
      <div ref={bars} className="mx-auto hidden h-80 max-w-site items-stretch gap-2.5 px-6 lg:flex">
        {cats.map((c, ci) => {
          const isActive = active === ci;
          return (
            <Link
              key={c.slug}
              href={`/shop?category=${c.slug}`}
              onMouseEnter={() => setActive(ci)}
              onFocus={() => setActive(ci)}
              aria-label={`${c.name}, ${c.count} products`}
              className={cn(
                "relative overflow-hidden rounded-2xl bg-navy ring-1 transition-[flex-grow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                isActive ? "ring-white/20" : "ring-white/10",
              )}
              style={{ flexGrow: isActive ? 6 : 1, flexBasis: 0 }}
            >
              {c.bg ? (
                <Image
                  src={c.bg}
                  alt=""
                  fill
                  sizes="(min-width:1024px) 640px, 100vw"
                  className="object-cover transition-transform duration-700 ease-out"
                  style={{ transform: isActive ? "scale(1)" : "scale(1.05)" }}
                />
              ) : null}
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

              {/* active: label */}
              <span
                className={cn(
                  "absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-5 transition-opacity duration-500",
                  isActive ? "opacity-100" : "opacity-0",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate font-display text-2xl font-bold text-white">{c.name}</span>
                  <span className="text-sm text-white/80 tabular-nums">{c.count} products</span>
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
                <c.Icon className="size-6 text-white/90" />
                <span className="[writing-mode:vertical-rl] rotate-180 text-xs font-medium tracking-wider text-white/80 uppercase">
                  {c.name}
                </span>
              </span>
            </Link>
          );
        })}
      </div>

      {/* Mobile / tablet — category cards */}
      <div className="mx-auto grid max-w-site grid-cols-2 gap-3 px-6 sm:grid-cols-3 lg:hidden">
        {cats.map((c) => (
          <Link
            key={c.slug}
            href={`/shop?category=${c.slug}`}
            className="group relative overflow-hidden rounded-2xl bg-navy ring-1 ring-white/10"
          >
            <div className="relative aspect-[16/10]">
              {c.bg ? (
                <Image src={c.bg} alt="" fill sizes="50vw" className="object-cover" />
              ) : null}
              <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top_right,rgba(9,19,52,0.92),rgba(14,58,140,0.45)_32%,transparent_60%)]" />
              <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(75%_80%_at_0%_100%,rgba(255,196,40,0.4),transparent_58%)]" />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-3">
                <div className="flex items-center gap-2">
                  <c.Icon className="size-4 text-white/90" />
                  <span className="font-display text-base font-bold text-white">{c.name}</span>
                </div>
                <span className="text-xs text-white/70 tabular-nums">{c.count}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
