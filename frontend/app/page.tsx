"use client";

import HeroStage from "@/components/home/HeroStage";
import HomeSections from "@/components/home/HomeSections";

export default function BharatNavyaHome() {
  return <div className="le-page counter-home-page">
    <section className="le-hero bn-home-hero" aria-labelledby="home-title"><div className="le-shell">
      <h1 id="home-title"><span>Suppliers, services and jobs</span> in one place.</h1>
      <HeroStage />
    </div></section>

    <HomeSections />
  </div>;
}
