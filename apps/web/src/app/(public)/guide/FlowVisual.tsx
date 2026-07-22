import {
  ShoppingBag,
  CreditCard,
  Check,
  FileText,
  Palette,
  Upload,
  Eye,
  Package,
  Truck,
  MapPin,
  BadgeCheck,
  Store,
  ClipboardList,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import "./flow-visual.css";

type Node = { icon: LucideIcon; label: string };
type Scene = { hero: LucideIcon; caption: string; nodes: [Node, Node, Node] };

// One relevant mini-scene per flow: a hero icon + the flow's three key steps
// animating in sequence, so the reader gets the gist without reading the text.
const SCENES: Record<string, Scene> = {
  buy: {
    hero: ShoppingBag,
    caption: "Add to cart, pay by card, done.",
    nodes: [
      { icon: ShoppingBag, label: "Shop" },
      { icon: CreditCard, label: "Pay" },
      { icon: Check, label: "Done" },
    ],
  },
  bulk: {
    hero: FileText,
    caption: "Quote first, approve the proof, then pay.",
    nodes: [
      { icon: FileText, label: "Quote" },
      { icon: Palette, label: "Proof" },
      { icon: CreditCard, label: "Pay" },
    ],
  },
  design: {
    hero: Palette,
    caption: "Mockup → your review → ready to print.",
    nodes: [
      { icon: Upload, label: "Mockup" },
      { icon: Eye, label: "Review" },
      { icon: Check, label: "Approved" },
    ],
  },
  shipping: {
    hero: Truck,
    caption: "Pack it, ship it, track it to the door.",
    nodes: [
      { icon: Package, label: "Pack" },
      { icon: Truck, label: "Ship" },
      { icon: MapPin, label: "Delivered" },
    ],
  },
  sell: {
    hero: Store,
    caption: "Apply, get approved, launch your store.",
    nodes: [
      { icon: FileText, label: "Apply" },
      { icon: BadgeCheck, label: "Approved" },
      { icon: Store, label: "Store live" },
    ],
  },
  admin: {
    hero: ClipboardList,
    caption: "One dashboard for orders, fulfillment & reports.",
    nodes: [
      { icon: Package, label: "Orders" },
      { icon: Truck, label: "Fulfill" },
      { icon: BarChart3, label: "Reports" },
    ],
  },
};

export function FlowVisual({ variant }: { variant: string }) {
  const scene = SCENES[variant];
  if (!scene) return null;
  const Hero = scene.hero;

  return (
    <div className="fv-card" aria-hidden>
      <div className="fv-hero">
        <span className="fv-hero-badge">
          <Hero className="size-10" strokeWidth={1.75} />
        </span>
      </div>

      <div className="fv-track">
        <span className="fv-line" />
        {scene.nodes.map((n, i) => {
          const Icon = n.icon;
          return (
            <span key={i} className="fv-node">
              <span className="fv-dot">
                <Icon className="size-4" />
              </span>
              <span className="fv-node-label">{n.label}</span>
            </span>
          );
        })}
      </div>

      <p className="fv-caption">{scene.caption}</p>
    </div>
  );
}
