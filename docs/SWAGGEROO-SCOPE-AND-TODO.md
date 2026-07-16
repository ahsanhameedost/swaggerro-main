# Swaggeroo — Client Requirements & Build Scope

**Source:** "Zak & Saad Swaggeroo Sync" — Fri, Jun 12, 2026
**Prepared:** June 15, 2026
**MVP deadline (agreed with Scott):** **July 1, 2026** — something demoable by end of June.

---

## Participants & roles

| Person | Role |
|---|---|
| **Saad** | Project / business lead (client side). Owns scope, decisions, pricing model. |
| **Scott** | Business owner / final decision-maker for Swaggeroo. |
| **Abdirizak "Zak" Bashir** | Current developer / maintainer. Holds the repo, infra, and prior-dev context. |
| **Ahsan Hameed** ("Essen"/"Hessen") | Tech lead — web & design (ninoastech). Filling in for Amar. Leading testing + build going forward. |
| **Amar** | Usual tech lead (on annual leave). |
| *Previous dev/team* | Built the current Swaggeroo; **disengaged** ~1–2 weeks ago. Project moving to Ahsan's team. |

---

## 1. Background & direction

- Swaggeroo is being **handed to a new team** (Ahsan/ninoastech) and effectively **re-scoped/rebuilt**. The previous dev's status report overstated completion — the team's working assumption after the demo is that **most of what's "working" is front-end UI only**, with little functional backend. Full testing (this week) will confirm.
- The previous developer **copied significant portions from swagup.com**. Direction is to make Swaggeroo more like **spygup.com**, remove the copied nuance, and **identify/remove anything that creates a legal/IP risk** ("so they don't come suing us").
- Rebrand: a **new Swaggeroo logo (kangaroo)** exists (Scott has it) and needs to be applied to whatever is kept.

---

## 2. The two product verticals (what the client wants Swaggeroo to be)

### A. B2B — White-label branded merch stores (like SwagUp / SpyGup)
Swaggeroo offers business clients their **own white-labeled e-commerce store** for branded merchandise.

- The store/page shows the **client's branding only** (e.g. "EHR's" logo), **not Swaggeroo's**.
- The client's employees / customers visit the page (linked from the client's own website — e.g. a "Merch" menu item) and place orders.
- Swaggeroo curates **trendy designs** (a library of ~100–5,000 designs) the client can choose from; designs can be customized with the client's phrases / culture / branding.
- **Revenue-share model:** e.g. sell a $50 shirt → Swaggeroo keeps ~$30, client gets ~$20 — passive income for the client.
- **Fulfillment = drop-ship** for these clients.

### B. B2C — Swaggeroo's own e-commerce store
Anyone (consumer, business owner, procurement specialist) can order apparel / merch / swag directly on swaggeroo.com.

- **Retail orders** (small, **5 units or fewer**): **fixed published price**.
- **Bulk / wholesale orders:** **custom quote**, returned in **24–48 hours**. Bulk pricing kept **custom and hidden** initially (more for the team to learn the model than to publish numbers).
- **Recurring large accounts** (e.g. "Key" ≈ 5,000 Ts/year): **share an annual calendar**, customer picks events + personal items, Swaggeroo builds **samples/mockups** and fulfills.
- Must accept **both retail and bulk/wholesale** orders.

---

## 3. Swag / package builder (specific client feedback from the demo)

The current builder is a **front-end placeholder with no backend logic** — to be **rebuilt custom**. Required behavior:

- **Upload a custom logo** and **see the logo previewed on the merch** (t-shirt, mug, etc.).
- **Select multiple products at once** (t-shirts, goodies, bags) — current build only allows **one item at a time**.
- Set **quantities** (multiple/bulk).
- **Calculate / show package pricing** (the demo's "Calculate" button does nothing).
- The team must first **learn the exact intended flow** before developing it (confirm with Saad/Scott).

---

## 4. Key decisions & constraints

| Topic | Decision / direction |
|---|---|
| **MVP deadline** | **July 1, 2026**; demoable by end of June. |
| **Scope verticals** | Build **both** B2B (white-label stores) and B2C (Swaggeroo store) for MVP. |
| **Shopping solution** | **Shopify** (team has used it before) for the e-commerce/store side. |
| **Payment gateway** | **TBD.** Prior dev integrated **Square** (sandbox / possibly a trial) — questionable, likely **needs rebuild/reintegration**. Decide Square vs. alternative + set up real merchant account. |
| **Fulfillment** | **Initially** outsource to **Abraham's agency — "SOA Marketing Agency"** for apparel. **Long-term:** Swaggeroo's own supply chain / warehouse. |
| **Pricing model** | Bulk = custom/hidden initially. Publish price only for orders of **≤ 5 units**. |
| **Branding** | Apply new **kangaroo logo**; remove SwagUp-copied content. |
| **Project mgmt** | **Google Workspace** (currently only domain/email set up — no project tooling yet). |
| **Tech stack** | Inherited stack acceptable; Ahsan to confirm comfort or propose alternatives. Changeable if needed. |
| **Hosting** | Currently **local only**. Zak to set up a **public preview** (Vercel / Sail / Railway) so the team can see progress. |
| **Repo access** | GitHub invite sent to **Ahsan (ninoastech.com)**; admin credentials to be emailed to Ahsan + Essen. |

---

## 5. Demo findings (what the team observed vs. the prior report)

- **Homepage / storefront:** exists but **UI is "out of sorts"** — text/image sizing and responsiveness issues.
- **Admin dashboard:** exists; **spreadsheet/CSV import** reportedly works (only basic check — *to be re-verified*); **most other admin workflows untested**.
- **Orders / shipping / payments / inventory:** **not tested / not believed functional.** Payments "definitely not."
- **Several public pages are "Coming Soon" placeholders** (resources, pricing, company). **Contact is built.**
- **Swag pack builder:** placeholder only, no logic.
- **Caution for testing:** verify nothing is live before placing test orders — must **not** accidentally **print a real shipping label or trigger charges**.

> Note: my own code review (separate verification) found the **bulk import feature is actually absent in the codebase** — both the backend importer and the dashboard UI. Zak stated in the call that import "works"; this conflicts with the source and **must be confirmed during testing.**

---

## 6. Open questions to resolve

- **Payments:** Whose Square account / what plan was configured? Was it real or dummy? Get config from Scott / prior dev.
- **Shipping:** Get the shipping setup details (carrier, config) from Scott / prior dev.
- **Prior-dev demo:** Any **recording** of a working demo? Possibly ask prior dev for one final demo (Saad's call — relationship already ended).
- **Exact swag-builder flow:** Confirm the precise intended UX with Saad/Scott before building.
- **Tech stack:** Ahsan to confirm keep vs. change.
- **Scope of work doc:** Saad to draft before Monday; finalized Tuesday.

---

## 7. TO-DO LIST

### 🔴 This week — Access, testing & info-gathering (due Mon EOB; reconvene Tue)

- [ ] **Zak:** Accept/confirm GitHub invite for **Ahsan (@ninoastech.com)**; email **admin login credentials** to Ahsan + Essen.
- [ ] **Zak:** Stand up a **public preview deployment** (Vercel / Sail / Railway) so the team can review progress without running locally.
- [ ] **Ahsan + ninoastech team:** **Full end-to-end testing** of every feature claimed in the prior report — record working vs. not working.
  - [ ] Admin dashboard workflows (products, orders, inventory, shipping settings, users, RBAC, contact messages).
  - [ ] **Verify the CSV/spreadsheet import actually works** (conflicts with code review — confirm).
  - [ ] Order submission → does it land in the admin "Orders" view?
  - [ ] Shipping zones/rates/estimation — **without triggering real labels/charges**.
  - [ ] Payments (Square sandbox) — confirm whether anything functions.
  - [ ] Swag pack builder + bulk flow.
  - [ ] Customer-facing flows (shop, product detail, cart, project submission, auth).
- [ ] **Zak:** Also run testing in parallel so both sides reach consensus on status.
- [ ] **Zak:** Get from **Scott / previous dev**: **Square/payment gateway** config (account owner, plan, sandbox vs. live) and the **shipping** setup details.
- [ ] **Zak/Saad:** Decide whether to request a **final demo or recording** from the previous dev.
- [ ] **Saad:** Obtain the **new kangaroo logo** from Scott and share with the team.

### 🟠 Monday — Scope of work

- [ ] **Saad:** Prepare a **draft Scope of Work** (targeting July 1) covering B2B + B2C, payments, Shopify, fulfillment.
- [ ] **Monday meeting** (late morning / early afternoon **Eastern**): review draft scope, gather feedback from Zak + Ahsan.
- [ ] **Ahsan:** Confirm tech-stack decision (keep inherited stack vs. propose changes).

### 🟡 Tuesday — Finalize

- [ ] Review consolidated **testing results**; mark the prior report's claims as confirmed/false.
- [ ] **Finalize the Scope of Work** and divide tasks across the team.

### 🟢 MVP build scope (toward July 1)

**Branding & cleanup**
- [ ] Apply new **kangaroo logo** and Swaggeroo branding throughout.
- [ ] **Remove SwagUp-copied content/design**; audit for **IP/legal risk** and replace flagged pieces.
- [ ] Fix homepage/storefront **UI sizing & responsiveness** issues.
- [ ] Build out **placeholder pages**: resources, pricing, company (contact already built).

**B2B — White-label stores**
- [ ] **Pitch/landing experience** marketing the white-label store offering to businesses.
- [ ] **White-label store** rendering the **client's branding only** (no Swaggeroo branding).
- [ ] **Design library** customers can pick from (curated designs), with client customization (logo, phrases).
- [ ] Link/embed model so a client can surface their store from their own website.
- [ ] **Revenue-share** accounting and **drop-ship** fulfillment wiring.

**B2C — Swaggeroo store**
- [ ] **E-commerce store** (via **Shopify**) supporting **retail (≤5, fixed price)** and **bulk/wholesale**.
- [ ] **Custom quote request** flow with **24–48h** turnaround; bulk pricing **hidden** initially.
- [ ] **Recurring-account / calendar** ordering (annual calendar → pick events → mockups → fulfill).
- [ ] **Sample / mockup generation** workflow.

**Swag / package builder (rebuild)**
- [ ] Custom **logo upload + live preview on merch**.
- [ ] **Multi-product selection** (t-shirts, goodies, bags) + **quantities** in one flow.
- [ ] Working **price calculation** for the package.
- [ ] Confirm exact flow with Saad/Scott before building.

**Payments & fulfillment**
- [ ] Decide payment gateway (Square vs. alternative) and set up a **real merchant account**; integrate.
- [ ] Integrate **SOA Marketing Agency** for initial apparel fulfillment; plan path to in-house supply chain.

**Infrastructure**
- [ ] Replace local-only setup with a real hosting/deploy path; production-harden as scope allows.

---

*Prepared from the Jun 12 sync transcript, cross-referenced against a direct review of the Swaggeroo source. Status notes in §5 reflect both the meeting discussion and the code as it currently stands.*
