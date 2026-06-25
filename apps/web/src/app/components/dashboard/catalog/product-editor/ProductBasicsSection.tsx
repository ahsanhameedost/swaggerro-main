"use client";

import type { DragEndEvent, SensorDescriptor, SensorOptions } from "@dnd-kit/core";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import {
    Button,
    Card,
    CardBody,
    CardHeader,
    Chip,
    Image,
    Input,
    Select,
    SelectItem,
    Switch,
    Textarea
} from "@heroui/react";
import { addToast } from "@heroui/toast";
import { Trash2, UploadCloud } from "lucide-react";
import type { EditorImage, ProductEditorState, ProductStatus, SelectKeys } from "./types";
import { RichTextEditor } from "../RichTextEditor";
import {
    EMPTY_CATEGORY_KEY,
    getImageRef,
    getMultiSelectedKeys,
    getSingleSelectedKey
} from "./utils";
import { SortableBlock } from "./SortableBlock";
import { ProductPricingOptionsSection } from "./ProductPricingOptionsSection";

type ItemOption = {
    id: string;
    name: string;
};

type ProductBasicsSectionProps = {
    state: ProductEditorState;
    categories: ItemOption[];
    collections: ItemOption[];
    shippingProfiles: ItemOption[];
    uploadingImages: boolean;
    imageInputRef: React.RefObject<HTMLInputElement | null>;
    sensors: SensorDescriptor<SensorOptions>[];
    onStateChange: (updater: (current: ProductEditorState) => ProductEditorState) => void;
    onUploadImages: (files: FileList | File[]) => Promise<void>;
    onImagesDragEnd: (event: DragEndEvent) => void;
    onOpen: () => void;
};

const STATUS_OPTIONS = [
    { id: "DRAFT", label: "Draft" },
    { id: "ACTIVE", label: "Active" },
    { id: "ARCHIVED", label: "Archived" }
];

export function ProductBasicsSection({
    state,
    categories,
    collections,
    shippingProfiles,
    uploadingImages,
    imageInputRef,
    sensors,
    onStateChange,
    onUploadImages,
    onImagesDragEnd,
    onOpen
}: ProductBasicsSectionProps) {
    const hasVariants = state.productCatalogVariants.length > 0;

    return (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-col items-start gap-1">
                        <div className="text-lg font-semibold">Basic information</div>
                    </CardHeader>
                    <CardBody className="space-y-5">
                        <Input
                            label="Title"
                            value={state.name}
                            onChange={(event) => onStateChange((current) => ({ ...current, name: event.target.value }))}
                            isRequired
                        />

                        <Textarea
                            label="Short description"
                            value={state.shortDescription}
                            minRows={3}
                            isRequired
                            onChange={(event) =>
                                onStateChange((current) => ({ ...current, shortDescription: event.target.value }))
                            }
                        />

                        <div className="space-y-2">
                            <div className="text-sm font-medium">Description</div>
                            <RichTextEditor
                                value={state.description}
                                onChange={(value) => onStateChange((current) => ({ ...current, description: value }))}
                            />
                        </div>
                    </CardBody>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="flex items-center justify-between">
                        <div>
                            <div className="text-lg font-semibold">Media</div>
                        </div>
                        <Button
                            startContent={<UploadCloud className="size-4" />}
                            onPress={() => imageInputRef.current?.click()}
                            isLoading={uploadingImages}
                            className="text-white"
                            style={{ background: "var(--primary-gradient)" }}
                        >
                            Upload images
                        </Button>
                    </CardHeader>
                    <CardBody className="space-y-4">
                        <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            className="hidden"
                            onChange={async (event) => {
                                if (!event.target.files?.length) return;

                                try {
                                    await onUploadImages(event.target.files);
                                } catch (error: unknown) {
                                    addToast({
                                        title: "Image upload failed",
                                        description: error instanceof Error ? error.message : "",
                                        color: "danger"
                                    });
                                } finally {
                                    event.target.value = "";
                                }
                            }}
                        />

                        {state.images.length ? (
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onImagesDragEnd}>
                                <SortableContext
                                    items={state.images.map((image) => getImageRef(image))}
                                    strategy={rectSortingStrategy}
                                >
                                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                        {state.images.map((image, index) => (
                                            <SortableBlock
                                                key={getImageRef(image)}
                                                id={getImageRef(image)}
                                                className="rounded-2xl border border-default-200 bg-content1 p-3"
                                            >
                                                <div className="space-y-3">
                                                    <div className="overflow-hidden rounded-2xl border border-default-100 bg-default-50">
                                                        <Image
                                                            src={image.url}
                                                            alt={image.alt || `Product image ${index + 1}`}
                                                            className="h-48 w-full object-cover"
                                                        />
                                                    </div>

                                                    <div className="flex items-center justify-between gap-2">
                                                        <Chip size="sm" color={index === 0 ? "primary" : "default"} variant="flat">
                                                            {index === 0 ? "Thumbnail" : `Image ${index + 1}`}
                                                        </Chip>

                                                        <Button
                                                            isIconOnly
                                                            color="danger"
                                                            variant="flat"
                                                            onPress={() =>
                                                                onStateChange((current) => ({
                                                                    ...current,
                                                                    images: current.images.filter((item) => getImageRef(item) !== getImageRef(image)),
                                                                    productCatalogVariants: current.productCatalogVariants.map((variant) => ({
                                                                        ...variant,
                                                                        imageIds: variant.imageIds.filter((imageId) => imageId !== getImageRef(image))
                                                                    }))
                                                                }))
                                                            }
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </Button>
                                                    </div>

                                                    <Input
                                                        label="Alt text"
                                                        value={image.alt ?? ""}
                                                        onChange={(event) =>
                                                            onStateChange((current) => ({
                                                                ...current,
                                                                images: current.images.map((item) =>
                                                                    getImageRef(item) === getImageRef(image)
                                                                        ? { ...item, alt: event.target.value }
                                                                        : item
                                                                )
                                                            }))
                                                        }
                                                    />
                                                </div>
                                            </SortableBlock>
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-default-300 px-6 py-12 text-center text-sm text-foreground/60">
                                Upload one or more product images.
                            </div>
                        )}
                    </CardBody>
                </Card>
            </div>

            <div className="space-y-6">
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-col items-start gap-1">
                        <div className="text-lg font-semibold">Publishing</div>
                        <div className="text-sm text-foreground/60">Status, category, and collections.</div>
                    </CardHeader>
                    <CardBody className="space-y-5">
                        <Select
                            label="Status"
                            items={STATUS_OPTIONS}
                            selectedKeys={[state.status]}
                            disallowEmptySelection
                            onSelectionChange={(selection) =>
                                onStateChange((current) => ({
                                    ...current,
                                    status: getSingleSelectedKey(selection as SelectKeys) as ProductStatus
                                }))
                            }
                        >
                            {(item) => <SelectItem key={item.id}>{item.label}</SelectItem>}
                        </Select>

                        <Select
                            label="Category"
                            items={[{ id: EMPTY_CATEGORY_KEY, name: "No category" }, ...categories]}
                            selectedKeys={[state.categoryId || EMPTY_CATEGORY_KEY]}
                            disallowEmptySelection
                            onSelectionChange={(selection) => {
                                const value = getSingleSelectedKey(selection as SelectKeys);
                                onStateChange((current) => ({
                                    ...current,
                                    categoryId: value === EMPTY_CATEGORY_KEY ? "" : value
                                }));
                            }}
                        >
                            {(item) => <SelectItem key={item.id}>{item.name}</SelectItem>}
                        </Select>

                        <Select
                            label="Collections"
                            items={collections}
                            selectedKeys={new Set(state.collectionIds)}
                            selectionMode="multiple"
                            onSelectionChange={(selection) =>
                                onStateChange((current) => ({
                                    ...current,
                                    collectionIds:
                                        selection === "all"
                                            ? collections.map((collection) => collection.id)
                                            : getMultiSelectedKeys(selection as SelectKeys)
                                }))
                            }
                        >
                            {(item) => <SelectItem key={item.id}>{item.name}</SelectItem>}
                        </Select>

                        <div className="flex items-center justify-between">
                            <p>Is Packaging Product:</p>
                            <Switch
                                isSelected={state.isPackaging}
                                onValueChange={(isSelected) =>
                                    onStateChange((current) => ({
                                        ...current,
                                        isPackaging: isSelected
                                    }))
                                }
                            >
                            </Switch>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p>Bulk quantity pricing:</p>
                                <p className="text-xs text-foreground/50">
                                    Turn off to always charge the base price and hide volume tiers on the storefront.
                                </p>
                            </div>
                            <Switch
                                isSelected={state.bulkPricingEnabled}
                                onValueChange={(isSelected) =>
                                    onStateChange((current) => ({
                                        ...current,
                                        bulkPricingEnabled: isSelected
                                    }))
                                }
                            >
                            </Switch>
                        </div>

                        <Select
                            label="Shipping profile"
                            items={[{ id: EMPTY_CATEGORY_KEY, name: "No shipping profile" }, ...shippingProfiles]}
                            selectedKeys={[state.shippingProfileId || EMPTY_CATEGORY_KEY]}
                            disallowEmptySelection
                            onSelectionChange={(selection) => {
                                const value = getSingleSelectedKey(selection as SelectKeys);
                                onStateChange((current) => ({
                                    ...current,
                                    shippingProfileId: value === EMPTY_CATEGORY_KEY ? "" : value
                                }));
                            }}
                        >
                            {(item) => <SelectItem key={item.id}>{item.name}</SelectItem>}
                        </Select>
                    </CardBody>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="flex flex-col items-start gap-1">
                        <div className="text-lg font-semibold">Shipping setup</div>
                        <div className="text-sm text-foreground/60">Attach a reusable shipping profile and physical specs.</div>
                    </CardHeader>
                    <CardBody className="space-y-4">
                        <Input
                            type="number"
                            min={0}
                            step="0.01"
                            label="Unit weight (oz)"
                            value={state.weightOz == null ? "" : String(state.weightOz)}
                            onChange={(event) =>
                                onStateChange((current) => ({
                                    ...current,
                                    weightOz: event.target.value.trim() ? Number(event.target.value) : null
                                }))
                            }
                        />

                        <div className="grid gap-4 md:grid-cols-3">
                            <Input
                                type="number"
                                min={0}
                                step="0.01"
                                label="Length (in)"
                                value={state.lengthIn == null ? "" : String(state.lengthIn)}
                                onChange={(event) =>
                                    onStateChange((current) => ({
                                        ...current,
                                        lengthIn: event.target.value.trim() ? Number(event.target.value) : null
                                    }))
                                }
                            />

                            <Input
                                type="number"
                                min={0}
                                step="0.01"
                                label="Width (in)"
                                value={state.widthIn == null ? "" : String(state.widthIn)}
                                onChange={(event) =>
                                    onStateChange((current) => ({
                                        ...current,
                                        widthIn: event.target.value.trim() ? Number(event.target.value) : null
                                    }))
                                }
                            />

                            <Input
                                type="number"
                                min={0}
                                step="0.01"
                                label="Height (in)"
                                value={state.heightIn == null ? "" : String(state.heightIn)}
                                onChange={(event) =>
                                    onStateChange((current) => ({
                                        ...current,
                                        heightIn: event.target.value.trim() ? Number(event.target.value) : null
                                    }))
                                }
                            />
                        </div>
                    </CardBody>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="flex flex-col items-start gap-1">
                        <div className="text-lg font-semibold">Base pricing</div>
                    </CardHeader>
                    <CardBody className="space-y-4">
                        <Input
                            type="number"
                            step="0.01"
                            min={0}
                            label="Base price"
                            value={state.basePrice == null ? "" : String(state.basePrice)}
                            isDisabled={hasVariants}
                            onChange={(event) =>
                                onStateChange((current) => ({
                                    ...current,
                                    basePrice: event.target.value.trim() ? Number(event.target.value) : null
                                }))
                            }
                        />

                        <Input
                            type="number"
                            step="0.01"
                            min={0}
                            label="Compare at price"
                            value={state.compareAtPrice == null ? "" : String(state.compareAtPrice)}
                            onChange={(event) =>
                                onStateChange((current) => ({
                                    ...current,
                                    compareAtPrice: event.target.value.trim() ? Number(event.target.value) : null
                                }))
                            }
                        />

                        <Input
                            type="number"
                            min={1}
                            label="Min quantity"
                            value={String(state.minQty)}
                            onChange={(event) =>
                                onStateChange((current) => ({
                                    ...current,
                                    minQty: Math.max(1, Number(event.target.value || 1)),
                                    productCatalogVariants: current.productCatalogVariants.map((variant) => ({
                                        ...variant,
                                        minQty: Math.max(1, variant.minQty)
                                    }))
                                }))
                            }
                        />

                        <Input
                            type="number"
                            min={0}
                            label="Base stock"
                            value={state.baseStock == null ? "" : String(state.baseStock)}
                            isDisabled={hasVariants}
                            onChange={(event) =>
                                onStateChange((current) => ({
                                    ...current,
                                    baseStock: Math.max(0, Number(event.target.value || 0))
                                }))
                            }
                        />
                    </CardBody>
                </Card>
                <ProductPricingOptionsSection
                    rows={state.pricingOptions}
                    disabled={state.productCatalogVariants.length > 0}
                    onOpen={onOpen}
                />
            </div>
        </div>
    );
}