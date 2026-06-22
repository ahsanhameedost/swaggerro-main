import { Check, Sparkles, TrendingDown } from "lucide-react";

const ITEMS = [
  { name: "Premium Fleece Hoodie", qty: 50, color: "#0b1020", price: "$1,575" },
  { name: "Insulated Tumbler 20oz", qty: 50, color: "#2563eb", price: "$825" },
  { name: "Hardcover Notebook", qty: 50, color: "#475569", price: "$595" },
];

/**
 * Stylized Pack Studio preview for the hero — mirrors the real builder's
 * Running Total so the hero shows the actual product, not stock art.
 */
export function PackPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* ambient brand glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-8 -z-10 rounded-[3rem] bg-[radial-gradient(60%_60%_at_70%_30%,rgba(30,64,175,0.24),transparent)] blur-2xl"
      />

      {/* floating proof badge */}
      <div className="absolute -top-4 -right-3 z-10 flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-lg">
        <span className="flex size-4 items-center justify-center rounded-full bg-success/15 text-success">
          <Check className="size-3" />
        </span>
        Proof ready
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.28),0_8px_24px_-12px_rgba(37,99,235,0.25)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Your Pack</p>
            <p className="text-xs text-muted-foreground">New Hire Kit · 50 recipients</p>
          </div>
          <span className="flex size-9 items-center justify-center rounded-xl bg-brand-soft text-primary">
            <Sparkles className="size-4" />
          </span>
        </div>

        <ul className="mt-5 space-y-3">
          {ITEMS.map((item) => (
            <li key={item.name} className="flex items-center gap-3">
              <span
                className="size-8 shrink-0 rounded-lg border border-border/70"
                style={{ backgroundColor: item.color }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                <p className="text-xs text-muted-foreground tabular-nums">{item.qty} units</p>
              </div>
              <span className="text-sm font-semibold text-foreground tabular-nums">{item.price}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-center gap-1.5 rounded-xl bg-success/10 px-3 py-2 text-xs font-medium text-success">
          <TrendingDown className="size-3.5" />
          Add 50 more to drop to $11.40/ea
        </div>

        <div className="mt-5 flex items-end justify-between border-t border-border pt-4">
          <div>
            <p className="text-xs text-muted-foreground">Per pack, all-in</p>
            <p className="text-2xl font-bold text-foreground tabular-nums">$59.90</p>
          </div>
          <div className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-brand">
            Add Pack to Cart
          </div>
        </div>
      </div>
    </div>
  );
}
