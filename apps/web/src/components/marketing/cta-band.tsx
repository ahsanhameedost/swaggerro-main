import Link from "next/link";
import { ArrowRight, BadgeCheck, TrendingDown, Gift, Globe, type LucideIcon } from "lucide-react";
import { Section } from "@/components/marketing/section";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CtaLink = { label: string; href: string };

// Universal Swaggeroo value props shown as a benefit row in the CTA.
const BENEFITS: { icon: LucideIcon; title: string; sub: string }[] = [
  { icon: BadgeCheck, title: "Free proofs", sub: "on every order" },
  { icon: TrendingDown, title: "Volume pricing", sub: "built right in" },
  { icon: Gift, title: "Ship to many", sub: "one order, many addresses" },
  { icon: Globe, title: "Ships worldwide", sub: "wherever they are" },
];

type Benefit = { icon: LucideIcon; title: string; sub?: string };

/** Membership-style call-to-action: branded card, benefit row, prominent CTA. */
export function CtaBand({
  title = "Ready to send swag people actually keep?",
  subtitle = "Build your first pack in minutes. No contracts, no setup calls, no nonsense.",
  primary = { label: "Open Pack Studio", href: "/studio" },
  secondary = { label: "Create an account", href: "/signup" },
  // "link" (default) renders the secondary action as a subtle text link; "button"
  // renders it as a filled/outlined secondary-colored button (used on white-label
  // stores so the seller's Secondary brand color shows here too).
  secondaryVariant = "link",
  benefits = BENEFITS,
}: {
  title?: string;
  subtitle?: string;
  primary?: CtaLink;
  secondary?: CtaLink | null;
  secondaryVariant?: "link" | "button";
  benefits?: Benefit[];
}) {
  return (
    <Section>
      <div className="relative overflow-hidden rounded-[2rem] border border-border bg-gradient-to-br from-brand-soft via-card to-brand-soft/60 p-8 shadow-sm sm:p-12 lg:px-16 lg:py-24">
        {/* layered brand glows for depth */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-16 size-80 rounded-full bg-brand/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 -left-20 size-80 rounded-full bg-highlight/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_100%_at_50%_0%,var(--brand-soft),transparent_70%)] opacity-60"
        />

        <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_auto] lg:gap-16">
          {/* copy + benefits */}
          <div className="text-center lg:text-left">
            <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold tracking-[-0.02em] text-balance text-foreground sm:text-4xl lg:mx-0 lg:text-5xl">
              {title}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground lg:mx-0">
              {subtitle}
            </p>
            <ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-4 lg:gap-x-6">
              {benefits.map(({ icon: Icon, title: t, sub }) => (
                <li key={t} className="flex items-start gap-2.5 text-left">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-primary ring-1 ring-primary/10">
                    <Icon className="size-4" strokeWidth={2.25} aria-hidden />
                  </span>
                  <span className="leading-tight">
                    <span className="block text-sm font-semibold text-foreground">{t}</span>
                    {sub ? <span className="block text-xs text-muted-foreground">{sub}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <div className="flex flex-col items-center gap-3">
            <Link
              href={primary.href}
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-14 w-full gap-2 px-8 text-base shadow-brand sm:w-auto",
              )}
            >
              {primary.label} <ArrowRight className="size-4" />
            </Link>
            {secondary ? (
              secondaryVariant === "button" ? (
                <Link
                  href={secondary.href}
                  className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl border border-secondary bg-background px-8 text-base font-semibold text-secondary transition-colors hover:bg-secondary hover:text-secondary-foreground sm:w-auto"
                >
                  {secondary.label}
                </Link>
              ) : (
                <Link
                  href={secondary.href}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  {secondary.label}
                </Link>
              )
            ) : (
              <span className="text-xs text-muted-foreground">No commitment, start free</span>
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}
