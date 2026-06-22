import { Plus } from "lucide-react";
import type { Faq } from "@/content/marketing";

/** Accessible, JS-free FAQ accordion (native <details>) as stacked cards. */
export function FaqAccordion({ items }: { items: Faq[] }) {
  return (
    <div className="space-y-3">
      {items.map((f) => (
        <details
          key={f.q}
          className="group rounded-2xl border border-border bg-card px-5 shadow-sm transition-colors open:border-primary/30 hover:border-primary/30"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-base font-semibold text-foreground [&::-webkit-details-marker]:hidden">
            {f.q}
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-all duration-200 group-open:rotate-45 group-open:bg-primary group-open:text-primary-foreground">
              <Plus className="size-4" />
            </span>
          </summary>
          <p className="pb-5 leading-relaxed text-muted-foreground">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
