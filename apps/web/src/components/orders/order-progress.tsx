import { FULFILLMENT_STAGES, orderFulfillmentStep } from "@/lib/order-flow";
import { cn } from "@/lib/utils";

/**
 * Presentational fulfillment tracker: Submitted → In design → Approved →
 * In production → Shipped. Reused by the customer dashboard tracking page and
 * the public order-tracking lookup.
 */
export function OrderProgress({
  status,
  productionStage,
  className
}: {
  status?: string | null;
  productionStage?: string | null;
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

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center", className)}>
      {FULFILLMENT_STAGES.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <div key={label} className="flex items-center gap-2 sm:flex-1">
            <div
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                done || active
                  ? "border-primary bg-primary text-white"
                  : "border-default-300 text-foreground/45"
              )}
            >
              {done ? "✓" : index + 1}
            </div>
            <span className={cn("text-sm", active ? "font-semibold text-foreground" : "text-foreground/60")}>
              {label}
            </span>
            {index < FULFILLMENT_STAGES.length - 1 ? (
              <span className={cn("hidden h-px flex-1 sm:block", done ? "bg-primary" : "bg-default-200")} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
