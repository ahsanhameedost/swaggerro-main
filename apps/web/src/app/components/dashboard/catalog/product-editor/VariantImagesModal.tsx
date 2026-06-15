"use client";

import {
  Button,
  Checkbox,
  Chip,
  Image,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader
} from "@heroui/react";
import type { EditorImage } from "./types";
import { getImageRef } from "./utils";

type VariantImagesModalProps = {
  isOpen: boolean;
  title: string;
  images: EditorImage[];
  selectedImageIds: string[];
  selectionCount: number;
  onSelectionChange: (imageIds: string[]) => void;
  onClose: () => void;
  onSave: () => void;
};

export function VariantImagesModal({
  isOpen,
  title,
  images,
  selectedImageIds,
  selectionCount,
  onSelectionChange,
  onClose,
  onSave
}: VariantImagesModalProps) {
  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()} size="4xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>{title}</ModalHeader>
        <ModalBody>
          {images.length ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {images.map((image, index) => {
                  const imageRef = getImageRef(image);
                  const checked = selectedImageIds.includes(imageRef);

                  return (
                    <label
                      key={imageRef}
                      className={`cursor-pointer rounded-2xl border p-3 transition ${
                        checked ? "border-primary bg-primary/5" : "border-default-200"
                      }`}
                    >
                      <div className="mb-3 flex justify-end">
                        <Checkbox
                          isSelected={checked}
                          onValueChange={(selected) =>
                            onSelectionChange(
                              selected
                                ? [...selectedImageIds, imageRef]
                                : selectedImageIds.filter((id) => id !== imageRef)
                            )
                          }
                        />
                      </div>
                      <div className="space-y-3">
                        <Image
                          src={image.url}
                          alt={image.alt || `Variant image ${index + 1}`}
                          className="h-44 w-full rounded-2xl object-cover"
                        />
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-medium">
                            {image.alt || `Image ${index + 1}`}
                          </div>
                          <Chip size="sm" variant="flat" color={index === 0 ? "primary" : "default"}>
                            {index === 0 ? "Thumbnail" : `#${index + 1}`}
                          </Chip>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-sm text-foreground/60">Upload product images first.</div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onClose}>
            Cancel
          </Button>
          <Button
            color="primary"
            className="text-white"
            style={{ background: "var(--primary-gradient)" }}
            onPress={onSave}
          >
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}