"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Spinner } from "@heroui/react";
import { addToast } from "@heroui/toast";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useMe } from "@/queries/auth";
import { useStore, useUpdateStore, useDeleteStore } from "@/queries/stores";
import type { UpdateStoreInput } from "@/modules/stores/types";
import { StoreEditor } from "@/app/components/stores/StoreEditor";

export default function AdminStoreEditorPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const router = useRouter();
  const { data: me } = useMe();
  const canWrite = !!me?.permissions?.includes("partners.stores.write");

  const { data, isLoading, isError, error } = useStore(id ?? null);
  const updateMutation = useUpdateStore();
  const deleteMutation = useDeleteStore();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const store = data?.store;

  const handleSave = async (input: UpdateStoreInput) => {
    if (!id) return;
    try {
      await updateMutation.mutateAsync({ id, input });
      addToast({ title: "Store saved", color: "success" });
    } catch (saveError: any) {
      addToast({ title: "Save failed", description: saveError?.message ?? "", color: "danger" });
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteMutation.mutateAsync(id);
      addToast({ title: "Store deleted", color: "success" });
      router.push("/dashboard/stores");
    } catch (deleteError: any) {
      addToast({ title: "Delete failed", description: deleteError?.message ?? "", color: "danger" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner label="Loading store…" />
      </div>
    );
  }

  if (isError || !store) {
    return (
      <div className="p-6">
        <Link href="/dashboard/stores" className="inline-flex items-center gap-1.5 text-sm text-primary">
          <ArrowLeft className="size-4" /> Back to stores
        </Link>
        <p className="mt-4 text-sm text-danger">
          {error instanceof Error ? error.message : "Store not found."}
        </p>
      </div>
    );
  }

  return (
    <div className="swag-redesign flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/stores"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Back to stores
          </Link>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight">{store.name}</h1>
        </div>
        {canWrite ? (
          confirmDelete ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Delete this store?</span>
              <button
                onClick={handleDelete}
                className="rounded-lg bg-destructive px-3 py-1.5 font-semibold text-white"
              >
                Confirm
              </button>
              <button onClick={() => setConfirmDelete(false)} className="rounded-lg border border-border px-3 py-1.5">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-4" /> Delete
            </button>
          )
        ) : null}
      </div>

      <StoreEditor store={store} mode="admin" saving={updateMutation.isPending} onSave={handleSave} />
    </div>
  );
}
