"use client";

// components/admin/BoostsTab.tsx — SELF-SERVE BOOSTS moderation queue.
// Sellers request to promote a listing (feature / top-of-category / rank) for N days;
// each arrives PENDING. Approving APPLIES the boost to the listing (isFeatured window
// or a rankBoostScore lift) and flips the request to "active"; rejecting drops it.
// adminGetBoosts(status), adminApproveBoost(id), adminRejectBoost(id).

import React, { useEffect, useState } from "react";
import {
  adminGetBoosts,
  adminApproveBoost,
  adminRejectBoost,
  type BoostRequestRow,
} from "./adminApi";
import {
  SectionHeader,
  FilterTabs,
  AdminTable,
  Row,
  Td,
  Pill,
  LoadingState,
  ErrorState,
  EmptyState,
  fmtDate,
} from "./ui";
import Button from "@/components/Button";
import { useToast } from "@/components/Toast";

type StatusFilter = "all" | "pending" | "active" | "rejected";

const TABS: { value: StatusFilter; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

const TYPE_LABELS: Record<string, string> = {
  feature: "Feature listing",
  category_top: "Top of category",
  rank: "Rank boost",
};

export default function BoostsTab() {
  const { addToast } = useToast();
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [boosts, setBoosts] = useState<BoostRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setBoosts(await adminGetBoosts(status));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load boost requests");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function approve(b: BoostRequestRow) {
    setBusyId(b.id);
    try {
      await adminApproveBoost(b.id);
      addToast("Boost approved and applied", "success");
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed", "error");
    } finally {
      setBusyId(null);
    }
  }
  async function reject(b: BoostRequestRow) {
    setBusyId(b.id);
    try {
      await adminRejectBoost(b.id);
      addToast("Boost request rejected", "info");
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed", "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <SectionHeader
        title="Boosts"
        subtitle="Seller boost requests. Approving applies the boost to the listing."
        actions={
          <span className="text-sm text-muted">{boosts.length} request(s)</span>
        }
      />
      <div className="mb-4">
        <FilterTabs
          tabs={TABS}
          value={status}
          onChange={(v) => setStatus(v as StatusFilter)}
        />
      </div>

      {loading ? (
        <LoadingState label="Loading boost requests…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : boosts.length === 0 ? (
        <EmptyState
          title="No boost requests"
          hint="No requests match this filter."
        />
      ) : (
        <AdminTable
          columns={[
            "Seller",
            "Listing",
            "Type",
            "Days",
            "Status",
            "Requested",
            "Actions",
          ]}
        >
          {boosts.map((b) => {
            const busy = busyId === b.id;
            return (
              <Row key={b.id}>
                <Td className="font-medium text-ink">
                  {b.sellerCompany || b.sellerId}
                </Td>
                <Td>
                  <a
                    href={`/listing/${b.listingId}`}
                    className="font-medium text-brand hover:underline"
                  >
                    {b.listingTitle || b.listingId}
                  </a>
                </Td>
                <Td className="text-muted">
                  {b.boostLabel || TYPE_LABELS[b.boostType] || b.boostType}
                </Td>
                <Td className="whitespace-nowrap text-muted">{b.days} days</Td>
                <Td>
                  <Pill status={b.status}>{b.status}</Pill>
                </Td>
                <Td className="whitespace-nowrap text-muted">
                  {fmtDate(b.createdAt)}
                </Td>
                <Td>
                  {b.status === "pending" ? (
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="brand"
                        disabled={busy}
                        onClick={() => approve(b)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => reject(b)}
                      >
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-faint">
                      {b.approvedAt
                        ? `Applied ${fmtDate(b.approvedAt)}`
                        : b.rejectedAt
                        ? `Rejected ${fmtDate(b.rejectedAt)}`
                        : "—"}
                    </span>
                  )}
                </Td>
              </Row>
            );
          })}
        </AdminTable>
      )}
    </div>
  );
}
