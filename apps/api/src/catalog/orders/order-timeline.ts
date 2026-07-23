import type { OrderTimelineStage } from "@prisma/client";

/**
 * Fulfillment stages shown on the customer tracking timeline, in order. Mirrors
 * the web `FULFILLMENT_STAGES` / `orderFulfillmentStep` mapping so the API and UI
 * agree on what "step" an order is at.
 */
export const TIMELINE_STAGES: OrderTimelineStage[] = [
  "SUBMITTED",
  "IN_DESIGN",
  "APPROVED",
  "IN_PRODUCTION",
  "SHIPPED"
];

/** Which fulfillment stage an order is at, from its status + production stage. */
export function fulfillmentStageOf(
  status?: string | null,
  productionStage?: string | null
): OrderTimelineStage {
  if (productionStage === "SHIPPED") return "SHIPPED";
  if (productionStage === "IN_PRODUCTION") return "IN_PRODUCTION";
  if (status === "APPROVED" || productionStage === "READY_FOR_PRODUCTION") return "APPROVED";
  if (status === "IN_REVIEW") return "IN_DESIGN";
  return "SUBMITTED";
}

// Minimal structural shape so this accepts both PrismaService and a
// $transaction client without importing either (avoids a dependency cycle).
type OrderEventDelegate = {
  upsert(args: {
    where: { orderId_stage: { orderId: string; stage: OrderTimelineStage } };
    create: { orderId: string; stage: OrderTimelineStage };
    update: Record<string, never>;
  }): Promise<unknown>;
}

/**
 * Stamp the stage an order has reached, plus any earlier stages it hasn't been
 * stamped for yet — so a step never shows as done-with-no-time on the tracker
 * (e.g. an order approved directly by an admin, skipping In-design).
 *
 * Idempotent: the empty `update` means a re-run keeps the original timestamp, so
 * a stage that was recorded at its real moment (normal design → approve flow)
 * keeps that time; only genuinely-skipped stages inherit the timestamp of the
 * milestone that revealed they were passed. Recording all lower stages in the
 * same call keeps the timeline monotonic. SUBMITTED (index 0) is never an
 * event — its time is the order's createdAt.
 */
export async function recordOrderTimeline(
  orderEvents: OrderEventDelegate,
  orderId: string,
  status?: string | null,
  productionStage?: string | null
): Promise<void> {
  const target = TIMELINE_STAGES.indexOf(fulfillmentStageOf(status, productionStage));
  for (let i = 1; i <= target; i++) {
    const stage = TIMELINE_STAGES[i];
    await orderEvents.upsert({
      where: { orderId_stage: { orderId, stage } },
      create: { orderId, stage },
      update: {}
    });
  }
}
