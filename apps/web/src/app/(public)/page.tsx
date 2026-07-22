import Link from "next/link";
import {
  ArrowRight,
  Gauge,
  Gift,
  Store,
  CalendarClock,
  MessageCircleQuestion,
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
import { Badge } from "@/components/ui/badge";
import { Section, SectionHeading } from "@/components/marketing/section";
import { CtaBand } from "@/components/marketing/cta-band";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { TestimonialCarousel } from "@/components/marketing/testimonial-carousel";
import { PackPreview } from "@/components/landing/pack-preview";
import { HeroSlider } from "@/components/landing/hero-slider";
import { AmbientBackdrop } from "@/components/landing/ambient-backdrop";
import { CategoryBar } from "@/components/landing/category-bar";
import { CategoryShowcase } from "@/components/landing/category-showcase";
import { FeatureBento } from "@/components/landing/feature-bento";
import { OccasionCollections } from "@/components/landing/occasion-collections";
import CurvedLoop from "@/components/reactbits/CurvedLoop";
import DarkVeil from "@/components/reactbits/DarkVeil";
import { ProductCard } from "@/components/shop/product-card";
import ScrollStack, { ScrollStackItem } from "@/components/reactbits/ScrollStack";
import { getHomeProducts, getHomeCategories, toShowcaseProducts } from "@/lib/home/data";
import type { CatalogProductListItem } from "@/modules/catalog/products/types";
import { TESTIMONIALS, FAQS } from "@/content/marketing";
import { cn } from "@/lib/utils";

// Curated occasion collections — mirrors the design's collection cards (live
// collections carry no imagery/counts yet, so these stay static & on-brand).
const OCCASIONS = [
  { slug: "new-hire", name: "New Hire Kit", description: "Make day one feel like a win.", imageUrl: "/products/premium-hoodie-branded.webp", count: 4 },
  { slug: "events", name: "Event Ready", description: "Booth-worthy gear that travels well.", imageUrl: "/products/classic-cotton-tee-cobalt.webp", count: 4 },
  { slug: "eco", name: "Eco Mob", description: "Planet-friendly picks, no greenwashing.", imageUrl: "/products/stainless-water-bottle-branded.webp", count: 4 },
  { slug: "holiday", name: "Holiday Drop", description: "Gifts that beat another branded stress ball.", imageUrl: "/products/bluetooth-speaker-branded.webp", count: 4 },
];

export default async function Home() {
  const [products, categories] = await Promise.all([getHomeProducts(), getHomeCategories()]);
  const featured = products.slice(0, 4);
  const showcaseProducts = toShowcaseProducts(products);

  return (
    <>
      <AmbientBackdrop />
      <Hero />
      <LogoWall />
      <CategoryBar categories={categories} />
      <CategoryShowcase categories={categories} products={showcaseProducts} />
      <FeaturedProducts featured={featured} />
      <OccasionCollections collections={OCCASIONS} />
      <FeatureBento />
      <PackStudioTeaser />
      <Superpowers />
      <Testimonials />
      <Section id="faq">
        <SectionHeading
          eyebrow="Frequently asked"
          title="Questions, answered"
          subtitle="Minimums, pricing, claim pages, shipping: the short version. Still curious? A human is one click away."
        />
        <div className="mx-auto mt-12 max-w-3xl">
          <FaqAccordion items={FAQS.slice(0, 6)} />

          <div className="mt-8 flex flex-col items-center justify-between gap-5 rounded-2xl border border-border bg-brand-soft/50 p-6 text-center sm:flex-row sm:gap-4 sm:text-left">
            <div className="flex items-center gap-3.5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card text-primary shadow-sm ring-1 ring-border">
                <MessageCircleQuestion className="size-5" />
              </span>
              <div>
                <p className="font-semibold text-foreground">Still have questions?</p>
                <p className="text-sm text-muted-foreground">
                  Talk to a real human. We usually reply within a few hours.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2.5">
              <Link href="/contact" className={cn(buttonVariants(), "gap-2")}>
                Talk to us <ArrowRight className="size-4" />
              </Link>
              <Link href="/faq" className={cn(buttonVariants({ variant: "outline" }))}>
                All FAQs
              </Link>
            </div>
          </div>
        </div>
      </Section>
      <CtaBand />
    </>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <>
      {/* Dark hero: an animated DarkVeil background spans the whole banner, with
          the content rendered light-on-dark above it. */}
      <section className="relative overflow-hidden bg-[#070712] text-white">
        {/* Animated veil across the full banner, recolored to brand blue #005CFE. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
          <DarkVeil
            tintColor="#005CFE"
            speed={0.8}
            warpAmount={1.4}
            scanlineIntensity={0.1}
            scanlineFrequency={2}
            noiseIntensity={0.02}
          />
        </div>
        {/* Soft scrim so the headline stays crisp over the animation — kept light
            through the middle so the animated veil shows at full strength. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-[#070712]/45 via-transparent to-[#070712]/75"
        />
        <div className="relative z-10">
          <HeroSlider />
        </div>
      </section>
      {/* Curved marquee strip — kept on a light background (as in the original
          design), with faint brand-blue text. */}
      <div className="relative select-none bg-background text-primary/15">
        <CurvedLoop
          marqueeText="Custom Swag ✦ Volume Pricing ✦ Free Proofs ✦ Ships Worldwide ✦"
          speed={1.2}
          curveAmount={80}
          interactive
          className="text-[3.25rem]"
        />
      </div>
    </>
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

// ── Featured products (live data) ───────────────────────────────────────────
function FeaturedProducts({ featured }: { featured: CatalogProductListItem[] }) {
  if (!featured.length) return null;
  return (
    <Section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          align="left"
          eyebrow="Crowd favorites"
          title="The swag that never sits in a drawer"
          subtitle="Best-sellers your recipients will reach for on a Monday."
        />
        <Link
          href="/shop"
          className={cn(buttonVariants({ variant: "outline" }), "gap-1.5 whitespace-nowrap")}
        >
          Shop all <ArrowRight className="size-4" />
        </Link>
      </div>
      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {featured.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </Section>
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
            Assemble a pack across four quick steps and watch the running total update live:
            per-unit price, the next volume break, and setup fees, all in one place. Save your
            draft and pick up right where you left off.
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
            href="/studio"
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
    body: "Pack Studio shows your per-unit price, the next volume break, and setup fees in real time. No quote emails, no surprises.",
    bg: "bg-gradient-to-br from-primary to-navy",
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
    body: "Spin up an on-brand store for your team in minutes. Your logo, your palette, your catalog, your domain.",
    bg: "bg-navy",
    tone: "dark",
  },
  {
    icon: CalendarClock,
    eyebrow: "Scheduled Gifting",
    title: "Set it and forget it",
    body: "New-hire kits and milestone gifts go out on time, automatically, without you lifting a finger.",
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
          subtitle="Keep scrolling. Here's what turns a one-off order into something your team relies on."
        />
      </div>
      <div className="mx-auto max-w-site px-6">
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

// ── Testimonials ────────────────────────────────────────────────────────────
function Testimonials() {
  return (
    <section className="bg-muted/40 py-20 sm:py-24">
      <div className="mx-auto max-w-site px-6">
        <SectionHeading eyebrow="Loved by the people who run swag" title="Don't take our word for it" />
      </div>
      <div className="mt-12">
        <TestimonialCarousel items={TESTIMONIALS} />
      </div>
    </section>
  );
}
