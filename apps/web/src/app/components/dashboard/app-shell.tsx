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
import LogoMark from "@/assets/logo_new.png";
import Image from "next/image";

const TOPBAR_H = 56;
const SIDEBAR_EXPANDED = 288;
const SIDEBAR_COLLAPSED = 80;

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
    <div className="flex min-w-0 items-center gap-3">
      <Image
        src={LogoMark}
        alt="Soaswag logo"
        className={`w-auto ${collapsed ? "h-8" : "h-14"}`}
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
          "whitespace-nowrap text-sm font-medium",
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
            "whitespace-nowrap text-sm font-medium",
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
            <span className="text-sm font-medium">{user.email}</span>
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
            href="/dashboard"
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

  const shellStyle = {
    ["--topbar-h" as string]: `${TOPBAR_H}px`,
    ["--sidebar-w" as string]: `${sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED}px`,
  } as React.CSSProperties;

  return (
    <div
      className="h-[100dvh] overflow-hidden overflow-x-hidden bg-background"
      style={shellStyle}
    >
      <header className="h-[var(--topbar-h)] border-b border-foreground/10 bg-background/80 backdrop-blur">
        <div className="flex h-full items-center justify-between">
          <div className="flex min-w-0 items-center">
            <div
              className="flex h-full items-center border-r border-foreground/10 px-4"
              style={{ width: "var(--sidebar-w)" }}
            >
              <Link href="/dashboard" className="block min-w-0">
                <Brand collapsed={sidebarCollapsed} />
              </Link>
            </div>

            <div className="flex min-w-0 items-center gap-3 px-4">
              <Button
                isIconOnly
                size="sm"
                variant="light"
                className="rounded-2xl"
                onPress={toggleSidebar}
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {sidebarCollapsed ? (
                  <Icons.ChevronsRight className="size-4" />
                ) : (
                  <Icons.ChevronsLeft className="size-4" />
                )}
              </Button>

              <h1 className="whitespace-nowrap text-3xl font-semibold leading-none tracking-tight">
                Dashboard
              </h1>
            </div>
          </div>

          <div className="px-4">
            <ProfileMenu user={user} onLogout={onLogout} />
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100dvh-var(--topbar-h))] min-w-0">
        <aside
          className={[
            "h-full min-w-0 border-r border-foreground/10 bg-background",
            "will-change-[width] transition-[width] duration-300 ease-in-out",
          ].join(" ")}
          style={{ width: "var(--sidebar-w)" }}
        >
          <div className="flex h-full flex-col min-w-0">
            <nav className="cc-scroll min-w-0 flex-1 overflow-y-auto px-3 py-4">
              <div className="flex min-w-0 flex-col gap-2">
                {nav.map((item) => (
                  <NavGroup
                    key={item.key}
                    item={item}
                    collapsed={sidebarCollapsed}
                    onExpandSidebar={() => {
                      if (sidebarCollapsed) toggleSidebar();
                    }}
                  />
                ))}
              </div>
            </nav>
          </div>
        </aside>

        <main className="cc-scroll min-w-0 flex-1 overflow-y-auto">
          <div className="min-w-0 p-5">{children}</div>
        </main>
      </div>
    </div>
  );
}