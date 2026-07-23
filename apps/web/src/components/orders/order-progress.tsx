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

/**
 * Presentational fulfillment tracker: Submitted → In design → Approved →
 * In production → Shipped, drawn as a vertical timeline. When `timestamps` is
 * supplied (aligned to FULFILLMENT_STAGES) each reached step shows the date +
 * time it happened. Reused by the customer dashboard tracking page and the
 * public order-tracking lookup.
 */
export function OrderProgress({
  status,
  productionStage,
  timestamps,
  className
}: {
  status?: string | null;
  productionStage?: string | null;
  timestamps?: (string | null)[];
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
