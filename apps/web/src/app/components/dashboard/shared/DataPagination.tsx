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
  const canGoPrevious = !disabled && page > 1;
  const canGoNext = !disabled && page < totalPages;

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <Dropdown placement="bottom-end">
        <DropdownTrigger>
          <Button
            variant="bordered"
            className="h-14 min-w-[110px] justify-between px-3"
            endContent={<ChevronDown className="size-4" />}
            isDisabled={disabled}
          >
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[11px] text-foreground/55">Per Page</span>
              <span className="text-sm font-medium">{pageSize}</span>
            </div>
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

      <Button
        isIconOnly
        variant="bordered"
        size="sm"
        isDisabled={!canGoPrevious}
        onPress={() => onPageChange(page - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft className="size-4" />
      </Button>

      <Button
        isIconOnly
        variant="bordered"
        size="sm"
        isDisabled={!canGoNext}
        onPress={() => onPageChange(page + 1)}
        aria-label="Next page"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
