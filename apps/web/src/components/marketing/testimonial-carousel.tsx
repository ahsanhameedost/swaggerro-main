"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Testimonial = { quote: string; name: string; role: string };

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function TestimonialCarousel({ items }: { items: Testimonial[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const go = (i: number) => setIndex(((i % items.length) + items.length) % items.length);

  // scroll the track to the active slide (horizontal only — no page jump)
  useEffect(() => {
    const track = trackRef.current;
    const el = track?.children[index] as HTMLElement | undefined;
    if (track && el) track.scrollTo({ left: el.offsetLeft, behavior: "smooth" });
  }, [index]);

  // auto-advance, paused on hover/focus
  useEffect(() => {
    if (paused || items.length < 2) return;
    const id = setInterval(() => setIndex((p) => (p + 1) % items.length), 6000);
    return () => clearInterval(id);
  }, [paused, items.length]);

  return (
    <div
      className="relative mx-auto max-w-3xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((q) => (
          <figure
            key={q.name}
            className="flex min-w-full snap-center flex-col rounded-3xl border border-border bg-card p-8 shadow-sm sm:p-10"
          >
            <div className="flex gap-0.5 text-primary">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-4 fill-current" />
              ))}
            </div>
            <blockquote className="mt-5 flex-1 font-display text-xl leading-relaxed text-balance text-foreground sm:text-2xl">
              “{q.quote}”
            </blockquote>
            <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-primary">
                {initials(q.name)}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{q.name}</p>
                <p className="text-sm text-muted-foreground">{q.role}</p>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>

      {/* controls */}
      <div className="mt-6 flex items-center justify-center gap-5">
        <button
          type="button"
          aria-label="Previous testimonial"
          onClick={() => go(index - 1)}
          className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <ArrowLeft className="size-4" />
        </button>

        <div className="flex items-center gap-2">
          {items.map((q, i) => (
            <button
              key={q.name}
              type="button"
              aria-label={`Go to testimonial ${i + 1}`}
              aria-current={i === index}
              onClick={() => go(i)}
              className={cn(
                "h-2 rounded-full transition-all",
                i === index ? "w-6 bg-primary" : "w-2 bg-border hover:bg-muted-foreground/50",
              )}
            />
          ))}
        </div>

        <button
          type="button"
          aria-label="Next testimonial"
          onClick={() => go(index + 1)}
          className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
