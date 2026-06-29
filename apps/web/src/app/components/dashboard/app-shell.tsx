"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Avatar,
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownSection,
  DropdownTrigger,
} from "@heroui/react";
import { addToast } from "@heroui/toast";
import { logout, type User } from "@/lib/auth";
import { buildNavForUser, type NavItem } from "@/lib/nav";
import { useUIStore } from "@/lib/ui-store";
import * as Icons from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import React from "react";
import LogoMark from "@/assets/swaggroo-logo.png";
import Image from "next/image";
import { NotificationBell } from "@/app/components/notifications/NotificationBell";

const TOPBAR_H = 72;
const SIDEBAR_EXPANDED = 288;
const SIDEBAR_COLLAPSED = 84;

function Icon({ name, className }: { name?: string; className?: string }) {
  const Cmp = name ? (Icons as any)[name] : null;
  if (!Cmp) return null;
  return <Cmp className={className ?? "size-5"} />;
}

function getInitial(email: string) {
  const c = (email?.trim()?.[0] ?? "U").toUpperCase();
  return /[A-Z0-9]/.test(c) ? c : "U";
}

function normalizePath(path?: string) {
  if (!path) return "";
  const normalized = path.replace(/\/+$/, "");
  return normalized || "/";
}

function isActivePath(pathname: string, href?: string) {
  if (!href) return false;

  const current = normalizePath(pathname);
  const target = normalizePath(href);

  if (target === "/dashboard") {
    return current === "/dashboard";
  }

  return current === target || current.startsWith(`${target}/`);
}

function hasActiveChild(pathname: string, item: NavItem) {
  return Boolean(item.children?.some((child) => isActivePath(pathname, child.href)));
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex min-w-0 items-center">
      <Image
        src={LogoMark}
        alt="Swaggeroo"
        className={`w-auto object-contain ${collapsed ? "h-9" : "h-12"}`}
        draggable={false}
        priority
      />
    </div>
  );
}

function NavLinkRow({
  href,
  icon,
  label,
  collapsed,
  active,
  nested = false,
}: {
  href: string;
  icon?: string;
  label: string;
  collapsed: boolean;
  active: boolean;
  nested?: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={[
        "group relative flex items-center transition-all",
        nested ? "rounded-xl" : "rounded-2xl",
        collapsed ? "justify-center px-2" : "justify-start px-3",
        nested ? "py-2" : "py-2.5",
        active
          ? "bg-foreground/5 text-foreground"
          : "text-foreground/80 hover:bg-foreground/5 hover:text-foreground",
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className={[
          "absolute left-0 top-1/2 -translate-y-1/2 rounded-full transition-colors",
          nested ? "h-6 w-[3px]" : "h-7 w-1",
          active ? "bg-[var(--primary)]" : "bg-transparent",
        ].join(" ")}
      />

      <div
        className={[
          "grid shrink-0 place-items-center transition-colors",
          nested ? "h-9 w-9 rounded-xl" : "h-10 w-10 rounded-2xl",
        ].join(" ")}
      >
        <Icon name={icon} className={nested ? "size-4.5" : "size-5"} />
      </div>

      <span
        className={[
          "whitespace-nowrap text-[15px] font-semibold",
          "transition-[opacity,transform,width,margin] duration-300 ease-in-out",
          collapsed
            ? "ml-0 w-0 -translate-x-1 opacity-0 pointer-events-none"
            : "ml-3 w-auto translate-x-0 opacity-100",
        ].join(" ")}
      >
        {label}
      </span>
    </Link>
  );
}

function NavDropdownRow({
  item,
  collapsed,
  onExpandSidebar,
}: {
  item: NavItem;
  collapsed: boolean;
  onExpandSidebar: () => void;
}) {
  const pathname = usePathname();
  const selfActive = isActivePath(pathname, item.href);
  const childActive = hasActiveChild(pathname, item);
  const active = selfActive || childActive;
  const [open, setOpen] = React.useState(active);

  React.useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  const handleToggle = () => {
    if (collapsed) {
      onExpandSidebar();
      setOpen(true);
      return;
    }
    setOpen((prev) => !prev);
  };

  return (
    <div className="flex flex-col">
      <button
        type="button"
        title={collapsed ? item.label : undefined}
        aria-expanded={!collapsed && open}
        onClick={handleToggle}
        className={[
          "group relative flex w-full items-center rounded-2xl px-3 py-2 text-left transition-all",
          active || open
            ? "bg-foreground/5 text-foreground"
            : "text-foreground/80 hover:bg-foreground/5 hover:text-foreground",
          collapsed ? "justify-center px-2" : "justify-start",
        ].join(" ")}
      >
        <span
          aria-hidden="true"
          className={[
            "absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-full transition-colors",
            active ? "bg-[var(--primary)]" : "bg-transparent",
          ].join(" ")}
        />

        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl">
          <Icon name={item.icon} className="size-5" />
        </div>

        <span
          className={[
            "whitespace-nowrap text-[15px] font-semibold",
            "transition-[opacity,transform,width,margin] duration-300 ease-in-out",
            collapsed
              ? "ml-0 w-0 -translate-x-1 opacity-0 pointer-events-none"
              : "ml-3 w-auto translate-x-0 opacity-100",
          ].join(" ")}
        >
          {item.label}
        </span>

        {!collapsed && (
          <span className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-xl text-foreground/60 cursor-pointer">
            {open ? <Icons.Minus className="size-4" /> : <Icons.Plus className="size-4" />}
          </span>
        )}
      </button>

      <div
        className={[
          "overflow-hidden transition-all duration-300 ease-in-out",
          !collapsed && open ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
        ].join(" ")}
      >
        <div className="border-l border-foreground/50 pl-3">
          <div className="flex flex-col gap-1 py-1">
            {item.children?.map((child) => (
              <NavLinkRow
                key={child.key}
                href={child.href!}
                icon={child.icon ?? item.icon}
                label={child.label}
                collapsed={false}
                active={isActivePath(pathname, child.href)}
                nested
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function NavGroup({
  item,
  collapsed,
  onExpandSidebar,
}: {
  item: NavItem;
  collapsed: boolean;
  onExpandSidebar: () => void;
}) {
  const pathname = usePathname();

  if (item.children?.length) {
    return (
      <NavDropdownRow
        item={item}
        collapsed={collapsed}
        onExpandSidebar={onExpandSidebar}
      />
    );
  }

  return (
    <NavLinkRow
      href={item.href!}
      icon={item.icon}
      label={item.label}
      collapsed={collapsed}
      active={isActivePath(pathname, item.href)}
    />
  );
}

function getDisplayName(user: User) {
  return user.firstName?.trim() || user.email.split("@")[0] || "there";
}

function ProfileMenu({ user, onLogout }: { user: User; onLogout: () => void }) {
  const initial = getInitial(user.email);

  return (
    <Dropdown placement="bottom-end">
      <DropdownTrigger>
        <Button
          variant="light"
          className="h-10 rounded-2xl px-2 data-[hover=true]:bg-foreground/5"
        >
          <Avatar
            name={initial}
            className="h-8 w-8"
            fallback={
              <div className="grid h-8 w-8 place-items-center rounded-full bg-foreground text-background">
                {initial}
              </div>
            }
          />
          <div className="hidden items-center gap-2 sm:flex">
            <span className="text-sm font-medium">Hello, {getDisplayName(user)}</span>
            <Icons.ChevronDown className="size-4 text-foreground/60" />
          </div>
        </Button>
      </DropdownTrigger>

      <DropdownMenu
        aria-label="Profile menu"
        className="w-[320px]"
        itemClasses={{ base: "rounded-2xl" }}
      >
        <DropdownSection showDivider>
          <DropdownItem key="meta" isReadOnly className="cursor-default">
            <div className="flex items-center gap-3 py-1">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-foreground text-background">
                <span className="text-base font-semibold">{initial}</span>
              </div>
              <div className="min-w-0">
                <div className="text-base font-semibold leading-tight">
                  Hi, {user.email.split("@")[0] || "User"}!
                </div>
                <div className="truncate text-xs text-foreground/60">{user.email}</div>
              </div>
            </div>
          </DropdownItem>
        </DropdownSection>

        <DropdownSection>
          <DropdownItem
            key="settings"
            startContent={<Icons.User className="size-4" />}
            as={Link}
            href="/dashboard/account"
          >
            Account Settings
          </DropdownItem>

          <DropdownItem
            key="logout"
            startContent={<Icons.LogOut className="size-4" />}
            className="text-[var(--primary)]"
            onPress={onLogout}
          >
            Log out
          </DropdownItem>
        </DropdownSection>
      </DropdownMenu>
    </Dropdown>
  );
}

const BREADCRUMB_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  catalog: "Catalog",
  products: "Products",
  categories: "Categories",
  collections: "Collections",
  orders: "Orders",
  designs: "Designs",
  recipients: "Recipients",
  inventory: "Inventory",
  shipments: "Shipments",
  shipping: "Shipping Settings",
  stores: "Stores",
  users: "Users",
  employees: "Employees",
  permissions: "Permissions",
  "contact-messages": "Contact Messages",
  partners: "Seller Applications",
  account: "Account Settings",
  new: "New",
  checkout: "Checkout",
};

function prettySegment(seg: string) {
  if (BREADCRUMB_LABELS[seg]) return BREADCRUMB_LABELS[seg];
  if (seg.length > 14 || /\d/.test(seg)) return "Details";
  return seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function Breadcrumb() {
  const pathname = usePathname();
  const parts = normalizePath(pathname).split("/").filter(Boolean);
  if (!parts.length) return null;

  const crumbs = parts.map((seg, i) => ({
    key: parts.slice(0, i + 1).join("/"),
    label: prettySegment(seg),
    href: "/" + parts.slice(0, i + 1).join("/"),
    last: i === parts.length - 1,
  }));

  return (
    <nav aria-label="Breadcrumb" className="mb-5">
      <div className="inline-flex items-center gap-1.5 rounded-full border border-divider bg-default-50 px-3 py-1.5 text-xs font-medium">
        <Link
          href="/dashboard"
          className="flex items-center text-foreground/50 transition-colors hover:text-foreground"
          aria-label="Dashboard home"
        >
          <Icons.Home className="size-3.5" />
        </Link>
        {crumbs.map((c) => (
          <span key={c.key} className="flex items-center gap-1.5">
            <Icons.ChevronRight className="size-3.5 text-foreground/25" />
            {c.last ? (
              <span className="font-semibold text-foreground">{c.label}</span>
            ) : (
              <Link href={c.href} className="text-foreground/55 transition-colors hover:text-foreground">
                {c.label}
              </Link>
            )}
          </span>
        ))}
      </div>
    </nav>
  );
}

export function AppShell({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const nav = buildNavForUser(user);
  const queryClient = useQueryClient();

  const onLogout = async () => {
    try {
      await logout();
      queryClient.removeQueries({ queryKey: ["me"] });
      addToast({ title: "Logged out", color: "success" });
      router.push("/login");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "";
      addToast({
        title: "Logout failed",
        description: message,
        color: "danger",
      });
    }
  };

  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Close the mobile drawer whenever the route changes.
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const shellStyle = {
    ["--topbar-h" as string]: `${TOPBAR_H}px`,
    ["--sidebar-w" as string]: `${sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED}px`,
  } as React.CSSProperties;

  const sidebarNav = (
    <nav className="cc-scroll min-w-0 flex-1 overflow-y-auto px-3 py-4">
      <div className="flex min-w-0 flex-col gap-2">
        {nav.map((item) => (
          <NavGroup
            key={item.key}
            item={item}
            collapsed={sidebarCollapsed && !mobileOpen}
            onExpandSidebar={() => {
              if (sidebarCollapsed) toggleSidebar();
            }}
          />
        ))}
      </div>
    </nav>
  );

  return (
    <div
      className="h-[100dvh] overflow-hidden overflow-x-hidden bg-background"
      style={shellStyle}
    >
      {/* Near-full-width frame with ~50px gutters on laptops, tighter on mobile */}
      <div className="mx-3 flex h-full flex-col overflow-hidden bg-background sm:mx-6 lg:mx-[50px]">
        <header className="h-[var(--topbar-h)] shrink-0 border-b border-foreground/10 bg-background">
          <div className="flex h-full items-center">
            <Link
              href="/dashboard"
              className={[
                "flex h-full w-auto shrink-0 items-center border-r border-foreground/10 px-4",
                sidebarCollapsed ? "lg:w-[var(--sidebar-w)] lg:justify-center lg:px-2" : "lg:w-[var(--sidebar-w)] lg:justify-start lg:px-5",
              ].join(" ")}
            >
              <Brand collapsed={sidebarCollapsed} />
            </Link>

            <div className="flex flex-1 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
              {/* Mobile: open drawer */}
              <Button
                isIconOnly
                size="sm"
                variant="light"
                className="rounded-xl text-foreground/70 data-[hover=true]:bg-foreground/5 lg:hidden"
                onPress={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Icons.Menu className="size-5" />
              </Button>

              {/* Desktop: collapse toggle */}
              <Button
                isIconOnly
                size="sm"
                variant="light"
                className="hidden rounded-xl text-foreground/70 data-[hover=true]:bg-foreground/5 lg:flex"
                onPress={toggleSidebar}
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {sidebarCollapsed ? (
                  <Icons.PanelLeftOpen className="size-5" />
                ) : (
                  <Icons.PanelLeftClose className="size-5" />
                )}
              </Button>

              <div className="flex items-center gap-1">
                <NotificationBell />
                <ProfileMenu user={user} onLogout={onLogout} />
              </div>
            </div>
          </div>
        </header>

        <div className="relative flex min-h-0 flex-1 min-w-0">
          {/* Mobile backdrop */}
          {mobileOpen && (
            <button
              type="button"
              aria-label="Close menu"
              className="fixed inset-x-0 bottom-0 top-[var(--topbar-h)] z-40 bg-black/40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
          )}

          <aside
            className={[
              "z-50 border-r border-foreground/10 bg-background",
              // Mobile: slide-over drawer under the header
              "fixed bottom-0 left-0 top-[var(--topbar-h)] w-72 transition-transform duration-300 ease-in-out",
              mobileOpen ? "translate-x-0" : "-translate-x-full",
              // Desktop: in-flow column that animates its width
              "lg:static lg:top-auto lg:h-full lg:w-[var(--sidebar-w)] lg:translate-x-0 lg:transition-[width]",
            ].join(" ")}
          >
            <div className="flex h-full flex-col min-w-0">{sidebarNav}</div>
          </aside>

          <main className="cc-scroll min-w-0 flex-1 overflow-y-auto bg-background">
            <div className="min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
              <Breadcrumb />
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}