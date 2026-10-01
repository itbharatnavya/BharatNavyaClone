// Closing section shared by Directory and Recruitment: three recent articles on the
// left, one call-to-action panel on the right. Styles: .ps-stories* / .ps-cta in
// app/counter-soft-system.css.

import Link from "next/link";
import type { Blog } from "@/lib/types";

export interface CtaPanel {
  eyebrow: string;
  title: string;
  body: string;
  primary: { href: string; label: string };
  secondary: { href: string; label: string };
}

function Arrow() { return <svg aria-hidden viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>; }

function shortDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
}

export default function StoriesCta({ id, title, lead, blogs, allHref, allLabel, panel }: {
  id: string;
  title: string;
  lead: string;
  blogs: Blog[];
  allHref: string;
  allLabel: string;
  panel: CtaPanel;
}) {
  const shown = blogs.filter((blog) => blog.coverImage).slice(0, 3);
  return <section className="ps-sec ps-stories" aria-labelledby={id}><div className="le-shell ps-stories-grid">
    <div className="ps-stories-list">
      <header>
        <div><h2 id={id}>{title}</h2><p>{lead}</p></div>
        <Link className="hs-link" href={allHref}>{allLabel}<Arrow /></Link>
      </header>
      {shown.length > 0
        ? <ul>{shown.map((blog) => <li key={blog.id}><Link href={`/blog/${blog.slug}`}>
            <span className="ps-thumb">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={blog.coverImage!} alt="" loading="lazy" /></span>
            <span className="ps-story-copy"><small>{blog.author?.companyName || blog.authorName || "Bharat Navya"} · {shortDate(blog.publishedAt)}</small><strong>{blog.title}</strong></span>
            <Arrow />
          </Link></li>)}</ul>
        : <p className="ps-empty">Articles will appear here as they are published.</p>}
    </div>
    <aside className="ps-cta">
      <p className="hs-eyebrow">{panel.eyebrow}</p>
      <h3>{panel.title}</h3>
      <p>{panel.body}</p>
      <div className="ps-cta-actions">
        <Link className="le-button is-primary" href={panel.primary.href}>{panel.primary.label}</Link>
        <Link className="le-button" href={panel.secondary.href}>{panel.secondary.label}</Link>
      </div>
    </aside>
  </div></section>;
}
