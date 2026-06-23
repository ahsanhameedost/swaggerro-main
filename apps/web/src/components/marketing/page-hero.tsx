import { Breadcrumbs, type Crumb } from "./breadcrumbs";

/** Consistent header for inner marketing pages (about, pricing, faq, …). */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  children,
  breadcrumbs,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  breadcrumbs?: Crumb[];
}) {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-full bg-[radial-gradient(50%_70%_at_50%_-10%,var(--brand-soft),transparent)]"
      />
      {breadcrumbs?.length ? (
        <div className="mx-auto max-w-site px-6 pt-6">
          <Breadcrumbs items={breadcrumbs} />
        </div>
      ) : null}
      <div className="mx-auto max-w-3xl px-6 pt-10 pb-14 text-center sm:pt-12 sm:pb-16">
        {eyebrow ? (
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">{eyebrow}</p>
        ) : null}
        <h1 className="mt-3 font-display text-4xl font-bold tracking-[-0.03em] text-balance text-foreground sm:text-5xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
        {children ? <div className="mt-8">{children}</div> : null}
      </div>
    </section>
  );
}
