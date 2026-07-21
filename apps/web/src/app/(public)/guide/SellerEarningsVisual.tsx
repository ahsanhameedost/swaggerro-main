"use client";

import { useEffect, useRef, useState } from "react";
import { Percent, Coins } from "lucide-react";

// Self-explanatory animation for "How sellers earn": a quantity that sweeps from
// 1 → 50 while two earning models count up alongside it, so the viewer sees both
// models AND how they scale from a single item to a bulk order — without reading.
const MAX_QTY = 50;
const PCT_PER = 5; // $5 / item — 50% of a $10 markup (base $10 → sold $20)
const FLAT_PER = 3; // $3 / item — a fixed cut
const MAX_EARN = MAX_QTY * PCT_PER; // scale reference for the bars

export function SellerEarningsVisual() {
  const [qty, setQty] = useState(1);
  const raf = useRef(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setQty(24);
      return;
    }
    let start: number | null = null;
    const DUR = 3600; // ms for one 1→50 sweep
    const loop = (t: number) => {
      if (start === null) start = t;
      const p = ((t - start) % (DUR * 2)) / DUR; // 0..2, then repeats
      const tri = p <= 1 ? p : 2 - p; // triangle wave 0→1→0
      const eased = tri * tri * (3 - 2 * tri); // smoothstep
      setQty(Math.max(1, Math.round(eased * MAX_QTY)));
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  const pctEarn = qty * PCT_PER;
  const flatEarn = qty * FLAT_PER;
  const money = (n: number) => "$" + n.toLocaleString("en-US");

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      {/* Quantity readout */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          On this order
        </span>
        <span className="inline-flex items-baseline gap-1 rounded-full bg-brand-soft px-3 py-1">
          <span className="font-display text-2xl font-bold tabular-nums text-primary">{qty}</span>
          <span className="text-xs font-medium text-primary/70">item{qty === 1 ? "" : "s"}</span>
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {qty <= 3 ? "A single order…" : qty >= 40 ? "…all the way up to bulk." : "…scaling up."}
      </p>

      {/* Model 1 — Percentage / markup split */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Percent className="size-3.5 text-primary" /> Percentage
            <span className="font-normal text-muted-foreground">· 50% of your markup</span>
          </span>
          <span className="font-display text-lg font-bold tabular-nums text-primary">{money(pctEarn)}</span>
        </div>
        <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-muted">
          <span
            className="block h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
            style={{ width: `${(pctEarn / MAX_EARN) * 100}%` }}
          />
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
          {money(PCT_PER)} / item × {qty}
        </p>
      </div>

      {/* Model 2 — Flat rate */}
      <div className="mt-5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Coins className="size-3.5 text-amber-500" /> Flat rate
            <span className="font-normal text-muted-foreground">· fixed per item</span>
          </span>
          <span className="font-display text-lg font-bold tabular-nums text-amber-500">{money(flatEarn)}</span>
        </div>
        <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-muted">
          <span
            className="block h-full rounded-full bg-amber-400 transition-[width] duration-150 ease-out"
            style={{ width: `${(flatEarn / MAX_EARN) * 100}%` }}
          />
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
          {money(FLAT_PER)} / item × {qty}
        </p>
      </div>

      <p className="mt-6 border-t border-border pt-3 text-center text-xs text-muted-foreground">
        Same rule for one item or a thousand — your earnings scale with the order.
      </p>
    </div>
  );
}
