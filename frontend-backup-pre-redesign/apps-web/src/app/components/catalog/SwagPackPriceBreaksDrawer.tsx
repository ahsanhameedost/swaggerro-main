"use client";

import {
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader
} from "@heroui/react";
import { formatMoney } from "@/lib/money";

export type SwagPackPriceBreakRow = {
  quantity: number;
  pricePerPack: number;
};

type SwagPackPriceBreaksDrawerProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  currency: string;
  rows: SwagPackPriceBreakRow[];
};

export function SwagPackPriceBreaksDrawer({
  isOpen,
  onOpenChange,
  currency,
  rows
}: SwagPackPriceBreaksDrawerProps) {
  return (
    <Drawer
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      placement="right"
      size="md"
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
                <div className="text-lg font-semibold text-black">Price breaks</div>
                <p className="mt-1 text-sm leading-6 text-black/70">
                  As you increase the size of your order, the cost per swag pack
                  decreases based on the selected products and packaging.
                </p>
              </div>
            </DrawerHeader>

            <DrawerBody className="py-6">
              <div className="rounded-[24px] border border-black/10">
                <div className="grid grid-cols-[1fr_auto] border-b border-black/10 px-5 py-4 text-sm font-semibold text-black">
                  <div>Quantity</div>
                  <div>Cost (each)</div>
                </div>

                <div className="divide-y divide-black/10">
                  {rows.map((row) => (
                    <div
                      key={row.quantity}
                      className="grid grid-cols-[1fr_auto] px-5 py-4 text-sm text-black"
                    >
                      <div>{row.quantity}</div>
                      <div>{formatMoney(row.pricePerPack, currency)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </DrawerBody>

            <DrawerFooter className="border-t border-black/10">
              <Button variant="bordered" className="w-full" onPress={onClose}>
                Close
              </Button>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
