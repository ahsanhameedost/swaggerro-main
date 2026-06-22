import Link from "next/link";
import { PageHero } from "@/components/marketing/page-hero";
import { Section } from "@/components/marketing/section";

export type LegalSection = {
  heading: string;
  /** Each entry is a paragraph (string) or a bullet list (string[]). */
  body: (string | string[])[];
};

/** Shared layout for legal pages (privacy, terms, shipping & returns). */
export function LegalDoc({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro?: string;
  sections: LegalSection[];
}) {
  return (
    <>
      <PageHero eyebrow="Legal" title={title} subtitle={`Last updated ${updated}`} />

      <Section>
        <div className="mx-auto max-w-3xl">
          {intro ? (
            <p className="text-lg leading-relaxed text-muted-foreground">{intro}</p>
          ) : null}

          {/* table of contents */}
          <nav className="mt-8 rounded-2xl border border-border bg-muted/40 p-5">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              On this page
            </p>
            <ol className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
              {sections.map((s, i) => (
                <li key={s.heading}>
                  <a
                    href={`#${slug(s.heading)}`}
                    className="text-foreground/80 transition-colors hover:text-primary"
                  >
                    {i + 1}. {s.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="mt-12 space-y-10">
            {sections.map((s, i) => (
              <section key={s.heading} id={slug(s.heading)} className="scroll-mt-24">
                <h2 className="font-display text-xl font-bold tracking-[-0.01em] text-foreground">
                  {i + 1}. {s.heading}
                </h2>
                <div className="mt-3 space-y-3 leading-relaxed text-muted-foreground">
                  {s.body.map((part, j) =>
                    Array.isArray(part) ? (
                      <ul key={j} className="ml-1 space-y-1.5">
                        {part.map((li, k) => (
                          <li key={k} className="flex gap-2.5">
                            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/60" />
                            <span>{li}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p key={j}>{part}</p>
                    ),
                  )}
                </div>
              </section>
            ))}
          </div>

          <p className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground">
            Questions about this policy? Reach us any time at{" "}
            <a href="mailto:hello@swaggeroo.com" className="font-medium text-primary hover:underline">
              hello@swaggeroo.com
            </a>{" "}
            or through our{" "}
            <Link href="/contact" className="font-medium text-primary hover:underline">
              contact page
            </Link>
            .
          </p>
        </div>
      </Section>
    </>
  );
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
