"use client";

import { ABOUT_PAGES } from "@/components/about/company";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isCounterPublicRoute, isCounterWorkspaceRoute } from "@/lib/routePresentation";

const companyLinks = [...ABOUT_PAGES.map((page) => ({ label: page.label, href: page.href })), { label: "Ask Navya", href: "/#ask-navya" }];

// App store badges. The apps aren't out yet, so these are labelled "Coming soon" and are not
// links; give each one an href (store URL) once the apps are published. Store logos are inline
// SVG (owner asked for the real marks), no external files.
const APPS = [
  { store: "Google Play", line: "Get it on", href: null as string | null, icon: <svg aria-hidden viewBox="0 0 24 24" className="is-logo"><path fill="#4285F4" d="M3.6 1.8 13.8 12 3.6 22.2c-.3-.2-.5-.6-.5-1.1V2.9c0-.5.2-.9.5-1.1z"/><path fill="#34A853" d="M17.1 8.7 13.8 12 3.6 1.8c.2-.1.5-.1.8 0l12.7 6.9z"/><path fill="#EA4335" d="M17.1 15.3 4.4 22.2c-.3.2-.6.2-.8 0L13.8 12l3.3 3.3z"/><path fill="#FBBC04" d="M21 12c0 .5-.3 1-.8 1.2l-3.1 2.1L13.8 12l3.3-3.3 3.1 2.1c.5.2.8.7.8 1.2z"/></svg> },
  { store: "App Store", line: "Download on the", href: null as string | null, icon: <svg aria-hidden viewBox="0 0 24 24" className="is-logo"><path fill="#fff" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg> },
];
function AppBadges(){return <div className="bn-footer-apps"><p>Get the app <em>Coming soon</em></p><div>{APPS.map(app=>{const inner=<>{app.icon}<span><small>{app.line}</small><strong>{app.store}</strong></span></>;return app.href?<a key={app.store} className="bn-app-badge" href={app.href} target="_blank" rel="noreferrer">{inner}</a>:<span key={app.store} className="bn-app-badge" aria-disabled="true" title="Coming soon">{inner}</span>})}</div></div>}

export default function Footer(){const year=new Date().getFullYear();const pathname=usePathname()||"/";const counterPublic=isCounterPublicRoute(pathname);const counterWorkspace=isCounterWorkspaceRoute(pathname);return <footer className={`bn-footer ${counterPublic||counterWorkspace?"is-counter-public":""}`}><div className="bn-container bn-footer-grid"><div className="bn-footer-brand"><Link href="/" className="bn-wordmark bn-footer-lockup" aria-label="Bharat Navya home">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/bharat-navya-logo.png" alt=""/><span><strong>Bharat Navya</strong><small>Suppliers, services and jobs across India.</small></span></Link><AppBadges /></div><div><h2>Bharat Navya</h2><ul className="bn-footer-links">{companyLinks.map(link=><li key={link.label}><Link href={link.href}>{link.label}</Link></li>)}</ul></div></div><div className="bn-container bn-footer-bottom"><span>© {year} Bharat Navya. All rights reserved.</span></div></footer>}
