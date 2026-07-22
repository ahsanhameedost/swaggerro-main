import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, BadgeCheck, TrendingDown, Gift, Globe, Store } from "lucide-react";
import { Section, SectionHeading } from "@/components/marketing/section";
import { cn } from "@/lib/utils";

// Illustrative price ladder — bar length = per-unit price (drops as qty climbs).
const PRICE_LADDER = [
  { qty: "50", price: "$11.50", w: "100%" },
  { qty: "100", price: "$8.50", w: "72%" },
  { qty: "250", price: "$7.25", w: "56%" },
  { qty: "500", price: "$6.50", w: "42%" },
];

const tile =
  "group relative overflow-hidden rounded-3xl ring-1 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg";

export function FeatureBento() {
  return (
    <Section>
      <SectionHeading
        eyebrow="The whole toolkit"
        title="Everything a swag program needs, in one grid"
        subtitle="From the first free proof to worldwide delivery, these are the tools that turn a one-off order into something your team runs on."
      />

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:h-[44rem] lg:grid-cols-4 lg:grid-rows-3">
        {/* Flagship — co-brand */}
        <article
          className={cn(
            tile,
            "min-h-[22rem] ring-white/10 sm:col-span-2 lg:col-span-2 lg:row-span-2 lg:min-h-0",
          )}
        >
          <Image
            src="/banner/cobrand-kit.webp"
            alt=""
            fill
            sizes="(min-width:1024px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/65 to-navy/10" />
          <div className="relative flex h-full flex-col justify-end p-7 sm:p-9">
            <span className="text-xs font-semibold tracking-[0.16em] text-highlight uppercase">
              Co-brand studio
            </span>
            <h3 className="mt-3 max-w-md font-display text-3xl font-bold tracking-[-0.02em] text-balance text-white sm:text-4xl">
              Your logo on everything they&apos;ll actually keep
            </h3>
            <p className="mt-3 max-w-md leading-relaxed text-white/80">
              Drop your logo onto any product and get a photoreal proof in seconds: print, embroidery
              or engrave, exactly as it&apos;ll ship.
            </p>
            <Link
              href="/mockup"
              className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-navy transition-transform hover:scale-[1.02]"
            >
              Preview your logo <ArrowRight className="size-4" />
            </Link>
          </div>
        </article>

        {/* Volume pricing */}
        <article className={cn(tile, "bg-card p-6 ring-border sm:col-span-2 lg:col-span-2 lg:min-h-0")}>
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand-soft text-primary">
              <TrendingDown className="size-5" />
            </span>
            <div>
              <h3 className="font-display text-lg font-bold text-foreground">Volume pricing, built in</h3>
              <p className="text-xs text-muted-foreground">The more you order, the less each one costs.</p>
            </div>
          </div>
          <div className="mt-5 space-y-2.5">
            {PRICE_LADDER.map((r, i) => (
              <div key={r.qty} className="flex items-center gap-3">
                <span className="w-14 shrink-0 text-xs text-muted-foreground tabular-nums">{r.qty} pcs</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-brand"
                    style={{ width: r.w }}
                  />
                </div>
                <span
                  className={cn(
                    "w-14 shrink-0 text-right text-sm font-bold tabular-nums",
                    i === PRICE_LADDER.length - 1 ? "text-primary" : "text-foreground",
                  )}
                >
                  {r.price}
                </span>
              </div>
            ))}
          </div>
        </article>

        {/* Free proofs */}
        <article className={cn(tile, "bg-brand-soft p-6 ring-primary/10 lg:min-h-0")}>
          <span className="flex size-10 items-center justify-center rounded-2xl bg-card text-primary shadow-sm">
            <BadgeCheck className="size-5" />
          </span>
          <h3 className="mt-4 font-display text-lg font-bold text-foreground">Free proofs</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            See a photoreal mockup before anything prints. Nothing ships until you approve it.
          </p>
        </article>

        {/* Worldwide stat */}
        <article className={cn(tile, "flex flex-col justify-between bg-navy p-6 ring-white/10 lg:min-h-0")}>
          <span className="flex size-10 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/15">
            <Globe className="size-5" />
          </span>
          <div>
            <p className="font-display text-5xl font-bold tracking-tight text-white tabular-nums">120+</p>
            <p className="mt-1 text-sm text-white/70">countries we ship to, wherever your crew is.</p>
          </div>
        </article>

        {/* Claim pages */}
        <article
          className={cn(
            tile,
            "flex flex-col justify-between bg-navy p-7 ring-white/10 sm:col-span-2 lg:col-span-2 lg:min-h-0",
          )}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-primary/25 blur-3xl"
          />
          <span className="relative flex size-10 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/15">
            <Gift className="size-5" />
          </span>
          <div className="relative">
            <h3 className="font-display text-2xl font-bold tracking-[-0.01em] text-white">
              Send one claim link
            </h3>
            <p className="mt-2 max-w-md leading-relaxed text-white/75">
              Skip the spreadsheet. Recipients open a link, pick their size, and enter their own
              address. No account needed.
            </p>
          </div>
        </article>

        {/* Branded stores */}
        <article
          className={cn(
            tile,
            "flex flex-col justify-between bg-card p-7 ring-border sm:col-span-2 lg:col-span-2 lg:min-h-0",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-highlight/15 text-highlight-foreground">
              <Store className="size-5 text-[color:var(--navy)]" />
            </span>
            <span className="rounded-full bg-highlight/15 px-2.5 py-1 text-[0.7rem] font-semibold tracking-wide text-[color:var(--navy)] uppercase">
              Popular
            </span>
          </div>
          <div>
            <h3 className="font-display text-2xl font-bold tracking-[-0.01em] text-foreground">
              Your own branded store
            </h3>
            <p className="mt-2 max-w-md leading-relaxed text-muted-foreground">
              Spin up a company store in minutes. Your logo, your colors, your catalog.
            </p>
            <Link
              href="/how-it-works"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              See how it works <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </article>
      </div>
    </Section>
  );
}
