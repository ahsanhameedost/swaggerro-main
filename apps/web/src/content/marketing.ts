/**
 * Single source of truth for marketing copy. Edit content here — every
 * marketing page reads from these arrays, so changes land everywhere at once.
 */
import {
  Boxes,
  Sparkles,
  Truck,
  Gift,
  Store,
  CalendarClock,
  HeartHandshake,
  Leaf,
  Gauge,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export type Step = { icon: LucideIcon; title: string; body: string };
export type Feature = { icon: LucideIcon; title: string; body: string };
export type Stat = { value: string; label: string };
export type Testimonial = { quote: string; name: string; role: string };
export type Faq = { q: string; a: string };

export const HOW_IT_WORKS: Step[] = [
  {
    icon: Boxes,
    title: "Pick a Pack",
    body: "Start in Pack Studio and pick products your crew will actually use: apparel, drinkware, tech and more.",
  },
  {
    icon: Sparkles,
    title: "Make it yours",
    body: "Drop in your logo and colors, choose an imprint method, and approve a free proof before anything prints.",
  },
  {
    icon: Truck,
    title: "We ship the mob",
    body: "Warehouse it, ship it in bulk, or send claim links so each recipient picks their size and address.",
  },
];

export const SUPERPOWERS: Feature[] = [
  {
    icon: Gift,
    title: "Claim Pages",
    body: "Skip the sizing spreadsheet. Send one link and each recipient picks their size and ships to their own address.",
  },
  {
    icon: Store,
    title: "Branded Stores",
    body: "Spin up an on-brand storefront for your company in minutes. Your logo, your colors, your catalog.",
  },
  {
    icon: CalendarClock,
    title: "Scheduled Gifting",
    body: "Set new-hire kits and milestone gifts on autopilot. They go out on time without you lifting a finger.",
  },
];

export const STATS: Stat[] = [
  { value: "50k+", label: "Packs shipped" },
  { value: "98%", label: "Reorder rate" },
  { value: "4.9/5", label: "Average rating" },
  { value: "120+", label: "Countries served" },
];

export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "We onboarded 240 people last quarter and not one sizing email landed in my inbox. Claim links did the whole thing.",
    name: "Priya Nair",
    role: "People Ops Lead, Northwind",
  },
  {
    quote:
      "The live pricing in Pack Studio is the first time I've trusted a swag quote without three back-and-forth emails.",
    name: "Marcus Bell",
    role: "Brand Manager, Lumen",
  },
  {
    quote:
      "Our branded store basically runs itself now. Reorders that used to take a week take about ninety seconds.",
    name: "Dana Whitlock",
    role: "Office Manager, Hearth",
  },
  {
    quote:
      "Three conferences in one month, same kit each time. The first reorder ate up an afternoon. The third one I did from the back of a taxi before I'd finished my coffee.",
    name: "Tom Iverson",
    role: "Events Marketing, Acme Co",
  },
  {
    quote:
      "Half the team's remote, so I used to mail boxes to a dozen countries myself. Now I drop a link in Slack and everyone picks their own size and address. Haven't touched a customs form since.",
    name: "Rosa Delgado",
    role: "COO, Volt",
  },
  {
    quote:
      "New folks get their welcome kit before day one now. One of them said it was the first job that felt sorted before she'd even logged in. Didn't expect swag to be the thing that pulled that off.",
    name: "Kenji Watanabe",
    role: "Head of People, Meridian",
  },
  {
    quote:
      "We didn't want to ship a box of stuff people quietly bin. Seeing the proof before anything got made changed what we ordered. We cut the run in half and still had plenty left over.",
    name: "Aisha Mensah",
    role: "Brand Lead, Cedar & Co",
  },
  {
    quote:
      "I sign off the budget, so a price that doesn't move after I approve it is the whole thing for me. I knew the final number before I hit order. That almost never happens.",
    name: "Greg Halloran",
    role: "Finance, Brightside",
  },
];

export const VALUES: Feature[] = [
  {
    icon: HeartHandshake,
    title: "People over logos",
    body: "Swag should feel like a gift, not a giveaway. We obsess over things people genuinely want to keep.",
  },
  {
    icon: Gauge,
    title: "Pricing without the dance",
    body: "Volume pricing is shown live as you build. No quote emails, no mystery markups, no haggling.",
  },
  {
    icon: Leaf,
    title: "Lighter on the planet",
    body: "Eco options on every category and carbon-aware shipping by default. Sustainability that isn't a checkbox.",
  },
  {
    icon: ShieldCheck,
    title: "Proofs before print",
    body: "Nothing goes to production until you've seen and approved a proof. What you approve is what you get.",
  },
];

export const FAQS: Faq[] = [
  {
    q: "Is there a minimum order?",
    a: "No hard minimum. Order as few as you like. Orders of 5 units or fewer check out and pay right away at the current volume price, with no proof step. Larger runs of 6+ go through a quick quote so we can proof your branding first. Swag Packs built in Pack Studio start at 5 packs.",
  },
  {
    q: "What's the difference between a small order and a bulk order?",
    a: "Orders of 5 units or fewer are pay-now: you check out and we start producing straight away, so there's nothing to wait on. Orders of 6 or more are quote-first: you submit the project, we send a free design proof to approve, and payment unlocks once you've signed off.",
  },
  {
    q: "How does pricing work?",
    a: "Pricing is volume-based: the per-unit price drops as your quantity climbs, and you see your live price and the next price break as you build in Pack Studio or on any product page. Small orders pay on the spot; bulk orders get a quote you approve before paying securely by card.",
  },
  {
    q: "Can I see the product before it prints?",
    a: "Always, on any bulk order. We send a free digital proof of your logo on the product, and nothing goes to production until you approve it. Need changes? Request a revision with your notes and we'll send an updated proof, and there's no limit on rounds.",
  },
  {
    q: "Can I ship to lots of people or addresses?",
    a: "Yes. Save people and places in your recipient address book, then ship the whole run to a single address or split it across many recipients, each with its own shipment and service level (standard or express).",
  },
  {
    q: "Do you ship internationally?",
    a: "Yes. We ship to 120+ countries, and each recipient can have their own local address, so international gifting just works.",
  },
  {
    q: "Can I store inventory and reorder later?",
    a: "Yes. Warehouse your stock with us (every receipt and shipment is tracked in an inventory ledger) and release it on demand. You can also open a branded store so your team reorders in a few clicks.",
  },
  {
    q: "Can I sell on Swaggeroo or open my own store?",
    a: "Yes. Apply to become a seller, and once you're approved you get your own branded storefront on Swaggeroo. We handle the catalog, printing and fulfillment; you curate products, add your logo, set your prices, and earn on every sale.",
  },
  {
    q: "Do you have discount or promo codes?",
    a: "Yes. Enter a coupon code at checkout to apply a percentage or fixed discount. Codes can be run by Swaggeroo across the platform or by an individual seller store.",
  },
  {
    q: "How do I track my order?",
    a: "Track any order with its order number and email, or tap the tracking link in our status emails. No account required.",
  },
  {
    q: "How long does an order take?",
    a: "Small pay-now orders go into production as soon as you check out. For bulk orders the clock starts when you approve your proof, and most ship within the lead time shown on each product. Shipments to multiple recipients go out as each one is scheduled.",
  },
];
