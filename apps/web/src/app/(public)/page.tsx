"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  Gauge,
  Gift,
  Store,
  CalendarClock,
  Sparkles,
  Wind,
  Mountain,
  Sun,
  Flame,
  Zap,
  Globe,
  Trees,
  Sunrise,
  type LucideIcon,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import LogoLoop from "@/components/reactbits/LogoLoop";
import FlowingMenu from "@/components/reactbits/FlowingMenu";
import { Badge } from "@/components/ui/badge";
import { Section, SectionHeading } from "@/components/marketing/section";
import { CtaBand } from "@/components/marketing/cta-band";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { TestimonialCarousel } from "@/components/marketing/testimonial-carousel";
import { PackPreview } from "@/components/landing/pack-preview";
import { HeroShowcase } from "@/components/landing/hero-showcase";
import { ProofPreview } from "@/components/landing/proof-preview";
import { ProductCard } from "@/components/shop/product-card";
import ScrollStack, { ScrollStackItem } from "@/components/reactbits/ScrollStack";
import { HOW_IT_WORKS, STATS, TESTIMONIALS, FAQS } from "@/content/marketing";
import { cn } from "@/lib/utils";
import { usePublicCategories, usePublicProducts } from "@/lib/queries.catalog";
import type { CatalogProductListItem } from "@/modules/catalog/products/types";
import type { CatalogCategory } from "@/modules/catalog/categories/types";
// Two sections kept from the previous home (per request) — unchanged backend.
import StrategicAssetSection from "../components/home/StrategicAssetSection";
import PricingEstimatorSection from "../components/home/PricingEstimatorSection";

export default function Home() {
  const { data: categories = [] } = usePublicCategories();
  const { data: productData, isLoading: productsLoading } = usePublicProducts({ page: 1, pageSize: 8 });
  const featured = (productData?.items ?? []).slice(0, 4);

  return (
    <div className="swag-redesign">
      <Hero />
      <LogoWall />
      <HowItWorks />
      <ProofTeaser />
      <FeaturedProducts featured={featured} loading={productsLoading} />
      <BrowseFlow categories={categories} />
      <PackStudioTeaser />
      <Superpowers />
      {/* Kept from the previous home design */}
      <StrategicAssetSection />
      <PricingEstimatorSection />
      <Stats />
      <Testimonials />
      <Section muted id="faq">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-xs font-semibold tracking-wide text-primary uppercase">FAQ</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-[-0.02em] text-balance sm:text-4xl">
              Questions, answered
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Minimums, pricing, claim pages, shipping — the short version. Still curious?
            </p>
            <Link
              href="/contact"
              className={cn(buttonVariants({ variant: "outline" }), "mt-6 gap-2")}
            >
              Talk to us <ArrowRight className="size-4" />
            </Link>
          </div>
          <FaqAccordion items={FAQS.slice(0, 6)} />
        </div>
      </Section>
      <CtaBand
        primary={{ label: "Browse the shop", href: "/shop" }}
        secondary={{ label: "Create an account", href: "/signup" }}
      />
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(currentColor_1px,transparent_1px)] [background-size:22px_22px] text-border/60 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-[-10%] -z-10 h-[40rem] w-[40rem] rounded-full bg-[radial-gradient(circle,rgba(28,131,255,0.16),transparent_62%)] blur-2xl"
      />

      <div className="mx-auto grid max-w-site items-center gap-14 px-6 pt-14 pb-20 lg:grid-cols-[1.1fr_0.9fr] lg:pt-20 lg:pb-28">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 py-1 pr-3.5 pl-1.5 text-xs font-medium text-muted-foreground shadow-xs backdrop-blur">
            <span className="rounded-full bg-primary px-2 py-0.5 text-[0.65rem] font-bold tracking-wide text-primary-foreground uppercase">
              For teams
            </span>
            Bulk company swag, branded and shipped anywhere
          </span>

          <h1 className="mt-6 font-display text-[2.75rem] leading-[0.98] font-bold tracking-[-0.035em] text-balance text-foreground sm:text-6xl lg:text-[4.5rem]">
            Branded swag,
            <br className="hidden sm:block" /> minus the{" "}
            <span className="relative inline-block whitespace-nowrap text-primary">
              <span className="absolute inset-x-[-0.15em] bottom-[0.08em] -z-10 h-[0.42em] -rotate-1 rounded-sm bg-primary/15" />
              busywork
            </span>
            .
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-relaxed text-pretty text-muted-foreground">
            Build a pack for your whole team, drop in your logo, and ship it in bulk — or send
            claim links and let each person pick their own size and address. No spreadsheets, no
            mystery pricing, just volume rates that drop as you scale.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/shop"
              className={cn(buttonVariants({ size: "lg" }), "h-12 gap-2 px-6 text-base shadow-brand")}
            >
              Browse the shop <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/swag-pack"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 px-6 text-base")}
            >
              Build a Pack
            </Link>
          </div>

          <dl className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-4 border-t border-border/70 pt-7">
            {STATS.map((s) => (
              <div key={s.label} className="flex flex-col">
                <dt className="order-2 text-xs text-muted-foreground">{s.label}</dt>
                <dd className="order-1 font-display text-2xl font-bold tracking-tight text-foreground tabular-nums">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="lg:pl-4">
          <HeroShowcase />
        </div>
      </div>
    </section>
  );
}

// ── Logo wall ─────────────────────────────────────────────────────────────────
const BRANDS: { name: string; icon: LucideIcon }[] = [
  { name: "Northwind", icon: Wind },
  { name: "Acme Co", icon: Mountain },
  { name: "Lumen", icon: Sun },
  { name: "Hearth", icon: Flame },
  { name: "Volt", icon: Zap },
  { name: "Meridian", icon: Globe },
  { name: "Cedar & Co", icon: Trees },
  { name: "Brightside", icon: Sunrise },
];

function LogoWall() {
  const logos = BRANDS.map(({ name, icon: Icon }) => ({
    title: name,
    ariaLabel: name,
    node: (
      <span className="inline-flex items-center gap-2 whitespace-nowrap text-foreground/40 transition-colors hover:text-foreground/65">
        <Icon className="size-6 shrink-0" strokeWidth={2.25} aria-hidden />
        <span className="text-xl font-bold tracking-tight">{name}</span>
      </span>
    ),
  }));
  return (
    <section className="border-y border-border/60 bg-card">
      <div className="mx-auto max-w-site px-6 py-10">
        <p className="text-center text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Trusted by people-first teams everywhere
        </p>
        <div className="relative mt-6 overflow-hidden">
          <LogoLoop
            logos={logos}
            speed={45}
            direction="left"
            gap={56}
            logoHeight={24}
            scaleOnHover
            fadeOut
            fadeOutColor="var(--card)"
            ariaLabel="Teams that trust Swaggeroo"
          />
        </div>
      </div>
    </section>
  );
}

// ── How it works ────────────────────────────────────────────────────────────
function HowItWorks() {
  return (
    <Section>
      <SectionHeading
        eyebrow="How it works"
        title="From idea to doorstep in three steps"
        subtitle="The boring parts — sizing, addresses, reorders — are the parts we automate."
      />

      <div className="relative mt-16 grid gap-12 sm:grid-cols-3 sm:gap-8">
        <div
          aria-hidden
          className="absolute top-9 right-[16%] left-[16%] hidden h-px bg-gradient-to-r from-border via-border to-border sm:block"
        />

        {HOW_IT_WORKS.map((step, i) => (
          <div key={step.title} className="group relative flex flex-col items-center text-center">
            <div className="relative z-10 flex size-[4.5rem] items-center justify-center rounded-2xl border border-border bg-card text-primary shadow-sm transition-all group-hover:-translate-y-1 group-hover:border-primary/40 group-hover:shadow-md">
              <step.icon className="size-7" />
              <span className="absolute -top-2.5 -right-2.5 flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-brand tabular-nums">
                {i + 1}
              </span>
            </div>

            <h3 className="mt-6 text-lg font-semibold text-foreground">{step.title}</h3>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-balance text-muted-foreground">
              {step.body}
            </p>

            {i < HOW_IT_WORKS.length - 1 ? (
              <ArrowRight className="absolute top-7 -right-4 hidden size-5 text-border sm:block" />
            ) : null}
          </div>
        ))}
      </div>
    </Section>
  );
}

// ── Proof / Mockup Studio teaser ────────────────────────────────────────────
function ProofTeaser() {
  return (
    <Section muted>
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div className="lg:order-1 lg:pr-6">
          <ProofPreview />
        </div>
        <div className="lg:order-2">
          <Badge variant="soft">Proof preview</Badge>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-[-0.02em] text-foreground sm:text-4xl">
            See your logo on it — before you spend a cent
          </h2>
          <p className="mt-4 max-w-lg leading-relaxed text-muted-foreground">
            Upload your logo, drop it onto any product, and position it just right. Love it? We send
            a free, production-ready proof to approve — nothing prints until you say go.
          </p>
          <ul className="mt-6 space-y-2.5">
            {[
              "Drag, scale & rotate in real time",
              "Imprint-location presets (left chest, full front…)",
              "A free proof before every print run",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-foreground">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-primary">
                  <Check className="size-3.5" />
                </span>
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/shop"
              className={cn(buttonVariants({ size: "lg" }), "h-12 gap-2 px-6 text-base shadow-brand")}
            >
              <Sparkles className="size-4" /> Upload your logo
            </Link>
            <Link
              href="/shop"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 px-6 text-base")}
            >
              Browse products
            </Link>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ── Featured products (live data) ───────────────────────────────────────────
function FeaturedProducts({
  featured,
  loading,
}: {
  featured: CatalogProductListItem[];
  loading?: boolean;
}) {
  // Reserve the section + show skeletons while the (remote) catalog loads, so it
  // never pops in late or appears blank mid-scroll. Only hide once we know it's empty.
  if (!loading && !featured.length) return null;
  return (
    <Section>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-xl">
          <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
            Crowd favorites
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-[-0.02em] text-balance text-foreground sm:text-4xl">
            The swag that never sits in a drawer
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Best-sellers your recipients will reach for on a Monday.
          </p>
        </div>
        <Link
          href="/shop"
          className={cn(buttonVariants({ variant: "outline" }), "h-11 gap-1.5 whitespace-nowrap px-5")}
        >
          Shop all <ArrowRight className="size-4" />
        </Link>
      </div>
      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {featured.length
          ? featured.map((p) => <ProductCard key={p.id} product={p} />)
          : Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
              >
                <div className="aspect-square animate-pulse bg-muted" />
                <div className="space-y-2 p-4">
                  <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="h-5 w-1/4 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
      </div>
    </Section>
  );
}

// ── Browse flow (FlowingMenu catalog index) ─────────────────────────────────
const CATEGORY_FLOW_IMAGE: Record<string, string> = {
  apparel: "/products/premium-hoodie.webp",
  drinkware: "/products/insulated-tumbler.webp",
  bags: "/products/laptop-backpack.webp",
  tech: "/products/bluetooth-speaker.webp",
  notebooks: "/products/hardcover-notebook.webp",
  drinkbottles: "/products/stainless-water-bottle.webp",
};

function BrowseFlow({ categories }: { categories: CatalogCategory[] }) {
  if (!categories.length) return null;
  const items = categories.map((c) => ({
    link: `/shop?category=${c.slug}`,
    text: c.name,
    image: CATEGORY_FLOW_IMAGE[c.slug] ?? "/products/classic-cotton-tee.webp",
  }));
  // Scale the marquee height to the number of categories so rows never cram.
  const menuHeight = `${Math.max(items.length, 4) * 4.75}rem`;
  return (
    <section className="bg-[#0d1b3d] pb-12 sm:pb-16">
      <div className="mx-auto max-w-site px-6 pt-20 pb-12 text-center sm:pt-28 sm:pb-16">
        <p className="text-xs font-semibold tracking-[0.2em] text-white/45 uppercase">
          Browse the goods
        </p>
        <h2 className="mx-auto mt-4 max-w-2xl font-display text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
          Run your eye down the catalog
        </h2>
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-white/55">
          Every category, one scroll. Hover a row to peek inside.
        </p>
      </div>
      <div className="relative w-full" style={{ height: menuHeight }}>
        <FlowingMenu
          items={items}
          textColor="#ffffff"
          bgColor="#0d1b3d"
          marqueeBgColor="#2196ff"
          marqueeTextColor="#ffffff"
          borderColor="rgba(255,255,255,0.12)"
        />
      </div>
    </section>
  );
}

// ── Pack Studio teaser ──────────────────────────────────────────────────────
function PackStudioTeaser() {
  const steps = ["Pick", "Personalize", "Brand", "Review"];
  return (
    <Section>
      <div className="grid items-center gap-12 rounded-3xl border border-border bg-card p-8 shadow-sm lg:grid-cols-2 lg:p-12">
        <div>
          <Badge variant="soft">The differentiator</Badge>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-[-0.02em] text-foreground sm:text-4xl">
            Pack Studio does the math so you don&apos;t
          </h2>
          <p className="mt-4 max-w-lg leading-relaxed text-muted-foreground">
            Assemble a pack and watch the running total update live — per-unit price, the next volume
            break, and setup fees, all in one place. Save your draft and pick up where you left off.
          </p>
          <ol className="mt-6 space-y-3">
            {steps.map((s, i) => (
              <li key={s} className="flex items-center gap-3">
                <span className="flex size-7 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-primary tabular-nums">
                  {i + 1}
                </span>
                <span className="font-medium text-foreground">{s}</span>
                {i < steps.length - 1 ? <span className="h-px flex-1 bg-border" aria-hidden /> : null}
              </li>
            ))}
          </ol>
          <Link
            href="/swag-pack"
            className={cn(buttonVariants({ size: "lg" }), "mt-8 h-12 gap-2 px-6 text-base shadow-brand")}
          >
            Build a Pack <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="lg:pl-6">
          <PackPreview />
        </div>
      </div>
    </Section>
  );
}

// ── Superpowers (ScrollStack showcase) ──────────────────────────────────────
const STACK_CARDS: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  body: string;
  bg: string;
  tone: "dark" | "light";
}[] = [
  {
    icon: Gauge,
    eyebrow: "Live pricing",
    title: "Price it as you build",
    body: "Pack Studio shows your per-unit price, the next volume break, and setup fees in real time — no quote emails, no surprises.",
    bg: "bg-gradient-to-br from-primary to-[color-mix(in_oklch,var(--primary),#0d1b3d_35%)]",
    tone: "dark",
  },
  {
    icon: Gift,
    eyebrow: "Claim Pages",
    title: "Skip the sizing spreadsheet",
    body: "Send one link and each recipient picks their own size and ships to their own address. No account required.",
    bg: "bg-card border border-border",
    tone: "light",
  },
  {
    icon: Store,
    eyebrow: "Branded Stores",
    title: "A storefront in your colors",
    body: "Spin up an on-brand store for your team in minutes — your logo, your palette, your catalog, your domain.",
    bg: "bg-[#0d1b3d]",
    tone: "dark",
  },
  {
    icon: CalendarClock,
    eyebrow: "Scheduled Gifting",
    title: "Set it and forget it",
    body: "New-hire kits and milestone gifts go out on time, automatically — without you lifting a finger.",
    bg: "bg-brand-soft",
    tone: "light",
  },
];

function Superpowers() {
  return (
    <section className="bg-muted/40">
      <div className="mx-auto max-w-site px-6 pt-20 text-center sm:pt-24">
        <SectionHeading
          eyebrow="More than a shop"
          title="Built for swag programs, not just orders"
          subtitle="Keep scrolling — here's what turns a one-off order into something your team relies on."
        />
      </div>
      <div className="mx-auto max-w-5xl px-6">
        <ScrollStack
          useWindowScroll
          itemDistance={90}
          itemStackDistance={36}
          itemScale={0.035}
          baseScale={0.86}
          stackPosition="22%"
          scaleEndPosition="12%"
        >
          {STACK_CARDS.map((c, i) => (
            <ScrollStackItem
              key={c.title}
              itemClassName={cn(c.bg, c.tone === "dark" ? "text-white" : "text-foreground")}
            >
              <div className="flex h-full flex-col justify-between">
                <div className="flex items-start justify-between">
                  <span
                    className={cn(
                      "flex size-12 items-center justify-center rounded-2xl",
                      c.tone === "dark" ? "bg-white/15 text-white" : "bg-primary/10 text-primary",
                    )}
                  >
                    <c.icon className="size-6" />
                  </span>
                  <span className="font-display text-5xl font-bold tabular-nums opacity-15">
                    0{i + 1}
                  </span>
                </div>
                <div>
                  <p
                    className={cn(
                      "text-xs font-semibold tracking-wide uppercase",
                      c.tone === "dark" ? "text-white/70" : "text-primary",
                    )}
                  >
                    {c.eyebrow}
                  </p>
                  <h3 className="mt-1.5 font-display text-2xl font-bold tracking-[-0.02em] sm:text-3xl">
                    {c.title}
                  </h3>
                  <p
                    className={cn(
                      "mt-2 max-w-xl leading-relaxed",
                      c.tone === "dark" ? "text-white/80" : "text-muted-foreground",
                    )}
                  >
                    {c.body}
                  </p>
                </div>
              </div>
            </ScrollStackItem>
          ))}
        </ScrollStack>
      </div>
    </section>
  );
}

// ── Stats band ──────────────────────────────────────────────────────────────
function Stats() {
  return (
    <Section>
      <div className="relative overflow-hidden rounded-3xl bg-foreground px-8 py-12 text-background">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(40%_80%_at_80%_-10%,rgba(28,131,255,0.5),transparent)]"
        />
        <div className="relative grid grid-cols-2 gap-8 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-display text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">
                {s.value}
              </p>
              <p className="mt-1.5 text-sm text-background/70">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ── Testimonials ────────────────────────────────────────────────────────────
function Testimonials() {
  return (
    <Section muted>
      <SectionHeading eyebrow="Loved by the people who run swag" title="Don't take our word for it" />
      <div className="mt-12">
        <TestimonialCarousel items={TESTIMONIALS} />
      </div>
    </Section>
  );
}
