"use client";

// Directory, seller side: "Be the business people find." While the section is on screen a
// company profile builds itself in four steps (company, verified badge, products, first
// enquiry) and the matching step lights up on the left; it then rests and plays again.
// No scroll locking: it pauses when the section leaves the screen. Styles: .sf-*.

import { useRef } from "react";
import Link from "next/link";
import { useStory } from "@/components/home/useStory";

const STEPS = [
  { title: "Add your company", body: "Name, place and what you do. Takes minutes." },
  { title: "Get verified", body: "A badge shows buyers you are real." },
  { title: "List your products", body: "Add price, minimum order and photos." },
  { title: "Get enquiries", body: "Buyer messages land in one inbox." },
];
const TILES = ["/demo/packaging-2.jpg", "/demo/machinery-2.jpg", "/demo/electronics-2.jpg"];

export default function StorefrontScene() {
  const root = useRef<HTMLElement>(null);
  useStory(root, ({ gsap, ScrollTrigger, q }) => {
    const num = q(".sf-num")[0];
    const proxy = { n: 0 };
    const items = q(".sf-steps li");
    const count = () => { num.textContent = String(Math.round(proxy.n)); }; // also run from the trigger: GSAP skips tween callbacks when it re-measures
    const mark = (index: number) => items.forEach((item, i) => item.setAttribute("aria-current", String(i === index)));
    gsap.set(q(".sf-products li"), { y: 30, opacity: 0 });
    gsap.set(q(".sf-verified"), { scale: 2.4, rotate: -14, opacity: 0 });
    gsap.set(q(".sf-toast"), { x: 40, opacity: 0 });
    gsap.set(q(".sf-foot"), { opacity: 0 });
    const build = (tl: gsap.core.Timeline) => tl
      .fromTo(q(".sf-verified"), { scale: 2.4, rotate: -14, opacity: 0 }, { scale: 1, rotate: 0, opacity: 1, duration: 0.6 }, 0.4)
      .fromTo(q(".sf-products li"), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.12 }, 1.4)
      .fromTo(q(".sf-foot"), { opacity: 0 }, { opacity: 1, duration: 0.4 }, 1.4)
      .fromTo(q(".sf-stars-fill"), { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.6 }, 1.6)
      .fromTo(q(".sf-toast"), { x: 40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5 }, 2.4)
      .fromTo(proxy, { n: 0 }, { n: 27, duration: 0.6 }, 2.4)
      .to({}, { duration: 0.4 }, 3);

    // Plays on its own while the section is in view (about 1.6s per step), holds the finished card,
    // then starts over. Pauses whenever the section is off screen.
    const tl = gsap.timeline({
      paused: true, repeat: -1, repeatDelay: 2.4, defaults: { ease: "power2.out" },
      onUpdate: () => { mark(Math.min(3, Math.floor(tl.time()))); count(); },
      onRepeat: () => mark(0),
    });
    build(tl);
    tl.timeScale(0.62);
    root.current!.dataset.auto = "true";
    const trigger = ScrollTrigger.create({ trigger: q(".sf-stage")[0], start: "top 75%", end: "bottom 25%", onToggle: (self) => (self.isActive ? tl.play() : tl.pause()) });
    return () => { trigger.kill(); tl.kill(); if (root.current) delete root.current.dataset.auto; };
  });
  return <section ref={root} className="ps-sec sf" aria-labelledby="sf-title"><div className="le-shell"><div className="sf-stage">
    <div className="sf-copy">
      <p className="hs-eyebrow">For businesses</p>
      <h2 id="sf-title">Get found by buyers.</h2>
      <ol className="sf-steps">{STEPS.map((step, i) => <li key={step.title} aria-current={i === 0}><b>{i + 1}</b><div><strong>{step.title}</strong><p>{step.body}</p></div></li>)}</ol>
      <Link className="le-button is-primary" href="/sell">List your business</Link>
    </div>
    <div className="sf-visual"><div className="sf-card" aria-hidden>
      <div className="sf-cover" />
      <div className="sf-head">
        <span className="sf-logo">Y</span>
        <div><strong>Your Company Pvt Ltd</strong><small>Pune, Maharashtra</small></div>
        <em className="sf-verified"><svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" /><path d="m9 12 2 2 4-4" /></svg>Verified</em>
      </div>
      <ul className="sf-products">{TILES.map((src) => <li key={src}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={src} alt="" /><i /></li>)}</ul>
      <div className="sf-foot">
        <span className="sf-stars"><span className="sf-stars-base">★★★★★</span><span className="sf-stars-fill">★★★★★</span><b>4.8</b></span>
        <span className="sf-stat"><b className="sf-num">27</b> enquiries this week</span>
      </div>
      <p className="sf-toast"><svg viewBox="0 0 24 24"><path d="M4 6h16v12H4z" /><path d="m4 7 8 6 8-6" /></svg>New enquiry from Pune</p>
    </div></div>
  </div></div></section>;
}
