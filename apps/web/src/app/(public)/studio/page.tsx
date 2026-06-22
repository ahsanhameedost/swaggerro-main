import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Boxes, Palette, ClipboardCheck, Sparkles } from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { Section, SectionHeading } from "@/components/marketing/section";
import { CtaBand } from "@/components/marketing/cta-band";
import { PackPreview } from "@/components/landing/pack-preview";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pack Studio",
  description:
    "Assemble a swag pack across a few quick steps and watch the price update live — then send it for approval.",
};

const STEPS = [
  { icon: Boxes, title: "Pick products", body: "Choose the items your crew will actually use — apparel, drinkware, tech and more." },
  { icon: Palette, title: "Personalize & brand", body: "Pick sizes and colors, drop in your logo, and choose an imprint method." },
  { icon: ClipboardCheck, title: "Review & send", body: "See your per-pack price and volume breaks, then send it to our team for a proof." },
];

export default function StudioPage() {
  return (
    <div className="swag-redesign">
      <PageHero
        eyebrow="Pack Studio"
        title="Build a pack, priced as you go"
        subtitle="Assemble a swag pack across a few quick steps and watch the running total update live — per-unit price, the next volume break, and setup fees, all in one place."
      >
        <Link
          href="/swag-pack"
          className={cn(buttonVariants({ size: "lg" }), "h-12 gap-2 px-6 text-base shadow-brand")}
        >
          Start building <ArrowRight className="size-4" />
        </Link>
      </PageHero>

      <Section>
        <SectionHeading
          eyebrow="How it works"
          title="Three steps to a pack"
          subtitle="The math, volume breaks, and setup fees update live — no quote emails."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="rounded-2xl border border-border bg-card p-7 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="flex size-12 items-center justify-center rounded-xl bg-brand-soft text-primary">
                  <s.icon className="size-5" />
                </span>
                <span className="font-display text-3xl font-bold tabular-nums text-muted-foreground/40">
                  0{i + 1}
                </span>
              </div>
              <h3 className="mt-5 text-lg font-semibold text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section muted>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="size-3.5" /> Live pricing
            </span>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-[-0.02em] text-foreground sm:text-4xl">
              Watch the total update as you build
            </h2>
            <p className="mt-4 max-w-lg leading-relaxed text-muted-foreground">
              Add products, set the pack quantity, and see your per-pack and all-in totals in real
              time. Save your draft and pick up right where you left off.
            </p>
            <Link
              href="/swag-pack"
              className={cn(buttonVariants({ size: "lg" }), "mt-7 h-12 gap-2 px-6 text-base shadow-brand")}
            >
              Open Pack Studio <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="lg:pl-6">
            <PackPreview />
          </div>
        </div>
      </Section>

      <CtaBand
        title="Ready to build your pack?"
        primary={{ label: "Start building", href: "/swag-pack" }}
        secondary={{ label: "Browse the shop", href: "/shop" }}
      />
    </div>
  );
}
