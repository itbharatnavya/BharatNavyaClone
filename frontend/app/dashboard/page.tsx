"use client";

import React, { Suspense } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { Loading } from "@/components/dashboard/shared";

// Unified, tabbed dashboard — one identity (OLX-style). Tabs are gated by
// admin feature flags. useSearchParams (for ?tab= and ?c=) requires a Suspense
// boundary under the App Router.
export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="container-bs" style={{ paddingTop: 60, paddingBottom: 60 }}>
          <Loading />
        </div>
      }
    >
      <DashboardShell />
    </Suspense>
  );
}
