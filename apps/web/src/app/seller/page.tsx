"use client";

import Link from "next/link";
import { Spinner } from "@heroui/react";
import { addToast } from "@heroui/toast";
import { ExternalLink, PackageOpen } from "lucide-react";
import { useMyStore, useUpdateMyStore } from "@/queries/stores";
import type { UpdateOwnStoreInput } from "@/modules/stores/types";
import { StoreEditor } from "@/app/components/stores/StoreEditor";

const STATUS_COPY: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: "Live", cls: "bg-success/10 text-success" },
  DRAFT: { label: "Draft", cls: "bg-muted text-muted-foreground" },
  SUSPENDED: { label: "Suspended", cls: "bg-destructive/10 text-destructive" },
};

export default function SellerDashboardPage() {
  const { data, isLoading, isError, error } = useMyStore();
  const updateMutation = useUpdateMyStore();
  const store = data?.store;

  const handleSave = async (input: UpdateOwnStoreInput) => {
    try {
      await updateMutation.mutateAsync(input);
      addToast({ title: "Store updated", color: "success" });
    } catch (saveError: any) {
      addToast({ title: "Save failed", description: saveError?.message ?? "", color: "danger" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner label="Loading your store…" />
      </div>
    );
  }

  if (isError || !store) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <PackageOpen className="mx-auto size-10 text-muted-foreground" />
        <h1 className="mt-4 font-display text-2xl font-bold">No store yet</h1>
        <p className="mt-2 text-muted-foreground">
          {error instanceof Error ? error.message : "Your store hasn't been set up yet."} Once your seller
          application is approved, your store will appear here.
        </p>
        <Link href="/" className="mt-6 inline-block text-sm font-medium text-primary hover:underline">
          Go to Swaggeroo
        </Link>
      </div>
    );
  }

  const status = STATUS_COPY[store.status] ?? STATUS_COPY.DRAFT;

  return (
    <div className="mx-auto max-w-site px-6 py-8 lg:py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight">{store.name}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.cls}`}>{status.label}</span>
          </div>
          <a
            href={`/store/${store.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            /store/{store.slug} <ExternalLink className="size-3.5" />
          </a>
        </div>
      </div>

      <StoreEditor store={store} mode="seller" saving={updateMutation.isPending} onSave={handleSave} />
    </div>
  );
}
