"use client";

// Directory, seller side: "Be the business people find." On roomy screens the section
// pins while a company profile builds itself in four steps (company, verified badge,
// products, first enquiry) and the matching step lights up on the left. Elsewhere the
// same build plays once when it scrolls into view. Styles: .sf-*.

import { useRef } from "react";
import Link from "next/link";
import { useStory } from "@/components/home/useStory";

const STEPS = [
  { title: "Add your company", body: "Name, location and what you do, set up in minutes." },
  { title: "Get verified", body: "A verified badge shows buyers who is really behind the listing." },
  { title: "List your products", body: "Add products and services with price, minimum order and photos." },
  { title: "Receive enquiries", body: "Buyers and requirements reach you in one inbox." },
];
const TILES = ["/demo/packaging-2.jpg", "/demo/machinery-2.jpg", "/demo/electronics-2.jpg"];

export default function StorefrontScene() {
  const root = useRef<HTMLElement>(null);
  useStory(root, ({ gsap, q, wide }) => {
    const section = root.current!;
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

    if (!wide) {
      // Phones and short windows: ordinary scrolling, the build plays once.
      build(gsap.timeline({ defaults: { ease: "power2.out" }, onUpdate: count, scrollTrigger: { trigger: q(".sf-card")[0], start: "top 80%", once: true } }));
      return;
    }
    section.dataset.pinned = "true";
    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: q(".sf-stage")[0],
        start: "top 96px",
        end: () => `+=${Math.round(window.innerHeight * 0.9 * 3.4)}`,
        pin: true, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true,
        snap: { snapTo: "labels", duration: { min: 0.2, max: 0.5 }, ease: "power1.inOut" },
        onUpdate: () => { mark(Math.min(3, Math.round(tl.time()))); count(); },
        onRefresh: count,
      },
    });
    build(tl);
    ["s0", "s1", "s2", "s3"].forEach((label, i) => tl.addLabel(label, i));
    return () => { delete section.dataset.pinned; };
  });
  return <section ref={root} className="ps-sec sf" aria-labelledby="sf-title"><div className="le-shell"><div className="sf-stage">
    <div className="sf-copy">
      <p className="hs-eyebrow">For businesses</p>
      <h2 id="sf-title">Be the business people find.</h2>
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
