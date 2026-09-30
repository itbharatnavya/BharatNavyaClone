"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import EvidenceMedia from "@/components/evidence/EvidenceMedia";
import { getBlogs } from "@/lib/api";
import type { Blog } from "@/lib/types";

export default function AboutBlogPreview() {
  const [sellerBlogs, setSellerBlogs] = useState<Blog[]>([]);
  const [employerBlogs, setEmployerBlogs] = useState<Blog[]>([]);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      getBlogs({ authorType: "seller" }),
      getBlogs({ authorType: "employer" }),
    ]).then((results) => {
      if (!active) return;
      const [sellerResult, employerResult] = results;
      if (sellerResult.status === "fulfilled") setSellerBlogs(sellerResult.value || []);
      if (employerResult.status === "fulfilled") setEmployerBlogs(employerResult.value || []);
    });
    return () => {
      active = false;
    };
  }, []);

  const guides = [...sellerBlogs, ...employerBlogs]
    .filter((blog) => blog.coverImage)
    .slice(0, 4);

  if (guides.length === 0) return null;

  return (
    <section className="counter-support-section counter-about-blog" aria-labelledby="about-blog-title">
      <div className="counter-support-shell">
        <header className="counter-about-blog-head">
          <div>
            <h2 id="about-blog-title">Ideas shaping better business decisions.</h2>
            <p>Practical context from companies and employers across Bharat Navya.</p>
          </div>
          <Link href="/blog">View all articles <span aria-hidden>→</span></Link>
        </header>

        <div className="le-editorial-grid counter-about-blog-grid">
          {guides.map((guide) => (
            <Link href={`/blog/${guide.slug}`} key={guide.id}>
              <EvidenceMedia
                asset={{
                  src: guide.coverImage!,
                  alt: `Cover for ${guide.title}`,
                  kind: "article",
                  source: "api",
                }}
                ratio="wide"
              />
              <span className="le-editorial-copy">
                <small>{guide.author?.companyName || guide.authorName || "Bharat Navya"}</small>
                <strong>{guide.title}</strong>
                <p>{guide.excerpt || "Practical context for growing companies and applicants."}</p>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
