"use client";

// components/admin/UnmatchedRfqsTab.tsx — the zero-match RFQ triage queue.
// A thin wrapper around RfqLogTab (queueMode) so the two tabs never drift out
// of sync: same table, same backend endpoint (GET /api/admin/inquiries), just
// a locked "unmatched, not yet decided" query and a Dismiss action alongside
// Forward. See RfqLogTab.tsx for the shared implementation.

import RfqLogTab from "./RfqLogTab";

export default function UnmatchedRfqsTab() {
  return <RfqLogTab queueMode />;
}
