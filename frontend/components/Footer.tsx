"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isCounterPublicRoute, isCounterWorkspaceRoute } from "@/lib/routePresentation";

const companyLinks = [{ label: "About", href: "/about" }, { label: "AI Guide", href: "/#ask-navya" }, { label: "Navya Blog", href: "/blog" }, { label: "Pricing", href: "/pricing" }];

export default function Footer(){const year=new Date().getFullYear();const pathname=usePathname()||"/";const counterPublic=isCounterPublicRoute(pathname);const counterWorkspace=isCounterWorkspaceRoute(pathname);return <footer className={`bn-footer ${counterPublic||counterWorkspace?"is-counter-public":""}`}><div className="bn-container bn-footer-grid"><div className="bn-footer-brand"><Link href="/" className="bn-wordmark" aria-label="Bharat Navya home">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/bharat-navya-logo.png" alt=""/><span>Bharat Navya</span></Link><p>A next-generation B2B platform.</p><small>Bharat Navya makes business information more structured, discoverable, and actionable. Business directories, AI-guided discovery, recruitment, and future growth tools connect identity, evidence, context, and clear next steps—helping businesses and professionals move from information to action.</small></div><div><h2>Bharat Navya</h2><ul className="bn-footer-links">{companyLinks.map(link=><li key={link.label}><Link href={link.href}>{link.label}</Link></li>)}</ul></div></div><div className="bn-container bn-footer-bottom"><span>© {year} Bharat Navya. All rights reserved.</span><span>Discover better. Understand deeper. Act smarter.</span></div></footer>}
