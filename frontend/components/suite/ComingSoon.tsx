"use client";

// Shared "Coming soon" product landing used by the Credit Card and Mutual
// teaser pages. On-brand hero: breadcrumb · product glyph · name · value prop ·
// a "Coming soon" badge · a "Notify me / Talk to us" mailto CTA · and a route
// back to all products. No live functionality — purely a teaser.

import React from "react";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import { CONTACT_EMAIL, type SuiteProduct } from "./products";

export default function ComingSoon({ product }: { product: SuiteProduct }) {
  const { Icon } = product;
  const subject = encodeURIComponent(`Notify me about ${product.fullName}`);
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${subject}`;

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        background:
          "radial-gradient(1000px 440px at 50% -10%, var(--brand-tint) 0%, rgba(239,246,255,0) 60%)," +
          "radial-gradient(720px 360px at 88% 4%, var(--action-tint) 0%, rgba(255,247,237,0) 58%)," +
          "var(--canvas)",
      }}
    >
      <div className="container-bs" style={{ paddingTop: 28 }}>
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: product.name },
          ]}
        />
      </div>

      <div
        className="container-bs"
        style={{
          textAlign: "center",
          paddingTop: "clamp(36px, 6vw, 60px)",
          paddingBottom: "clamp(56px, 9vw, 96px)",
          maxWidth: 760,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 72,
            height: 72,
            margin: "0 auto",
            borderRadius: 20,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#fff",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-card)",
            color: "var(--brand)",
          }}
        >
          <Icon size={34} />
        </span>

        <div style={{ marginTop: 22 }}>
          <span className="badge badge-neutral" style={{ fontSize: 12 }}>
            Coming soon
          </span>
        </div>

        <h1
          style={{
            fontSize: "clamp(32px, 5vw, 52px)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.06,
            color: "var(--ink)",
            marginTop: 16,
          }}
        >
          {product.fullName}
        </h1>
        <p
          style={{
            fontSize: "clamp(16px, 2.2vw, 19px)",
            color: "var(--muted)",
            maxWidth: 560,
            margin: "18px auto 0",
            lineHeight: 1.6,
          }}
        >
          {product.tagline} We&apos;re building it as part of the BharatSource suite — leave your details and we&apos;ll tell you the moment it goes live.
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 12,
            marginTop: 30,
          }}
        >
          <a href={mailto} className="btn btn-brand btn-lg">
            Notify me / Talk to us
          </a>
          <Link href="/" className="btn btn-secondary btn-lg">
            Back to all products
          </Link>
        </div>

        <p style={{ fontSize: 13, color: "var(--faint)", marginTop: 18 }}>
          One BharatSource account will work across every product.
        </p>
      </div>
    </div>
  );
}
