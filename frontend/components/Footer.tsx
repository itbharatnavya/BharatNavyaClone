"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isCounterPublicRoute, isCounterWorkspaceRoute } from "@/lib/routePresentation";

const companyLinks = [{ label: "About", href: "/about" }, { label: "AI Guide", href: "/#ask-navya" }, { label: "Navya Blog", href: "/blog" }, { label: "Pricing", href: "/pricing" }];

export default function Footer(){const year=new Date().getFullYear();const pathname=usePathname()||"/";const counterPublic=isCounterPublicRoute(pathname);const counterWorkspace=isCounterWorkspaceRoute(pathname);return <footer className={`bn-footer ${counterPublic||counterWorkspace?"is-counter-public":""}`}><div className="bn-container bn-footer-grid"><div className="bn-footer-brand"><Link href="/" className="bn-wordmark bn-footer-lockup" aria-label="Bharat Navya home">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/bharat-navya-logo.png" alt=""/><span><strong>Bharat Navya</strong><small>Suppliers, services and jobs across India.</small></span></Link></div><div><h2>Bharat Navya</h2><ul className="bn-footer-links">{companyLinks.map(link=><li key={link.label}><Link href={link.href}>{link.label}</Link></li>)}</ul></div></div><div className="bn-container bn-footer-bottom"><span>© {year} Bharat Navya. All rights reserved.</span></div></footer>}
