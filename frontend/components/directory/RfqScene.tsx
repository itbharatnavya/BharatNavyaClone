"use client";

// Directory, buyer side: "One requirement. Many quotes." A requirement types itself
// out, fans out to suppliers and quotes come back to compare (best price and fastest
// delivery flagged). The whole sequence is scrubbed to scroll. Supplier names come
// from the live featured list; prices are sample figures and are labelled as such.
// Styles: .rfq-* in app/counter-soft-system.css.

import { useRef } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { useFeaturedSellers } from "@/lib/catalog";
import { useStory } from "@/components/home/useStory";

const FIELDS = [
  { label: "Item", value: "TMT bars, Fe-500D 12 mm" },
  { label: "Quantity", value: "20 tonnes" },
  { label: "Deliver to", value: "Pune" },
];
const QUOTES = [
  { price: "₹56,400", days: "3 days" },
  { price: "₹54,700", days: "4 days", best: true },
  { price: "₹55,800", days: "2 days", fast: true },
];
const FALLBACK = ["Supplier A", "Supplier B", "Supplier C"];

export default function RfqScene() {
  const root = useRef<HTMLElement>(null);
  const { sellers } = useFeaturedSellers();
  const suppliers = [0, 1, 2].map((i) => ({ name: sellers[i]?.companyName || sellers[i]?.name || FALLBACK[i], logo: sellers[i]?.logo as string | undefined }));

  useStory(root, ({ gsap, q }) => {
    const spans = q(".rfq-req dd span");
    const full = spans.map((span) => span.textContent || "");
    const proxy = { p: 0 };
    const write = () => spans.forEach((span, i) => { const part = Math.min(1, Math.max(0, proxy.p * 3 - i)); span.textContent = full[i].slice(0, Math.round(full[i].length * part)); });
    gsap.set(q(".rfq-wire"), { svgOrigin: "0 150" });
    gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: q(".rfq-board")[0], start: "top 78%", end: "top 20%", scrub: 0.5, invalidateOnRefresh: true } })
      .to(proxy, { p: 1, duration: 3, onUpdate: write }, 0)
      .to(q(".rfq-post"), { scale: 0.94, duration: 0.12 }, 3.1)
      .to(q(".rfq-post"), { scale: 1, duration: 0.12 }, 3.22)
      .fromTo(q(".rfq-wire"), { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 1, stagger: 0.15 }, 3.3)
      .fromTo(q(".rfq-quote"), { x: 36, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, stagger: 0.25 }, 3.9)
      .fromTo(q(".rfq-badge"), { scale: 0 }, { scale: 1, duration: 0.4, stagger: 0.2, ease: "power2.out" }, 5);
    return () => spans.forEach((span, i) => { span.textContent = full[i]; });
  });

  return <section ref={root} className="ps-sec rfq" aria-labelledby="rfq-title"><div className="le-shell">
    <header className="le-section-head"><div><h2 id="rfq-title">One requirement. Many quotes.</h2></div><p>Post what you need once. Relevant suppliers reply with price and delivery, and you compare them side by side.</p><Link className="le-button is-primary" href="/rfq">Post a requirement</Link></header>
    <div className="rfq-board">
      <div className="rfq-req">
        <p className="hs-eyebrow">Your requirement</p>
        <dl>{FIELDS.map((field) => <div key={field.label}><dt>{field.label}</dt><dd><span>{field.value}</span></dd></div>)}</dl>
        <span className="rfq-post">Post requirement</span>
      </div>
      <svg className="rfq-wires" viewBox="0 0 100 300" preserveAspectRatio="none" aria-hidden focusable="false">
        {[50, 150, 250].map((y) => <path key={y} d={`M0 150 C50 150 50 ${y} 100 ${y}`} className="rfq-wire" />)}
      </svg>
      <ol className="rfq-quotes">
        {QUOTES.map((quote, i) => <li key={i} className="rfq-quote">
          <Avatar src={suppliers[i].logo} name={suppliers[i].name} size={40} />
          <span className="rfq-quote-who"><strong>{suppliers[i].name}</strong><small>Delivery in {quote.days}</small></span>
          <b>{quote.price}<small>/ tonne</small></b>
          {quote.best && <em className="rfq-badge">Best price</em>}
          {quote.fast && <em className="rfq-badge is-fast">Fastest</em>}
        </li>)}
      </ol>
    </div>
    <p className="rfq-note">Sample figures, shown for illustration. Real quotes come from suppliers who match your requirement.</p>
  </div></section>;
}
