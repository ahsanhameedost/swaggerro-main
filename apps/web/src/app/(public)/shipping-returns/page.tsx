import type { Metadata } from "next";
import { LegalDoc, type LegalSection } from "@/components/marketing/legal-doc";

export const metadata: Metadata = {
  title: "Shipping & Returns",
  description:
    "Production timelines, shipping options, and how Swaggeroo handles returns, defects, and refunds.",
};

const SECTIONS: LegalSection[] = [
  {
    heading: "Production and lead times",
    body: [
      "Swaggeroo products are made to order. Production begins after you approve your digital proof, and typical lead times are shown on each product page (most run 10–16 business days after approval, depending on the item and decoration method).",
      "Rush timelines may be available on request — contact us before ordering if you have a hard deadline.",
    ],
  },
  {
    heading: "Proof approval",
    body: [
      "We send a free digital proof before anything is printed. We print exactly what you approve, so please review spelling, colors, sizing, placement, and quantities carefully. Production and shipping timelines start from the moment you approve.",
    ],
  },
  {
    heading: "Shipping options",
    body: [
      "We offer three ways to get your order where it needs to go:",
      [
        "Bulk shipping — the full run ships to a single address you choose.",
        "Claim links — send one link and each recipient enters their own size and shipping address.",
        "Warehouse & release — we store your inventory and ship on demand as you need it.",
      ],
    ],
  },
  {
    heading: "Shipping rates and delivery estimates",
    body: [
      "Shipping is calculated at checkout based on destination, weight, and speed. Delivery estimates are provided by carriers and are not guaranteed. Once an order ships, transit time is in the carrier’s hands.",
    ],
  },
  {
    heading: "Order tracking",
    body: [
      "When your order ships, we email tracking details, and you can follow status from your account under Orders. Claim-link campaigns show fulfillment progress as recipients complete their details.",
    ],
  },
  {
    heading: "Returns on custom items",
    body: [
      "Because items are personalized for you, they are not eligible for return or exchange due to buyer’s remorse, incorrect sizing selected at checkout, or color expectations that differ from your approved proof. Please use the free proof and any size guidance before approving.",
    ],
  },
  {
    heading: "Defective or incorrect items",
    body: [
      "We stand behind our work. If your order arrives defective, materially different from your approved proof, or with the wrong items, contact us within 14 days of delivery with photos. We will reprint the affected items or issue a refund for them at our discretion.",
    ],
  },
  {
    heading: "Damaged in transit",
    body: [
      "If your shipment arrives damaged, keep the packaging and send us photos within 14 days. We’ll work with the carrier and make it right with a replacement or refund.",
    ],
  },
  {
    heading: "Cancellations and changes",
    body: [
      "You can change or cancel an order any time before you approve the proof. After proof approval, production has begun and orders generally cannot be cancelled or modified.",
    ],
  },
  {
    heading: "Refunds",
    body: [
      "Approved refunds are issued to your original payment method. Depending on your bank or card provider, it may take several business days for the credit to appear after we process it.",
    ],
  },
  {
    heading: "International orders",
    body: [
      "We ship internationally on many products. Import duties, taxes, and customs fees are determined by the destination country and are the recipient’s responsibility unless stated otherwise at checkout.",
    ],
  },
  {
    heading: "Contact us",
    body: [
      "Need help with a shipment or a problem with your order? Email hello@swaggeroo.com and we’ll sort it out.",
    ],
  },
];

export default function ShippingReturnsPage() {
  return (
    <LegalDoc
      title="Shipping & Returns"
      updated="June 17, 2026"
      intro="How long things take, how they get to you, and what happens if something isn’t right."
      sections={SECTIONS}
    />
  );
}
