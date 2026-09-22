"use client";

// /blog/[slug] — a single VENDOR article. Fetches getBlog(slug), renders the
// markdown body, and interlinks to the authoring vendor: a byline linking to the
// seller profile, and an "About the vendor" card that links to their profile and
// their listings. Author resolution is best-effort (see components/seller/vendorAuthors).

import React, { useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { getBlog } from "@/lib/api";
import type { Blog } from "@/lib/types";
import Breadcrumbs from "@/components/Breadcrumbs";
import Avatar from "@/components/Avatar";
import { useTr } from "@/components/discovery/hooks";
import { useVendorProfile } from "@/components/seller/vendorAuthors";

const fmtDate = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export default function BlogArticlePage({
  params,
}: {
  params: { slug: string };
}) {
  const t = useTr();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { author, profile } = useVendorProfile(blog);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getBlog(params.slug)
      .then((b) => active && setBlog(b))
      .catch((e) =>
        active && setError(e instanceof Error ? e.message : "Article not found")
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [params.slug]);

  if (loading) {
    return (
      <div className="counter-public-page counter-article container-bs section-pad-sm" style={{ maxWidth: 760 }}>
        <div className="skeleton" style={{ height: 20, width: 240, marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 40, width: "90%", marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 280, width: "100%", marginTop: 20 }} />
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div
        className="counter-public-page counter-article container-bs section-pad"
        style={{ maxWidth: 640, textAlign: "center" }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>{t("blog.notFound", "Article not found")}</h1>
        <p style={{ color: "var(--muted)", marginTop: 8 }}>
          {error || t("blog.notFoundMessage", "This article may have been unpublished.")}
        </p>
        <div style={{ marginTop: 20 }}>
          <Link href="/blog" className="btn btn-secondary">
            ← {t("blog.backToBlog", "Back to blog")}
          </Link>
        </div>
      </div>
    );
  }

  const isEmployerAuthor = author?.type === "employer";
  const vendorName = author?.name || (isEmployerAuthor ? "A company on Bharat Navya" : "Bharat Navya company");
  const vendorSlug = author?.slug;
  // Employer authors link to their /employer/<slug> profile, not /seller/<slug> —
  // build plan Phase 7, needed once /recruitment/blog started linking articles here.
  const vendorHref = vendorSlug ? (isEmployerAuthor ? `/employer/${vendorSlug}` : `/seller/${vendorSlug}`) : null;
  const dateStr = fmtDate(blog.publishedAt || blog.createdAt);
  const listingCount = profile?.listings?.length ?? 0;
  const aboutText = profile?.seller?.about;

  return (
    <article className="counter-public-page counter-article container-bs section-pad-sm" style={{ maxWidth: 760 }}>
      <Breadcrumbs
        items={[
          isEmployerAuthor ? { label: "Recruitment blog", href: "/recruitment/blog" } : { label: "Blog", href: "/blog" },
          { label: blog.title },
        ]}
        className="mb-4"
      />

      {blog.tags?.[0] && (
        <span className="badge badge-neutral" style={{ marginTop: 16 }}>
          {blog.tags[0]}
        </span>
      )}

      <h1
        style={{
          fontSize: 34,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          lineHeight: 1.2,
          marginTop: 12,
        }}
      >
        {blog.title}
      </h1>

      {/* Byline — vendor avatar + company name linking to the seller profile */}
      <div
        style={{
          marginTop: 16,
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        {vendorHref ? (
          <Link
            href={vendorHref}
            style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}
            title={`Visit ${vendorName}`}
          >
            <Avatar src={author?.logo} name={vendorName} size={40} />
            <span style={{ color: "var(--brand)", fontWeight: 600, fontSize: 15 }}>
              {vendorName}
            </span>
          </Link>
        ) : (
          <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <Avatar src={author?.logo} name={vendorName} size={40} />
            <span style={{ color: "var(--ink)", fontWeight: 600, fontSize: 15 }}>
              {vendorName}
            </span>
          </span>
        )}
        <span style={{ fontSize: 14, color: "var(--muted)", display: "flex", gap: 8, alignItems: "center" }}>
          {dateStr && <span>{dateStr}</span>}
          {dateStr && typeof blog.views === "number" && blog.views > 0 && <span>·</span>}
          {typeof blog.views === "number" && blog.views > 0 && (
            <span>{blog.views} views</span>
          )}
        </span>
      </div>

      {/* Cover */}
      {blog.coverImage && (
        <div
          style={{
            marginTop: 24,
            borderRadius: 0,
            overflow: "hidden",
            border: "1px solid var(--border)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={blog.coverImage}
            alt={blog.title}
            decoding="async"
            style={{ width: "100%", maxWidth: "100%", display: "block" }}
          />
        </div>
      )}

      {/* Body */}
      <div className="blog-prose" style={{ marginTop: 28 }}>
        <ReactMarkdown components={{ h1: ({ children }) => <h2>{children}</h2> }}>
          {blog.body || ""}
        </ReactMarkdown>
      </div>

      {/* About the vendor — promotional mini-card linking to profile + listings */}
      <div className="vendor-card">
        <div className="vendor-card-head">
          <Avatar src={author?.logo} name={vendorName} size={48} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "var(--faint)", fontWeight: 600, letterSpacing: "0.02em" }}>
              {isEmployerAuthor ? t("blog.aboutCompanyEyebrow", "ABOUT THE COMPANY") : t("blog.aboutVendorEyebrow", "ABOUT THE VENDOR")}
            </div>
            {vendorHref ? (
              <Link
                href={vendorHref}
                className="line-clamp-1"
                style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)" }}
              >
                {vendorName}
              </Link>
            ) : (
              <div className="line-clamp-1" style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>
                {vendorName}
              </div>
            )}
            {author?.city && (
              <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{author.city}</div>
            )}
          </div>
        </div>

        {aboutText && (
          <p className="line-clamp-3" style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, marginTop: 14 }}>
            {aboutText}
          </p>
        )}

        {vendorHref ? (
          <div className="vendor-card-actions">
            <Link href={vendorHref} className="btn btn-primary btn-sm">
              {isEmployerAuthor ? t("blog.viewCompanyProfile", "View company profile") : t("blog.viewVendorProfile", "View vendor profile")}
            </Link>
            {/* Listings are a Directory/seller concept — an employer author has none. */}
            {!isEmployerAuthor && (
              <Link href={vendorHref} className="btn btn-secondary btn-sm">
                {listingCount > 0
                  ? t("blog.viewVendorListingsN", `View ${listingCount} listings`)
                  : t("blog.viewVendorListings", "View their listings")}
              </Link>
            )}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: "var(--faint)", marginTop: 12 }}>
            {isEmployerAuthor
              ? t("blog.companyUnlinked", "This company's public profile isn't available yet.")
              : t("blog.vendorUnlinked", "This vendor's public profile isn't available yet.")}
          </p>
        )}
      </div>

      {/* Footer nav */}
      <div className="divider" style={{ margin: "28px 0 20px" }} />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <Link href={isEmployerAuthor ? "/recruitment/blog" : "/blog"} className="btn btn-ghost btn-sm">
          ← {isEmployerAuthor ? t("blog.allRecruitmentArticles", "All articles") : t("blog.allArticles", "All articles")}
        </Link>
        {vendorHref && (
          <Link href={vendorHref} className="btn btn-secondary btn-sm">
            {t("blog.moreFromVendor", `More from ${vendorName}`)}
          </Link>
        )}
      </div>

      <style>{`
        .blog-prose {
          font-size: 16px;
          line-height: 1.75;
          color: var(--ink);
        }
        .blog-prose > * { margin-bottom: 18px; }
        .blog-prose h1, .blog-prose h2, .blog-prose h3 {
          font-weight: 700;
          letter-spacing: -0.01em;
          margin-top: 32px;
          margin-bottom: 12px;
          line-height: 1.3;
        }
        .blog-prose h1 { font-size: 26px; }
        .blog-prose h2 { font-size: 22px; }
        .blog-prose h3 { font-size: 18px; }
        .blog-prose p { color: var(--ink); }
        .blog-prose a { color: var(--brand); text-decoration: underline; }
        .blog-prose ul, .blog-prose ol { padding-left: 24px; }
        .blog-prose li { margin-bottom: 6px; }
        .blog-prose blockquote {
          border: 0;
          padding: 16px;
          background: var(--bg-subtle);
          color: var(--muted);
          font-style: italic;
        }
        .blog-prose code {
          background: var(--bg-subtle);
          border: 1px solid var(--border);
          border-radius: 0;
          padding: 2px 6px;
          font-size: 0.9em;
        }
        .blog-prose pre {
          background: var(--bg-subtle);
          border: 1px solid var(--border);
          border-radius: 0;
          padding: 16px;
          overflow-x: auto;
        }
        .blog-prose pre code { background: transparent; border: none; padding: 0; }
        .blog-prose img { max-width: 100%; border-radius: 0; margin: 8px 0; }
        .blog-prose hr { border: none; border-top: 1px solid var(--border); }
        .blog-prose table { width: 100%; border-collapse: collapse; display: block; overflow-x: auto; }
        .blog-prose th, .blog-prose td {
          border: 1px solid var(--border);
          padding: 8px 12px;
          text-align: left;
        }
        .vendor-card {
          margin-top: 36px;
          border: 1px solid var(--border);
          border-radius: 0;
          padding: 20px;
          background: var(--bg-subtle);
        }
        .vendor-card-head {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }
        .vendor-card-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 16px;
        }
      `}</style>
    </article>
  );
}
