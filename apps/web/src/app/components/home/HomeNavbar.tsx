"use client";

import React from "react";
import {
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
  Button,
  Navbar,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";
import { ChevronDown } from "lucide-react";
import LogoMark from "@/assets/logo_new.png";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import PrimaryButton from "../PrimaryButton";
import { useMe } from "@/queries/auth";
import { logout as logoutRequest } from "@/modules/auth/api";
import { useCatalogCartStore } from "@/lib/cart-store";

type NavItem = {
  label: string;
  href: string;
};

// Real, live pages.
const NAV_ITEMS: NavItem[] = [
  { label: "Shop", href: "/shop" },
  { label: "How it works", href: "/how-it-works" },
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
];

// Pages still in progress — grouped under a single "More" dropdown.
const COMING_SOON: NavItem[] = [
  { label: "Platform", href: "/platform" },
  { label: "Resources", href: "/resources" },
  { label: "Pricing", href: "/pricing" },
  { label: "Company", href: "/company" },
];

export default function HomeNavbar() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useMe();

  const bulkItems = useCatalogCartStore((state) => state.bulkItems);
  const swagPackItems = useCatalogCartStore((state) => state.swagPackItems);
  const cartCount = bulkItems.length + (swagPackItems.length > 0 ? 1 : 0);

  const navLinkClass =
    "text2 font-medium text-black/80 transition-colors hover:text-[var(--primary)]";

  const handleLogout = async () => {
    try {
      await logoutRequest();
    } catch {
      // ignore network errors; clear local state regardless
    }
    await queryClient.invalidateQueries({ queryKey: ["me"] });
    setIsMenuOpen(false);
    router.push("/");
    router.refresh();
  };

  const CartLink = ({ onClick }: { onClick?: () => void }) => (
    <Link href="/cart" onClick={onClick} className={navLinkClass}>
      Cart{cartCount > 0 ? ` (${cartCount})` : ""}
    </Link>
  );

  return (
    <div className="padding-section-xs px-4 md:px-10">
      <Navbar
        isMenuOpen={isMenuOpen}
        onMenuOpenChange={setIsMenuOpen}
        maxWidth="full"
        isBordered={false}
        classNames={{
          wrapper: "h-20 px-0",
        }}
      >
        <NavbarContent className="lg:hidden" justify="start">
          <NavbarMenuToggle
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            className="text-black"
          />
        </NavbarContent>

        <NavbarBrand>
          <Link
            href="/"
            className="flex items-center gap-3 text-black no-underline"
            aria-label="Soaswag Home"
          >
            <div className="flex flex-col items-center leading-none ml-11 md:ml-50 lg:ml-0">
              <Image
                src={LogoMark}
                alt="Soaswag logo"
                className="h-14 w-auto sm:h-20"
                draggable={false}
                priority
              />
            </div>
          </Link>
        </NavbarBrand>

        {/* ✅ Desktop nav only on lg+ */}
        <NavbarContent className="hidden lg:flex" justify="center">
          <div className="flex items-center gap-8 lg:gap-10">
            {NAV_ITEMS.map((item) => (
              <NavbarItem key={item.label}>
                <Link href={item.href} className={navLinkClass}>
                  {item.label}
                </Link>
              </NavbarItem>
            ))}

            {/* Coming-soon pages grouped under one dropdown */}
            <NavbarItem>
              <Dropdown placement="bottom-start">
                <DropdownTrigger>
                  <button
                    type="button"
                    className={`${navLinkClass} inline-flex items-center gap-1`}
                  >
                    More <ChevronDown className="size-4" />
                  </button>
                </DropdownTrigger>
                <DropdownMenu aria-label="More pages">
                  {COMING_SOON.map((item) => (
                    <DropdownItem
                      key={item.href}
                      as={Link}
                      href={item.href}
                      endContent={
                        <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-black/40">
                          Soon
                        </span>
                      }
                    >
                      {item.label}
                    </DropdownItem>
                  ))}
                </DropdownMenu>
              </Dropdown>
            </NavbarItem>
          </div>
        </NavbarContent>

        {/* ✅ Right actions only on lg+ */}
        <NavbarContent className="hidden lg:flex" justify="end">
          <NavbarItem>
            <CartLink />
          </NavbarItem>

          {isLoading ? null : user ? (
            <>
              <NavbarItem>
                <Link href="/dashboard" className={navLinkClass}>
                  Dashboard
                </Link>
              </NavbarItem>
              <NavbarItem>
                <Button
                  variant="flat"
                  radius="full"
                  className="h-10 bg-black/5 px-5 font-semibold text-black/70 hover:bg-black/10"
                  onPress={handleLogout}
                >
                  Log out
                </Button>
              </NavbarItem>
            </>
          ) : (
            <>
              <NavbarItem>
                <Link
                  href="/login"
                  className="text2 font-medium text-black/70 transition-colors hover:text-(--primary)"
                >
                  Sign In
                </Link>
              </NavbarItem>
              <NavbarItem>
                <PrimaryButton href="/signup" className="h-10 px-5" text="Get Started" />
              </NavbarItem>
            </>
          )}
        </NavbarContent>

        <NavbarMenu className="bg-white">
          <div className="mx-auto w-full max-w-xl px-2 pb-6 pt-2">
            <div className="space-y-2">
              {NAV_ITEMS.map((item) => (
                <NavbarMenuItem key={item.label}>
                  <Link
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className="block rounded-xl px-3 py-3 text-base font-semibold text-black/80 transition-colors hover:bg-black/5 hover:text-[var(--primary)]"
                  >
                    {item.label}
                  </Link>
                </NavbarMenuItem>
              ))}
              <NavbarMenuItem>
                <Link
                  href="/cart"
                  onClick={() => setIsMenuOpen(false)}
                  className="block rounded-xl px-3 py-3 text-base font-semibold text-black/80 transition-colors hover:bg-black/5 hover:text-[var(--primary)]"
                >
                  Cart{cartCount > 0 ? ` (${cartCount})` : ""}
                </Link>
              </NavbarMenuItem>

              <p className="px-3 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-black/35">
                Coming soon
              </p>
              {COMING_SOON.map((item) => (
                <NavbarMenuItem key={item.label}>
                  <Link
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center justify-between rounded-xl px-3 py-3 text-base font-semibold text-black/60 transition-colors hover:bg-black/5 hover:text-[var(--primary)]"
                  >
                    {item.label}
                    <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-black/40">
                      Soon
                    </span>
                  </Link>
                </NavbarMenuItem>
              ))}
            </div>

            <div className="mt-6 grid gap-3">
              {isLoading ? null : user ? (
                <>
                  <Button
                    as={Link}
                    href="/dashboard"
                    variant="flat"
                    radius="full"
                    className="h-12 w-full bg-black/5 font-semibold text-black/70 hover:bg-black/10"
                    onPress={() => setIsMenuOpen(false)}
                  >
                    Dashboard
                  </Button>
                  <Button
                    variant="flat"
                    radius="full"
                    className="h-12 w-full bg-black/5 font-semibold text-black/70 hover:bg-black/10"
                    onPress={handleLogout}
                  >
                    Log out
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    as={Link}
                    href="/login"
                    variant="flat"
                    radius="full"
                    className="h-12 w-full bg-black/5 font-semibold text-black/70 hover:bg-black/10"
                    onPress={() => setIsMenuOpen(false)}
                  >
                    Sign In
                  </Button>

                  <div onClick={() => setIsMenuOpen(false)}>
                    <PrimaryButton href="/signup" className="h-12 w-full" text="Get Started" />
                  </div>
                </>
              )}
            </div>
          </div>
        </NavbarMenu>
      </Navbar>
    </div>
  );
}
