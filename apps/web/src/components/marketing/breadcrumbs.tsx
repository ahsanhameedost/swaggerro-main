import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type Crumb = { label: string; href?: string };

const TONES = {
  default: {
    base: "text-muted-foreground",
    link: "transition-colors hover:text-foreground",
    current: "font-medium text-foreground",
    sep: "text-border",
  },
  onBrand: {
    base: "text-white/70",
    link: "transition-colors hover:text-white",
    current: "font-medium text-white",
    sep: "text-white/50",
  },
} as const;

/** Left-aligned breadcrumb trail for inner pages. The last item is treated as the current page. */
export function Breadcrumbs({
  items,
  className,
  tone = "default",
}: {
  items: Crumb[];
  className?: string;
  tone?: keyof typeof TONES;
}) {
  if (!items.length) return null;
  const t = TONES[tone];
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className={`flex flex-wrap items-center gap-1.5 text-sm ${t.base}`}>
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
              {item.href && !last ? (
                <Link href={item.href} className={t.link}>
                  {item.label}
                </Link>
              ) : (
                <span
                  className={last ? t.current : undefined}
                  aria-current={last ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
              {!last ? <ChevronRight className={`size-3.5 ${t.sep}`} aria-hidden /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
