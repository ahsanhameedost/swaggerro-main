import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, LayoutDashboard } from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { Section } from "@/components/marketing/section";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Your account",
  description: "Your Swaggeroo customer account — orders, proofs, and reorders.",
};

export default function AccountPage() {
  return (
    <div className="swag-redesign">
      <PageHero
        eyebrow="Account"
        title="Your account is on the way"
        subtitle="A self-serve customer area — orders, proofs, and one-click reorders — is coming soon. In the meantime our team handles everything for you."
      />
      <Section>
        <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-primary">
            <Clock className="size-7" />
          </div>
          <h2 className="mt-5 font-display text-2xl font-bold text-foreground">Coming soon</h2>
          <p className="mx-auto mt-3 max-w-md leading-relaxed text-muted-foreground">
            Order history, design proofs, and reorders will live here. Admins can already manage
            everything from the dashboard.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className={cn(buttonVariants({ size: "lg" }), "h-12 gap-2 px-6 text-base shadow-brand")}
            >
              <LayoutDashboard className="size-4" /> Go to dashboard
            </Link>
            <Link
              href="/shop"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 gap-2 px-6 text-base")}
            >
              Browse the shop <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </Section>
    </div>
  );
}
