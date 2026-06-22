"use client";

import * as React from "react";
import Image, { type StaticImageData } from "next/image";
import { Check } from "lucide-react";
import PrimaryButton from "../PrimaryButton";

import r1 from "@/assets/ship/Rectangle 1.png";
import r3 from "@/assets/ship/Rectangle 3.png";
import r4 from "@/assets/ship/Rectangle 4.png";
import r5 from "@/assets/ship/Rectangle 5.png";
import r7 from "@/assets/ship/Rectangle 7.png";
import r8 from "@/assets/ship/Rectangle 8.png";
import r9 from "@/assets/ship/Rectangle 9.png";
import r10 from "@/assets/ship/Rectangle 10.png";
import r11 from "@/assets/ship/Rectangle 11.png";
import r12 from "@/assets/ship/Rectangle 12.png";
import EllipseInner from "@/assets/ship/ellipse-inner.png";
import EllipseOuter from "@/assets/ship/ellipse-outer.png";
import { cx } from "@/lib/helpers";

type ImageSrc = string | StaticImageData;
type DotPos = "tl" | "tr" | "bl" | "br";

type OrbitItem = {
  src: ImageSrc;
  alt: string;
  leftPct: number; // desktop only
  topPct: number; // desktop only
  size: "xs" | "sm" | "md" | "lg";
  rotateDeg?: number;
  dot?: DotPos;
  hideBelowLg?: boolean;
};

function useMediaQuery(query: string) {
  return React.useSyncExternalStore(
    (onStoreChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onStoreChange);
      return () => mql.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}

function sizeClass(size: OrbitItem["size"]) {
  // desktop sizes (same as your good desktop)
  switch (size) {
    case "xs":
      return "h-[44px] w-[44px]";
    case "sm":
      return "h-[72px] w-[72px]";
    case "md":
      return "h-[120px] w-[120px]";
    case "lg":
      return "h-[170px] w-[170px]";
  }
}

function sizeClassMobile(size: OrbitItem["size"]) {
  // small mobile-friendly sizes
  switch (size) {
    case "xs":
      return "h-[36px] w-[36px]";
    case "sm":
      return "h-[56px] w-[56px]";
    case "md":
      return "h-[76px] w-[76px]";
    case "lg":
      return "h-[92px] w-[92px]";
  }
}

function dotClass(pos: DotPos) {
  switch (pos) {
    case "tl":
      return "left-[-6px] top-[-6px]";
    case "tr":
      return "right-[-6px] top-[-6px]";
    case "bl":
      return "left-[-6px] bottom-[-6px]";
    case "br":
      return "right-[-6px] bottom-[-6px]";
  }
}

function originForDot(pos: DotPos) {
  switch (pos) {
    case "tl":
      return "0% 0%";
    case "tr":
      return "100% 0%";
    case "bl":
      return "0% 100%";
    case "br":
      return "100% 100%";
  }
}

function parseIntFromFormatted(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

function formatWithCommas(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function useInViewOnce<T extends HTMLElement>(threshold = 0.35) {
  const ref = React.useRef<T | null>(null);
  const [inView, setInView] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [inView, threshold]);

  return { ref, inView };
}

function useCountUp({
  start,
  target,
  durationMs,
}: {
  start: boolean;
  target: number;
  durationMs: number;
}) {
  const [value, setValue] = React.useState(0);
  const startedRef = React.useRef(false);

  React.useEffect(() => {
    if (!start || startedRef.current) return;
    startedRef.current = true;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    if (prefersReduced) {
      setValue(target);
      return;
    }

    const t0 = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const elapsed = now - t0;
      const p = Math.min(1, elapsed / durationMs);
      const eased = easeOutCubic(p);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setValue(target);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, target, durationMs]);

  return value;
}

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--primary)] text-white">
        <Check className="h-3.5 w-3.5" />
      </span>
      <span className="text-black/90 text1 text-[20px]">{children}</span>
    </div>
  );
}

type MobileSlot = {
  angleDeg: number;
  radius: number;
  size: OrbitItem["size"];
  dot: DotPos;
};

const MOBILE_SLOTS: MobileSlot[] = [
  { angleDeg: -135, radius: 150, size: "md", dot: "br" },
  { angleDeg: -60, radius: 160, size: "sm", dot: "br" },
  { angleDeg: 0, radius: 170, size: "md", dot: "bl" },
  { angleDeg: 60, radius: 160, size: "sm", dot: "tl" },
  { angleDeg: 135, radius: 150, size: "md", dot: "tr" },
  { angleDeg: 180, radius: 140, size: "sm", dot: "tr" },
];

function polarToXY(angleDeg: number, radius: number) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: Math.cos(a) * radius, y: Math.sin(a) * radius };
}

function OrbitCard({
  item,
  inView,
  idx,
  sizeClassName,
  dotPos,
  anchorStyle,
}: {
  item: OrbitItem;
  inView: boolean;
  idx: number;
  sizeClassName: string;
  dotPos: DotPos;
  anchorStyle: React.CSSProperties;
}) {
  const origin = originForDot(dotPos);
  const delayMs = Math.min(900, idx * 90);

  return (
    <button
      type="button"
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={anchorStyle}
      aria-label={`Preview ${item.alt}`}
    >
      <div className={cx("relative", sizeClassName)}>
        <span
          className={cx(
            "absolute z-20 rounded-full bg-[var(--primary)] ring-4 ring-white",
            "h-2.5 w-2.5",
            dotClass(dotPos)
          )}
        />
        <div
          className={cx(
            "absolute inset-0 rounded-[16px] bg-white shadow-[0_18px_40px_rgba(0,0,0,0.10)] ring-1 ring-black/5",
            "overflow-hidden",
            "transition-transform duration-[900ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] will-change-transform"
          )}
          style={{
            transformOrigin: origin,
            transform: `rotate(${item.rotateDeg ?? 0}deg) scale(${inView ? 1 : 0})`,
            transitionDelay: `${delayMs}ms`,
          }}
        >
          <Image src={item.src} alt={item.alt} fill className="object-cover" sizes="200px" priority={idx < 4} />
        </div>
      </div>
    </button>
  );
}

export default function ShippingOrbitSection({
  items = DEFAULT_ITEMS,
  mapSrc,
  statValue = "23,432,967",
  statLabel = "Shipped Globally",
}: {
  items?: OrbitItem[];
  mapSrc?: ImageSrc;
  statValue?: string;
  statLabel?: string;
}) {
  const { ref, inView } = useInViewOnce<HTMLElement>(0.35);
  const isMdUp = useMediaQuery("(min-width: 768px)");

  const targetNumber = React.useMemo(() => parseIntFromFormatted(statValue), [statValue]);
  const counted = useCountUp({ start: inView, target: targetNumber, durationMs: 3000 });

  const mobileItems = React.useMemo(() => {
    // take first 6 visible items for a clean mobile orbit
    const base = items.filter((it) => !it.hideBelowLg).slice(0, MOBILE_SLOTS.length);
    // if you have fewer non-hidden, just fill from remaining
    if (base.length >= MOBILE_SLOTS.length) return base;
    const rest = items.filter((it) => !base.includes(it)).slice(0, MOBILE_SLOTS.length - base.length);
    return [...base, ...rest].slice(0, MOBILE_SLOTS.length);
  }, [items]);

  return (
    <section ref={ref}>
      <div className="padding-section-md">
        {/* Title */}
        <div className="text-center">
          <h3 className="text-balance text-black">
            We Ship Swag Wherever,
            <br />
            Whenever
          </h3>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            <CheckItem>Skip The Post Office Visits</CheckItem>
            <CheckItem>No More Customs Forms</CheckItem>
            <CheckItem>We Handle All Logistics</CheckItem>
          </div>
        </div>

        {/* Orbit canvas */}
        <div className="relative mt-12">
          {/* =========================
              MOBILE LAYOUT (<md)
             ========================= */}
          {!isMdUp && (
            <div className="relative h-[560px] w-full overflow-hidden">
              <div className="pointer-events-none absolute inset-0">
                {mapSrc ? (
                  <Image src={mapSrc} alt="" fill className="object-contain opacity-80" sizes="100vw" />
                ) : (
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage:
                        "radial-gradient(rgba(232,33,37,0.55) 1px, transparent 1.1px)",
                      backgroundSize: "10px 10px",
                      maskImage:
                        "radial-gradient(ellipse at center, black 0%, black 45%, transparent 75%)",
                      WebkitMaskImage:
                        "radial-gradient(ellipse at center, black 0%, black 45%, transparent 75%)",
                    }}
                  />
                )}

                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-70">
                  <div className="relative h-[360px] w-[360px]">
                    <Image src={EllipseOuter} alt="" fill className="object-contain" />
                  </div>
                </div>

                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-75">
                  <div className="relative h-[270px] w-[270px]">
                    <Image src={EllipseInner} alt="" fill className="object-contain" />
                  </div>
                </div>
              </div>

              {/* center stats (slightly smaller spacing for mobile) */}
              <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-center">
                <div className="text-[34px] font-bold leading-tight text-[var(--primary)]">
                  {formatWithCommas(counted)}
                </div>
                <div className="mt-1 text3 text-black">{statLabel}</div>
                <div className="mt-5 flex justify-center">
                  <PrimaryButton href="/contact" className="h-10 px-9" text="Book Demo" />
                </div>
              </div>

              {/* small orbit items auto-placed around circle */}
              <div className="absolute inset-0 z-20">
                {mobileItems.map((it, idx) => {
                  const slot = MOBILE_SLOTS[idx] ?? MOBILE_SLOTS[MOBILE_SLOTS.length - 1];
                  const { x, y } = polarToXY(slot.angleDeg, slot.radius);
                  return (
                    <OrbitCard
                      key={`m-${idx}-${it.alt}`}
                      item={{
                        ...it,
                        size: slot.size,
                        rotateDeg: (it.rotateDeg ?? 0) * 0.6,
                      }}
                      inView={inView}
                      idx={idx}
                      sizeClassName={sizeClassMobile(slot.size)}
                      dotPos={slot.dot}
                      anchorStyle={{
                        left: "50%",
                        top: "50%",
                        transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* =========================
              DESKTOP LAYOUT (md+)
             ========================= */}
          {isMdUp && (
            <div className="relative h-[840px] w-full overflow-hidden">
              <div className="pointer-events-none absolute inset-0">
                {mapSrc ? (
                  <Image
                    src={mapSrc}
                    alt=""
                    fill
                    className="object-contain"
                    sizes="(max-width: 1024px) 100vw, 1200px"
                  />
                ) : (
                  <div
                    className="absolute inset-0 opacity-25"
                    style={{
                      backgroundImage:
                        "radial-gradient(rgba(232,33,37,0.55) 1px, transparent 1.1px)",
                      backgroundSize: "10px 10px",
                      maskImage:
                        "radial-gradient(ellipse at center, black 0%, black 45%, transparent 70%)",
                      WebkitMaskImage:
                        "radial-gradient(ellipse at center, black 0%, black 45%, transparent 70%)",
                    }}
                  />
                )}

                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-70">
                  <div className="relative h-[760px] w-[760px]">
                    <Image src={EllipseOuter} alt="" fill className="object-contain" />
                  </div>
                </div>

                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-75">
                  <div className="relative h-[560px] w-[560px]">
                    <Image src={EllipseInner} alt="" fill className="object-contain" />
                  </div>
                </div>
              </div>

              <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-center">
                <h3 className="text-[var(--primary)]">{formatWithCommas(counted)}</h3>
                <div className="-mt-1 text1 text-black">{statLabel}</div>
                <div className="mt-6 flex justify-center">
                  <PrimaryButton href="/contact" className="h-10 px-10" text="Book Demo" />
                </div>
              </div>

              <div className="absolute inset-0 z-20">
                {items.map((it, idx) => {
                  const dotPos = it.dot ?? "br";
                  const origin = originForDot(dotPos);
                  const delayMs = Math.min(900, idx * 80);

                  return (
                    <button
                      key={`d-${idx}-${it.alt}`}
                      type="button"
                      className={cx(
                        "absolute -translate-x-1/2 -translate-y-1/2",
                        it.hideBelowLg && "hidden lg:block"
                      )}
                      style={{ left: `${it.leftPct}%`, top: `${it.topPct}%` }}
                      aria-label={`Preview ${it.alt}`}
                    >
                      <div className={cx("relative", sizeClass(it.size))}>
                        <span
                          className={cx(
                            "absolute z-20 h-2.5 w-2.5 rounded-full bg-[var(--primary)] ring-4 ring-white",
                            dotClass(dotPos)
                          )}
                        />
                        <div
                          className={cx(
                            "absolute inset-0 rounded-[16px] bg-white shadow-[0_18px_40px_rgba(0,0,0,0.10)] ring-1 ring-black/5",
                            "overflow-hidden",
                            "transition-transform duration-[900ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] will-change-transform"
                          )}
                          style={{
                            transformOrigin: origin,
                            transform: `rotate(${it.rotateDeg ?? 0}deg) scale(${inView ? 1 : 0})`,
                            transitionDelay: `${delayMs}ms`,
                          }}
                        >
                          <Image src={it.src} alt={it.alt} fill className="object-cover" sizes="200px" priority={idx < 4} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const DEFAULT_ITEMS: OrbitItem[] = [
  { src: r4, alt: "Kit collage", leftPct: 18, topPct: 30, size: "lg", rotateDeg: -14, dot: "br" },
  { src: r8, alt: "Small sticker", leftPct: 35, topPct: 33, size: "sm", rotateDeg: 8, dot: "br", hideBelowLg: true },
  { src: r10, alt: "Bag", leftPct: 52, topPct: 27, size: "md", rotateDeg: 0, dot: "br" },
  { src: r4, alt: "Whole Foods tote", leftPct: 83, topPct: 30, size: "lg", rotateDeg: 14, dot: "bl" },

  { src: r10, alt: "Bottle", leftPct: 10, topPct: 56, size: "md", rotateDeg: 0, dot: "tr" },
  // { src: r5, alt: "Small mug", leftPct: 38, topPct: 59, size: "xs", rotateDeg: -8, dot: "br", hideBelowLg: true },
  { src: r12, alt: "Hand bottle", leftPct: 88, topPct: 60, size: "md", rotateDeg: 10, dot: "tl" },

  { src: r12, alt: "Shoes", leftPct: 20, topPct: 84, size: "lg", rotateDeg: 18, dot: "tr" },
  { src: r9, alt: "Stamp", leftPct: 52, topPct: 88, size: "md", rotateDeg: 0, dot: "tl" },
  { src: r8, alt: "Cap", leftPct: 82, topPct: 86, size: "lg", rotateDeg: -14, dot: "tl" },
  { src: r5, alt: "Tumbler", leftPct: 70, topPct: 54, size: "sm", rotateDeg: 6, dot: "tr", hideBelowLg: true },
];