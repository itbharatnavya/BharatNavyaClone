"use client";

// components/admin/ReportsTab.tsx — listing-report moderation queue.
// adminGetReports(status), adminResolveReport(id), adminDismissReport(id).

import React, { useEffect, useState } from "react";
import {
  adminGetReports,
  adminResolveReport,
  adminDismissReport,
  type AdminReport,
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

type StatusFilter = "all" | "open" | "resolved" | "dismissed";

const TABS: { value: StatusFilter; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" },
  { value: "all", label: "All" },
];

export default function ReportsTab() {
  const { addToast } = useToast();
  const [status, setStatus] = useState<StatusFilter>("open");
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setReports(await adminGetReports(status));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function resolve(r: AdminReport) {
    setBusyId(r.id);
    try {
      await adminResolveReport(r.id);
      addToast("Report resolved", "success");
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed", "error");
    } finally {
      setBusyId(null);
    }
  }
  async function dismiss(r: AdminReport) {
    setBusyId(r.id);
    try {
      await adminDismissReport(r.id);
      addToast("Report dismissed", "info");
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
        title="Reports"
        subtitle="Buyer-flagged listings awaiting moderation."
        actions={
          <span className="text-sm text-muted">{reports.length} report(s)</span>
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
        <LoadingState label="Loading reports…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : reports.length === 0 ? (
        <EmptyState
          title="Nothing to moderate"
          hint="No reports match this filter."
        />
      ) : (
        <AdminTable
          columns={["Listing", "Reason", "Details", "Status", "Reported", "Actions"]}
        >
          {reports.map((r) => {
            const busy = busyId === r.id;
            return (
              <Row key={r.id}>
                <Td>
                  <a
                    href={`/listing/${r.listingId}`}
                    className="font-medium text-brand hover:underline"
                  >
                    {r.listingId}
                  </a>
                </Td>
                <Td className="font-medium text-ink">{r.reason}</Td>
                <Td className="max-w-[320px] text-muted">
                  <span className="line-clamp-2">{r.details || "—"}</span>
                </Td>
                <Td>
                  <Pill status={r.status}>{r.status}</Pill>
                </Td>
                <Td className="whitespace-nowrap text-muted">
                  {fmtDate(r.createdAt)}
                </Td>
                <Td>
                  {r.status === "open" ? (
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="brand"
                        disabled={busy}
                        onClick={() => resolve(r)}
                      >
                        Resolve
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => dismiss(r)}
                      >
                        Dismiss
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-faint">
                      {r.resolvedAt ? fmtDate(r.resolvedAt) : "—"}
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
