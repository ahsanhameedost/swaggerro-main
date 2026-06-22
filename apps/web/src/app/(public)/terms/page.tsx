import type { Metadata } from "next";
import { LegalDoc, type LegalSection } from "@/components/marketing/legal-doc";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of Swaggeroo and your orders.",
};

const SECTIONS: LegalSection[] = [
  {
    heading: "Agreement to terms",
    body: [
      "These Terms of Service (“Terms”) govern your access to and use of Swaggeroo’s website, products, and services. By creating an account or placing an order, you agree to these Terms. If you are using Swaggeroo on behalf of an organization, you represent that you have authority to bind that organization.",
    ],
  },
  {
    heading: "Accounts",
    body: [
      "You must provide accurate information and keep your account credentials secure. You are responsible for all activity under your account. Notify us promptly of any unauthorized use. You must be at least 18 years old, or the age of majority in your jurisdiction, to place an order.",
    ],
  },
  {
    heading: "Custom orders, proofs, and production",
    body: [
      "Most Swaggeroo products are custom-decorated to your specifications. Before production, we provide a digital proof for your approval.",
      [
        "You are responsible for reviewing each proof carefully — including spelling, colors, sizing, placement, and quantities.",
        "Production begins only after you approve the proof. Once approved, an order generally cannot be changed or cancelled.",
        "Screen, monitor, and material differences mean printed colors may vary slightly from what you see on-screen.",
      ],
    ],
  },
  {
    heading: "Pricing, payment, and taxes",
    body: [
      "Prices are shown in the currency listed at checkout and may include setup fees and volume pricing based on quantity. We may correct pricing errors even after an order is submitted. You authorize us to charge your payment method for the total, including applicable taxes and shipping. Payments are processed by Stripe.",
    ],
  },
  {
    heading: "Shipping and claim links",
    body: [
      "We ship in bulk to a single address, warehouse your order for later release, or generate claim links so recipients can enter their own size and shipping address. Delivery estimates are not guaranteed. Risk of loss passes to you when the carrier accepts the shipment. See our Shipping & Returns policy for details.",
    ],
  },
  {
    heading: "Returns and refunds",
    body: [
      "Because items are custom-made for you, they are generally non-returnable except where they are defective or differ materially from your approved proof. Our full policy, including how we handle defects and damage, is described in our Shipping & Returns policy.",
    ],
  },
  {
    heading: "Your content and intellectual property",
    body: [
      "You retain ownership of the logos, artwork, and other materials you upload (“Your Content”). You grant Swaggeroo and our production partners a non-exclusive, worldwide license to use, reproduce, and modify Your Content solely to produce and fulfill your orders and to provide the service.",
      "You represent and warrant that you own or have permission to use Your Content and that it does not infringe any third party’s rights. The Swaggeroo name, logo, website, and software are our intellectual property and may not be used without permission.",
    ],
  },
  {
    heading: "Acceptable use",
    body: [
      "You agree not to upload content or place orders that are unlawful, infringing, hateful, or that violate third-party rights. We may refuse or cancel any order, and remove content, at our discretion — for example, where we believe it infringes intellectual property or violates these Terms.",
    ],
  },
  {
    heading: "Branded stores",
    body: [
      "If you create a branded store, you are responsible for the content, products, and pricing you publish, and for ensuring you have the rights to any brand assets you use. You remain responsible for orders placed through your store under these Terms.",
    ],
  },
  {
    heading: "Disclaimers",
    body: [
      "The service is provided “as is” and “as available,” without warranties of any kind, whether express or implied, including merchantability, fitness for a particular purpose, and non-infringement, to the fullest extent permitted by law.",
    ],
  },
  {
    heading: "Limitation of liability",
    body: [
      "To the fullest extent permitted by law, Swaggeroo will not be liable for any indirect, incidental, special, consequential, or punitive damages, or for lost profits or revenues. Our total liability for any claim relating to the service or an order will not exceed the amount you paid for the order giving rise to the claim.",
    ],
  },
  {
    heading: "Indemnification",
    body: [
      "You agree to indemnify and hold Swaggeroo harmless from claims, damages, and expenses (including reasonable legal fees) arising from Your Content, your use of the service, or your breach of these Terms.",
    ],
  },
  {
    heading: "Governing law",
    body: [
      "These Terms are governed by the laws of the jurisdiction in which Swaggeroo is established, without regard to conflict-of-laws principles. Disputes will be resolved in the courts located there, unless applicable law provides otherwise.",
    ],
  },
  {
    heading: "Changes to these terms",
    body: [
      "We may update these Terms from time to time. We will post the updated version here and revise the “Last updated” date. Your continued use of the service after changes take effect constitutes acceptance.",
    ],
  },
  {
    heading: "Contact us",
    body: ["Questions about these Terms? Email hello@swaggeroo.com."],
  },
];

export default function TermsPage() {
  return (
    <LegalDoc
      title="Terms of Service"
      updated="June 17, 2026"
      intro="These terms cover how you use Swaggeroo and how custom orders, proofs, and payments work. Please read them carefully."
      sections={SECTIONS}
    />
  );
}
