"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Checkbox,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader
} from "@heroui/react";
import { addToast } from "@heroui/toast";
import { Minus, Plus } from "lucide-react";
import type { CatalogPricingOption } from "@/lib/catalog";
import {
  createEmptyPricingOption,
  normalizePricingOptions,
  validatePricingOptions
} from "./utils";

type PricingOptionsModalProps = {
  isOpen: boolean;
  title: string;
  rows: CatalogPricingOption[];
  onClose: () => void;
  onSave: (rows: CatalogPricingOption[]) => void;
};

export function PricingOptionsModal({
  isOpen,
  title,
  rows,
  onClose,
  onSave
}: PricingOptionsModalProps) {
  const [localRows, setLocalRows] = useState<CatalogPricingOption[]>([]);

  useEffect(() => {
    setLocalRows(rows.length ? normalizePricingOptions(rows) : [createEmptyPricingOption()]);
  }, [rows, isOpen]);

  const canAddRow = !localRows.some((row) => row.isOnward);

  const updateRow = (index: number, patch: Partial<CatalogPricingOption>) => {
    setLocalRows((current) =>
      current.map((row, rowIndex) => {
        if (rowIndex !== index) return row;

        const nextRow: CatalogPricingOption = {
          ...row,
          ...patch
        };

        if (patch.isOnward === true) {
          nextRow.qtyTo = null;
        }

        return nextRow;
      })
    );
  };

  const handleSave = () => {
    try {
      const normalizedRows = normalizePricingOptions(localRows);
      if (normalizedRows.length) {
        validatePricingOptions(normalizedRows);
      }
      onSave(normalizedRows);
      onClose();
    } catch (error: any) {
      addToast({
        title: "Invalid pricing options",
        description: error?.message ?? "Please check your pricing ranges",
        color: "danger"
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()} size="5xl">
      <ModalContent>
        <ModalHeader>{title}</ModalHeader>
        <ModalBody>
          <div className="space-y-3">
            {localRows.map((row, index) => (
              <div
                key={index}
                className="grid gap-3 rounded-2xl border border-default-200 p-4 md:grid-cols-[1fr_1fr_1fr_auto_auto]"
              >
                <Input
                  type="number"
                  label="Quantity from"
                  min={1}
                  value={String(row.qtyFrom ?? 1)}
                  onChange={(event) =>
                    updateRow(index, { qtyFrom: Math.max(1, Number(event.target.value || 1)) })
                  }
                />
                <Input
                  type="number"
                  label="Quantity to"
                  min={1}
                  isDisabled={row.isOnward}
                  value={row.isOnward ? "" : String(row.qtyTo ?? "")}
                  onChange={(event) =>
                    updateRow(index, {
                      qtyTo: event.target.value ? Math.max(1, Number(event.target.value)) : null
                    })
                  }
                />
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  label="Price"
                  value={String(row.price ?? 0)}
                  onChange={(event) =>
                    updateRow(index, { price: Math.max(0, Number(event.target.value || 0)) })
                  }
                />
                <div className="flex items-center pb-1">
                  <Checkbox
                    isSelected={row.isOnward}
                    onValueChange={(checked) => updateRow(index, { isOnward: checked, qtyTo: null })}
                  >
                    Onward
                  </Checkbox>
                </div>
                <div className="flex items-center justify-end">
                  <Button
                    isIconOnly
                    color="danger"
                    variant="flat"
                    onPress={() =>
                      setLocalRows((current) => current.filter((_, rowIndex) => rowIndex !== index))
                    }
                  >
                    <Minus className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-start">
            <Button
              variant="flat"
              startContent={<Plus className="size-4" />}
              isDisabled={!canAddRow}
              onPress={() =>
                setLocalRows((current) => [
                  ...current,
                  {
                    ...createEmptyPricingOption(),
                    qtyFrom: current.length
                      ? current.at(-1)?.isOnward
                        ? current.at(-1)?.qtyFrom ?? 1
                        : ((current.at(-1)?.qtyTo ?? current.at(-1)?.qtyFrom ?? 0) + 1)
                      : 1
                  }
                ])
              }
            >
              Add row
            </Button>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onClose}>
            Cancel
          </Button>
          <Button color="primary" onPress={handleSave}>
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}