import type { Metadata } from "next";
import { LegalDoc, type LegalSection } from "@/components/marketing/legal-doc";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Swaggeroo collects, uses, and protects your personal information.",
};

const SECTIONS: LegalSection[] = [
  {
    heading: "Overview",
    body: [
      "This Privacy Policy explains how Swaggeroo (“Swaggeroo,” “we,” “us”) collects, uses, shares, and protects information when you visit our website, create an account, place an order, or use our services.",
      "By using Swaggeroo, you agree to the practices described here. If you do not agree, please do not use our services.",
    ],
  },
  {
    heading: "Information we collect",
    body: [
      "We collect information you provide directly and information generated automatically as you use the service:",
      [
        "Account information — name, email address, password, and company details.",
        "Order information — products, quantities, sizes, colors, imprint choices, recipients, and shipping addresses.",
        "Payment information — processed by our payment provider (Stripe). We do not store full card numbers on our servers.",
        "Uploaded content — logos, artwork, and design files you upload for proofs and printing.",
        "Usage data — device, browser, IP address, pages viewed, and interactions, collected via cookies and similar technologies.",
      ],
    ],
  },
  {
    heading: "How we use your information",
    body: [
      "We use the information we collect to:",
      [
        "Provide, operate, and improve the service — building packs, generating proofs, and fulfilling orders.",
        "Process payments, prevent fraud, and keep accounts secure.",
        "Communicate with you about orders, proofs, support requests, and service updates.",
        "Send marketing messages where permitted — you can opt out at any time.",
        "Comply with legal obligations and enforce our terms.",
      ],
    ],
  },
  {
    heading: "How we share information",
    body: [
      "We do not sell your personal information. We share it only as needed to run the service:",
      [
        "Service providers — cloud hosting and database, payments (Square), email delivery, analytics, and print/fulfillment partners who produce and ship your order.",
        "Shipping carriers — to deliver orders and claim-page shipments.",
        "Legal and safety — when required by law or to protect rights, property, or safety.",
        "Business transfers — in connection with a merger, acquisition, or sale of assets.",
      ],
    ],
  },
  {
    heading: "Cookies and tracking",
    body: [
      "We use cookies and similar technologies to keep you signed in, remember your cart and pack drafts, measure usage, and improve the product. You can control cookies through your browser settings; disabling some cookies may affect functionality.",
    ],
  },
  {
    heading: "Data retention",
    body: [
      "We retain personal information for as long as your account is active or as needed to provide the service, comply with legal obligations, resolve disputes, and enforce agreements. Uploaded artwork is retained to support reorders and reprints unless you ask us to delete it.",
    ],
  },
  {
    heading: "Security",
    body: [
      "We use technical and organizational measures — encryption in transit, access controls, and trusted infrastructure providers — to protect your information. No method of transmission or storage is 100% secure, so we cannot guarantee absolute security.",
    ],
  },
  {
    heading: "Your rights",
    body: [
      "Depending on where you live, you may have the right to access, correct, delete, or export your personal information, and to object to or restrict certain processing (for example, under GDPR or the CCPA).",
      "To exercise any of these rights, contact us at hello@swaggeroo.com. We will respond within the timeframe required by applicable law.",
    ],
  },
  {
    heading: "International transfers",
    body: [
      "We may process and store information in countries other than where you live. Where required, we use appropriate safeguards for international transfers of personal information.",
    ],
  },
  {
    heading: "Children’s privacy",
    body: [
      "Swaggeroo is not directed to children under 16, and we do not knowingly collect personal information from them. If you believe a child has provided us information, contact us and we will delete it.",
    ],
  },
  {
    heading: "Changes to this policy",
    body: [
      "We may update this Privacy Policy from time to time. We will post the updated version here and revise the “Last updated” date above. Significant changes may be communicated by email or in-product notice.",
    ],
  },
  {
    heading: "Contact us",
    body: [
      "If you have questions or requests regarding this policy or your personal information, email hello@swaggeroo.com.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalDoc
      title="Privacy Policy"
      updated="June 17, 2026"
      intro="Your trust matters. This policy describes what information we collect, why we collect it, and the choices you have."
      sections={SECTIONS}
    />
  );
}
