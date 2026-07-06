"use client";

import { useEffect } from "react";
import { ArrowRight, Check, ShoppingBag, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type AddedToCartLine = {
  name: string;
  imageUrl?: string | null;
  variantName?: string | null;
  quantity: number;
  unitLabel: string;
  totalLabel: string;
};

type AddedToCartDrawerProps = {
  open: boolean;
  onClose: () => void;
  line: AddedToCartLine | null;
  /** Primary CTA — the "direct checkout" action. */
  primaryLabel: string;
  onPrimary: () => void;
  /** Secondary CTA — defaults to closing the drawer. */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Optional short note under the summary (e.g. "Free proofs before printing"). */
  note?: string;
};

// A right-side slide-in confirmation shown right after "Add to cart". Purely
// presentational so it can be reused by the public shop and white-label stores —
// the parent owns the cart mutation and where the primary CTA leads.
export function AddedToCartDrawer({
  open,
  onClose,
  line,
  primaryLabel,
  onPrimary,
  secondaryLabel = "Continue shopping",
  onSecondary,
  note,
}: AddedToCartDrawerProps) {
  // Close on Escape and lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <div className={cn("fixed inset-0 z-[60]", open ? "" : "pointer-events-none")} aria-hidden={!open}>
      {/* Scrim */}
      <div
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-foreground/40 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-label="Added to cart"
        className={cn(
          "absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-card shadow-2xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-success">
            <span className="flex size-6 items-center justify-center rounded-full bg-success/12">
              <Check className="size-3.5" />
            </span>
            Added to cart
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {line ? (
            <div className="flex gap-4 rounded-2xl border border-border bg-background p-4">
              <div className="size-20 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                {line.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={line.imageUrl} alt="" className="h-full w-full object-contain p-1.5" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <ShoppingBag className="size-6" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">{line.name}</p>
                {line.variantName ? (
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">{line.variantName}</p>
                ) : null}
                <p className="mt-1 text-sm text-muted-foreground">
                  {line.unitLabel} × {line.quantity}
                </p>
                <p className="mt-2 font-display text-lg font-bold tabular-nums text-foreground">
                  {line.totalLabel}
                </p>
              </div>
            </div>
          ) : null}

          {note ? <p className="mt-4 text-center text-xs text-muted-foreground">{note}</p> : null}
        </div>

        <footer className="space-y-2.5 border-t border-border px-5 py-4">
          <button
            onClick={onPrimary}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white"
            style={{ backgroundImage: "var(--primary-gradient)", backgroundColor: "var(--primary)" }}
          >
            {primaryLabel} <ArrowRight className="size-4" />
          </button>
          <button
            onClick={onSecondary ?? onClose}
            className="w-full rounded-xl border border-border bg-card py-2.5 text-sm font-semibold text-foreground transition hover:border-foreground/30"
          >
            {secondaryLabel}
          </button>
        </footer>
      </aside>
    </div>
  );
}
