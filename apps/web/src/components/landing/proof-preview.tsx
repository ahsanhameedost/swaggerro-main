import { Check, Move, Maximize2, RotateCw } from "lucide-react";

/**
 * Stylized Mockup Studio preview for the landing page — a logo placed on a
 * product with selection handles, conveying the drag/scale/rotate proof tool.
 * Pure CSS illustration (no external image) so it stays crisp and on-brand.
 */
export function ProofPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-8 -z-10 rounded-[3rem] bg-[radial-gradient(60%_60%_at_30%_30%,rgba(30,64,175,0.22),transparent)] blur-2xl"
      />

      {/* floating proof badge */}
      <div className="absolute -top-4 -right-3 z-10 flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-lg">
        <span className="flex size-4 items-center justify-center rounded-full bg-success/15 text-success">
          <Check className="size-3" />
        </span>
        Proof ready
      </div>

      <div className="rounded-3xl border border-border bg-card p-5 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.28),0_8px_24px_-12px_rgba(30,64,175,0.25)]">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Mockup Studio</p>
          <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-primary">
            Preview
          </span>
        </div>

        {/* stage with checkerboard + product + placed logo */}
        <div className="relative mt-4 aspect-square overflow-hidden rounded-2xl border border-border bg-[conic-gradient(#f1f5f9_90deg,#ffffff_90deg_180deg,#f1f5f9_180deg_270deg,#ffffff_270deg)] bg-[length:28px_28px]">
          {/* the "product" */}
          <div className="absolute inset-7 rounded-[2rem] bg-gradient-to-br from-slate-200 to-slate-300 shadow-inner dark:from-slate-700 dark:to-slate-800" />

          {/* placed logo with selection ring + corner handles */}
          <div className="absolute top-1/2 left-1/2 w-[46%] -translate-x-1/2 -translate-y-1/2">
            <div className="relative rounded-xl bg-primary px-4 py-3 text-center shadow-brand ring-2 ring-primary/40">
              <span className="font-display text-xl font-bold tracking-tight text-primary-foreground">
                LOGO
              </span>
              {/* selection handles */}
              {["-top-1.5 -left-1.5", "-top-1.5 -right-1.5", "-bottom-1.5 -left-1.5", "-bottom-1.5 -right-1.5"].map(
                (pos) => (
                  <span
                    key={pos}
                    className={`absolute ${pos} size-3 rounded-full border-2 border-primary bg-card`}
                  />
                ),
              )}
            </div>
          </div>
        </div>

        {/* control chips */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { icon: Move, label: "Drag" },
            { icon: Maximize2, label: "Scale" },
            { icon: RotateCw, label: "Rotate" },
          ].map((c) => (
            <div
              key={c.label}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-muted py-2 text-xs font-medium text-muted-foreground"
            >
              <c.icon className="size-3.5" />
              {c.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
