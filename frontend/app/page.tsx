"use client";

import HeroStage from "@/components/home/HeroStage";
import HomeSections from "@/components/home/HomeSections";
import ApiAdvertisingSlot from "@/components/evidence/ApiAdvertisingSlot";

export default function BharatNavyaHome() {
  return <div className="le-page counter-home-page">
    <section className="le-hero bn-home-hero" aria-labelledby="home-title"><div className="le-shell">
      <h1 id="home-title"><span>The B2B platform</span> built for what’s next.</h1>
      <p>Discover products, evaluate suppliers, explore roles, and turn everyday business requirements into new opportunities.</p>
      <HeroStage />
    </div></section>

    {/* home_hero campaigns (seller self-serve + admin bookings). Renders nothing when none are live. */}
    <div className="le-shell bn-home-ad" style={{ paddingBlock: "1.5rem 0" }}>
      <ApiAdvertisingSlot compact showFallback={false} placement="home_hero" kind="native" context="Sponsored on the homepage" summary="A clearly labelled placement, separate from organic discovery." action="View promotion" />
    </div>

    <HomeSections />
  </div>;
}
