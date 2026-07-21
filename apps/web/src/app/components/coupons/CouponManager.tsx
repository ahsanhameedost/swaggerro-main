"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Spinner,
  Switch,
} from "@heroui/react";
import { addToast } from "@heroui/toast";
import { Pencil, Plus, Ticket, Trash2 } from "lucide-react";
import type { Coupon, CouponInput } from "@/modules/coupons/api";
import { formatMoney } from "@/lib/money";
import { CouponScopePicker, type CouponScope } from "./CouponScopePicker";

type Props = {
  coupons: Coupon[];
  isLoading: boolean;
  onCreate: (input: CouponInput) => Promise<unknown>;
  onUpdate: (id: string, input: Partial<CouponInput>) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  // Admin can restrict a coupon to a specific user; sellers cannot.
  canRestrictUser?: boolean;
  // Which catalog list the scope picker reads: admin (all products) or public
  // (published catalog, used by sellers).
  scopeVariant?: "admin" | "public";
  title?: string;
  subtitle?: string;
};

type FormState = {
  code: string;
  description: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: string;
  minSubtotal: string;
  maxDiscount: string;
  usageLimit: string;
  expiresAt: string;
  assignedUserId: string;
  active: boolean;
  productIds: string[];
  categoryIds: string[];
  collectionIds: string[];
};

const emptyForm: FormState = {
  code: "",
  description: "",
  discountType: "PERCENT",
  discountValue: "",
  minSubtotal: "",
  maxDiscount: "",
  usageLimit: "",
  expiresAt: "",
  assignedUserId: "",
  active: true,
  productIds: [],
  categoryIds: [],
  collectionIds: [],
};

function toForm(c: Coupon): FormState {
  return {
    code: c.code,
    description: c.description ?? "",
    discountType: c.discountType,
    discountValue: String(c.discountValue),
    minSubtotal: c.minSubtotal != null ? String(c.minSubtotal) : "",
    maxDiscount: c.maxDiscount != null ? String(c.maxDiscount) : "",
    usageLimit: c.usageLimit != null ? String(c.usageLimit) : "",
    expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : "",
    assignedUserId: c.assignedUserId ?? "",
    active: c.active,
    productIds: c.productIds ?? [],
    categoryIds: c.categoryIds ?? [],
    collectionIds: c.collectionIds ?? [],
  };
}

export function CouponManager({
  coupons,
  isLoading,
  onCreate,
  onUpdate,
  onDelete,
  canRestrictUser = false,
  scopeVariant = "admin",
  title = "Coupons",
  subtitle = "Create discount codes customers redeem at checkout.",
}: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase();
    return q ? coupons.filter((c) => c.code.includes(q)) : coupons;
  }, [coupons, search]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };
  const openEdit = (c: Coupon) => {
    setEditing(c);
    setForm(toForm(c));
    setOpen(true);
  };

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const buildInput = (): CouponInput | null => {
    const code = form.code.trim().toUpperCase();
    const value = Number(form.discountValue);
    if (code.length < 3) {
      addToast({ title: "Code must be at least 3 characters", color: "warning" });
      return null;
    }
    if (!Number.isFinite(value) || value <= 0) {
      addToast({ title: "Enter a discount value above 0", color: "warning" });
      return null;
    }
    if (form.discountType === "PERCENT" && value > 100) {
      addToast({ title: "A percentage can't be more than 100", color: "warning" });
      return null;
    }
    const num = (s: string) => (s.trim() === "" ? null : Number(s));
    return {
      code,
      description: form.description.trim() || null,
      discountType: form.discountType,
      discountValue: value,
      minSubtotal: num(form.minSubtotal),
      maxDiscount: form.discountType === "PERCENT" ? num(form.maxDiscount) : null,
      usageLimit: form.usageLimit.trim() === "" ? null : Math.floor(Number(form.usageLimit)),
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      assignedUserId: canRestrictUser ? form.assignedUserId.trim() || null : null,
      active: form.active,
      productIds: form.productIds,
      categoryIds: form.categoryIds,
      collectionIds: form.collectionIds,
    };
  };

  const save = async () => {
    const input = buildInput();
    if (!input) return;
    setSaving(true);
    try {
      if (editing) await onUpdate(editing.id, input);
      else await onCreate(input);
      addToast({ title: editing ? "Coupon updated" : "Coupon created", color: "success" });
      setOpen(false);
    } catch (e: any) {
      addToast({ title: "Couldn't save", description: e?.message ?? "Try again.", color: "danger" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: Coupon) => {
    if (!window.confirm(`Delete coupon ${c.code}? This can't be undone.`)) return;
    try {
      await onDelete(c.id);
      addToast({ title: "Coupon deleted", color: "success" });
    } catch (e: any) {
      addToast({ title: "Couldn't delete", description: e?.message ?? "Try again.", color: "danger" });
    }
  };

  const discountLabel = (c: Coupon) =>
    c.discountType === "PERCENT" ? `${c.discountValue}% off` : `${formatMoney(c.discountValue, "USD")} off`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-foreground/60">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            size="sm"
            placeholder="Search codes…"
            value={search}
            onValueChange={setSearch}
            className="w-44"
          />
          <Button color="primary" startContent={<Plus className="size-4" />} onPress={openNew}>
            New coupon
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner label="Loading coupons…" />
        </div>
      ) : !filtered.length ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-divider py-16 text-center">
          <Ticket className="size-8 text-foreground/40" />
          <p className="text-sm text-foreground/60">No coupons yet. Create your first discount code.</p>
          <Button color="primary" variant="flat" startContent={<Plus className="size-4" />} onPress={openNew}>
            New coupon
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-divider">
          <table className="w-full text-sm">
            <thead className="bg-default-100 text-left text-xs uppercase tracking-wide text-foreground/50">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Scope</th>
                <th className="px-4 py-3">Used</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {filtered.map((c) => {
                const expired = c.expiresAt ? new Date(c.expiresAt) < new Date() : false;
                return (
                  <tr key={c.id} className="hover:bg-default-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{c.code}</div>
                      {c.description ? (
                        <div className="text-xs text-foreground/50">{c.description}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{discountLabel(c)}</td>
                    <td className="px-4 py-3">
                      <Chip size="sm" variant="flat" color={c.scope === "store" ? "secondary" : "primary"}>
                        {c.scope === "store" ? "Store" : "Platform"}
                      </Chip>
                      {(() => {
                        const n =
                          (c.productIds?.length ?? 0) +
                          (c.categoryIds?.length ?? 0) +
                          (c.collectionIds?.length ?? 0);
                        return (
                          <div className="mt-1 text-xs text-foreground/50">
                            {n === 0 ? "Whole order" : `${n} item${n > 1 ? "s" : ""} scoped`}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-foreground/70">
                      {c.usedCount}
                      {c.usageLimit != null ? ` / ${c.usageLimit}` : ""}
                    </td>
                    <td className="px-4 py-3">
                      <Chip
                        size="sm"
                        variant="flat"
                        color={!c.active ? "default" : expired ? "warning" : "success"}
                      >
                        {!c.active ? "Inactive" : expired ? "Expired" : "Active"}
                      </Chip>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button isIconOnly size="sm" variant="light" onPress={() => openEdit(c)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          color="danger"
                          onPress={() => void remove(c)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={open} onOpenChange={setOpen} size="lg" scrollBehavior="inside">
        <ModalContent>
          {() => (
            <>
              <ModalHeader>{editing ? `Edit ${editing.code}` : "New coupon"}</ModalHeader>
              <ModalBody className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Code"
                    value={form.code}
                    onValueChange={(v) => set("code", v.toUpperCase())}
                    placeholder="SAVE10"
                    isRequired
                  />
                  <Select
                    label="Discount type"
                    selectedKeys={[form.discountType]}
                    onSelectionChange={(keys) =>
                      set("discountType", Array.from(keys as Set<string>)[0] as "PERCENT" | "FIXED")
                    }
                  >
                    <SelectItem key="PERCENT">Percentage (%)</SelectItem>
                    <SelectItem key="FIXED">Fixed amount ($)</SelectItem>
                  </Select>
                  <Input
                    label={form.discountType === "PERCENT" ? "Percent off" : "Amount off ($)"}
                    type="number"
                    value={form.discountValue}
                    onValueChange={(v) => set("discountValue", v)}
                    isRequired
                  />
                  {form.discountType === "PERCENT" ? (
                    <Input
                      label="Max discount ($, optional)"
                      type="number"
                      value={form.maxDiscount}
                      onValueChange={(v) => set("maxDiscount", v)}
                    />
                  ) : (
                    <div />
                  )}
                  <Input
                    label="Min order subtotal ($, optional)"
                    type="number"
                    value={form.minSubtotal}
                    onValueChange={(v) => set("minSubtotal", v)}
                  />
                  <Input
                    label="Total uses allowed (optional)"
                    type="number"
                    value={form.usageLimit}
                    onValueChange={(v) => set("usageLimit", v)}
                  />
                  <Input
                    label="Expires on (optional)"
                    type="date"
                    value={form.expiresAt}
                    onValueChange={(v) => set("expiresAt", v)}
                  />
                  {canRestrictUser ? (
                    <Input
                      label="Restrict to user ID (optional)"
                      value={form.assignedUserId}
                      onValueChange={(v) => set("assignedUserId", v)}
                      placeholder="Only this user can redeem"
                    />
                  ) : (
                    <div />
                  )}
                </div>
                <Input
                  label="Description (optional)"
                  value={form.description}
                  onValueChange={(v) => set("description", v)}
                  placeholder="Internal note — what this code is for"
                />
                <CouponScopePicker
                  variant={scopeVariant}
                  value={{
                    productIds: form.productIds,
                    categoryIds: form.categoryIds,
                    collectionIds: form.collectionIds,
                  }}
                  onChange={(next: CouponScope) =>
                    setForm((f) => ({
                      ...f,
                      productIds: next.productIds,
                      categoryIds: next.categoryIds,
                      collectionIds: next.collectionIds,
                    }))
                  }
                />
                <div className="flex items-center justify-between rounded-2xl border border-divider px-4 py-3">
                  <div>
                    <div className="text-sm font-medium">Active</div>
                    <div className="text-xs text-foreground/50">Only active codes can be redeemed.</div>
                  </div>
                  <Switch isSelected={form.active} onValueChange={(v) => set("active", v)} />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button color="primary" isLoading={saving} onPress={() => void save()}>
                  {editing ? "Save changes" : "Create coupon"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
