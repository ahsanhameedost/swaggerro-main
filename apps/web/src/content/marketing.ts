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
    body: "Start in Pack Studio and choose products your crew will actually use — apparel, drinkware, tech and more.",
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
    body: "Spin up an on-brand storefront for your company in minutes — your logo, your colors, your catalog.",
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
    body: "Eco options on every category and carbon-aware shipping by default — sustainability that isn't a checkbox.",
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
    a: "Each product has its own minimum (often 25–50 units) so volume pricing actually works in your favor. The minimum is shown right on every product and enforced in Pack Studio.",
  },
  {
    q: "How does pricing work?",
    a: "Pricing is volume-based: the more you order, the lower the per-unit cost. Pack Studio shows your live per-unit price and the next price break as you build, plus any one-time imprint setup fees.",
  },
  {
    q: "What are claim pages?",
    a: "Instead of collecting sizes and addresses yourself, you send one claim link. Each recipient opens it, picks their size, and enters their own shipping address — no account needed.",
  },
  {
    q: "Do you ship internationally?",
    a: "Yes. We ship to 120+ countries, and claim pages let recipients enter local addresses so international gifting just works.",
  },
  {
    q: "Can I see the product before it prints?",
    a: "Always. We send a free digital proof of your logo on the product, and nothing goes to print until you approve it.",
  },
  {
    q: "Can I store inventory and reorder later?",
    a: "Yes. Warehouse your pack with us and ship from it on demand, or set up a branded store so your team can reorder in a few clicks.",
  },
  {
    q: "What imprint methods do you offer?",
    a: "Screen print, embroidery, pad print, laser engraving, full-color print and deboss — availability depends on the product, and Pack Studio only shows the methods that work for what you've picked.",
  },
  {
    q: "How long does an order take?",
    a: "Most orders ship within the lead time shown on each product (typically 10–16 days after proof approval). Claim-page orders ship as recipients submit their details.",
  },
];
