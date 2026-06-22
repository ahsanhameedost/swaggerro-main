"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  Button,
  Image,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Textarea
} from "@heroui/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, Trash2, UploadCloud } from "lucide-react";
import type { CatalogCategory } from "@/lib/catalog";

const schema = z.object({
  name: z.string().trim().min(1, "Category name is required").max(120),
  description: z.string().trim().max(1000).optional()
});

export type CategoryFormValues = z.infer<typeof schema>;

type CategoryFormModalProps = {
  isOpen: boolean;
  category: CatalogCategory | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSave: (payload: {
    values: CategoryFormValues;
    file: File | null;
    removeCurrentImage: boolean;
  }) => Promise<void>;
};

const MAX_IMAGE_SIZE_MB = 5;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function CategoryFormModal({
  isOpen,
  category,
  isSubmitting,
  onClose,
  onSave
}: CategoryFormModalProps) {
  const isEdit = !!category;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [removeCurrentImage, setRemoveCurrentImage] = useState(false);
  const [fileError, setFileError] = useState("");

  const defaultValues = useMemo<CategoryFormValues>(
    () => ({
      name: category?.name ?? "",
      description: category?.description ?? ""
    }),
    [category]
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(schema),
    defaultValues
  });

  useEffect(() => {
    if (!isOpen) return;
    reset(defaultValues);
    setSelectedFile(null);
    setRemoveCurrentImage(false);
    setFileError("");
    if (inputRef.current) inputRef.current.value = "";
  }, [defaultValues, isOpen, reset]);

  const previewUrl = useMemo(() => {
    if (selectedFile) return URL.createObjectURL(selectedFile);
    if (removeCurrentImage) return null;
    return category?.imageUrl ?? null;
  }, [category?.imageUrl, removeCurrentImage, selectedFile]);

  useEffect(() => {
    return () => {
      if (selectedFile && previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl, selectedFile]);

  const onPickFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setSelectedFile(null);
      setFileError("Only JPG, PNG, and WEBP images are allowed.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      setSelectedFile(null);
      setFileError(`Image must be ${MAX_IMAGE_SIZE_MB}MB or smaller.`);
      return;
    }

    setSelectedFile(file);
    setRemoveCurrentImage(false);
    setFileError("");
  };

  const submit = handleSubmit(async (values) => {
    await onSave({
      values,
      file: selectedFile,
      removeCurrentImage
    });
  });

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => (!open ? onClose() : undefined)} size="3xl">
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <span className="text-xl font-semibold">
                {isEdit ? "Edit category" : "Create category"}
              </span>
            </ModalHeader>

            <ModalBody>
              <form id="category-form" className="flex flex-col gap-5" onSubmit={submit}>
                <Input
                  label="Category name"
                  placeholder="Apparel"
                  isRequired
                  isInvalid={!!errors.name}
                  errorMessage={errors.name?.message}
                  {...register("name")}
                />

                <Textarea
                  label="Description"
                  placeholder="Short description for this category"
                  minRows={4}
                  isInvalid={!!errors.description}
                  errorMessage={errors.description?.message}
                  {...register("description")}
                />

                <div className="rounded-2xl border border-divider bg-content1 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">Category image</div>
                      <div className="text-xs text-foreground/60">
                        Optional. Use JPG, PNG, or WEBP up to {MAX_IMAGE_SIZE_MB}MB.
                      </div>
                    </div>

                    <input
                      ref={inputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={onPickFile}
                    />

                    <div className="flex gap-2">
                      <Button
                        variant="flat"
                        startContent={<UploadCloud className="size-4" />}
                        onPress={() => inputRef.current?.click()}
                      >
                        {selectedFile ? "Change image" : "Upload image"}
                      </Button>

                      {(category?.imageUrl || selectedFile) ? (
                        <Button
                          variant="light"
                          color="danger"
                          startContent={<Trash2 className="size-4" />}
                          onPress={() => {
                            setSelectedFile(null);
                            setRemoveCurrentImage(true);
                            setFileError("");
                            if (inputRef.current) inputRef.current.value = "";
                          }}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 md:flex-row">
                    <div className="flex h-40 w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-divider bg-background md:w-56">
                      {previewUrl ? (
                        <Image
                          removeWrapper
                          src={previewUrl}
                          alt={category?.name || "Category image preview"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-center text-foreground/50">
                          <ImagePlus className="size-8" />
                          <span className="text-sm">No image selected</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-2 text-sm text-foreground/65">
                      <p>
                        {selectedFile
                          ? `Selected file: ${selectedFile.name}`
                          : category?.imageUrl && !removeCurrentImage
                            ? "Current image will stay unless you replace or remove it."
                            : "Upload an image now or skip it for later."}
                      </p>
                      {fileError ? <p className="text-sm text-danger">{fileError}</p> : null}
                    </div>
                  </div>
                </div>
              </form>
            </ModalBody>

            <ModalFooter>
              <Button variant="light" onPress={onClose}>
                Cancel
              </Button>
              <Button
                color="primary"
                type="submit"
                form="category-form"
                isLoading={isSubmitting}
                style={{ backgroundImage: "var(--primary-gradient)", color: "#fff" }}
              >
                {isEdit ? "Save changes" : "Create category"}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
