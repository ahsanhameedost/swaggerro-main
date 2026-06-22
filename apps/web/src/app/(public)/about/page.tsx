import type { Metadata } from "next";
import { PageHero } from "@/components/marketing/page-hero";
import { Section, SectionHeading } from "@/components/marketing/section";
import { CtaBand } from "@/components/marketing/cta-band";
import { VALUES, STATS } from "@/content/marketing";

export const metadata: Metadata = {
  title: "About",
  description:
    "Swaggeroo makes custom swag people actually want — designed, branded, and shipped without the chaos.",
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="Our story"
        title="Swag, minus the chaos"
        subtitle="We started Swaggeroo because ordering company swag felt like a part-time job — spreadsheets of sizes, mystery quotes, and boxes nobody wanted. So we rebuilt the whole thing."
      />

      {/* Mission */}
      <Section>
        <div className="mx-auto max-w-3xl space-y-5 text-lg leading-relaxed text-muted-foreground">
          <p>
            The average swag order touches a dozen tools and twice as many email threads.
            Someone collects sizes in a spreadsheet, someone else chases a quote, and three
            weeks later a pallet of medium t-shirts shows up for a team that mostly wears large.
          </p>
          <p>
            Swaggeroo replaces all of that with one place to{" "}
            <span className="font-semibold text-foreground">build, brand, and ship</span>. Pack
            Studio prices your order live as you go. Claim pages let recipients pick their own
            size and address. Branded stores let your team reorder in seconds. The boring,
            error-prone parts are the parts we automate.
          </p>
          <p>
            The result is swag that feels like a gift instead of a giveaway — and a process that
            takes minutes instead of weeks.
          </p>
        </div>
      </Section>

      {/* Values */}
      <Section muted>
        <SectionHeading
          eyebrow="What we believe"
          title="The principles behind the platform"
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {VALUES.map((v) => (
            <div
              key={v.title}
              className="flex gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-primary">
                <v.icon className="size-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{v.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{v.body}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Stats */}
      <Section>
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-display text-4xl font-bold tracking-tight text-primary tabular-nums sm:text-5xl">
                {s.value}
              </p>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </Section>

      <CtaBand
        title="Come build something your crew will keep"
        secondary={{ label: "Browse the shop", href: "/shop" }}
      />
    </>
  );
}
