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
} from "@heroui/react";
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

const NAV_ITEMS: NavItem[] = [
  { label: "Shop", href: "/shop" },
  { label: "Platform", href: "/platform" },
  { label: "Resources", href: "/resources" },
  { label: "Pricing", href: "/pricing" },
  { label: "Company", href: "/company" },
  { label: "Contact", href: "/contact" },
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
