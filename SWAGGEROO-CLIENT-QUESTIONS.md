# Swaggeroo — Questions for the Client

**Prepared:** June 15, 2026
**Purpose:** Questions to ask Saad / Scott in the meeting, so we can lock the scope and unblock the remaining work toward the **July 1 MVP**. This is a *questions-only* list — see the Scope & Status documents for the detailed findings.

---

## 1. Checkout & Payments (highest priority — currently blocked)

> Product add now works on local (S3 removed, switched to local storage). The one thing still failing is the **checkout page** — the order does not go through. Before we fix it properly we need these answers:

1. **Which payment gateway should we finalize for the MVP?** Square (already half-integrated, sandbox only), or switch to Stripe / something else?
2. **Whose merchant account do we use?** We need real (live) credentials — account owner, plan, and whether it's a real account or a trial/dummy.
3. Should checkout go **live (real charges)** for the MVP demo, or stay in **sandbox / test mode** until launch?
4. For **bulk / wholesale** orders — should checkout collect payment at all, or just submit a **quote request** (no payment, 24–48h follow-up)?
5. What exactly should happen **after a successful checkout** — order confirmation email? Order appears in the admin dashboard? Anything else?
6. Do you want **guest checkout**, or must the customer have an account to place an order?

---

## 2. Storage & Hosting

7. We removed the **S3** dependency and moved file uploads to **local storage** to unblock product creation. For production, do you want us to (a) keep local, (b) re-enable S3 with your AWS account, or (c) use a different storage provider?
8. **Where should the app be hosted/deployed?** (Vercel / Railway / your own AWS, etc.) Right now it only runs locally — we need a target before we can stand up a public preview.
9. Do you have/own the **AWS account** referenced in the existing CI/CD pipeline, or should we set up fresh infrastructure?

---

## 3. Shopify vs. the current custom build

10. The notes say the e-commerce side should use **Shopify**. Do you want us to **migrate the store to Shopify**, or **keep and finish the existing custom Next.js/NestJS build** we already have working? *(This is a major direction decision — it changes most of the remaining plan.)*
11. If Shopify: is that for the **whole store**, or only the B2C retail piece (and we keep custom for B2B white-label + swag builder)?

---

## 4. Swag / Package Builder (needs to be rebuilt — exact flow unknown)

12. Walk us through the **exact intended flow** of the swag/package builder, step by step.
13. Should a customer be able to **upload their logo and see it previewed** on each product (shirt, mug, bag)?
14. Should they **select multiple products in one package** (current build allows only one at a time)? With per-product quantities?
15. How should **package pricing be calculated** — what's the formula / rules? (The current "Calculate" button does nothing.)

---

## 5. B2B — White-label branded stores

16. For the **white-label stores**, what's the exact setup — does each business client get their **own branded page/subdomain**? How is it created (self-serve, or we set it up)?
17. The **design library** — roughly how many designs at launch, and who supplies them? How does a client customize a design (logo, phrases, colours)?
18. **Revenue-share** — confirm the model and split (e.g. $50 shirt → Swaggeroo $30 / client $20). How is the client's share tracked and paid out?
19. How does a client **embed/link** their store from their own website?

---

## 6. B2C — Swaggeroo's own store

20. Confirm the rule: **retail = orders of 5 units or fewer at a fixed published price**; everything larger = **custom hidden quote**. Is that still correct?
21. For the **custom quote** flow — what info do we collect from the customer, and what's the 24–48h turnaround process on your side?
22. **Recurring large accounts** (e.g. the "Key" ~5,000 shirts/year, annual calendar → events → mockups): is this **in scope for the July 1 MVP**, or a later phase?

---

## 7. Fulfillment & Shipping

23. **SOA Marketing Agency** (Abraham) for initial apparel fulfillment — how do orders get to them? Manual hand-off, email, or do we need a real integration for the MVP?
24. Do you want **real carrier shipping rates** (e.g. live rates via Shippo/carrier API) for the MVP, or are **manual flat/zone rates** fine for now?
25. Are there **products that ship from different places** (drop-ship vs. warehouse) we need to account for?

---

## 8. Branding, Content & Pages

26. Can you send the **new kangaroo logo** and any brand guidelines (colours, fonts) so we can apply them across the site?
27. The previous build **copied content/design from swagup.com**. Are there specific pages/sections you've flagged as **legal/IP risk** that must be removed or rewritten first?
28. The **4 "Coming Soon" pages** (Company, Platform, Pricing, Resources) — are these **in scope for July 1**? Who provides the copy?
29. **Testimonials and the homepage video** are currently placeholder/dummy. Do you have real ones, or should they stay as placeholders for the demo?

---

## 9. Scope & Priorities for July 1

30. Of everything above, what are your **top 3 must-haves** for the July 1 demo vs. what can wait for a later phase?
31. Is **bulk product import (CSV/Excel upload)** needed for the MVP? *(Note: the previous report claimed it was done, but it does not exist in the code — it would need to be built.)*
32. Do you need **SKU codes** on products? *(Not currently in the system at all.)*
33. Who is the **single point of contact** for sign-off on scope and for answering questions during the build?

---

*Prepared as a meeting checklist. Pair this with the Scope & TODO and the Verified-Status documents for the full technical detail behind each question.*
