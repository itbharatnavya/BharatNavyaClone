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

    <HomeSections>
      <ApiAdvertisingSlot placement={["home_hero", "category_top"]} kind="native" context="Sponsored on Bharat Navya" fallbackTitle="Put your business in front of people looking for what you do." fallbackSummary="Feature your business where relevant users are exploring products, services, and suppliers—without changing organic ranking or verification." fallbackAction="Explore placements" summary="A clearly labelled promotion, kept separate from organic records and decision signals." action="View promotion" />
    </HomeSections>
  </div>;
}
