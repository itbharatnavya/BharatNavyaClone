"use client";

// Sidebar for the "user feedback/activity" ask. Deliberately suite-level, not
// Directory data (no live listings/reviews pulled in here — see CLAUDE.md's
// "remove directory-specific context" rule): a short editorial activity log
// plus one representative quote, both static content the same way WHY/ONE_ACCOUNT
// content in the old homepage was static.

import React from "react";
import Reveal from "@/components/Reveal";

interface ActivityItem {
  id: string;
  dot: "brand" | "action" | "neutral";
  text: string;
  time: string;
}

const ACTIVITY: ActivityItem[] = [
  { id: "a1", dot: "brand", text: "40+ verified sellers joined the Directory this week.", time: "2h ago" },
  { id: "a2", dot: "action", text: "Bharat Agent started learning to answer GST and compliance questions.", time: "1d ago" },
  { id: "a3", dot: "brand", text: "A Pune manufacturer shortlisted 5 suppliers in one session.", time: "2d ago" },
  { id: "a4", dot: "neutral", text: "Recruitment entered early development.", time: "4d ago" },
  { id: "a5", dot: "brand", text: "A Surat exporter connected with 3 new buyers via the Directory.", time: "6d ago" },
];

const DOT_COLOR: Record<ActivityItem["dot"], string> = {
  brand: "var(--brand)",
  action: "var(--action)",
  neutral: "var(--faint)",
};

export default function ActivityFeed() {
  return (
    <Reveal delay={160} className="home-activity-sidebar">
      <aside className="card card-flat" style={{ padding: "clamp(18px, 2.6vw, 22px)", minWidth: 0 }} aria-label="Recent activity across Bharat Navya">
        <div className="eyebrow" style={{ marginBottom: 4 }}>Activity</div>
        <h3 style={{ fontSize: "var(--fs-md)", fontWeight: 700, color: "var(--ink)" }}>Across Bharat Navya</h3>

        <ul style={{ listStyle: "none", margin: "16px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          {ACTIVITY.map((item) => (
            <li key={item.id} style={{ display: "flex", gap: 10, minWidth: 0 }}>
              <span aria-hidden style={{ width: 7, height: 7, borderRadius: "50%", background: DOT_COLOR[item.dot], marginTop: 6, flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: "var(--fs-sm)", color: "var(--ink)", lineHeight: 1.5 }}>{item.text}</p>
                <span style={{ fontSize: "var(--fs-xs)", color: "var(--faint)" }}>{item.time}</span>
              </div>
            </li>
          ))}
        </ul>

        <hr className="divider" style={{ margin: "18px 0" }} />

        <blockquote style={{ margin: 0 }}>
          <p style={{ fontSize: "var(--fs-sm)", color: "var(--muted)", lineHeight: 1.6, fontStyle: "italic" }}>
            &ldquo;Finding the right supplier used to take days of calling around. Now it takes an afternoon.&rdquo;
          </p>
          <footer style={{ fontSize: "var(--fs-xs)", color: "var(--faint)", marginTop: 8 }}>— Manufacturing SME, Pune</footer>
        </blockquote>
      </aside>
    </Reveal>
  );
}
