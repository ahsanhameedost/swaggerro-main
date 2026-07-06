"use client";

import { Card, CardBody, Spinner, Switch } from "@heroui/react";
import { addToast } from "@heroui/toast";
import { Settings2 } from "lucide-react";
import { useMe } from "@/queries/auth";
import { useSettings, useUpdateSetting } from "@/queries/settings";

export default function PlatformSettingsPage() {
  const { data: me } = useMe();
  const canRead = !!me?.permissions?.includes("settings.read");
  const canWrite = !!me?.permissions?.includes("settings.write");

  const { data, isLoading } = useSettings();
  const updateSetting = useUpdateSetting();

  if (!canRead) {
    return (
      <Card>
        <CardBody>You do not have permission to view platform settings.</CardBody>
      </Card>
    );
  }

  const sellersCanAddProducts = data?.settings.sellers_can_add_products === "true";
  // Default ON when unset so the B2C gate is active out of the box.
  const previewLogoGate = data?.settings.preview_logo_gate !== "false";

  const toggleSellersCanAdd = async (next: boolean) => {
    try {
      await updateSetting.mutateAsync({
        key: "sellers_can_add_products",
        value: next ? "true" : "false",
      });
      addToast({
        title: next ? "Sellers can now add products" : "Seller product-adding disabled",
        color: "success",
      });
    } catch (err: any) {
      addToast({ title: "Couldn't save setting", description: err?.message ?? "", color: "danger" });
    }
  };

  const togglePreviewLogoGate = async (next: boolean) => {
    try {
      await updateSetting.mutateAsync({
        key: "preview_logo_gate",
        value: next ? "true" : "false",
      });
      addToast({
        title: next ? "Logo-preview gate enabled" : "Logo-preview gate disabled",
        color: "success",
      });
    } catch (err: any) {
      addToast({ title: "Couldn't save setting", description: err?.message ?? "", color: "danger" });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="border border-divider shadow-sm">
        <CardBody className="flex flex-row items-center gap-3 p-6">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Settings2 className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Platform settings</h1>
            <p className="text-sm text-foreground/60">
              Global switches for how the marketplace behaves. Only super-admins can change these.
            </p>
          </div>
        </CardBody>
      </Card>

      <Card className="border border-divider shadow-sm">
        <CardBody className="p-6">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner size="sm" />
            </div>
          ) : (
            <div className="flex items-start justify-between gap-6">
              <div className="max-w-2xl">
                <h2 className="text-base font-semibold">Let sellers add their own products</h2>
                <p className="mt-1 text-sm text-foreground/60">
                  Off (default): sellers only resell Swaggeroo&apos;s catalog — they earn just the
                  commission on each sale and Swaggeroo keeps the product price.
                </p>
                <p className="mt-1 text-sm text-foreground/60">
                  On: sellers may add their own products. On those products the split flips — the
                  seller keeps the price and Swaggeroo takes the commission. Swaggeroo&apos;s own
                  products are unaffected.
                </p>
              </div>
              <Switch
                isSelected={sellersCanAddProducts}
                isDisabled={!canWrite || updateSetting.isPending}
                onValueChange={toggleSellersCanAdd}
                aria-label="Let sellers add their own products"
              />
            </div>
          )}
        </CardBody>
      </Card>

      <Card className="border border-divider shadow-sm">
        <CardBody className="p-6">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner size="sm" />
            </div>
          ) : (
            <div className="flex items-start justify-between gap-6">
              <div className="max-w-2xl">
                <h2 className="text-base font-semibold">
                  Logo-preview gate on small orders (B2C)
                </h2>
                <p className="mt-1 text-sm text-foreground/60">
                  On (default): for 1–5 units the &ldquo;Preview your logo&rdquo; option is hidden and
                  shoppers get a fast, direct pay-now checkout. Ordering more than 5 units unlocks
                  logo preview and the standard quote flow.
                </p>
                <p className="mt-1 text-sm text-foreground/60">
                  Off: no gate — logo preview is always available and the minimum is 1, so every
                  order uses the standard flow.
                </p>
              </div>
              <Switch
                isSelected={previewLogoGate}
                isDisabled={!canWrite || updateSetting.isPending}
                onValueChange={togglePreviewLogoGate}
                aria-label="Logo-preview gate on small orders"
              />
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
