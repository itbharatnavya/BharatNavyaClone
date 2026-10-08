"use client";

import HeroStage from "@/components/home/HeroStage";
import HomeSections from "@/components/home/HomeSections";

export default function BharatNavyaHome() {
  return <div className="le-page counter-home-page">
    <section className="le-hero bn-home-hero" aria-labelledby="home-title"><div className="le-shell">
      <h1 id="home-title"><span>The B2B platform</span> built for what’s next.</h1>
      <p>Discover products, evaluate suppliers, explore roles, and turn everyday business requirements into new opportunities.</p>
      <HeroStage />
    </div></section>

    <HomeSections />
  </div>;
}
