import { cn } from "@/lib/utils";

/** Standard vertical rhythm + max-width wrapper for marketing sections. */
export function Section({
  children,
  muted,
  id,
  className,
}: {
  children: React.ReactNode;
  muted?: boolean;
  id?: string;
  className?: string;
}) {
  return (
    <section id={id} className={cn(muted && "bg-muted/40", className)}>
      <div className="mx-auto max-w-site px-6 py-20 sm:py-24">{children}</div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      {eyebrow ? (
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">{eyebrow}</p>
      ) : null}
      <h2 className="mt-2 font-display text-3xl font-bold tracking-[-0.02em] text-balance text-foreground sm:text-4xl">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-3 leading-relaxed text-muted-foreground">{subtitle}</p>
      ) : null}
    </div>
  );
}
