"use client";

import React from "react";
import { useTr } from "@/components/discovery/hooks";
import Reveal from "@/components/Reveal";

function SearchIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H8l-4 4V6a2 2 0 012-2h13a2 2 0 012 2z" />
    </svg>
  );
}
function DealIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export default function HowItWorks() {
  const t = useTr();
  const steps = [
    {
      icon: <SearchIcon />,
      title: t("home.how.step1.title", "Search or ask the AI"),
      body: t(
        "home.how.step1.body",
        "Describe what you need in plain words. Our concierge finds the right products, services and vendors across India."
      ),
    },
    {
      icon: <ChatIcon />,
      title: t("home.how.step2.title", "Connect directly"),
      body: t(
        "home.how.step2.body",
        "Chat, call or WhatsApp verified sellers. Send an enquiry or an RFQ that fans out to matching providers."
      ),
    },
    {
      icon: <DealIcon />,
      title: t("home.how.step3.title", "Compare & close"),
      body: t(
        "home.how.step3.body",
        "See transparent pricing, trust badges and reviews. Pick the best offer and deal on your own terms."
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {steps.map((s, i) => (
        <Reveal key={i} delay={i * 90}>
        <div className="card card-flat card-pad">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <span
              style={{
                width: 48,
                height: 48,
                borderRadius: "var(--r-sm)",
                background: "var(--brand-tint)",
                color: "var(--brand)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {s.icon}
            </span>
            <span
              style={{
                fontSize: "var(--fs-2xl)",
                fontWeight: 800,
                color: "var(--border-strong)",
                lineHeight: 1,
              }}
            >
              {i + 1}
            </span>
          </div>
          <h3 style={{ fontSize: "var(--fs-md)", fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>
            {s.title}
          </h3>
          <p style={{ fontSize: "var(--fs-sm)", color: "var(--muted)" }}>{s.body}</p>
        </div>
        </Reveal>
      ))}
    </div>
  );
}
