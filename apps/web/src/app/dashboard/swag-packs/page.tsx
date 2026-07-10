"use client";

import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, CardBody, Spinner } from "@heroui/react";
import { addToast } from "@heroui/toast";
import { Gift, RotateCcw, Trash2 } from "lucide-react";
import { getSavedSwagPacks, deleteSavedSwagPack } from "@/modules/swag-packs/api";
import { useCatalogCartStore } from "@/lib/cart-store";

export default function SavedSwagPacksPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const loadSwagPack = useCatalogCartStore((s) => s.loadSwagPack);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["saved-swag-packs"],
    queryFn: getSavedSwagPacks
  });

  const packs = data?.packs ?? [];

  const reorder = (snapshot: Parameters<typeof loadSwagPack>[0]) => {
    loadSwagPack(snapshot);
    addToast({ title: "Pack loaded into your cart", color: "success" });
    router.push("/cart");
  };

  const remove = async (id: string) => {
    try {
      await deleteSavedSwagPack(id);
      await qc.invalidateQueries({ queryKey: ["saved-swag-packs"] });
    } catch (e: any) {
      addToast({ title: "Delete failed", description: e?.message ?? "Try again.", color: "danger" });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-jakarta text-2xl font-bold tracking-tight">My Swag Packs</h1>
        <p className="text-sm text-foreground/60">
          Reorder a saved pack anytime — no need to rebuild it from scratch.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner label="Loading your packs…" />
        </div>
      ) : isError ? (
        <Card className="border border-divider">
          <CardBody className="text-sm text-danger">Unable to load your saved packs.</CardBody>
        </Card>
      ) : packs.length === 0 ? (
        <Card className="border border-divider shadow-sm">
          <CardBody className="flex flex-col items-center gap-3 py-16 text-center text-foreground/60">
            <Gift className="size-8 opacity-50" />
            <div>You haven&apos;t saved any Swag Packs yet.</div>
            <Button
              color="primary"
              onPress={() => router.push("/studio")}
              style={{ backgroundImage: "var(--primary-gradient)" }}
              className="text-white"
            >
              Build a pack
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4">
          {packs.map((pack) => {
            const itemCount = pack.snapshot?.swagPackItems?.length ?? 0;
            return (
              <Card key={pack.id} className="border border-divider shadow-sm">
                <CardBody className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-semibold">{pack.name}</div>
                    <div className="text-sm text-foreground/60">
                      {itemCount} product{itemCount === 1 ? "" : "s"} ·{" "}
                      {pack.snapshot?.swagPackQuantity ?? 0} packs · saved{" "}
                      {new Date(pack.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      color="primary"
                      startContent={<RotateCcw className="size-4" />}
                      onPress={() => reorder(pack.snapshot)}
                      style={{ backgroundImage: "var(--primary-gradient)" }}
                      className="text-white"
                    >
                      Reorder
                    </Button>
                    <Button
                      variant="bordered"
                      color="danger"
                      isIconOnly
                      aria-label="Delete pack"
                      onPress={() => remove(pack.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
