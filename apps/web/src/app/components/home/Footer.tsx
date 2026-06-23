"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Facebook, Twitter, Mail, Youtube, Send, MapPin, Phone } from "lucide-react";
import { addToast } from "@heroui/toast";
import { cx } from "@/lib/helpers";
import LogoMark from "@/assets/logo_new.png";

type FooterLink = { label: string; href: string };

const COLS: Array<{ title: string; links: FooterLink[] }> = [
  {
    title: "Order",
    links: [
      { label: "Shop", href: "/shop" },
      { label: "Pack Studio", href: "/studio" },
      { label: "Mockup Studio", href: "/mockup" },
      { label: "Build a Pack", href: "/swag-pack" },
    ],
  },
  {
    title: "Explore",
    links: [
      { label: "How it works", href: "/how-it-works" },
      { label: "About", href: "/about" },
      { label: "FAQ", href: "/faq" },
      { label: "Support", href: "/contact" },
    ],
  },
  {
    title: "Connect",
    links: [
      { label: "Contact Us", href: "/contact" },
      { label: "Book a Demo", href: "/contact" },
      { label: "Vendors & Suppliers", href: "/contact" },
      { label: "Shipping & Returns", href: "/shipping-returns" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Shipping & Returns", href: "/shipping-returns" },
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
        "inline-flex h-10 w-10 items-center justify-center rounded-full",
        "border border-border bg-card text-foreground/70",
        "transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary"
      )}
    >
      {children}
    </Link>
  );
}

function FooterCol({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((l, idx) => (
          <li key={`${l.label}-${idx}`}>
            <Link
              href={l.href}
              className="text-sm text-foreground/80 transition-colors hover:text-primary"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
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
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Subscribe
      </h3>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        News, drops, and the occasional swag tip — no spam.
      </p>
      <div className="mt-4 flex h-12 items-center gap-2 rounded-2xl border border-border bg-card px-3">
        <input
          className="h-full w-full min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
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
          className="inline-flex h-9 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="swag-redesign border-t border-border/60 bg-muted/40">
      <div className="mx-auto max-w-site px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2.6fr]">
          {/* Brand */}
          <div className="max-w-sm">
            <Image
              src={LogoMark}
              alt="Swaggeroo logo"
              className="h-16 w-auto"
              draggable={false}
            />
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              Creating, managing, and distributing swag your crew actually wants — designed,
              branded, and shipped anywhere from one simple platform.
            </p>

            <div className="mt-6 space-y-2.5 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <MapPin className="size-4 text-primary" /> 100 E Pine St #110, Orlando, FL 32801
              </p>
              <p className="flex items-center gap-2">
                <Phone className="size-4 text-primary" />
                <a href="tel:8886307924" className="hover:text-primary">888-630-7924</a>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="size-4 text-primary" />
                <a href="mailto:sales@swaggeroo.com" className="hover:text-primary">
                  sales@swaggeroo.com
                </a>
              </p>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <SocialIcon href="#" label="Facebook">
                <Facebook className="h-4 w-4" />
              </SocialIcon>
              <SocialIcon href="#" label="Twitter">
                <Twitter className="h-4 w-4" />
              </SocialIcon>
              <SocialIcon href="mailto:sales@swaggeroo.com" label="Email">
                <Mail className="h-4 w-4" />
              </SocialIcon>
              <SocialIcon href="#" label="YouTube">
                <Youtube className="h-4 w-4" />
              </SocialIcon>
            </div>
          </div>

          {/* Links + subscribe */}
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {COLS.map((c) => (
              <FooterCol key={c.title} title={c.title} links={c.links} />
            ))}
            <div className="sm:col-span-2 lg:col-span-1">
              <SubscribeBlock />
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 text-sm text-muted-foreground sm:flex-row">
          <p>
            © 2026 <span className="font-semibold text-foreground">Swaggeroo</span>. All rights
            reserved.
          </p>
          <p className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-success" />
            Carbon-aware shipping on every order
          </p>
        </div>
      </div>
    </footer>
  );
}
