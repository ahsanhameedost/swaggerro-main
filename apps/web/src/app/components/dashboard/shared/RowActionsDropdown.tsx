"use client";

import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Button
} from "@heroui/react";
import { Eye, MoreVertical, Pencil, Trash2 } from "lucide-react";

type RowActionsDropdownProps = {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isReadOnly?: boolean;
};

export function RowActionsDropdown({
  onView,
  onEdit,
  onDelete,
  isReadOnly
}: RowActionsDropdownProps) {
  return (
    <Dropdown placement="bottom-end">
      <DropdownTrigger>
        <Button isIconOnly variant="light" size="sm" aria-label="Actions">
          <MoreVertical className="size-4" />
        </Button>
      </DropdownTrigger>
      <DropdownMenu aria-label="Row actions">
        {onView ? (
          <DropdownItem key="view" startContent={<Eye className="size-4" />} onPress={onView}>
            View
          </DropdownItem>
        ) : null}
        {!isReadOnly && onEdit ? (
          <DropdownItem key="edit" startContent={<Pencil className="size-4" />} onPress={onEdit}>
            Edit
          </DropdownItem>
        ) : null}
        {!isReadOnly && onDelete ? (
          <DropdownItem
            key="delete"
            className="text-danger"
            color="danger"
            startContent={<Trash2 className="size-4" />}
            onPress={onDelete}
          >
            Delete
          </DropdownItem>
        ) : null}
      </DropdownMenu>
    </Dropdown>
  );
}
