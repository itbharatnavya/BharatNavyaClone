"use client";

// components/admin/EmployersTab.tsx — Recruitment employer directory + approval
// workflow. Mirrors SellersTab.tsx's list+approve/suspend pattern, scoped to
// employerProfile instead of sellerProfile. No monetization editor here — the
// backend (routes/adminEmployers.js) only exposes approve/suspend, no reject
// and no monetization fields (RECRUITMENT.md §3).

import React, { useEffect, useMemo, useState } from "react";
import {
  adminGetEmployers,
  adminApproveEmployer,
  adminSuspendEmployer,
  type EmployerRow,
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
} from "./ui";
import Button from "@/components/Button";
import { useToast } from "@/components/Toast";

type StatusFilter = "all" | "pending" | "approved" | "suspended";

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "suspended", label: "Suspended" },
];

export default function EmployersTab() {
  const { addToast } = useToast();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [employers, setEmployers] = useState<EmployerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setEmployers(await adminGetEmployers(status));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load employers");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const counts = useMemo(() => employers.length, [employers]);

  async function act(
    employer: EmployerRow,
    fn: (id: string) => Promise<{ id: string; status: string }>,
    label: string
  ) {
    setBusyId(employer.id);
    try {
      await fn(employer.id);
      addToast(`${employer.companyName} ${label}`, "success");
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
        title="Employers"
        subtitle="Approve or suspend Recruitment employer accounts."
        actions={
          <span className="text-sm text-muted">
            {counts} employer{counts === 1 ? "" : "s"}
          </span>
        }
      />

      <div className="mb-4">
        <FilterTabs
          tabs={STATUS_TABS}
          value={status}
          onChange={(v) => setStatus(v as StatusFilter)}
        />
      </div>

      {loading ? (
        <LoadingState label="Loading employers…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : employers.length === 0 ? (
        <EmptyState title="No employers" hint="No employers match this filter." />
      ) : (
        <AdminTable columns={["Company", "Contact", "Industry", "Location", "Status", "Verified", "Actions"]}>
          {employers.map((e) => {
            const busy = busyId === e.id;
            return (
              <Row key={e.id}>
                <Td>
                  <div className="font-semibold text-ink">{e.companyName}</div>
                  <div className="text-xs text-faint">/{e.slug}</div>
                </Td>
                <Td>
                  <div className="text-ink">{e.name}</div>
                  <div className="text-xs text-faint">{e.mobile || e.email}</div>
                </Td>
                <Td className="text-muted">{e.industry || "—"}</Td>
                <Td className="whitespace-nowrap text-muted">
                  {e.location?.city || "—"}
                  {e.location?.state ? `, ${e.location.state}` : ""}
                </Td>
                <Td>
                  <Pill status={e.status}>{e.status}</Pill>
                </Td>
                <Td>
                  {e.isVerified ? (
                    <Pill tone="green">Verified</Pill>
                  ) : (
                    <span className="text-faint">—</span>
                  )}
                </Td>
                <Td>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {e.status !== "approved" && (
                      <Button
                        size="sm"
                        variant="brand"
                        disabled={busy}
                        onClick={() => act(e, adminApproveEmployer, "approved")}
                      >
                        Approve
                      </Button>
                    )}
                    {e.status !== "suspended" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => act(e, adminSuspendEmployer, "suspended")}
                      >
                        Suspend
                      </Button>
                    )}
                  </div>
                </Td>
              </Row>
            );
          })}
        </AdminTable>
      )}
    </div>
  );
}
