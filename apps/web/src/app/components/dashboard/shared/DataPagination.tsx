"use client";

import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger
} from "@heroui/react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE_OPTIONS = [10, 15, 25, 50];

type DataPaginationProps = {
  page: number;
  pageSize: number;
  totalPages: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

export function DataPagination({
  page,
  pageSize,
  totalPages,
  disabled,
  onPageChange,
  onPageSizeChange
}: DataPaginationProps) {
  const safeTotal = Math.max(1, totalPages);
  const canGoPrevious = !disabled && page > 1;
  const canGoNext = !disabled && page < safeTotal;

  return (
    <div className="flex items-center gap-2">
      <Dropdown placement="bottom-end">
        <DropdownTrigger>
          <Button
            variant="bordered"
            size="sm"
            className="h-10 gap-2 px-3"
            endContent={<ChevronDown className="size-4 text-foreground/50" />}
            isDisabled={disabled}
          >
            <span className="text-xs text-foreground/55">Per page</span>
            <span className="text-sm font-semibold tabular-nums">{pageSize}</span>
          </Button>
        </DropdownTrigger>
        <DropdownMenu aria-label="Rows per page">
          {PAGE_SIZE_OPTIONS.map((value) => (
            <DropdownItem key={String(value)} onPress={() => onPageSizeChange(value)}>
              {value}
            </DropdownItem>
          ))}
        </DropdownMenu>
      </Dropdown>

      <div className="flex items-center gap-1 rounded-xl border border-divider p-1">
        <Button
          isIconOnly
          variant="light"
          size="sm"
          className="h-8 w-8 min-w-8"
          isDisabled={!canGoPrevious}
          onPress={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="px-1.5 text-sm font-medium tabular-nums text-foreground/70">
          {page} <span className="text-foreground/40">/ {safeTotal}</span>
        </span>
        <Button
          isIconOnly
          variant="light"
          size="sm"
          className="h-8 w-8 min-w-8"
          isDisabled={!canGoNext}
          onPress={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
