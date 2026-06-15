"use client";

import type { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

type SortableBlockProps = {
  id: string;
  children: ReactNode;
  className?: string;
  handleClassName?: string;
  contentClassName?: string;
};

export function SortableBlock({
  id,
  children,
  className = "",
  handleClassName = "",
  contentClassName = ""
}: SortableBlockProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`grid grid-cols-[44px_minmax(0,1fr)] items-start gap-3 ${isDragging ? "opacity-60" : ""} ${className}`}
    >
      <button
        type="button"
        aria-label="Drag to sort"
        className={`mt-1 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-default-200 bg-content1 text-foreground/70 ${handleClassName}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <div className={contentClassName}>{children}</div>
    </div>
  );
}