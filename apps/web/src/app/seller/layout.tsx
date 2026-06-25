"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Store } from "lucide-react";
import { logout as logoutRequest } from "@/modules/auth/api";
import { useMe } from "@/queries/auth";

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useMe();

  const handleLogout = async () => {
    try {
      await logoutRequest();
    } catch {
      // ignore
    }
    await queryClient.invalidateQueries({ queryKey: ["me"] });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="swag-redesign min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-site items-center justify-between gap-4 px-6">
          <Link href="/seller" className="flex items-center gap-2 font-display text-lg font-bold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand-soft text-primary">
              <Store className="size-4" />
            </span>
            Seller Studio
          </Link>
          <div className="flex items-center gap-3">
            {me?.email ? <span className="hidden text-sm text-muted-foreground sm:inline">{me.email}</span> : null}
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition hover:bg-muted"
            >
              <LogOut className="size-4" /> Log out
            </button>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
