"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isCounterPublicRoute, isCounterWorkspaceRoute } from "@/lib/routePresentation";

const destinations = [
  { name: "Directory", href: "/directory", tagline: "Businesses, products, services and company information.", tone: "var(--bn-green-050)", color: "var(--bn-directory)" },
  { name: "Recruitment", href: "/recruitment", tagline: "Roles, employers and workplace information.", tone: "var(--bn-blue-050)", color: "var(--bn-recruitment)" },
];
const companyLinks = [{ label: "About", href: "/about" }, { label: "AI Guide", href: "/#ask-navya" }, { label: "Navya Blog", href: "/blog" }, { label: "Pricing", href: "/pricing" }];

function DestinationIcon({ recruitment = false }: { recruitment?: boolean }) { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{recruitment ? <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/></> : <><path d="M4 21V7l8-4 8 4v14M8 10h2m4 0h2m-8 4h2m4 0h2M9 21v-3h6v3"/></>}</svg> }

export default function Footer(){const year=new Date().getFullYear();const pathname=usePathname()||"/";const counterPublic=isCounterPublicRoute(pathname);const counterWorkspace=isCounterWorkspaceRoute(pathname);return <footer className={`bn-footer ${counterPublic||counterWorkspace?"is-counter-public":""}`}><div className="bn-container bn-footer-grid"><div className="bn-footer-brand"><Link href="/" className="bn-wordmark" aria-label="Bharat Navya home">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/bharat-navya-logo.png" alt=""/><span>Bharat Navya</span></Link><p>A next-generation B2B platform.</p><small>Bharat Navya makes business information more structured, discoverable, and actionable. Business directories, AI-guided discovery, recruitment, and future growth tools connect identity, evidence, context, and clear next steps—helping businesses and professionals move from information to action.</small></div><div><h2>Destinations</h2><ul>{destinations.map((destination,index)=><li key={destination.name}><Link href={destination.href}><span style={{background:destination.tone,color:destination.color}}><DestinationIcon recruitment={index===1}/></span><span><strong>{destination.name}</strong><small>{destination.tagline}</small></span></Link></li>)}</ul></div><div><h2>Bharat Navya</h2><ul className="bn-footer-links">{companyLinks.map(link=><li key={link.label}><Link href={link.href}>{link.label}</Link></li>)}</ul></div></div><div className="bn-container bn-footer-bottom"><span>© {year} Bharat Navya. All rights reserved.</span><span>Discover better. Understand deeper. Act smarter.</span></div></footer>}
