// The About section's shared content: the pages in the About menu (navbar dropdown, footer and
// the switcher on each About page), plus company facts that the owner still has to supply.
// Anything left null / empty here is simply not rendered, so nothing made-up reaches the site:
//   COMPANY.email / phone / address / careersEmail  -> Contact and Careers show them when set
//   LEADERSHIP[].name / photo / bio                 -> Team shows the role only until filled
//   OPEN_ROLES                                       -> Careers shows an empty state when []
import type { ReactNode } from "react";

const glyph = (d: string) => <svg aria-hidden viewBox="0 0 24 24">{d.split("|").map((path) => <path key={path} d={path} />)}</svg>;

export interface AboutPage { href: string; label: string; blurb: string; icon: ReactNode; match: (path: string) => boolean }

export const ABOUT_PAGES: AboutPage[] = [
  { href: "/about", label: "Our story", blurb: "Why we built Bharat Navya", match: (p) => p === "/about", icon: glyph("M4 5h11a3 3 0 0 1 3 3v11H7a3 3 0 0 1-3-3V5z|M18 8h2v11a2 2 0 0 1-2 2|M8 9h6|M8 13h6") },
  { href: "/about/team", label: "Team", blurb: "The people behind it", match: (p) => p === "/about/team", icon: glyph("M16 20v-1.5a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4V20|M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z|M20 20v-1.5a3.5 3.5 0 0 0-2.5-3.3|M15.5 4.3a3.5 3.5 0 0 1 0 6.4") },
  { href: "/careers", label: "Careers", blurb: "Work with us", match: (p) => p === "/careers", icon: glyph("M4 8h16v11H4z|M9 8V6a3 3 0 0 1 6 0v2|M4 13h16") },
  { href: "/blog", label: "Blog", blurb: "Guides and stories", match: (p) => p === "/blog" || p.startsWith("/blog/"), icon: glyph("M5 4h10l4 4v12H5z|M14 4v5h5|M8 13h8|M8 17h5") },
  { href: "/contact", label: "Contact", blurb: "Get help or talk to us", match: (p) => p === "/contact", icon: glyph("M6 7h12a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H9l-4 2v-3.2A3 3 0 0 1 3 15v-5a3 3 0 0 1 3-3Z|M8 12h.01|M12 12h.01|M16 12h.01") },
];

export const isAboutRoute = (path: string) => ABOUT_PAGES.some((page) => page.match(path));

// TODO(owner): fill these in; each line appears on the site only once it has a value.
export const COMPANY: { email: string | null; phone: string | null; address: string | null; hours: string | null; careersEmail: string | null } = {
  email: null,
  phone: null,
  address: null,
  hours: null,
  careersEmail: null,
};

// TODO(owner): add names, photos (local files under /public) and one-line bios.
export const LEADERSHIP: { role: string; area: string; name?: string; photo?: string; bio?: string }[] = [
  { role: "Founder", area: "Vision, partners and the overall product" },
  { role: "Product", area: "What we build and in what order" },
  { role: "Engineering", area: "The platform, search and Ask Navya" },
  { role: "Design", area: "How everything looks and feels" },
  { role: "Growth and partnerships", area: "Bringing businesses and employers on board" },
  { role: "Operations and support", area: "Verification, quality and helping users" },
];

export const TEAMS = [
  { name: "Product and engineering", body: "Builds Directory, Recruitment, search and Ask Navya.", icon: glyph("M8 9l-4 3 4 3|M16 9l4 3-4 3|M13.5 6l-3 12") },
  { name: "Design", body: "Keeps every screen simple, fast and easy on a phone.", icon: glyph("M12 3a9 9 0 1 0 0 18c1 0 1.5-.7 1.5-1.5 0-.5-.3-.9-.3-1.4 0-.8.7-1.4 1.5-1.4H17a4 4 0 0 0 4-4c0-5-4-9.7-9-9.7z|M7.5 11h.01|M10 7.5h.01|M14 7.5h.01") },
  { name: "Partnerships and sales", body: "Works with businesses, employers and advertisers.", icon: glyph("M7 11l3-3 3 2 4-4|M3 12l4 4 3-1 4 4 3-3|M14 19l1-1|M17 16l1-1") },
  { name: "Support and verification", body: "Checks companies and helps people when they get stuck.", icon: glyph("M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z|m9 12 2 2 4-4") },
];

// TODO(owner): Bharat Navya's own openings. Empty = Careers shows "no open roles right now".
export const OPEN_ROLES: { title: string; team: string; location: string; type: string; href: string }[] = [];
