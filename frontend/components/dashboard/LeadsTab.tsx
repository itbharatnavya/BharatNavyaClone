"use client";

// LeadsTab — the seller's "RFQs" table: every requirement delivered to them,
// server-paginated and filterable. Connect (Call/WhatsApp) replaces the old
// quote-back form — the seller reaches the buyer directly, same as everywhere
// else in Directory, and that action is recorded as the row's contact status.

import React, { useEffect, useState } from "react";
import type { User } from "@/lib/types";
import { getMyRfqDeliveries, contactLead, type RfqDeliveryRow, type RfqDeliveryStatusFilter } from "@/lib/api";
import { waLink, sellerReplyText } from "@/lib/whatsapp";
import { useToast } from "@/components/Toast";
import Badge from "@/components/Badge";
import { PanelHeader, EmptyState, Loading, Icon, formatDate, timeAgo, useTr } from "./shared";

interface Props {
  user: User;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];

function CallIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}
function WhatsAppIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 21l1.65-4.95A8.5 8.5 0 1 1 8.1 19.4L3 21Z" />
      <path d="M8.5 9.5c0 3.5 2.5 6 6 6" />
    </svg>
  );
}

const STATUS_OPTIONS: { value: RfqDeliveryStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "not_contacted", label: "Not contacted" },
  { value: "contacted", label: "Contacted" },
];

export default function LeadsTab({ user }: Props) {
  void user;
  const tr = useTr();
  const { addToast } = useToast();

  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<RfqDeliveryStatusFilter>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [rows, setRows] = useState<RfqDeliveryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState({ total: 0, contacted: 0, notContacted: 0 });
  const [loading, setLoading] = useState(true);
  const [busyLeadId, setBusyLeadId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 350);
    return () => clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    setPage(1);
  }, [q, status, from, to, limit]);

  async function load() {
    setLoading(true);
    try {
      const res = await getMyRfqDeliveries({ q: q || undefined, status, from: from || undefined, to: to || undefined, page, limit });
      setRows(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setSummary(res.summary);
    } catch (e) {
      addToast((e as Error).message || "Failed to load RFQs", "error");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, from, to, page, limit]);

  async function handleConnect(row: RfqDeliveryRow, via: "call" | "whatsapp") {
    // Open the link immediately — never let the status write delay or block
    // the actual call/message.
    if (via === "call") {
      window.location.href = `tel:${(row.buyerMobile || "").replace(/\s/g, "")}`;
    } else {
      const href = waLink({
        phone: row.buyerMobile,
        text: sellerReplyText({ buyerName: row.buyerName, productName: row.productName }),
      });
      if (href) window.open(href, "_blank", "noopener,noreferrer");
    }

    setBusyLeadId(row.leadId);
    try {
      await contactLead(row.leadId, via);
      setRows((prev) =>
        prev.map((r) =>
          r.leadId === row.leadId
            ? { ...r, contactedAt: new Date().toISOString(), contactedVia: via }
            : r
        )
      );
    } catch (e) {
      // Non-fatal: the call/message already went out — just the status log failed.
      addToast((e as Error).message || "Couldn't record the contact status", "error");
    } finally {
      setBusyLeadId(null);
    }
  }

  const empty = !loading && rows.length === 0;

  return (
    <div>
      <PanelHeader
        title={tr("dashboard.leads.title", "RFQs")}
        subtitle={tr("dashboard.leads.subtitle", "Buyer requirements delivered to you — connect directly by call or WhatsApp.")}
        actions={
          <span style={{ fontSize: 13, color: "var(--muted)" }}>
            {summary.total} total · {summary.contacted} contacted · {summary.notContacted} not contacted
          </span>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <input
          className="input"
          placeholder={tr("dashboard.leads.search", "Search buyer or product…")}
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
        />
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value as RfqDeliveryStatusFilter)}>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      {loading ? (
        <Loading />
      ) : empty ? (
        <EmptyState
          icon={<Icon name="leads" size={22} />}
          title={tr("dashboard.leads.empty", "No RFQs yet")}
          subtitle={tr("dashboard.leads.emptyHint", "When buyers' requirements match your listings, they'll land here.")}
        />
      ) : (
        <>
          <div className="card card-flat" style={{ padding: 0, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
              <thead>
                <tr style={{ background: "var(--bg-subtle)" }}>
                  {["Date", "Buyer", "Requirement", "Category", "Status", ""].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "10px 14px",
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.03em",
                        color: "var(--muted)",
                        borderBottom: "1px solid var(--border)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const busy = busyLeadId === r.leadId;
                  return (
                    <tr key={r.leadId} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 14px", whiteSpace: "nowrap", color: "var(--faint)" }}>
                        {formatDate(r.deliveredDate)}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ fontWeight: 600, color: "var(--ink)" }}>{r.buyerName || "Buyer"}</div>
                        <div style={{ fontSize: 12, color: "var(--faint)" }}>{r.buyerMobile || r.buyerEmail || "—"}</div>
                      </td>
                      <td style={{ padding: "10px 14px", maxWidth: 220 }}>
                        <div className="line-clamp-1">{r.productName || "Requirement"}</div>
                        {r.quantity && <div style={{ fontSize: 12, color: "var(--faint)" }}>Qty: {r.quantity}</div>}
                      </td>
                      <td style={{ padding: "10px 14px", whiteSpace: "nowrap", color: "var(--muted)" }}>
                        {r.categoryId || "—"}
                      </td>
                      <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                        {r.contactedAt ? (
                          <Badge variant="new">
                            {r.contactedVia === "whatsapp" ? "WhatsApp" : "Call"} — {timeAgo(r.contactedAt)}
                          </Badge>
                        ) : (
                          <Badge variant="neutral">{tr("dashboard.leads.notContacted", "Not contacted")}</Badge>
                        )}
                      </td>
                      <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={busy || !r.buyerMobile}
                            onClick={() => handleConnect(r, "call")}
                            title="Call"
                          >
                            <CallIcon />
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={busy || !r.buyerMobile}
                            onClick={() => handleConnect(r, "whatsapp")}
                            title="WhatsApp"
                          >
                            <WhatsAppIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 14 }}>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted)" }}>
                Rows per page
                <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="select" style={{ width: "auto", padding: "4px 8px" }}>
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>
                Page {page} of {totalPages}
              </span>
              <button type="button" className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
