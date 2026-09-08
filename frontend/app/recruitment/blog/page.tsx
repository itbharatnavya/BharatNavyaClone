"use client";

// /recruitment/blog — Recruitment's own blog surface (build plan Phase 7). A filtered
// view of the existing generic blog list (blogs.js, reused as-is) — no new collection,
// no parallel authoring flow. Recruiters already publish here via the dashboard's
// Blogs tab (reused BlogsTab.tsx); this page is just the reader-facing index, scoped
// to authorType=employer via the same GET /api/blogs the suite-wide /blog page uses.
// The suite-wide /blog page is untouched — this is an additional, filtered entry point.

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getBlogs } from "@/lib/api";
import type { Blog } from "@/lib/types";
import Avatar from "@/components/Avatar";

const fmtDate = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

export default function RecruitmentBlogPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBlogs({ authorType: "employer" })
      .then(setBlogs)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load articles"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="counter-public-page counter-editorial counter-recruitment-editorial">
      <header className="counter-support-hero is-ink">
        <div className="counter-support-shell counter-editorial-heading">
          <h1>Hiring context from companies on Bharat Navya.</h1>
          <p>Guides, workplace notes and hiring updates published by the recruiters and companies behind current roles.</p>
        </div>
      </header>

      <div className="counter-support-shell counter-editorial-index">

      {loading ? (
        <div className="rb-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <div className="skeleton" style={{ height: 170, borderRadius: 12 }} />
              <div className="skeleton" style={{ height: 18, width: "80%", marginTop: 12 }} />
              <div className="skeleton" style={{ height: 14, width: "50%", marginTop: 8 }} />
            </div>
          ))}
        </div>
      ) : error ? (
        <p style={{ color: "var(--error)" }}>{error}</p>
      ) : blogs.length === 0 ? (
        <div className="card card-flat card-pad" style={{ textAlign: "center", color: "var(--muted)", padding: 48 }}>
          No articles published yet. Check back soon.
        </div>
      ) : (
        <div className="rb-grid">
          {blogs.map((b) => {
            const dateStr = fmtDate(b.publishedAt || b.createdAt);
            const companyName = b.authorName || "Company";
            const companySlug = b.sellerSlug;
            return (
              <article key={b.id} className="card rb-card">
                <Link href={`/blog/${b.slug}`} className="rb-card-main">
                  <div className="rb-cover">
                    {b.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.coverImage} alt={b.title} className="rb-cover-img" />
                    ) : (
                      <div className="rb-cover-fallback" aria-hidden>
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="rb-body">
                    {b.tags?.[0] && <span className="badge badge-neutral" style={{ marginBottom: 8 }}>{b.tags[0]}</span>}
                    <h2 className="line-clamp-2 rb-card-title">{b.title}</h2>
                    {b.excerpt && <p className="line-clamp-2" style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 8 }}>{b.excerpt}</p>}
                  </div>
                </Link>

                <div className="rb-author">
                  {companySlug ? (
                    <Link href={`/employer/${companySlug}`} className="rb-author-link" title={`Visit ${companyName}`}>
                      <Avatar src={b.author?.logo} name={companyName} size={30} />
                      <span className="rb-author-text">
                        <span className="rb-author-name rb-author-name--link">{companyName}</span>
                        <span className="rb-author-meta">{[b.author?.city, dateStr].filter(Boolean).join(" · ")}</span>
                      </span>
                    </Link>
                  ) : (
                    <span className="rb-author-link" style={{ cursor: "default" }}>
                      <Avatar src={b.author?.logo} name={companyName} size={30} />
                      <span className="rb-author-text">
                        <span className="rb-author-name">{companyName}</span>
                        <span className="rb-author-meta">{dateStr}</span>
                      </span>
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      </div>

      <style jsx>{`
        .rb-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
        .rb-card { overflow: hidden; height: 100%; display: flex; flex-direction: column; }
        .rb-card-main { display: block; color: inherit; }
        .rb-cover { aspect-ratio: 16 / 9; background: var(--bg-subtle); border-bottom: 1px solid var(--border); overflow: hidden; }
        .rb-cover-img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .rb-cover-fallback { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--faint); background: linear-gradient(120deg, var(--tricolor-green-tint), var(--bg-subtle)); }
        .rb-body { padding: 18px; }
        .rb-card-title { font-size: 17px; font-weight: 600; line-height: 1.35; color: var(--ink); }
        .rb-author { margin-top: auto; padding: 12px 18px 16px; border-top: 1px solid var(--border); }
        .rb-author-link { display: flex; align-items: center; gap: 10px; min-width: 0; max-width: 100%; color: inherit; }
        .rb-author-text { display: flex; flex-direction: column; min-width: 0; }
        .rb-author-name { font-size: 13px; font-weight: 600; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .rb-author-name--link { color: var(--tricolor-green-hover); }
        .rb-author-link:hover .rb-author-name--link { text-decoration: underline; }
        .rb-author-meta { font-size: 12px; color: var(--faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        @media (max-width: 900px) { .rb-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 560px) { .rb-grid { grid-template-columns: minmax(0, 1fr); } }
      `}</style>
    </div>
  );
}
