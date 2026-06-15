"use client";

import type { ReactNode } from "react";

import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader
} from "@heroui/react";

type DeleteConfirmDialogProps = {
  isOpen: boolean;
  title?: string;
  message: ReactNode;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export function DeleteConfirmDialog({
  isOpen,
  title = "Delete item",
  message,
  isLoading,
  onClose,
  onConfirm
}: DeleteConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => (!open ? onClose() : undefined)} size="sm">
      <ModalContent>
        {() => (
          <>
            <ModalHeader>{title}</ModalHeader>
            <ModalBody>
              <div className="text-sm text-foreground/70">{message}</div>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={onClose}>
                No
              </Button>
              <Button color="danger" onPress={onConfirm} isLoading={isLoading}>
                Yes
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
