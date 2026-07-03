"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Sparkles, TrendingDown } from "lucide-react";

const ITEMS = [
  { name: "Premium Fleece Hoodie", color: "#0b1020" },
  { name: "Insulated Tumbler 20oz", color: "#2563eb" },
  { name: "Hardcover Notebook", color: "#475569" },
];

// Volume breaks the card loops through — qty climbs, per-unit price falls.
const BREAKS = [
  { qty: 50, lines: [1575, 825, 595], perPack: 59.9 },
  { qty: 100, lines: [2850, 1450, 1050], perPack: 53.5 },
  { qty: 250, lines: [6475, 3225, 2300], perPack: 48.0 },
  { qty: 500, lines: [11950, 5700, 4100], perPack: 43.5 },
] as const;

const LOOP_MS = 2000;
const LAST = BREAKS.length - 1;

const reduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Tween a number to its target with requestAnimationFrame (easeOutCubic). */
function useTween(target: number, duration = 650) {
  const [val, setVal] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(from + (target - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return val;
}

const money0 = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const money2 = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const int = (n: number) => Math.round(n).toLocaleString("en-US");

/**
 * Stylized Pack Studio preview — loops through volume breaks so the running
 * total recalculates live ("Pack Studio does the math"). Numbers count to value.
 */
export function PackPreview() {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (reduced()) return;
    const id = setInterval(() => setI((p) => (p + 1) % BREAKS.length), LOOP_MS);
    return () => clearInterval(id);
  }, []);

  const cur = BREAKS[i];
  const next = BREAKS[(i + 1) % BREAKS.length];

  const qty = useTween(cur.qty);
  const line0 = useTween(cur.lines[0]);
  const line1 = useTween(cur.lines[1]);
  const line2 = useTween(cur.lines[2]);
  const perPack = useTween(cur.perPack);
  const hintPerPack = useTween(next.perPack);
  const lines = [line0, line1, line2];

  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* ambient brand glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-8 -z-10 rounded-[3rem] bg-[radial-gradient(60%_60%_at_70%_30%,rgba(33,150,255,0.24),transparent)] blur-2xl"
      />

      {/* floating proof badge */}
      <div className="absolute -top-4 -right-3 z-10 flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-lg">
        <span className="flex size-4 items-center justify-center rounded-full bg-success/15 text-success">
          <Check className="size-3" />
        </span>
        Proof ready
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 shadow-[0_24px_60px_-20px_rgba(13,27,61,0.28),0_8px_24px_-12px_rgba(33,150,255,0.25)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Your Pack</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              New Hire Kit · {int(qty)} recipients
            </p>
          </div>
          <span className="flex size-9 items-center justify-center rounded-xl bg-brand-soft text-primary">
            <Sparkles className="size-4" />
          </span>
        </div>

        <ul className="mt-5 space-y-3">
          {ITEMS.map((item, idx) => (
            <li key={item.name} className="flex items-center gap-3">
              <span
                className="size-8 shrink-0 rounded-lg border border-border/70"
                style={{ backgroundColor: item.color }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                <p className="text-xs text-muted-foreground tabular-nums">{int(qty)} units</p>
              </div>
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {money0(lines[idx])}
              </span>
            </li>
          ))}
        </ul>

        {/* volume-break hint — re-animates on each step */}
        <div
          key={i}
          className="mt-5 flex items-center gap-1.5 rounded-xl bg-success/10 px-3 py-2 text-xs font-medium text-success duration-500 animate-in fade-in slide-in-from-bottom-1"
        >
          {i === LAST ? (
            <>
              <Check className="size-3.5" />
              <span className="tabular-nums">Best volume price unlocked · {money2(perPack)}/ea</span>
            </>
          ) : (
            <>
              <TrendingDown className="size-3.5" />
              <span className="tabular-nums">
                Add {int(next.qty - cur.qty)} more to drop to {money2(hintPerPack)}/ea
              </span>
            </>
          )}
        </div>

        <div className="mt-5 flex items-end justify-between border-t border-border pt-4">
          <div>
            <p className="text-xs text-muted-foreground">Per pack, all-in</p>
            <p className="text-2xl font-bold text-foreground tabular-nums">{money2(perPack)}</p>
          </div>
          <div className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-brand">
            Add Pack to Cart
          </div>
        </div>
      </div>
    </div>
  );
}
