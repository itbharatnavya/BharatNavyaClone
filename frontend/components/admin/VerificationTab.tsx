"use client";

// components/admin/VerificationTab.tsx — seller verification review queue.
// A seller submits GST/PAN via the dashboard "Get verified" card; approving here sets
// the verified badge + trust seal (+1yr) on their profile.

import React, { useEffect, useMemo, useState } from "react";
import {
  adminGetVerifications,
  adminApproveVerification,
  adminRejectVerification,
  type AdminVerification,
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

type StatusFilter = "all" | "pending" | "approved" | "rejected";

const TABS: { value: StatusFilter; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

function tone(status: string): "green" | "amber" | "red" | "gray" {
  if (status === "approved") return "green";
  if (status === "pending") return "amber";
  if (status === "rejected") return "red";
  return "gray";
}

export default function VerificationTab() {
  const { addToast } = useToast();
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [rows, setRows] = useState<AdminVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setRows(await adminGetVerifications());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(
    () => (status === "all" ? rows : rows.filter((r) => r.status === status)),
    [rows, status]
  );

  async function decide(r: AdminVerification, approve: boolean) {
    setBusyId(r.id);
    try {
      if (approve) {
        await adminApproveVerification(r.id);
        addToast(`${r.companyName || "Seller"} verified`, "success");
      } else {
        await adminRejectVerification(r.id);
        addToast("Request rejected", "info");
      }
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Action failed", "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <SectionHeader
        title="Verification"
        subtitle="Review seller GST/PAN submissions. Approving grants the verified badge and trust seal for one year."
        actions={<span className="text-sm text-muted">{filtered.length} request(s)</span>}
      />

      <div className="mb-4">
        <FilterTabs
          tabs={TABS}
          value={status}
          onChange={(v) => setStatus(v as StatusFilter)}
        />
      </div>

      {loading ? (
        <LoadingState label="Loading requests…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No requests" hint="No verification requests match this filter." />
      ) : (
        <AdminTable
          columns={["Company", "GST", "PAN", "Note", "Status", "Submitted", "Actions"]}
        >
          {filtered.map((r) => {
            const busy = busyId === r.id;
            return (
              <Row key={r.id}>
                <Td className="font-semibold text-ink">{r.companyName || r.sellerId}</Td>
                <Td className="whitespace-nowrap font-mono text-xs text-muted">
                  {r.gstNumber || "—"}
                </Td>
                <Td className="whitespace-nowrap font-mono text-xs text-muted">
                  {r.panNumber || "—"}
                </Td>
                <Td className="max-w-[240px] text-muted">
                  <span className="line-clamp-2">{r.note || "—"}</span>
                </Td>
                <Td>
                  <Pill tone={tone(r.status)}>{r.status}</Pill>
                </Td>
                <Td className="whitespace-nowrap text-muted">{fmtDate(r.createdAt)}</Td>
                <Td>
                  {r.status === "pending" ? (
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="brand"
                        disabled={busy}
                        onClick={() => decide(r, true)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={busy}
                        onClick={() => decide(r, false)}
                      >
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-faint">
                      {r.reviewedAt ? fmtDate(r.reviewedAt) : "—"}
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
