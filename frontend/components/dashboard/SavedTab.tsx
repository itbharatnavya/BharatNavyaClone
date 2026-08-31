"use client";

// SavedTab — the dashboard's view of the buyer's shortlist (heart icon).
// Visible to every logged-in user (buyer or seller) — saving products is a
// buyer action either kind of account can do. Reuses ShortlistGrid, the same
// resolve-and-render component the standalone /shortlist page uses, so both
// surfaces always show the same set.

import React from "react";
import Link from "next/link";
import type { User } from "@/lib/types";
import { useShortlist } from "@/lib/shortlist";
import ShortlistGrid from "@/components/ShortlistGrid";
import { PanelHeader, useTr } from "./shared";

interface Props {
  user: User;
}

export default function SavedTab({ user }: Props) {
  void user;
  const tr = useTr();
  const { ids, loading } = useShortlist();

  return (
    <div>
      <PanelHeader
        title={tr("dashboard.saved.title", "Saved")}
        subtitle={tr("dashboard.saved.subtitle", "Products you've saved with the heart icon.")}
        actions={
          <Link href="/categories" className="btn btn-secondary btn-sm">
            {tr("dashboard.saved.browse", "Browse categories")}
          </Link>
        }
      />
      <ShortlistGrid ids={ids} loading={loading} />
    </div>
  );
}
