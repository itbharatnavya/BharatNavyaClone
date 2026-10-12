"use client";

import DealFlowBg from "@/components/home/DealFlowBg";
import HeroStage from "@/components/home/HeroStage";
import HomeSections from "@/components/home/HomeSections";

export default function BharatNavyaHome() {
  return <div className="le-page counter-home-page">
    <section className="le-hero bn-home-hero" aria-labelledby="home-title"><DealFlowBg /><div className="le-shell">
      <h1 id="home-title"><span>The B2B platform</span> built for what’s next.</h1>
      <HeroStage />
    </div></section>

    <HomeSections />
  </div>;
}
