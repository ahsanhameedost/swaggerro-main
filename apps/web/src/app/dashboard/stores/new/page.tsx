"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addToast } from "@heroui/toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useCreateStore } from "@/queries/stores";

const inputClass =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring";

export default function NewStorePage() {
  const router = useRouter();
  const createMutation = useCreateStore();
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [slug, setSlug] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      addToast({ title: "Store name is required", color: "warning" });
      return;
    }
    try {
      const { store } = await createMutation.mutateAsync({
        name: name.trim(),
        companyName: companyName.trim() || null,
        slug: slug.trim() || undefined,
        status: "DRAFT",
      });
      addToast({ title: "Store created", description: "Now add branding and products.", color: "success" });
      router.push(`/dashboard/stores/${store.id}`);
    } catch (error: any) {
      addToast({ title: "Create failed", description: error?.message ?? "", color: "danger" });
    }
  };

  return (
    <div className="swag-redesign mx-auto max-w-xl p-6">
      <Link
        href="/dashboard/stores"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to stores
      </Link>
      <h1 className="mt-2 font-display text-2xl font-bold tracking-tight">New store</h1>
      <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <label className="block">
          <span className="text-sm font-medium text-foreground">Store name</span>
          <input className={`${inputClass} mt-1.5`} value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Swag Store" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-foreground">Company name</span>
          <input className={`${inputClass} mt-1.5`} value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Corp" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-foreground">Slug (optional)</span>
          <input className={`${inputClass} mt-1.5`} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="acme" />
          <span className="mt-1 block text-xs text-muted-foreground">Auto-generated from the name if left blank.</span>
        </label>
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-brand transition hover:bg-primary/90 disabled:opacity-60"
        >
          {createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Create store
        </button>
      </form>
    </div>
  );
}
