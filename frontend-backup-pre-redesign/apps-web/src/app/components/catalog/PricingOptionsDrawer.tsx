"use client";

import {
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader
} from "@heroui/react";
import type { CatalogPricingOption } from "@/lib/catalog";
import { findMatchingPricingOption, sortPricingOptions } from "@/lib/catalog-pricing";
import { formatMoney } from "@/lib/money";
import { QuantityStepper } from "./QuantityStepper";

type PricingOptionsDrawerProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  options: CatalogPricingOption[];
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  currency: string;
  minQty: number;
  maxQty?: number;
  onQuantityChange: (value: number) => void;
};

function describeTier(option: CatalogPricingOption) {
  if (option.isOnward || option.qtyTo == null) {
    return `${option.qtyFrom}+`;
  }

  return `${option.qtyFrom} - ${option.qtyTo}`;
}

export function PricingOptionsDrawer({
  isOpen,
  onOpenChange,
  title,
  options,
  quantity,
  unitPrice,
  totalPrice,
  currency,
  minQty,
  maxQty,
  onQuantityChange
}: PricingOptionsDrawerProps) {
  const sortedOptions = sortPricingOptions(options);
  const activeTier = findMatchingPricingOption(quantity, sortedOptions);

  return (
    <Drawer
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      placement="right"
      size="lg"
      backdrop="opaque"
      classNames={{
        base: "rounded-none sm:rounded-l-[28px]"
      }}
    >
      <DrawerContent>
        {(onClose) => (
          <>
            <DrawerHeader className="border-b border-black/10">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-black/45">Pricing options</div>
                <div className="mt-2 text-2xl font-semibold text-black">{title}</div>
              </div>
            </DrawerHeader>

            <DrawerBody className="space-y-5 py-6">
              <div className="rounded-[24px] border border-black/10 bg-zinc-50 p-5">
                <QuantityStepper
                  label={`Quantity (min ${minQty})`}
                  value={quantity}
                  minValue={minQty}
                  maxValue={maxQty}
                  onChange={onQuantityChange}
                  helperText={""}
                />

                <div className="mt-5 flex items-center justify-between text-sm text-black/65">
                  <span>Applied unit price</span>
                  <span className="font-semibold text-black">{formatMoney(unitPrice, currency)}</span>
                </div>

                <div className="mt-2 flex items-center justify-between text-sm text-black/65">
                  <span>Estimated line total</span>
                  <span className="font-semibold text-black">{formatMoney(totalPrice, currency)}</span>
                </div>
              </div>

              <div className="space-y-3">
                {sortedOptions.map((option) => {
                  const isActive = activeTier
                    ? activeTier.qtyFrom === option.qtyFrom &&
                      activeTier.qtyTo === option.qtyTo &&
                      activeTier.price === option.price &&
                      activeTier.isOnward === option.isOnward
                    : false;

                  return (
                    <div
                      key={`${option.qtyFrom}-${option.qtyTo ?? "onward"}-${option.price}`}
                      className={`flex items-center justify-between rounded-[24px] border px-5 py-4 transition ${
                        isActive
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-black/10 bg-white"
                      }`}
                    >
                      <div>
                        <div className="text-sm font-semibold text-black">{describeTier(option)} units</div>
                        <div className="text-xs text-black/50">
                          {option.isOnward ? "Onward tier" : "Per item pricing"}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-semibold text-black">
                          {formatMoney(option.price, currency)}
                        </div>
                        {isActive ? (
                          <div className="text-xs font-medium text-primary">Applied</div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </DrawerBody>

            <DrawerFooter className="border-t border-black/10">
              <Button variant="bordered" className="w-full border-black/15" onPress={onClose}>
                Close
              </Button>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
