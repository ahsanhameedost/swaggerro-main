"use client";

import { useEffect } from "react";
import type { DragEndEvent, SensorDescriptor, SensorOptions } from "@dnd-kit/core";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
    Accordion,
    AccordionItem,
    Button,
    Card,
    CardBody,
    CardHeader,
    Chip,
    Input,
    Select,
    SelectItem
} from "@heroui/react";
import { Plus, Trash2 } from "lucide-react";
import type {
    EditorVariantDefinition,
    EditorVariantOption,
    SelectKeys,
    VariantType
} from "./types";
import { SortableBlock } from "./SortableBlock";
import {
    getSingleSelectedKey,
    getVariantDefinitionRef,
    getVariantOptionRef
} from "./utils";

type ProductVariantsSectionProps = {
    variants: EditorVariantDefinition[];
    sensors: SensorDescriptor<SensorOptions>[];
    expandedKeys: Set<string>;
    scrollTargetId: string | null;
    onExpandedKeysChange: (keys: Set<string>) => void;
    onScrollHandled: () => void;
    onAddVariant: () => void;
    onDeleteVariant: (variantRef: string) => void;
    onUpdateVariantName: (variantRef: string, name: string) => void;
    onUpdateVariantType: (variantRef: string, type: VariantType) => void;
    onAddOption: (variantRef: string) => void;
    onDeleteOption: (variantRef: string, optionRef: string) => void;
    onUpdateOption: (
        variantRef: string,
        optionRef: string,
        updater: (current: EditorVariantOption) => EditorVariantOption
    ) => void;
    onReorderVariants: (event: DragEndEvent) => void;
    onReorderOptions: (variantRef: string, event: DragEndEvent) => void;
};

export function ProductVariantsSection({
    variants,
    sensors,
    expandedKeys,
    scrollTargetId,
    onExpandedKeysChange,
    onScrollHandled,
    onAddVariant,
    onDeleteVariant,
    onUpdateVariantName,
    onUpdateVariantType,
    onAddOption,
    onDeleteOption,
    onUpdateOption,
    onReorderVariants,
    onReorderOptions
}: ProductVariantsSectionProps) {
    useEffect(() => {
        if (!scrollTargetId) return;

        const element = document.getElementById(scrollTargetId);
        if (!element) return;

        requestAnimationFrame(() => {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            onScrollHandled();
        });
    }, [scrollTargetId, onScrollHandled]);

    return (
        <Card className="shadow-sm">
            <CardHeader className="flex items-center justify-between">
                <div>
                    <div className="text-lg font-semibold">Variants</div>
                    <div className="text-sm text-foreground/60">
                        Create color, size, dimension, or any other option set.
                    </div>
                </div>
                <Button startContent={<Plus className="size-4" />} variant="flat" onPress={onAddVariant}>
                    Add variant
                </Button>
            </CardHeader>

            <CardBody>
                {!variants.length ? (
                    <div className="rounded-2xl border border-dashed border-default-300 px-6 py-12 text-center text-sm text-foreground/60">
                        Add variants only when the product needs multiple purchasable combinations.
                    </div>
                ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onReorderVariants}>
                        <SortableContext
                            items={variants.map((variant) => getVariantDefinitionRef(variant))}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-4">
                                {variants.map((variant) => {
                                    const variantRef = getVariantDefinitionRef(variant);

                                    return (
                                        <div id={`variant-${variantRef}`} key={variantRef}>
                                            <SortableBlock id={variantRef} className="items-start">
                                                <Accordion
                                                    variant="splitted"
                                                    selectionMode="multiple"
                                                    selectedKeys={expandedKeys}
                                                    onSelectionChange={(keys) => {
                                                        const next = new Set(
                                                            Array.from(keys as Set<React.Key>).map((item) => String(item))
                                                        );
                                                        onExpandedKeysChange(next);
                                                    }}
                                                >
                                                    <AccordionItem
                                                        key={variantRef}
                                                        aria-label={variant.name || "New variant"}
                                                        title={
                                                            <div className="flex items-center justify-between gap-3">
                                                                <div className="flex min-w-0 items-center gap-2">
                                                                    <div className="truncate font-semibold">
                                                                        {variant.name || "New variant"}
                                                                    </div>
                                                                    <Chip size="sm" variant="flat">
                                                                        {variant.type}
                                                                    </Chip>
                                                                    <Chip size="sm" variant="flat" color="primary">
                                                                        {variant.options.length} options
                                                                    </Chip>
                                                                </div>
                                                            </div>
                                                        }
                                                    >
                                                        <div className="space-y-4 pt-2">
                                                            <div className="grid items-center gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
                                                                <Input
                                                                    label="Variant name"
                                                                    value={variant.name}
                                                                    onChange={(event) => onUpdateVariantName(variantRef, event.target.value)}
                                                                />

                                                                <Select
                                                                    label="Type"
                                                                    selectedKeys={[variant.type]}
                                                                    disallowEmptySelection
                                                                    items={[
                                                                        { id: "TEXT", label: "Text" },
                                                                        { id: "COLOR", label: "Color" }
                                                                    ]}
                                                                    onSelectionChange={(selection) => {
                                                                        const nextType = getSingleSelectedKey(selection as SelectKeys) as VariantType;
                                                                        if (!nextType) return;
                                                                        onUpdateVariantType(variantRef, nextType);
                                                                    }}
                                                                >
                                                                    {(item) => <SelectItem key={item.id}>{item.label}</SelectItem>}
                                                                </Select>

                                                                <div className="flex justify-end">
                                                                    <Button
                                                                        isIconOnly
                                                                        color="danger"
                                                                        variant="flat"
                                                                        onPress={() => onDeleteVariant(variantRef)}
                                                                    >
                                                                        <Trash2 className="size-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center justify-between gap-3">
                                                                <div className="text-sm font-medium">Option values</div>
                                                                <Button
                                                                    size="sm"
                                                                    variant="flat"
                                                                    startContent={<Plus className="size-4" />}
                                                                    onPress={() => onAddOption(variantRef)}
                                                                >
                                                                    Add value
                                                                </Button>
                                                            </div>

                                                            <DndContext
                                                                sensors={sensors}
                                                                collisionDetection={closestCenter}
                                                                onDragEnd={(event) => onReorderOptions(variantRef, event)}
                                                            >
                                                                <SortableContext
                                                                    items={variant.options.map((option) => getVariantOptionRef(option))}
                                                                    strategy={verticalListSortingStrategy}
                                                                >
                                                                    <div className="space-y-3">
                                                                        {variant.options.map((option) => {
                                                                            const optionRef = getVariantOptionRef(option);

                                                                            return (
                                                                                <div id={`variant-option-${optionRef}`} key={optionRef}>
                                                                                    <SortableBlock
                                                                                        id={optionRef}
                                                                                        className="items-start"
                                                                                        contentClassName="rounded-2xl border border-default-200 bg-default-50 p-4"
                                                                                    >
                                                                                        <div className="grid gap-3 md:grid-cols-[160px_minmax(0,1fr)_auto]">
                                                                                            {variant.type === "COLOR" ? (
                                                                                                <>
                                                                                                    <div className="space-y-2">
                                                                                                        <div className="text-sm font-medium">Color</div>
                                                                                                        <input
                                                                                                            type="color"
                                                                                                            value={option.colorHex || "#111111"}
                                                                                                            className="h-12 w-full cursor-pointer rounded-xl border border-default-200 bg-content1 p-2"
                                                                                                            onChange={(event) =>
                                                                                                                onUpdateOption(variantRef, optionRef, (current) => ({
                                                                                                                    ...current,
                                                                                                                    code: event.target.value,
                                                                                                                    colorHex: event.target.value
                                                                                                                }))
                                                                                                            }
                                                                                                        />
                                                                                                    </div>

                                                                                                    <Input
                                                                                                        label="Label"
                                                                                                        value={option.label}
                                                                                                        className="mt-5"
                                                                                                        onChange={(event) =>
                                                                                                            onUpdateOption(variantRef, optionRef, (current) => ({
                                                                                                                ...current,
                                                                                                                label: event.target.value
                                                                                                            }))
                                                                                                        }
                                                                                                    />
                                                                                                </>
                                                                                            ) : (
                                                                                                <>
                                                                                                    <Input
                                                                                                        label="Code"
                                                                                                        value={option.code}
                                                                                                        onChange={(event) =>
                                                                                                            onUpdateOption(variantRef, optionRef, (current) => ({
                                                                                                                ...current,
                                                                                                                code: event.target.value
                                                                                                            }))
                                                                                                        }
                                                                                                    />

                                                                                                    <Input
                                                                                                        label="Label"
                                                                                                        value={option.label}
                                                                                                        onChange={(event) =>
                                                                                                            onUpdateOption(variantRef, optionRef, (current) => ({
                                                                                                                ...current,
                                                                                                                label: event.target.value
                                                                                                            }))
                                                                                                        }
                                                                                                    />
                                                                                                </>
                                                                                            )}

                                                                                            <div className="flex items-center justify-end">
                                                                                                <Button
                                                                                                    isIconOnly
                                                                                                    color="danger"
                                                                                                    variant="flat"
                                                                                                    onPress={() => onDeleteOption(variantRef, optionRef)}
                                                                                                >
                                                                                                    <Trash2 className="size-4" />
                                                                                                </Button>
                                                                                            </div>
                                                                                        </div>
                                                                                    </SortableBlock>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </SortableContext>
                                                            </DndContext>
                                                        </div>
                                                    </AccordionItem>
                                                </Accordion>
                                            </SortableBlock>
                                        </div>
                                    );
                                })}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
            </CardBody>
        </Card>
    );
}
