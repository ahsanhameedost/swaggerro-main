"use client";

import { useMemo } from "react";
import {
  Avatar,
  AvatarGroup,
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Select,
  SelectItem
} from "@heroui/react";
import type { ProductCatalogVariantSelection } from "@/lib/catalog";
import type {
  EditorImage,
  EditorProductCatalogVariant,
  EditorVariantDefinition,
  GroupDraftState,
  SelectKeys
} from "./types";
import {
  EMPTY_GROUP_BY_KEY,
  getImageRef,
  getProductCatalogVariantRef,
  getSingleSelectedKey,
  getVariantDefinitionRef
} from "./utils";

type ProductCatalogVariantsSectionProps = {
  images: EditorImage[];
  variantDefinitions: EditorVariantDefinition[];
  productCatalogVariants: EditorProductCatalogVariant[];
  groupByVariantId: string;
  groupDrafts: GroupDraftState;
  onGroupByVariantIdChange: (value: string) => void;
  onGroupDraftsChange: (next: GroupDraftState) => void;
  onApplyGroupValues: (groupKey: string, rows: EditorProductCatalogVariant[]) => void;
  onUpdateRow: (variantRef: string, patch: Partial<EditorProductCatalogVariant>) => void;
  onOpenVariantPricing: (variantRef: string) => void;
  onOpenGroupPricing: (title: string, variantRefs: string[]) => void;
  onOpenImages: (title: string, variantRefs: string[], selectedImageIds: string[]) => void;
};

function getSelectionOptionId(selection: ProductCatalogVariantSelection) {
  return selection.variantOptionId;
}

function resolveImageItems(images: EditorImage[], imageIds: string[]) {
  const set = new Set(imageIds);
  return images.filter((image) => set.has(getImageRef(image)));
}

export function ProductCatalogVariantsSection({
  images,
  variantDefinitions,
  productCatalogVariants,
  groupByVariantId,
  groupDrafts,
  onGroupByVariantIdChange,
  onGroupDraftsChange,
  onApplyGroupValues,
  onUpdateRow,
  onOpenVariantPricing,
  onOpenGroupPricing,
  onOpenImages
}: ProductCatalogVariantsSectionProps) {
  const groupedVariantRows = useMemo(() => {
    if (!groupByVariantId) {
      return [] as Array<{
        key: string;
        label: string;
        rows: EditorProductCatalogVariant[];
      }>;
    }

    const groups = new Map<string, { label: string; rows: EditorProductCatalogVariant[] }>();

    productCatalogVariants.forEach((variant) => {
      const selected = variant.selectedOptions.find((item) => item.variantId === groupByVariantId);
      const key = selected ? getSelectionOptionId(selected) : getProductCatalogVariantRef(variant);
      const label = selected?.label || variant.title || "Ungrouped";

      if (!groups.has(key)) {
        groups.set(key, { label, rows: [] });
      }

      groups.get(key)?.rows.push(variant);
    });

    return Array.from(groups.entries()).map(([key, value]) => ({
      key,
      label: value.label,
      rows: value.rows
    }));
  }, [groupByVariantId, productCatalogVariants]);

  const renderImageGroup = (imageIds: string[], onPress: () => void) => {
    const selectedImages = resolveImageItems(images, imageIds);

    if (!selectedImages.length) {
      return (
        <Button variant="flat" onPress={onPress}>
          Choose images
        </Button>
      );
    }

    return (
      <button type="button" onClick={onPress} className="rounded-full">
        <AvatarGroup isBordered max={4}>
          {selectedImages.map((image) => (
            <Avatar key={getImageRef(image)} src={image.url} name={image.alt || "Image"} />
          ))}
        </AvatarGroup>
      </button>
    );
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-lg font-semibold">Product catalog variants</div>
        </div>

        <div className="w-full md:w-60">
          <Select
            label="Group by"
            items={[
              { id: EMPTY_GROUP_BY_KEY, name: "None" },
              ...variantDefinitions.map((variant) => ({
                id: getVariantDefinitionRef(variant),
                name: variant.name || "Unnamed variant"
              }))
            ]}
            selectedKeys={[groupByVariantId || EMPTY_GROUP_BY_KEY]}
            disallowEmptySelection
            onSelectionChange={(selection) => {
              const value = getSingleSelectedKey(selection as SelectKeys);
              onGroupByVariantIdChange(value === EMPTY_GROUP_BY_KEY ? "" : value);
            }}
          >
            {(item) => <SelectItem key={item.id}>{item.name}</SelectItem>}
          </Select>
        </div>
      </CardHeader>

      <CardBody>
        {!productCatalogVariants.length ? (
          <div className="rounded-2xl border border-dashed border-default-300 px-6 py-12 text-center text-sm text-foreground/60">
            Add variant definitions above to generate purchasable product catalog variants.
          </div>
        ) : groupByVariantId ? (
          <div className="space-y-6">
            {groupedVariantRows.map((group) => {
              const sharedPrice =
                group.rows.every((row) => row.price === group.rows[0]?.price)
                  ? String(group.rows[0]?.price ?? "")
                  : "";
              const sharedStock =
                group.rows.every((row) => row.stock === group.rows[0]?.stock)
                  ? String(group.rows[0]?.stock ?? "")
                  : "";
              const sharedMinQty =
                group.rows.every((row) => row.minQty === group.rows[0]?.minQty)
                  ? String(group.rows[0]?.minQty ?? "")
                  : "";

              const draft = groupDrafts[group.key] ?? {
                price: sharedPrice,
                stock: sharedStock,
                minQty: sharedMinQty
              };

              const groupImageIds = group.rows[0]?.imageIds ?? [];

              return (
                <div key={group.key} className="rounded-2xl border border-default-200">
                  <div className="grid gap-3 border-b border-default-200 bg-default-50 p-4 lg:grid-cols-[minmax(0,1fr)_200px_160px_140px_140px_auto_auto]">
                    <div className="flex items-center gap-4">
                      {renderImageGroup(groupImageIds, () =>
                        onOpenImages(group.label, group.rows.map((row) => getProductCatalogVariantRef(row)), groupImageIds)
                      )}
                      <div>
                        <div className="font-semibold">{group.label}</div>
                        <div className="text-sm text-foreground/60">
                          {group.rows.length} variants in this group
                        </div>
                      </div>
                    </div>

                    <Input
                      type="number"
                      step="0.01"
                      label="Price"
                      value={draft.price}
                      onChange={(event) =>
                        onGroupDraftsChange({
                          ...groupDrafts,
                          [group.key]: {
                            ...draft,
                            price: event.target.value
                          }
                        })
                      }
                    />

                    <Input
                      type="number"
                      label="Stock"
                      value={draft.stock}
                      onChange={(event) =>
                        onGroupDraftsChange({
                          ...groupDrafts,
                          [group.key]: {
                            ...draft,
                            stock: event.target.value
                          }
                        })
                      }
                    />

                    <Input
                      type="number"
                      label="Min qty"
                      value={draft.minQty}
                      onChange={(event) =>
                        onGroupDraftsChange({
                          ...groupDrafts,
                          [group.key]: {
                            ...draft,
                            minQty: event.target.value
                          }
                        })
                      }
                    />

                    <div className="flex items-center justify-end">
                      <Button
                        variant="flat"
                        onPress={() =>
                          onOpenGroupPricing(
                            group.label,
                            group.rows.map((row) => getProductCatalogVariantRef(row))
                          )
                        }
                      >
                        {group.rows.some((row) => row.pricingOptions.length > 0)
                          ? "Edit group pricing"
                          : "Set group pricing"}
                      </Button>
                    </div>

                    <div className="flex items-center justify-end">
                      <Button variant="flat" onPress={() => onApplyGroupValues(group.key, group.rows)}>
                        Apply
                      </Button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-default-200 text-left text-foreground/60">
                          <th className="px-4 py-3">Images</th>
                          <th className="px-4 py-3">Variant</th>
                          <th className="px-4 py-3">Price</th>
                          <th className="px-4 py-3">Stock</th>
                          <th className="px-4 py-3">Min qty</th>
                          <th className="px-4 py-3">Pricing</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.rows.map((variant) => {
                          const variantRef = getProductCatalogVariantRef(variant);

                          return (
                            <tr key={variantRef} className="border-b border-default-100 last:border-b-0">
                              <td className="px-4 py-3">
                                {renderImageGroup(variant.imageIds, () =>
                                  onOpenImages(variant.title, [variantRef], variant.imageIds)
                                )}
                              </td>
                              <td className="px-4 py-3 font-medium">{variant.title}</td>
                              <td className="px-4 py-3">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min={0}
                                  value={String(variant.price)}
                                  onChange={(event) =>
                                    onUpdateRow(variantRef, {
                                      price: Math.max(0, Number(event.target.value || 0))
                                    })
                                  }
                                />
                              </td>
                              <td className="px-4 py-3">
                                <Input
                                  type="number"
                                  min={0}
                                  value={String(variant.stock)}
                                  onChange={(event) =>
                                    onUpdateRow(variantRef, {
                                      stock: Math.max(0, Number(event.target.value || 0))
                                    })
                                  }
                                />
                              </td>
                              <td className="px-4 py-3">
                                <Input
                                  type="number"
                                  min={1}
                                  value={String(variant.minQty)}
                                  onChange={(event) =>
                                    onUpdateRow(variantRef, {
                                      minQty: Math.max(1, Number(event.target.value || 1))
                                    })
                                  }
                                />
                              </td>
                              <td className="px-4 py-3">
                                <Button variant="flat" onPress={() => onOpenVariantPricing(variantRef)}>
                                  {variant.pricingOptions.length ? `${variant.pricingOptions.length} rows` : "Add"}
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-default-200 text-left text-foreground/60">
                  <th className="px-4 py-3">Images</th>
                  <th className="px-4 py-3">Variant</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Min qty</th>
                  <th className="px-4 py-3">Pricing</th>
                </tr>
              </thead>
              <tbody>
                {productCatalogVariants.map((variant) => {
                  const variantRef = getProductCatalogVariantRef(variant);

                  return (
                    <tr key={variantRef} className="border-b border-default-100 last:border-b-0">
                      <td className="px-4 py-3">
                        {renderImageGroup(variant.imageIds, () =>
                          onOpenImages(variant.title, [variantRef], variant.imageIds)
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{variant.title}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          value={String(variant.price)}
                          onChange={(event) =>
                            onUpdateRow(variantRef, {
                              price: Math.max(0, Number(event.target.value || 0))
                            })
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          min={0}
                          value={String(variant.stock)}
                          onChange={(event) =>
                            onUpdateRow(variantRef, {
                              stock: Math.max(0, Number(event.target.value || 0))
                            })
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          min={1}
                          value={String(variant.minQty)}
                          onChange={(event) =>
                            onUpdateRow(variantRef, {
                              minQty: Math.max(1, Number(event.target.value || 1))
                            })
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="flat" onPress={() => onOpenVariantPricing(variantRef)}>
                          {variant.pricingOptions.length ? `${variant.pricingOptions.length} rows` : "Add"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}