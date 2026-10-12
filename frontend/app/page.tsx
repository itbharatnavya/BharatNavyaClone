"use client";

import TradeGridBg from "@/components/home/TradeGridBg";
import HeroStage from "@/components/home/HeroStage";
import HomeSections from "@/components/home/HomeSections";

export default function BharatNavyaHome() {
  return <div className="le-page counter-home-page">
    <section className="le-hero bn-home-hero" aria-labelledby="home-title"><TradeGridBg /><div className="le-shell">
      <h1 id="home-title"><span>The B2B platform</span> built for what’s next.</h1>
      <HeroStage />
    </div></section>

    <HomeSections />
  </div>;
}
