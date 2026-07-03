"use client";

import { TESTIMONIALS, type Testimonial } from "@/content/marketing";

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Card({ t }: { t: Testimonial }) {
  return (
    <figure className="mr-5 flex w-[320px] shrink-0 flex-col rounded-3xl border border-border bg-card p-7 shadow-sm sm:w-[380px]">
      <blockquote className="flex-1 leading-relaxed text-pretty text-foreground">
        &ldquo;{t.quote}&rdquo;
      </blockquote>
      <figcaption className="mt-6 flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-primary">
          {initials(t.name)}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-semibold text-foreground">{t.name}</span>
          <span className="block truncate text-sm text-muted-foreground">{t.role}</span>
        </span>
      </figcaption>
    </figure>
  );
}

export default function TestimonialsMarquee() {
  return (
    <section className="bg-muted/40 py-20 sm:py-24">
      <div className="mx-auto max-w-site px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">
            Loved by the people who run swag
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-[-0.02em] text-balance text-foreground sm:text-4xl">
            Don&apos;t take our word for it
          </h2>
        </div>
      </div>
      <div className="mt-12">
        <div className="tm-marquee group relative w-full overflow-hidden py-2">
          <div
            className="tm-track flex w-max group-hover:[animation-play-state:paused]"
            style={{ ["--tm-duration" as string]: "70s" }}
          >
            {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
              <Card key={`${t.name}-${i}`} t={t} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
