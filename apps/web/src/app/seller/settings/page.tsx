"use client";

import { useMe } from "@/queries/auth";
import { useMyStore } from "@/queries/stores";
import { ChangePasswordCard } from "@/app/components/account/ChangePasswordCard";

export default function SellerSettingsPage() {
  const { data: me } = useMe();
  const { data: storeData } = useMyStore();
  const store = storeData?.store;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 lg:py-10">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">Account settings</h1>
        <p className="mt-1 text-muted-foreground">Manage your sign-in details and store account.</p>
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold">Account</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Detail label="Name" value={[me?.firstName, me?.lastName].filter(Boolean).join(" ") || "—"} />
            <Detail label="Email" value={me?.email ?? "—"} />
            <Detail label="Role" value={me?.role ?? "—"} />
            <Detail label="Store" value={store?.name ?? "—"} />
            {store ? <Detail label="Store URL" value={`/store/${store.slug}`} /> : null}
          </dl>
        </div>

        <ChangePasswordCard />
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}
