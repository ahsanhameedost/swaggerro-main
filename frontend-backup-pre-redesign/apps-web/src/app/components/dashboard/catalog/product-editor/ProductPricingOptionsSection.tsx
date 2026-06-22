"use client";

import { Button, Card, CardBody, CardHeader } from "@heroui/react";
import { Plus } from "lucide-react";
import type { CatalogPricingOption } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";

type ProductPricingOptionsSectionProps = {
  rows: CatalogPricingOption[];
  disabled: boolean;
  onOpen: () => void;
};

export function ProductPricingOptionsSection({
  rows,
  disabled,
  onOpen
}: ProductPricingOptionsSectionProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">Pricing options</div>
          <div className="text-sm text-foreground/60">
            Quantity ranges for simple products.
          </div>
        </div>
        <Button
          variant="flat"
          startContent={<Plus className="size-4" />}
          isDisabled={disabled}
          onPress={onOpen}
        >
          Add
        </Button>
      </CardHeader>
      <CardBody>
        {rows.length ? (
          <div className="space-y-2">
            {rows.map((row, index) => (
              <div key={index} className="rounded-xl border border-default-200 px-3 py-2 text-sm">
                {row.qtyFrom}
                {row.isOnward ? "+" : `-${row.qtyTo}`} → {formatMoney(row.price)}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-default-300 px-6 py-10 text-center text-sm text-foreground/60">
            {disabled ? "Bulk pricing is managed per product variant." : "No pricing ranges added yet."}
          </div>
        )}
      </CardBody>
    </Card>
  );
}