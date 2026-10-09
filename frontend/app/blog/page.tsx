"use client";

// /blog — index of published VENDOR blogs. Each card promotes its authoring
// vendor (seller): it shows the vendor's company name + logo + city and is
// interlinked — the card body links to /blog/<slug>, the vendor name links to
// /seller/<slug>. Cover uses coverImage with a soft-gradient fallback.

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AboutSwitcher } from "@/components/about/AboutShell";
import { getBlogs } from "@/lib/api";
import type { Blog } from "@/lib/types";
import { useTr } from "@/components/discovery/hooks";
import Avatar from "@/components/Avatar";
import { useVendorAuthors } from "@/components/seller/vendorAuthors";

const fmtDate = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export default function BlogIndexPage() {
  const t = useTr();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { authorFor } = useVendorAuthors(blogs);

  useEffect(() => {
    getBlogs()
      .then(setBlogs)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load blogs"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="counter-public-page counter-editorial">
      <header className="counter-support-hero is-ivory">
        <div className="counter-support-shell counter-editorial-heading">
          <h1>Business updates worth keeping in view.</h1>
          <p>Practical insights, company developments, and timely updates that help you understand businesses and make more informed decisions across Bharat Navya.</p>
        </div>
      </header>
      <div className="counter-support-shell ap-blog-switch"><AboutSwitcher /></div>

      <div className="counter-support-shell counter-editorial-index">

      {loading ? (
        <div className="blog-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <div className="skeleton" style={{ height: 170, borderRadius: "var(--r-sm)" }} />
              <div className="skeleton" style={{ height: 18, width: "80%", marginTop: 12 }} />
              <div className="skeleton" style={{ height: 14, width: "50%", marginTop: 8 }} />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="counter-public-state" role="status">
          Updates are temporarily unavailable. Please try again shortly.
        </div>
      ) : blogs.length === 0 ? (
        <div
          className="card card-flat card-pad"
          style={{ textAlign: "center", color: "var(--muted)", padding: 48 }}
        >
          {t("blog.empty", "No articles published yet. Check back soon.")}
        </div>
      ) : (
        <div className="blog-grid">
          {blogs.map((b) => {
            const vendor = authorFor(b);
            const dateStr = fmtDate(b.publishedAt || b.createdAt);
            return (
              <article key={b.id} className="card blog-card">
                {/* Card body → the article. A separate sibling link (below) points
                    at the vendor, so no anchors are nested. */}
                <Link href={`/blog/${b.slug}`} className="blog-card-main">
                  <div className="blog-cover">
                    {b.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.coverImage} alt={b.title} className="blog-cover-img" loading="lazy" decoding="async" />
                    ) : (
                      <div className="blog-cover-fallback" aria-hidden>
                        <svg
                          width="26"
                          height="26"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="blog-body">
                    {b.tags?.[0] && (
                      <span className="badge badge-neutral" style={{ marginBottom: 8 }}>
                        {b.tags[0]}
                      </span>
                    )}
                    <h2 className="line-clamp-2 blog-card-title">{b.title}</h2>
                    {b.excerpt && (
                      <p
                        className="line-clamp-2"
                        style={{ fontSize: "var(--fs-sm)", color: "var(--muted)", marginTop: 8 }}
                      >
                        {b.excerpt}
                      </p>
                    )}
                  </div>
                </Link>

                {/* Vendor / author row — interlinked to the seller profile. */}
                <div className="blog-author">
                  {vendor.slug ? (
                    <Link
                      href={`/seller/${vendor.slug}`}
                      className="blog-author-link"
                      title={`Visit ${vendor.name}`}
                    >
                      <Avatar src={vendor.logo} name={vendor.name} size={30} />
                      <span className="blog-author-text">
                        <span className="blog-author-name blog-author-name--link">
                          {vendor.name}
                        </span>
                        <span className="blog-author-meta">
                          {[vendor.city, dateStr].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                    </Link>
                  ) : (
                    <span className="blog-author-link" style={{ cursor: "default" }}>
                      <Avatar src={vendor.logo} name={vendor.name} size={30} />
                      <span className="blog-author-text">
                        <span className="blog-author-name">{vendor.name}</span>
                        <span className="blog-author-meta">
                          {[vendor.city, dateStr].filter(Boolean).join(" · ")}
                        </span>
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
        .blog-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 20px;
        }
        .blog-card {
          overflow: hidden;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        .blog-card-main {
          display: block;
          color: inherit;
        }
        .blog-cover {
          aspect-ratio: 16 / 9;
          background: var(--bg-subtle);
          border-bottom: 1px solid var(--border);
          overflow: hidden;
        }
        .blog-cover-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .blog-cover-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--faint);
          background: linear-gradient(
            120deg,
            var(--brand-tint, #eff6ff),
            var(--action-tint, #E3EBFF)
          );
        }
        .blog-body {
          padding: 18px;
        }
        .blog-card-title {
          font-size: var(--fs-md);
          font-weight: 600;
          line-height: 1.35;
          color: var(--ink);
        }
        .blog-author {
          margin-top: auto;
          padding: 12px 18px 16px;
          border-top: 1px solid var(--border);
        }
        .blog-author-link {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          max-width: 100%;
          color: inherit;
        }
        .blog-author-text {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .blog-author-name {
          font-size: var(--fs-xs);
          font-weight: 600;
          color: var(--ink);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .blog-author-name--link {
          color: var(--brand);
        }
        .blog-author-link:hover .blog-author-name--link {
          text-decoration: underline;
        }
        .blog-author-meta {
          font-size: var(--fs-xs);
          color: var(--faint);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        @media (max-width: 900px) {
          .blog-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 560px) {
          .blog-grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
    </div>
  );
}
