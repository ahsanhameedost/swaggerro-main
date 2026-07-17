import { Prisma } from "@prisma/client";

/**
 * Build a Prisma `where` that matches a catalog order by EITHER its CUID `id`
 * or its human order number. Order numbers arrive from the UI as "SW-054",
 * "sw54", or a plain "54" — all resolve to the numeric `orderNumber` (54).
 *
 * A CUID (e.g. "cmrmg1sbr0005e0q4m4vfa4kv") contains letters throughout, so it
 * never matches the digits-only pattern and is treated as an `id`.
 */
export function buildOrderIdentifierWhere(param: string): Prisma.CatalogOrderWhereInput {
  const trimmed = param.trim();
  const or: Prisma.CatalogOrderWhereInput[] = [{ id: trimmed }];

  const match = /^(?:sw-?)?0*(\d+)$/i.exec(trimmed);
  if (match) {
    const orderNumber = Number(match[1]);
    if (Number.isSafeInteger(orderNumber)) {
      or.push({ orderNumber });
    }
  }

  return { OR: or };
}
