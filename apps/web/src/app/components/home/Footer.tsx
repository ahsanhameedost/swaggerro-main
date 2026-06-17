"use client";

import Link from "next/link";
import { useState } from "react";
import { Facebook, Twitter, Mail, Youtube, Send } from "lucide-react";
import { addToast } from "@heroui/toast";
import { cx } from "@/lib/helpers";
import Image from "next/image";
import LogoWhite from "@/assets/logo_white.png";

type FooterLink = { label: string; href: string };

const COLS: Array<{ title: string; links: FooterLink[] }> = [
  {
    title: "Order",
    links: [
      { label: "Shop", href: "/shop" },
      { label: "Build a Pack", href: "/swag-pack" },
      { label: "Bulk Orders", href: "/shop" },
    ],
  },
  {
    title: "Explore",
    links: [
      { label: "Platform", href: "/platform" },
      { label: "Resources", href: "/resources" },
      { label: "Pricing", href: "/pricing" },
      { label: "Support", href: "/contact" },
    ],
  },
  {
    title: "Connect",
    links: [
      { label: "Contact Us", href: "/contact" },
      { label: "Book a Demo", href: "/contact" },
      { label: "Vendors & Suppliers", href: "/contact" },
      { label: "Company", href: "/company" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/company" },
      { label: "Terms of Service", href: "/company" },
      { label: "Careers", href: "/company" },
    ],
  },
];

function SocialIcon({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cx(
        "inline-flex h-11 w-11 items-center justify-center rounded-full",
        "bg-white text-black",
        "transition-transform hover:-translate-y-0.5 hover:opacity-95 active:translate-y-0"
      )}
    >
      {children}
    </Link>
  );
}

function FooterCol({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div className="min-w-[180px]">
      <h5 className="text-white">{title}</h5>
      <div className="mt-6 space-y-3 text2 text-white/60">
        {links.map((l, idx) => (
          <Link
            key={`${l.label}-${idx}`}
            href={l.href}
            className="block hover:text-white/80"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function LocationBlock({
  title,
  addressLines,
  phone,
  email,
}: {
  title: string;
  addressLines: string[];
  phone: string;
  email: string;
}) {
  return (
    <div className="min-w-[240px]">
      <h5 className="text-white">{title}</h5>

      <div className="mt-6 space-y-8 text2 text-white/60">
        <div className="space-y-1">
          {addressLines.map((line, idx) => (
            <div
              key={`${title}-addr-${idx}`}
              className={cx(
                idx < 2 && "underline decoration-white/20 underline-offset-4"
              )}
            >
              {line}
            </div>
          ))}
        </div>

        <div className="space-y-1">
          <div>
            <a
              href={`tel:${phone.replace(/[^0-9+]/g, "")}`}
              className="hover:text-white/80 underline decoration-white/20 underline-offset-4"
            >
              {phone}
            </a>
          </div>
          <div>
            <a
              href={`mailto:${email}`}
              className="hover:text-white/80 underline decoration-white/20 underline-offset-4"
            >
              {email}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function SubscribeBlock() {
  const [email, setEmail] = useState("");

  const handleSubscribe = () => {
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      addToast({
        title: "Enter a valid email",
        description: "Please provide a valid email address to subscribe.",
        color: "warning",
      });
      return;
    }
    addToast({
      title: "Subscribed",
      description: "Thanks! We'll keep you posted.",
      color: "success",
    });
    setEmail("");
  };

  return (
    <div className={cx("w-full min-w-0", "sm:min-w-[180px] sm:max-w-[420px]")}>
      <h5 className="text-white">Subscribe</h5>

      <p className="mt-6 text2 text-white/60">
        Feel free to reach out if you want to collab with us, or simply chat.
      </p>

      <div className="mt-8">
        <div
          className={cx(
            "flex h-14 w-full items-center gap-3 rounded-2xl bg-white/12",
            "px-4 sm:px-5"
          )}
        >
          <input
            className={cx(
              "h-full w-full min-w-0 bg-transparent text3 text-white outline-none",
              "placeholder:text-white/60"
            )}
            placeholder="Enter your email"
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubscribe();
            }}
          />
          <button
            type="button"
            aria-label="Submit email"
            onClick={handleSubscribe}
            className="inline-flex h-10 w-11 shrink-0 items-center justify-center rounded-full hover:bg-white/10"
          >
            <Send className="h-5 w-5" style={{ color: "var(--primary)" }} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="bg-black text-white">
      <div className="container">
        <div className="grid gap-10 py-20 lg:grid-cols-[420px_1fr]">
          <div className="pt-4">
            <Image
              src={LogoWhite}
              alt="Swaggeroo logo"
              className="h-28 w-auto sm:h-32"
              draggable={false}
              priority
            />

            <h5 className="mt-10 max-w-[320px] text-white">
              Creating, Managing Swag. Distributing Everywhere.
            </h5>

            <div className="mt-12 flex items-center gap-4">
              <SocialIcon href="#" label="Facebook">
                <Facebook className="h-5 w-5" />
              </SocialIcon>
              <SocialIcon href="#" label="Twitter">
                <Twitter className="h-5 w-5" />
              </SocialIcon>
              <SocialIcon href="mailto:sales@swaggeroo.com" label="Email">
                <Mail className="h-5 w-5" />
              </SocialIcon>
              <SocialIcon href="#" label="YouTube">
                <Youtube className="h-5 w-5" />
              </SocialIcon>
            </div>
          </div>

          <div className="border-t border-white/10 pt-10 lg:border-l lg:border-t-0 lg:pl-16 lg:pt-4">
            <div className="grid gap-12 sm:grid-cols-2 xl:grid-cols-4">
              {COLS.map((c) => (
                <FooterCol key={c.title} title={c.title} links={c.links} />
              ))}
            </div>

            <div className="mt-16 grid gap-12 xl:grid-cols-[240px_240px_1fr]">
              <LocationBlock
                title="Address"
                addressLines={["100 E Pine St #110, Orlando, FL 32801"]}
                phone="321-352-4125"
                email="sales@swaggeroo.com"
              />
              <SubscribeBlock />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container py-10 text-center text2 text-white/60 font-medium sm:px-6 lg:px-8">
          © 2026 All rights reserved{" "}
          <span className="font-semibold text-white">Swaggeroo</span>
        </div>
      </div>
    </footer>
  );
}