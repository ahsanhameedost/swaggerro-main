import { FULFILLMENT_STAGES, orderFulfillmentStep } from "@/lib/order-flow";
import { cn } from "@/lib/utils";

/** "22 Jul 2026, 18:37" — date + time, in the viewer's locale. */
function formatStamp(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

/** Compact "22 Jul, 18:37" (no year) for the tighter horizontal layout. */
function formatStampShort(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

/**
 * Presentational fulfillment tracker: Submitted → In design → Approved →
 * In production → Shipped. `orientation="vertical"` (default) draws a timeline
 * — good for a single-order detail view. `orientation="horizontal"` draws a
 * compact stepper row — good for a list of orders. When `timestamps` is supplied
 * (aligned to FULFILLMENT_STAGES) each reached step shows when it happened.
 */
export function OrderProgress({
  status,
  productionStage,
  timestamps,
  orientation = "vertical",
  className
}: {
  status?: string | null;
  productionStage?: string | null;
  timestamps?: (string | null)[];
  orientation?: "vertical" | "horizontal";
  className?: string;
}) {
  if (status === "CANCELLED" || status === "REJECTED") {
    return (
      <div
        className={cn(
          "rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm font-medium text-danger",
          className
        )}
      >
        This order was {status === "CANCELLED" ? "cancelled" : "rejected"}.
      </div>
    );
  }

  const current = orderFulfillmentStep({ status, productionStage });
  const lastIndex = FULFILLMENT_STAGES.length - 1;

  if (orientation === "horizontal") {
    return (
      <ol className={cn("flex items-start", className)}>
        {FULFILLMENT_STAGES.map((label, index) => {
          const done = index < current;
          const active = index === current;
          const reached = done || active;
          const stamp = timestamps?.[index] ?? null;
          const isLast = index === lastIndex;

          return (
            <li key={label} className={cn("flex min-w-0 flex-col", isLast ? "shrink-0" : "flex-1")}>
              {/* node + connector to the next step */}
              <div className="flex items-center">
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                    reached ? "border-primary bg-primary text-white" : "border-default-300 text-foreground/40"
                  )}
                >
                  {done ? "✓" : index + 1}
                </span>
                {!isLast ? (
                  <span className={cn("mx-1 h-0.5 flex-1 rounded-full", done ? "bg-primary" : "bg-default-200")} />
                ) : null}
              </div>

              {/* label + timestamp under the node */}
              <div className="mt-2 pr-3">
                <p
                  className={cn(
                    "truncate text-xs",
                    active
                      ? "font-semibold text-foreground"
                      : reached
                        ? "text-foreground/80"
                        : "text-foreground/45"
                  )}
                >
                  {label}
                </p>
                {timestamps ? (
                  <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                    {stamp ? formatStampShort(stamp) : reached ? "—" : ""}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <ol className={cn("flex flex-col", className)}>
      {FULFILLMENT_STAGES.map((label, index) => {
        const done = index < current;
        const active = index === current;
        const reached = done || active;
        const stamp = timestamps?.[index] ?? null;

        return (
          <li key={label} className="flex gap-3">
            {/* Rail: node + connector line to the next step. */}
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  reached
                    ? "border-primary bg-primary text-white"
                    : "border-default-300 text-foreground/40"
                )}
              >
                {done ? "✓" : index + 1}
              </span>
              {index < lastIndex ? (
                <span
                  className={cn(
                    "w-px flex-1",
                    "min-h-6",
                    done ? "bg-primary" : "bg-default-200"
                  )}
                />
              ) : null}
            </div>

            {/* Label + timestamp. pb keeps rows apart and lets the rail stretch. */}
            <div className={cn("min-w-0", index < lastIndex ? "pb-5" : "")}>
              <p
                className={cn(
                  "text-sm leading-7",
                  active ? "font-semibold text-foreground" : reached ? "text-foreground/80" : "text-foreground/45"
                )}
              >
                {label}
              </p>
              {timestamps ? (
                <p className="text-xs text-muted-foreground">
                  {stamp ? formatStamp(stamp) : reached ? "—" : ""}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
