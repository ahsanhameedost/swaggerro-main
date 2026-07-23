"use client";

import { useEffect, useRef } from "react";
import { Star, StarHalf } from "lucide-react";
import "./testimonial-marquee.css";

type Testimonial = { quote: string; name: string; role: string; rating?: number };

function Stars({ rating = 5 }: { rating?: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        if (i < full) return <Star key={i} className="size-4 fill-current text-primary" />;
        if (i === full && half)
          return (
            <span key={i} className="relative inline-flex">
              <Star className="size-4 fill-current text-muted-foreground/25" />
              <StarHalf className="absolute inset-0 size-4 fill-current text-primary" />
            </span>
          );
        return <Star key={i} className="size-4 fill-current text-muted-foreground/25" />;
      })}
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const COPIES = 4;

/** Continuous, auto-looping wall of testimonials — several visible at a time. */
export function TestimonialCarousel({ items }: { items: Testimonial[] }) {
  // Four copies keep the row full-width and gap-free even on ultra-wide /
  // zoomed-out viewports (we shift by exactly one copy → seamless loop).
  const loop = [...items, ...items, ...items, ...items];
  const trackRef = useRef<HTMLDivElement>(null);

  // Drive the scroll ourselves so hover pause/resume EASES in and out instead of
  // hard-stopping. `speed` glides toward its target (0 on hover, full otherwise)
  // with a time-constant so it decelerates and accelerates smoothly.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const marquee = track.parentElement;
    const durationSec = Math.max(40, items.length * 5); // one full copy scroll
    const TAU = 260; // ms — smoothing; higher = longer, gentler ramp

    let raf = 0;
    let last = 0;
    let x = 0;
    let speed = 0;
    let copyWidth = 0;
    let hovering = false;

    const onEnter = () => {
      hovering = true;
    };
    const onLeave = () => {
      hovering = false;
    };
    const onResize = () => {
      copyWidth = track.scrollWidth / COPIES;
    };
    onResize();

    marquee?.addEventListener("pointerenter", onEnter);
    marquee?.addEventListener("pointerleave", onLeave);
    marquee?.addEventListener("focusin", onEnter);
    marquee?.addEventListener("focusout", onLeave);
    window.addEventListener("resize", onResize);

    const tick = (t: number) => {
      if (!last) last = t;
      const dt = Math.min(64, t - last); // clamp tab-switch gaps
      last = t;
      if (!copyWidth) copyWidth = track.scrollWidth / COPIES;

      const target = hovering || !copyWidth ? 0 : copyWidth / durationSec; // px/s
      // Frame-rate-independent exponential ease toward the target speed.
      speed = target + (speed - target) * Math.exp(-dt / TAU);
      x -= (speed * dt) / 1000;
      if (copyWidth > 0) while (-x >= copyWidth) x += copyWidth;
      track.style.transform = `translate3d(${x}px, 0, 0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      marquee?.removeEventListener("pointerenter", onEnter);
      marquee?.removeEventListener("pointerleave", onLeave);
      marquee?.removeEventListener("focusin", onEnter);
      marquee?.removeEventListener("focusout", onLeave);
    };
  }, [items.length]);

  return (
    <div className="tm-marquee relative w-full overflow-hidden py-2">
      <div ref={trackRef} className="tm-track flex w-max">
        {loop.map((q, i) => (
          <figure
            key={`${q.name}-${i}`}
            aria-hidden={i >= items.length}
            className="mr-5 flex w-[320px] shrink-0 flex-col rounded-3xl border border-border bg-card p-7 shadow-sm sm:w-[380px]"
          >
            <Stars rating={q.rating} />
            <blockquote className="mt-4 line-clamp-6 flex-1 leading-relaxed text-pretty text-foreground">
              “{q.quote}”
            </blockquote>
            <figcaption className="mt-5 flex items-center gap-3 border-t border-border pt-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-primary">
                {initials(q.name)}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{q.name}</p>
                <p className="text-xs text-muted-foreground">{q.role}</p>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
