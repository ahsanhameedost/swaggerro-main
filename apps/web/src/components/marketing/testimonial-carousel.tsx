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

/** Continuous, auto-looping wall of testimonials — several visible at a time.
 *  The scroll is a single Web Animations API loop on the track (the same
 *  compositor-accelerated transform a CSS `animation` gets), so it stays
 *  smooth regardless of what else the page's main thread is doing. Hover
 *  eases the *playback rate* toward 0 instead of calling `pause()`, which
 *  keeps the same continuous timeline (no jump) and avoids an instant
 *  hard-stop.
 *
 *  Hover is intentionally driven by `mousemove`, NOT pointerenter/pointerleave.
 *  Those also fire when the page SCROLLS this (wide, tall) section under an
 *  otherwise-stationary cursor — the browser re-runs hit testing on scroll —
 *  which made this look like it kept randomly stopping and starting while
 *  scrolling past with the mouse just resting somewhere on screen. mousemove
 *  only ever fires from genuine cursor movement, so scrolling alone (mouse
 *  untouched) can never change the hover state, no matter what ends up under
 *  the cursor's screen position. Do not swap this back to pointerenter/leave.
 *
 *  One more thing that caused a one-time stutter right after page load: a
 *  `-50%` keyframe re-resolves against the track's CURRENT width on every
 *  frame. If a web font swaps in (or anything else reflows the track) after
 *  the animation has already started, that's a live width change mid-flight
 *  — the translateX target jumps instantly. A measured pixel offset is fixed
 *  once instead; a ResizeObserver re-measures and restarts cleanly (once, not
 *  every frame) if the track's width does change later.
 *
 *  Do NOT gate the start on `document.fonts.ready` — measured in practice it
 *  can take 1s+ to resolve (varies with cache state, especially in dev mode),
 *  which left the marquee frozen for a full second on every load. Starting
 *  immediately and letting the ResizeObserver correct any late font-swap
 *  reflow is far less noticeable than a multi-second dead start. */
export function TestimonialCarousel({ items }: { items: Testimonial[] }) {
  // Two copies are enough for a seamless loop; the animation moves the track by
  // one full copy width, which avoids the visible reset from a larger repeated set.
  const loop = [...items, ...items];
  // ms for one copy to scroll past; grows with the list so speed stays even.
  const duration = Math.max(32, items.length * 5) * 1000;
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const marquee = track.parentElement;
    let anim: Animation | null = null;
    let cancelled = false;

    const start = () => {
      if (cancelled || anim) return;
      // Fixed pixel offset (one copy's width), not "-50%" — see comment above.
      const offset = track.scrollWidth / 2;
      anim = track.animate(
        [{ transform: "translate3d(0, 0, 0)" }, { transform: `translate3d(${-offset}px, 0, 0)` }],
        { duration, iterations: Infinity },
      );
      anim.playbackRate = rate;
    };

    // Re-measure and restart (once, not per-frame) if the track's own content
    // width genuinely changes — e.g. a font finishes loading after `start()`.
    // Note: ResizeObserver always fires once immediately after `observe()`
    // even with no real size change, so this legitimately cancels/restarts
    // once right after mount too — expected, not a bug.
    const resizeObserver = new ResizeObserver(() => {
      if (!anim) return;
      anim.cancel();
      anim = null;
      start();
    });
    resizeObserver.observe(track);

    const TAU = 260; // ms — smoothing; higher = longer, gentler ramp
    let raf = 0;
    let last = 0;
    let rate = 1;
    let hovering = false;

    const tick = (t: number) => {
      if (!last) last = t;
      const dt = Math.min(64, t - last); // clamp tab-switch gaps
      last = t;
      const target = hovering ? 0 : 1;
      rate = target + (rate - target) * Math.exp(-dt / TAU);
      if (anim) anim.playbackRate = rate;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    start();

    // Genuine cursor movement only — see the comment above for why this is
    // mousemove-driven rather than pointerenter/pointerleave.
    const onMouseMove = (e: MouseEvent) => {
      if (!marquee) return;
      const rect = marquee.getBoundingClientRect();
      hovering =
        e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
    };
    const onMouseLeaveDocument = () => {
      hovering = false;
    };
    // Keyboard focus is always a deliberate action (never scroll-induced), so
    // it's safe to pause on it too.
    const onFocusIn = () => {
      hovering = true;
    };
    const onFocusOut = () => {
      hovering = false;
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("mouseleave", onMouseLeaveDocument);
    marquee?.addEventListener("focusin", onFocusIn);
    marquee?.addEventListener("focusout", onFocusOut);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      anim?.cancel();
      resizeObserver.disconnect();
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeaveDocument);
      marquee?.removeEventListener("focusin", onFocusIn);
      marquee?.removeEventListener("focusout", onFocusOut);
    };
  }, [duration]);

  return (
    <div className="tm-marquee relative w-full overflow-hidden py-2">
      <div ref={trackRef} className="tm-track flex w-max items-stretch">
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
