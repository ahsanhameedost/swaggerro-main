import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Truck, Gift, Boxes } from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { Section, SectionHeading } from "@/components/marketing/section";
import { CtaBand } from "@/components/marketing/cta-band";
import { PackPreview } from "@/components/landing/pack-preview";
import { buttonVariants } from "@/components/ui/button";
import { HOW_IT_WORKS, SUPERPOWERS } from "@/content/marketing";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "Build a pack, brand it, and ship it anywhere — or send claim links and let recipients self-serve. Here's how Swaggeroo works end to end.",
};

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        eyebrow="How it works"
        title="From idea to doorstep, the easy way"
        subtitle="Three steps to get swag out the door — and a few superpowers that make the whole thing run itself."
      >
        <Link
          href="/swag-pack"
          className={cn(buttonVariants({ size: "lg" }), "h-12 gap-2 px-6 text-base shadow-brand")}
        >
          Build a Pack <ArrowRight className="size-4" />
        </Link>
      </PageHero>

      {/* Steps — alternating rows, each with its own visual */}
      <Section>
        <div className="space-y-16 lg:space-y-28">
          {HOW_IT_WORKS.map((step, i) => (
            <div key={step.title} className="relative grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
              <div className={cn(i % 2 === 1 && "lg:order-2")}>
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-primary">
                    <step.icon className="size-5" />
                  </span>
                  <span className="font-display text-2xl font-bold text-muted-foreground tabular-nums">
                    Step {i + 1}
                  </span>
                </div>
                <h2 className="mt-4 font-display text-2xl font-bold tracking-[-0.02em] text-foreground sm:text-3xl">
                  {step.title}
                </h2>
                <p className="mt-3 max-w-md leading-relaxed text-muted-foreground">{step.body}</p>
              </div>
              <div className={cn("flex justify-center", i % 2 === 1 && "lg:order-1")}>
                <StepVisual index={i} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Superpowers */}
      <Section muted>
        <SectionHeading
          eyebrow="The superpowers"
          title="Where Swaggeroo pulls ahead"
          subtitle="Once your pack is built, these turn a one-off order into a program."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {SUPERPOWERS.map((p) => (
            <div key={p.title} className="rounded-2xl border border-border bg-card p-7 shadow-sm">
              <div className="flex size-12 items-center justify-center rounded-xl bg-brand-soft text-primary">
                <p.icon className="size-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-foreground">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <CtaBand secondary={{ label: "Browse the shop", href: "/shop" }} />
    </>
  );
}

// ── Per-step visuals ─────────────────────────────────────────────────────────
function StepVisual({ index }: { index: number }) {
  if (index === 0) return <PickGallery />;
  if (index === 1) return <PackPreview />;
  return <ShipOptions />;
}

// Step 1 — a mini catalog grid (real product photography)
const PICK_TILES = [
  { src: "/products/premium-hoodie.webp", label: "Apparel" },
  { src: "/products/insulated-tumbler.webp", label: "Drinkware" },
  { src: "/products/laptop-backpack.webp", label: "Bags" },
  { src: "/products/bluetooth-speaker.webp", label: "Tech" },
];

function PickGallery() {
  return (
    <div className="relative w-full max-w-md">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[3rem] bg-[radial-gradient(60%_60%_at_50%_40%,rgba(30,64,175,0.16),transparent)] blur-2xl"
      />
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {PICK_TILES.map((t) => (
          <figure
            key={t.src}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
          >
            <div className="relative aspect-square">
              <Image src={t.src} alt={t.label} fill sizes="220px" className="object-cover" />
            </div>
            <figcaption className="absolute top-2 left-2 rounded-full bg-card/90 px-2.5 py-0.5 text-xs font-semibold text-foreground shadow-sm backdrop-blur">
              {t.label}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

// Step 3 — the three fulfillment options
const SHIP_OPTIONS = [
  { icon: Truck, title: "Bulk to one address", body: "We ship the whole run to your office or event." },
  { icon: Gift, title: "Claim links", body: "Send one link; each recipient picks size + address." },
  { icon: Boxes, title: "Warehouse & release", body: "Store it with us and ship on demand, later." },
];

function ShipOptions() {
  return (
    <div className="relative w-full max-w-md">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[3rem] bg-[radial-gradient(60%_60%_at_50%_40%,rgba(30,64,175,0.16),transparent)] blur-2xl"
      />
      <div className="rounded-3xl border border-border bg-card p-6 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.28)]">
        <p className="text-sm font-semibold text-foreground">Choose how it ships</p>
        <ul className="mt-4 space-y-3">
          {SHIP_OPTIONS.map((o) => (
            <li
              key={o.title}
              className="flex items-start gap-3 rounded-2xl border border-border bg-background p-4 transition-colors hover:border-primary/40"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-primary">
                <o.icon className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">{o.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{o.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
