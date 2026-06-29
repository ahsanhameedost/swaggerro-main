"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink, LayoutGrid, LogOut, Settings, Store, Wallet } from "lucide-react";
import { logout as logoutRequest } from "@/modules/auth/api";
import { useMe } from "@/queries/auth";
import { useMyStore } from "@/queries/stores";
import { NotificationBell } from "@/app/components/notifications/NotificationBell";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/seller", label: "Storefront", icon: LayoutGrid, exact: true },
  { href: "/seller/payouts", label: "Payouts", icon: Wallet, exact: false },
  { href: "/seller/settings", label: "Account settings", icon: Settings, exact: false },
];

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const { data: storeData } = useMyStore();
  const store = storeData?.store;

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
    <div className="swag-redesign min-h-screen bg-muted/30">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
          <div className="flex h-16 items-center gap-2 border-b border-border px-5 font-display text-lg font-bold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand-soft text-primary">
              <Store className="size-4" />
            </span>
            Seller Studio
          </div>

          <nav className="flex-1 space-y-1 p-3">
            {NAV.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                    active
                      ? "bg-brand-soft text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}

            {store ? (
              <a
                href={`/store/${store.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <ExternalLink className="size-4" />
                View storefront
              </a>
            ) : null}
          </nav>

          <div className="border-t border-border p-3">
            <div className="px-2 pb-2">
              <p className="truncate text-sm font-medium text-foreground">
                {me?.firstName || me?.email?.split("@")[0] || "Seller"}
              </p>
              {me?.email ? <p className="truncate text-xs text-muted-foreground">{me.email}</p> : null}
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-destructive"
            >
              <LogOut className="size-4" /> Log out
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile top bar */}
          <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card px-4 md:hidden">
            <Link href="/seller" className="flex items-center gap-2 font-display font-bold">
              <Store className="size-4 text-primary" /> Seller Studio
            </Link>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <Link href="/seller/settings" className="rounded-lg p-2 text-muted-foreground hover:bg-muted">
                <Settings className="size-4" />
              </Link>
              <button onClick={handleLogout} className="rounded-lg p-2 text-muted-foreground hover:bg-muted">
                <LogOut className="size-4" />
              </button>
            </div>
          </header>
          {/* Desktop top bar */}
          <header className="hidden h-14 items-center justify-end border-b border-border bg-card px-6 md:flex">
            <NotificationBell />
          </header>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
