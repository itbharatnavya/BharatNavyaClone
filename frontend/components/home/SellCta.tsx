"use client";

import React from "react";
import Button from "@/components/Button";
import { useTr } from "@/components/discovery/hooks";

export interface SellCtaProps {
  className?: string;
}

export default function SellCta({ className = "" }: SellCtaProps) {
  const t = useTr();
  return (
    <div
      className={["card card-flat", className].filter(Boolean).join(" ")}
      style={{
        position: "relative",
        overflow: "hidden",
        padding: "clamp(28px, 6vw, 44px) clamp(20px, 5vw, 40px)",
        background: "linear-gradient(120deg, var(--brand-tint) 0%, #ffffff 55%, var(--action-tint) 100%)",
        borderColor: "#dbe6fb",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        <div style={{ maxWidth: 560 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            {t("home.sell.eyebrow", "Grow your business")}
          </div>
          <h2 style={{ fontSize: "var(--fs-xl)", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--ink)" }}>
            {t("home.sell.title", "Sell to buyers across India — free to start")}
          </h2>
          <p style={{ fontSize: "var(--fs-sm)", color: "var(--muted)", marginTop: 10 }}>
            {t(
              "home.sell.subtitle",
              "List your products or services, get verified, and receive enquiries and leads. One account to buy and to sell."
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Button variant="primary" size="lg" href="/sell">
            {t("home.sell.cta", "+ Start selling")}
          </Button>
          <Button variant="secondary" size="lg" href="/pricing">
            {t("home.sell.secondary", "See plans")}
          </Button>
        </div>
      </div>
    </div>
  );
}
