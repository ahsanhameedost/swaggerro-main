/**
 * Swaggeroo Seller Agreement — the contract a seller must read and accept before
 * their application is submitted. Keep SELLER_AGREEMENT_VERSION in sync with
 * apps/api/src/partners/dto/partner.dto.ts.
 */

export const SELLER_AGREEMENT_VERSION = "2026-06-v1";

export const SELLER_AGREEMENT_EFFECTIVE_DATE = "June 2026";

export type SellerAgreementSection = {
  heading: string;
  body: string[];
};

export const SELLER_AGREEMENT_INTRO =
  "This Seller Agreement (the “Agreement”) governs your participation as a seller on the Swaggeroo marketplace. Please read it carefully. By checking the acceptance box and submitting your application, you confirm that you have read, understood, and agree to be bound by the terms below.";

export const SELLER_AGREEMENT_SECTIONS: SellerAgreementSection[] = [
  {
    heading: "1. The Swaggeroo marketplace",
    body: [
      "Swaggeroo provides a hosted, white-label storefront through which approved sellers can offer branded merchandise to their own customers. Swaggeroo handles product fulfilment, payment processing, and order management; you handle merchandising, branding, and customer relationships for your store.",
    ],
  },
  {
    heading: "2. Commission and platform fees",
    body: [
      "Swaggeroo earns a commission on each product sold through your store. Commission is set by Swaggeroo on a per-product basis and takes one of two forms:",
      "• Percentage commission — a percentage of the sale price, ranging from 0% to a maximum of 15% per product. Where a per-product rate is not set, your store’s default rate applies.",
      "• Flat commission — a fixed amount defined at the product’s catalogue base price. If you raise your selling price above the base price, the flat commission scales proportionally so Swaggeroo retains the same share of each sale.",
      "Commission is calculated on the final price the customer pays and is deducted before your earnings are calculated. The applicable commission for each product is shown to you in your seller dashboard before you publish it.",
    ],
  },
  {
    heading: "3. Pricing and your earnings",
    body: [
      "Each product has a catalogue base price set by Swaggeroo, which is the minimum price at which you may sell that product. You may raise your selling price above the base price at your discretion; you may not sell below it.",
      "Your earnings on each sale equal the customer’s price less the applicable Swaggeroo commission. Earnings are accrued to your account and paid out according to the payout details and schedule configured in your dashboard.",
    ],
  },
  {
    heading: "4. Your responsibilities",
    body: [
      "You are responsible for the logos, artwork, text, and other materials you upload, and you confirm you have the rights to use them. You agree not to sell counterfeit, infringing, unlawful, or offensive goods, and to comply with all applicable laws and the Swaggeroo content guidelines.",
    ],
  },
  {
    heading: "5. Fulfilment and customer service",
    body: [
      "Swaggeroo produces and ships orders placed through your store. You agree to respond promptly to customer enquiries that relate to your branding or merchandising decisions, and to cooperate with Swaggeroo on any order issues, returns, or disputes.",
    ],
  },
  {
    heading: "6. Term, suspension and changes",
    body: [
      "Swaggeroo may update commission rates, fees, and the terms of this Agreement from time to time; material changes will be communicated to you. Swaggeroo may suspend or terminate a store that breaches this Agreement. You may close your store at any time, subject to fulfilling outstanding orders.",
    ],
  },
];
