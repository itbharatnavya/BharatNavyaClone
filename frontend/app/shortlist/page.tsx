"use client";

// SHORTLIST — the buyer's saved products. Server-persisted for a logged-in user,
// localStorage for a guest (see lib/shortlist.tsx). The grid is derived from the
// provider's `ids`, so unsaving a card here removes it immediately. Rendering
// itself lives in ShortlistGrid, shared with the dashboard's "Saved" tab.

import React from "react";
import { useShortlist } from "@/lib/shortlist";
import { useAuth } from "@/lib/auth";
import Breadcrumbs from "@/components/Breadcrumbs";
import ShortlistGrid from "@/components/ShortlistGrid";

export default function ShortlistPage() {
  const { ids, loading } = useShortlist();
  const { user } = useAuth();

  const crumbs = [{ label: "Directory", href: "/directory" }, { label: "Shortlist" }];

  return (
    <div className="container-bs" style={{ paddingTop: 24, paddingBottom: 96 }}>
      <Breadcrumbs items={crumbs} />
      <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--ink)", margin: "12px 0 6px" }}>
        Your shortlist
      </h1>
      <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24 }}>
        {user
          ? "Products you've saved — synced to your account."
          : "Products you've saved on this device. Sign in to keep them across devices."}
      </p>

      <ShortlistGrid ids={ids} loading={loading} />
    </div>
  );
}
