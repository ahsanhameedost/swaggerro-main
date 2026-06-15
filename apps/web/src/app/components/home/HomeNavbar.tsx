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
import PrimaryButton from "../PrimaryButton";

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

  const navLinkClass =
    "text2 font-medium text-black/80 transition-colors hover:text-[var(--primary)]";

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

              {/* <span className="font-gemunu-libre mt-2 text-[18px] font-extrabold tracking-[0.08em]">
                <span className="text-(--primary)">SOAS</span>
                <span className="text-black">WAG</span>
              </span> */}
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
            <Link
              href="/login"
              className="text2 font-medium text-black/70 transition-colors hover:text-(--primary)"
            >
              Sign In
            </Link>
          </NavbarItem>

          <NavbarItem>
            <PrimaryButton className="h-10 px-5" text="Get Started" />
          </NavbarItem>
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
            </div>

            <div className="mt-6 grid gap-3">
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
                <PrimaryButton className="h-12 w-full" text="Get Started" />
              </div>
            </div>
          </div>
        </NavbarMenu>
      </Navbar>
    </div>
  );
}