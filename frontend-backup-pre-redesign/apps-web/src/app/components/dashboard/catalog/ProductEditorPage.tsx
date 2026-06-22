"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Button, Card, CardBody, Spinner } from "@heroui/react";
import { addToast } from "@heroui/toast";
import { Save } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import {
  createCatalogImageUpload,
  uploadFileToPresignedUrl,
  type CatalogPricingOption
} from "@/lib/catalog";
import {
  useCategories,
  useCollections,
  useCreateProduct,
  useProduct,
  useUpdateProduct
} from "@/lib/queries.catalog";
import { useMe } from "@/queries/auth";
import { useShippingProfiles } from "@/queries/shipping";
import { ProductBasicsSection } from "./product-editor/ProductBasicsSection";
import { ProductVariantsSection } from "./product-editor/ProductVariantsSection";
import { ProductCatalogVariantsSection } from "./product-editor/ProductCatalogVariantsSection";
import { PricingOptionsModal } from "./product-editor/PricingOptionsModal";
import { VariantImagesModal } from "./product-editor/VariantImagesModal";
import type {
  EditorProductCatalogVariant,
  EditorVariantOption,
  GroupDraftState,
  ImagePickerTarget,
  PricingModalTarget,
  ProductEditorPageProps,
  ProductEditorState,
  VariantType
} from "./product-editor/types";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE_MB,
  buildPayload,
  createEmptyState,
  createEmptyVariantDefinition,
  createEmptyVariantOption,
  createId,
  getImageRef,
  getProductCatalogVariantRef,
  getVariantDefinitionRef,
  getVariantOptionRef,
  mapProductToState,
  normalizeImages,
  normalizePricingOptions,
  normalizeVariantDefinitions,
  syncProductCatalogVariants,
  toInputNumber
} from "./product-editor/utils";

export function ProductEditorPage({ mode }: ProductEditorPageProps) {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const productId = mode === "edit" ? params.id : undefined;
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    })
  );

  const [state, setState] = useState<ProductEditorState>(createEmptyState());
  const [uploadingImages, setUploadingImages] = useState(false);
  const [pricingModalTarget, setPricingModalTarget] = useState<PricingModalTarget>(null);
  const [pricingModalRows, setPricingModalRows] = useState<CatalogPricingOption[]>([]);
  const [groupByVariantId, setGroupByVariantId] = useState("");
  const [groupDrafts, setGroupDrafts] = useState<GroupDraftState>({});
  const [imagePickerTarget, setImagePickerTarget] = useState<ImagePickerTarget>(null);
  const [imagePickerSelection, setImagePickerSelection] = useState<string[]>([]);
  const [expandedVariantKeys, setExpandedVariantKeys] = useState<Set<string>>(new Set());
  const [scrollTargetId, setScrollTargetId] = useState<string | null>(null);

  const { data: user } = useMe();
  const canWrite = !!user?.permissions?.includes("catalog.products.write");
  const canRead = !!user?.permissions?.includes("catalog.products.read");
  const canReadShippingSettings = !!user?.permissions?.includes("shipping.settings.read");

  const { data: categoriesData, isLoading: isCategoriesLoading } = useCategories({ page: 1, pageSize: 100 });
  const { data: collectionsData, isLoading: isCollectionsLoading } = useCollections({ page: 1, pageSize: 100 });
  const { data: shippingProfilesData, isLoading: isShippingProfilesLoading } = useShippingProfiles(canReadShippingSettings);
  const {
    data: productResponse,
    isLoading: isProductLoading,
    isFetching: isProductFetching
  } = useProduct(productId ?? "", mode === "edit");

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();

  useEffect(() => {
    if (mode !== "edit") {
      setState(createEmptyState());
      setExpandedVariantKeys(new Set());
      return;
    }

    if (productResponse?.product) {
      const nextState = mapProductToState(productResponse.product);
      setState(nextState);
      setExpandedVariantKeys(new Set());
    }
  }, [mode, productResponse?.product]);

  useEffect(() => {
    if (!state.variantDefinitions.some((variant) => getVariantDefinitionRef(variant) === groupByVariantId)) {
      setGroupByVariantId("");
    }
  }, [groupByVariantId, state.variantDefinitions]);

  const categories = useMemo(
    () => (categoriesData?.items ?? []).map((item) => ({ id: item.id, name: item.name })),
    [categoriesData?.items]
  );
  const collections = useMemo(
    () => (collectionsData?.items ?? []).map((item) => ({ id: item.id, name: item.name })),
    [collectionsData?.items]
  );
  const shippingProfiles = useMemo(
    () => (shippingProfilesData ?? []).map((item) => ({ id: item.id, name: item.name })),
    [shippingProfilesData]
  );

  const updateState = (updater: (current: ProductEditorState) => ProductEditorState) => {
    setState((current) => updater(current));
  };

  const updateVariantDefinitions = (
    updater: (current: ProductEditorState["variantDefinitions"]) => ProductEditorState["variantDefinitions"]
  ) => {
    updateState((current) => {
      const nextDefinitions = normalizeVariantDefinitions(updater(current.variantDefinitions));

      return {
        ...current,
        variantDefinitions: nextDefinitions,
        productCatalogVariants: syncProductCatalogVariants(
          nextDefinitions,
          current.productCatalogVariants,
          current.basePrice ?? null,
          current.baseStock,
          current.minQty
        )
      };
    });
  };

  const updateProductCatalogVariantRow = (
    variantRef: string,
    patch: Partial<EditorProductCatalogVariant>
  ) => {
    updateState((current) => ({
      ...current,
      productCatalogVariants: current.productCatalogVariants.map((variant) =>
        getProductCatalogVariantRef(variant) === variantRef
          ? {
            ...variant,
            ...patch
          }
          : variant
      )
    }));
  };

  const addVariant = () => {
    const variant = createEmptyVariantDefinition();
    const variantRef = getVariantDefinitionRef(variant);

    updateVariantDefinitions((current) => [variant, ...current]);
    setExpandedVariantKeys((current) => new Set([variantRef, ...current]));
    setScrollTargetId(`variant-${variantRef}`);
  };

  const deleteVariant = (variantRef: string) => {
    updateVariantDefinitions((current) =>
      current.filter((variant) => getVariantDefinitionRef(variant) !== variantRef)
    );
    setExpandedVariantKeys((current) => {
      const next = new Set(current);
      next.delete(variantRef);
      return next;
    });
  };

  const updateVariantName = (variantRef: string, name: string) => {
    updateVariantDefinitions((current) =>
      current.map((variant) =>
        getVariantDefinitionRef(variant) === variantRef
          ? {
            ...variant,
            name
          }
          : variant
      )
    );
  };

  const updateVariantType = (variantRef: string, type: VariantType) => {
    updateVariantDefinitions((current) =>
      current.map((variant) => {
        if (getVariantDefinitionRef(variant) !== variantRef) {
          return variant;
        }

        return {
          ...variant,
          type,
          options: variant.options.map((option) => {
            if (type === "COLOR") {
              const color = option.colorHex || option.code || "#111111";
              return {
                ...option,
                code: color,
                colorHex: color
              };
            }

            return {
              ...option,
              code: option.code && option.code !== option.colorHex ? option.code : option.label,
              colorHex: null
            };
          })
        };
      })
    );
  };

  const addOption = (variantRef: string) => {
    const variant = state.variantDefinitions.find((item) => getVariantDefinitionRef(item) === variantRef);
    if (!variant) return;

    const option = createEmptyVariantOption(variant.type);
    const optionRef = getVariantOptionRef(option);

    updateVariantDefinitions((current) =>
      current.map((item) =>
        getVariantDefinitionRef(item) === variantRef
          ? {
            ...item,
            options: [option, ...item.options]
          }
          : item
      )
    );
    setExpandedVariantKeys((current) => new Set([variantRef, ...current]));
    setScrollTargetId(`variant-option-${optionRef}`);
  };

  const deleteOption = (variantRef: string, optionRef: string) => {
    updateVariantDefinitions((current) =>
      current.map((variant) =>
        getVariantDefinitionRef(variant) === variantRef
          ? {
            ...variant,
            options:
              variant.options.length === 1
                ? variant.options
                : variant.options.filter((option) => getVariantOptionRef(option) !== optionRef)
          }
          : variant
      )
    );
  };

  const updateOption = (
    variantRef: string,
    optionRef: string,
    updater: (current: EditorVariantOption) => EditorVariantOption
  ) => {
    updateVariantDefinitions((current) =>
      current.map((variant) =>
        getVariantDefinitionRef(variant) === variantRef
          ? {
            ...variant,
            options: variant.options.map((option) =>
              getVariantOptionRef(option) === optionRef ? updater(option) : option
            )
          }
          : variant
      )
    );
  };

  const handleImageUpload = async (files: FileList | File[]) => {
    const validFiles = Array.from(files);

    if (!validFiles.length) return;

    for (const file of validFiles) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        throw new Error(`${file.name}: only JPG, PNG, and WebP are allowed`);
      }

      if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
        throw new Error(`${file.name}: image size must be smaller than ${MAX_IMAGE_SIZE_MB}MB`);
      }
    }

    setUploadingImages(true);

    try {
      const uploadedImages = await Promise.all(
        validFiles.map(async (file) => {
          const upload = await createCatalogImageUpload("products", {
            filename: file.name,
            contentType: file.type as "image/jpeg" | "image/png" | "image/webp"
          });

          await uploadFileToPresignedUrl(upload.uploadUrl, file);

          return {
            clientId: createId("img"),
            url: upload.publicUrl,
            key: upload.key,
            alt: file.name.replace(/\.[^.]+$/, ""),
            sortOrder: 0
          };
        })
      );

      updateState((current) => ({
        ...current,
        images: normalizeImages([...current.images, ...uploadedImages])
      }));
    } finally {
      setUploadingImages(false);
    }
  };

  const handleImagesDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    updateState((current) => {
      const oldIndex = current.images.findIndex((image) => getImageRef(image) === active.id);
      const newIndex = current.images.findIndex((image) => getImageRef(image) === over.id);

      if (oldIndex < 0 || newIndex < 0) {
        return current;
      }

      return {
        ...current,
        images: normalizeImages(arrayMove(current.images, oldIndex, newIndex))
      };
    });
  };

  const handleVariantDefinitionsDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    updateVariantDefinitions((current) => {
      const oldIndex = current.findIndex((variant) => getVariantDefinitionRef(variant) === active.id);
      const newIndex = current.findIndex((variant) => getVariantDefinitionRef(variant) === over.id);

      if (oldIndex < 0 || newIndex < 0) {
        return current;
      }

      return arrayMove(current, oldIndex, newIndex);
    });
  };

  const handleVariantOptionsDragEnd = (variantRef: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    updateVariantDefinitions((current) =>
      current.map((variant) => {
        if (getVariantDefinitionRef(variant) !== variantRef) {
          return variant;
        }

        const oldIndex = variant.options.findIndex((option) => getVariantOptionRef(option) === active.id);
        const newIndex = variant.options.findIndex((option) => getVariantOptionRef(option) === over.id);

        if (oldIndex < 0 || newIndex < 0) {
          return variant;
        }

        return {
          ...variant,
          options: arrayMove(variant.options, oldIndex, newIndex)
        };
      })
    );
  };

  function arePricingOptionsEqual(
    left: CatalogPricingOption[],
    right: CatalogPricingOption[]
  ) {
    const normalizedLeft = normalizePricingOptions(left);
    const normalizedRight = normalizePricingOptions(right);

    return JSON.stringify(normalizedLeft) === JSON.stringify(normalizedRight);
  }

  const openPricingModal = (target: PricingModalTarget) => {
    if (!target) return;

    if (target.type === "product") {
      setPricingModalRows(state.pricingOptions.length ? state.pricingOptions : []);
      setPricingModalTarget(target);
      return;
    }

    if (target.type === "variant-group") {
      const groupRows = state.productCatalogVariants.filter((variant) =>
        target.variantRefs.includes(getProductCatalogVariantRef(variant))
      );

      const firstRows = groupRows[0]?.pricingOptions ?? [];
      const samePricing = groupRows.every((row) =>
        arePricingOptionsEqual(row.pricingOptions ?? [], firstRows)
      );

      setPricingModalRows(samePricing ? firstRows : []);
      setPricingModalTarget(target);
      return;
    }

    const row = state.productCatalogVariants.find(
      (variant) => getProductCatalogVariantRef(variant) === target.variantRef
    );

    setPricingModalRows(row?.pricingOptions ?? []);
    setPricingModalTarget(target);
  };

  const handlePricingModalSave = (rows: CatalogPricingOption[]) => {
    if (!pricingModalTarget) return;

    if (pricingModalTarget.type === "product") {
      updateState((current) => ({
        ...current,
        pricingOptions: normalizePricingOptions(rows)
      }));
      return;
    }

    if (pricingModalTarget.type === "variant-group") {
      updateState((current) => ({
        ...current,
        productCatalogVariants: current.productCatalogVariants.map((variant) =>
          pricingModalTarget.variantRefs.includes(getProductCatalogVariantRef(variant))
            ? {
              ...variant,
              pricingOptions: normalizePricingOptions(rows)
            }
            : variant
        )
      }));
      return;
    }

    updateProductCatalogVariantRow(pricingModalTarget.variantRef, {
      pricingOptions: normalizePricingOptions(rows)
    });
  };

  const openImagesModal = (title: string, variantRefs: string[], selectedImageIds: string[]) => {
    setImagePickerTarget({
      title,
      variantRefs,
      selectedImageIds: [...selectedImageIds]
    });
    setImagePickerSelection([...selectedImageIds]);
  };

  const handleApplyGroupValues = (groupKey: string, rows: EditorProductCatalogVariant[]) => {
    const draft = groupDrafts[groupKey];
    if (!draft) return;

    const nextPrice = toInputNumber(draft.price);
    const nextStock = toInputNumber(draft.stock);
    const nextMinQty = toInputNumber(draft.minQty);

    updateState((current) => ({
      ...current,
      productCatalogVariants: current.productCatalogVariants.map((variant) => {
        const isInGroup = rows.some(
          (row) => getProductCatalogVariantRef(row) === getProductCatalogVariantRef(variant)
        );

        if (!isInGroup) {
          return variant;
        }

        return {
          ...variant,
          price: nextPrice ?? variant.price,
          stock: nextStock == null ? variant.stock : Math.max(0, Math.floor(nextStock)),
          minQty: nextMinQty == null ? variant.minQty : Math.max(1, Math.floor(nextMinQty))
        };
      })
    }));

    addToast({
      title: "Group updated",
      description: "Price, stock, and min quantity were applied to the selected group",
      color: "success"
    });
  };

  const handleSubmit = async () => {
    if (!canWrite) return;

    try {
      const payload = buildPayload(state);

      if (mode === "create") {
        const response = await createMutation.mutateAsync(payload);
        addToast({ title: "Product created", color: "success" });
        router.replace(`/dashboard/catalog/products/${response.product.id}`);
        return;
      }

      if (!productId) return;

      await updateMutation.mutateAsync({
        id: productId,
        input: payload
      });

      addToast({ title: "Product updated", color: "success" });
    } catch (error: unknown) {
      addToast({
        title: "Unable to save product",
        description: error instanceof Error ? error.message : "Please review the product details",
        color: "danger"
      });
    }
  };

  if (!canRead) {
    return (
      <Card>
        <CardBody className="py-16 text-center text-foreground/70">
          You do not have permission to view catalog products.
        </CardBody>
      </Card>
    );
  }

  if (
    isCategoriesLoading ||
    isCollectionsLoading ||
    isShippingProfilesLoading ||
    (mode === "edit" && (isProductLoading || isProductFetching))
  ) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <Spinner label="Loading product editor" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-3xl border border-default-200 bg-content1 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {mode === "create" ? "Create product" : "Update product"}
          </h1>
        </div>

        <div className="flex gap-3">
          <Button variant="flat" onPress={() => router.push("/dashboard/catalog/products")}>
            Back
          </Button>
          <Button
            color="primary"
            startContent={<Save className="size-4" />}
            isLoading={createMutation.isPending || updateMutation.isPending}
            onPress={handleSubmit}
            isDisabled={!canWrite}
            className="text-white"
            style={{ background: "var(--primary-gradient)" }}
          >
            Save product
          </Button>
        </div>
      </div>

      <ProductBasicsSection
        state={state}
        categories={categories}
        collections={collections}
        shippingProfiles={shippingProfiles}
        uploadingImages={uploadingImages}
        imageInputRef={imageInputRef}
        sensors={sensors}
        onStateChange={updateState}
        onUploadImages={handleImageUpload}
        onImagesDragEnd={handleImagesDragEnd}
        onOpen={() => openPricingModal({ type: "product" })}
      />

      <ProductVariantsSection
        variants={state.variantDefinitions}
        sensors={sensors}
        expandedKeys={expandedVariantKeys}
        scrollTargetId={scrollTargetId}
        onExpandedKeysChange={setExpandedVariantKeys}
        onScrollHandled={() => setScrollTargetId(null)}
        onAddVariant={addVariant}
        onDeleteVariant={deleteVariant}
        onUpdateVariantName={updateVariantName}
        onUpdateVariantType={updateVariantType}
        onAddOption={addOption}
        onDeleteOption={deleteOption}
        onUpdateOption={updateOption}
        onReorderVariants={handleVariantDefinitionsDragEnd}
        onReorderOptions={handleVariantOptionsDragEnd}
      />

      <ProductCatalogVariantsSection
        images={state.images}
        variantDefinitions={state.variantDefinitions}
        productCatalogVariants={state.productCatalogVariants}
        groupByVariantId={groupByVariantId}
        groupDrafts={groupDrafts}
        onGroupByVariantIdChange={setGroupByVariantId}
        onGroupDraftsChange={setGroupDrafts}
        onApplyGroupValues={handleApplyGroupValues}
        onUpdateRow={updateProductCatalogVariantRow}
        onOpenVariantPricing={(variantRef) => openPricingModal({ type: "variant", variantRef })}
        onOpenGroupPricing={(title, variantRefs) =>
          openPricingModal({ type: "variant-group", title, variantRefs })
        }
        onOpenImages={openImagesModal}
      />

      <PricingOptionsModal
        isOpen={!!pricingModalTarget}
        title={pricingModalTarget?.type === "variant" ? "Variant pricing options" : "Pricing options"}
        rows={pricingModalRows}
        onClose={() => setPricingModalTarget(null)}
        onSave={handlePricingModalSave}
      />

      <VariantImagesModal
        isOpen={!!imagePickerTarget}
        title={imagePickerTarget?.title ? `Select images • ${imagePickerTarget.title}` : "Select images"}
        images={state.images}
        selectedImageIds={imagePickerSelection}
        selectionCount={imagePickerTarget?.variantRefs.length ?? 0}
        onSelectionChange={setImagePickerSelection}
        onClose={() => {
          setImagePickerTarget(null);
          setImagePickerSelection([]);
        }}
        onSave={() => {
          if (!imagePickerTarget) return;

          updateState((current) => ({
            ...current,
            productCatalogVariants: current.productCatalogVariants.map((variant) =>
              imagePickerTarget.variantRefs.includes(getProductCatalogVariantRef(variant))
                ? {
                  ...variant,
                  imageIds: [...imagePickerSelection]
                }
                : variant
            )
          }));

          setImagePickerTarget(null);
          setImagePickerSelection([]);
        }}
      />
    </div>
  );
}