"use client";

import { addToast } from "@heroui/toast";
import bottle from "@/assets/hero/bottle.png";
import shoes from "@/assets/hero/shoes.png";
import set from "@/assets/hero/set.png";
import kit from "@/assets/hero/kit.png";
import Catalog from "@/assets/hero/Catalog.png";
import faq from "@/assets/faq.png";
import img1 from "@/assets/newsletter/img1.png";
import img2 from "@/assets/newsletter/img2.png";
import google from "@/assets/works/google.png";
import shopify from "@/assets/works/shopify.png";
import deel from "@/assets/works/deel.png";
import force from "@/assets/works/force.png";
import slack from "@/assets/works/slack.png";
import zapier from "@/assets/works/zapier.png";
import person from "@/assets/works/person.png";
import circle from "@/assets/works/circle.png";
import HowItWorksImg from "@/assets/how-it-works.png";
import UltimateSolutionImg from "@/assets/ultimate_solution.png";
import PreviewImg from "@/assets/img2.png";
import WorldMapImg from "@/assets/ship/map.png";
import BrandStripSection from "../components/home/BrandStripSection";
import HowItWorksSection from "../components/home/HowItWorksSection";
import PrimaryButton from "../components/PrimaryButton";
import UnmatchedGearSection from "../components/home/UnmatchedGearSection";
import UltimateSolutionSection from "../components/home/UltimateSolutionSection";
import VideoShowcaseSection from "../components/home/VideoShowcaseSection";
import StrategicAssetSection from "../components/home/StrategicAssetSection";
import ShippingOrbitSection from "../components/home/ShippingOrbitSection";
import PricingEstimatorSection from "../components/home/PricingEstimatorSection";
import BrandedShopsSliderSection from "../components/home/BrandedShopsSliderSection";
import WorksSeamlesslySection from "../components/home/WorksSeamlesslySection";
import NewsletterSubscribeBanner from "../components/home/NewsletterSubscribeBanner";
import FaqSection from "../components/home/FaqSection";
import TestimonialsOrbitSection from "../components/home/TestimonialsOrbitSection";
import HeroCurvedSlider from "../components/home/HeroCurvedSlider";

import gridImg1 from "@/assets/grid/img1.png";
import gridImg2 from "@/assets/grid/img2.png";
import gridImg3 from "@/assets/grid/img3.png";
import gridImg4 from "@/assets/grid/img4.png";
import gridImg5 from "@/assets/grid/img5.png";
import gridImg6 from "@/assets/grid/img6.png";
import gridImg7 from "@/assets/grid/img7.png";
import gridImg8 from "@/assets/grid/img8.png";
import gridImg9 from "@/assets/grid/img9.png";
import EditorialStyleSection from "../components/home/EditorialStyleSection";

const MARQUEE_ITEMS = [
  { src: bottle, alt: "Swag bottle" },
  { src: shoes, alt: "Skate shoes" },
  { src: set, alt: "Branded set" },
  { src: kit, alt: "Merch kit" },
  { src: Catalog, alt: "Catalog" },
];

export default function Home() {

  return (
    <div>
      <section className="relative overflow-hidden bg-white">
        <div className="container relative z-20 py-12 md:absolute md:inset-x-0 md:top-12 md:py-0">
          <div className="mx-auto flex max-w-3xl flex-col items-center justify-center text-center">
            <h1 className="text-balance">
              <span className="block text-black">Bring Your Culture to Life With</span>
              <span className="block">
                <span className="text-primary-gradient">Swaggeroo</span>
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-pretty text1">
              The all-in-one platform to create, organize, and distribute premium swag that makes your brand stand out.
            </p>

            <div className="mt-8 flex items-center justify-center">
              <PrimaryButton href="/shop" className="h-12 px-10" text="Get Started" />
            </div>
          </div>
        </div>

        <HeroCurvedSlider images={MARQUEE_ITEMS} durationSeconds={50} hideCurveOnMobile />
      </section>

      <BrandStripSection />

      <HowItWorksSection imageSrc={HowItWorksImg} />

      <UnmatchedGearSection />

      <UltimateSolutionSection imageSrc={UltimateSolutionImg} />

      <VideoShowcaseSection imageSrc={PreviewImg} />

      <StrategicAssetSection />
      <ShippingOrbitSection mapSrc={WorldMapImg} />

      <PricingEstimatorSection />

      <BrandedShopsSliderSection />

      <WorksSeamlesslySection
        personImage={person}
        circleImage={circle}
        orbitDurationSeconds={18}
        logos={[
          { src: google, alt: "Google", angleDeg: 270 },
          { src: shopify, alt: "Shopify", angleDeg: 330 },
          { src: zapier, alt: "Zapier", angleDeg: 30 },
          { src: slack, alt: "Slack", angleDeg: 90 },
          { src: force, alt: "Salesforce", angleDeg: 150 },
          { src: deel, alt: "Deel", angleDeg: 210 },
        ]}
      />

      <NewsletterSubscribeBanner
        leftDecor={img1}
        rightDecor={img2}
        onSubmit={(value) => {
          const email = (value ?? "").trim();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            addToast({
              title: "Enter a valid email",
              description: "Please provide a valid email address.",
              color: "warning",
            });
            return;
          }
          addToast({
            title: "Subscribed",
            description: "Thanks for subscribing — we'll be in touch.",
            color: "success",
          });
        }}
      />
      <FaqSection imageSrc={faq} />

      <EditorialStyleSection
        shopHref="/shop"
        images={{
          heroLeft: gridImg1,
          capTop: gridImg2,
          skateTall: gridImg4,
          toteMid: gridImg3,
          keysSmall: gridImg5,
          catalogLeft: gridImg8,
          kitMid: gridImg7,
          teamRight: gridImg6,
          bottleWide: gridImg9,
        }}
      />
      <TestimonialsOrbitSection />
    </div>
  );
}