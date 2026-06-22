"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Spinner } from "@heroui/react";
import { ArrowRight, Sparkles } from "lucide-react";
import { usePublicProduct } from "@/lib/queries.catalog";
import { MockupBuilder } from "@/app/components/catalog/MockupBuilder";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function MockupContent() {
  const params = useSearchParams();
  const slug = params.get("product") ?? "";
  const { data, isLoading, isError } = usePublicProduct(slug, !!slug);
  const product = data?.product;

  if (!slug) {
    return (
      <div className="swag-redesign mx-auto max-w-site px-6 py-20 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-primary">
          <Sparkles className="size-3.5" /> Mockup Studio
        </span>
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Pick a product to preview your logo
        </h1>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          Choose any product from the shop, then hit “Preview your logo” to place your artwork.
        </p>
        <Link href="/shop" className={cn(buttonVariants({ size: "lg" }), "mt-7 h-12 gap-2 px-6 text-base shadow-brand")}>
          Browse the shop <ArrowRight className="size-4" />
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner label="Loading product…" />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="swag-redesign mx-auto max-w-site px-6 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Product not found</h1>
        <Link href="/shop" className={cn(buttonVariants({ variant: "outline" }), "mt-6 gap-2")}>
          Back to shop <ArrowRight className="size-4" />
        </Link>
      </div>
    );
  }

  return <MockupBuilder product={product} />;
}

export default function MockupPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <MockupContent />
    </Suspense>
  );
}
