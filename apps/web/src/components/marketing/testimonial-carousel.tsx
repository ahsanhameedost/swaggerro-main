"use client";

import type { CSSProperties } from "react";
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

/** Continuous, auto-looping wall of testimonials — several visible at a time. */
export function TestimonialCarousel({ items }: { items: Testimonial[] }) {
  // Four copies keep the row full-width and gap-free even on ultra-wide /
  // zoomed-out viewports (the CSS shifts by exactly one copy → seamless loop).
  const loop = [...items, ...items, ...items, ...items];
  const duration = Math.max(40, items.length * 5); // constant-ish speed as the list grows

  return (
    <div className="tm-marquee group relative w-full overflow-hidden py-2">
      <div
        className="tm-track flex w-max group-hover:[animation-play-state:paused]"
        style={{ "--tm-duration": `${duration}s` } as CSSProperties}
      >
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
