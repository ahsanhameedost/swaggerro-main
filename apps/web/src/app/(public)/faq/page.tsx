import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/marketing/page-hero";
import { Section } from "@/components/marketing/section";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { CtaBand } from "@/components/marketing/cta-band";
import { FAQS } from "@/content/marketing";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to the most common questions about ordering, pricing, and shipping swag with Swaggeroo.",
};

export default function FaqPage() {
  return (
    <>
      <PageHero
        eyebrow="FAQ"
        title="Questions, answered"
        subtitle="Everything you need to know about minimums, pricing, claim pages, and shipping."
      />

      <Section>
        <div className="mx-auto max-w-3xl">
          <FaqAccordion items={FAQS} />
        </div>
        <p className="mx-auto mt-8 max-w-3xl text-center text-sm text-muted-foreground">
          Still stuck?{" "}
          <Link href="/contact" className="font-semibold text-primary hover:underline">
            Get in touch
          </Link>{" "}
          and a human will help.
        </p>
      </Section>

      <CtaBand
        title="Ready when you are"
        secondary={{ label: "Browse the shop", href: "/shop" }}
      />
    </>
  );
}
