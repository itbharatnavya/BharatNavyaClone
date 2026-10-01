"use client";

// MyRfqsTab — the buyer's "My RFQs" inbox. Lists the requirements the buyer
// posted; expanding one shows which seller(s) it reached and whether they've
// connected yet (Call/WhatsApp — see routes/inquiries.js's POST
// /leads/:leadId/contact). There's no quote-back step in this flow — a
// seller reaches the buyer directly, the same way Directory works everywhere
// else (listing page, seller profile).

import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { User, Inquiry, SellerDelivery } from "@/lib/types";
import { getMyRfqs } from "@/lib/api";
import { useToast } from "@/components/Toast";
import Badge from "@/components/Badge";
import { PanelHeader, EmptyState, Loading, Icon, formatDate, timeAgo, useTr } from "./shared";

interface Props {
  user: User;
}

function ContactStatus({ seller }: { seller: SellerDelivery }) {
  const tr = useTr();
  if (!seller.contactedAt) {
    return (
      <span style={{ fontSize: 13, color: "var(--muted)" }}>
        {tr("dashboard.myrfqs.notContacted", "Not contacted yet")}
      </span>
    );
  }
  const via = seller.contactedVia === "whatsapp" ? "WhatsApp" : "Call";
  return (
    <span style={{ fontSize: 13, color: "var(--success)" }}>
      {tr("dashboard.myrfqs.contactedVia", "Contacted via")} {via} — {timeAgo(seller.contactedAt)}
    </span>
  );
}

export default function MyRfqsTab({ user }: Props) {
  void user;
  const tr = useTr();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rfqs, setRfqs] = useState<Inquiry[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await getMyRfqs();
        if (!alive) return;
        setRfqs(Array.isArray(res) ? res : []);
      } catch (e) {
        addToast((e as Error).message || "Failed to load your RFQs", "error");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [addToast]);

  return (
    <div>
      <PanelHeader
        title={tr("dashboard.myrfqs.title", "My RFQs")}
        subtitle={tr(
          "dashboard.myrfqs.subtitle",
          "Requirements you posted and which suppliers reached out to you."
        )}
        actions={
          <Link href="/rfq" className="btn btn-primary btn-sm">
            {tr("dashboard.myrfqs.post", "Post a requirement")}
          </Link>
        }
      />

      {loading ? (
        <Loading />
      ) : rfqs.length === 0 ? (
        <EmptyState
          icon={<Icon name="leads" size={22} />}
          title={tr("dashboard.myrfqs.empty", "No RFQs yet")}
          subtitle={tr(
            "dashboard.myrfqs.emptyHint",
            "Post a requirement and matching suppliers will reach out to you here."
          )}
          action={
            <Link href="/rfq" className="btn btn-primary">
              {tr("dashboard.myrfqs.post", "Post a requirement")}
            </Link>
          }
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {rfqs.map((r) => {
            const isOpen = expanded === r.id;
            const sellers = r.sellers || [];
            const contactedCount = sellers.filter((s) => s.contactedAt).length;
            return (
              <div key={r.id} className="card card-flat" style={{ padding: 0, overflow: "hidden" }}>
                <button
                  type="button"
                  onClick={() => setExpanded((cur) => (cur === r.id ? null : r.id))}
                  style={{
                    display: "flex",
                    width: "100%",
                    textAlign: "left",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: 16,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600, color: "var(--ink)" }}>
                        {r.productName || tr("dashboard.myrfqs.untitled", "Requirement")}
                      </span>
                      {r.categoryId && <span className="chip">{r.categoryId}</span>}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--faint)", marginTop: 4, display: "flex", gap: 12, flexWrap: "wrap" }}>
                      {r.quantity && <span>{tr("dashboard.myrfqs.qty", "Qty")}: {r.quantity}</span>}
                      <span>{formatDate(r.createdAt)}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
                    <Badge variant={contactedCount > 0 ? "new" : "neutral"}>
                      {sellers.length === 0
                        ? tr("dashboard.myrfqs.noSellers", "0 suppliers")
                        : `${sellers.length} ${sellers.length === 1 ? tr("dashboard.myrfqs.supplier", "supplier") : tr("dashboard.myrfqs.suppliers", "suppliers")}`}
                    </Badge>
                    <Icon
                      name="chevron"
                      size={18}
                      style={{
                        color: "var(--faint)",
                        transform: isOpen ? "rotate(90deg)" : "none",
                        transition: "transform .15s",
                      }}
                    />
                  </div>
                </button>

                {isOpen && (
                  <div style={{ padding: 16, borderTop: "1px solid var(--border)" }}>
                    {sellers.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {sellers.map((s) => (
                          <div
                            key={s.leadId}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: 10,
                              flexWrap: "wrap",
                              padding: "8px 0",
                              borderBottom: "1px solid var(--border)",
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 14 }}>
                                {s.companyName || "Seller"}
                                {s.isVerified && (
                                  <span style={{ marginLeft: 6, fontSize: 12, color: "var(--brand)" }}>
                                    {tr("dashboard.myrfqs.verified", "Verified")}
                                  </span>
                                )}
                              </div>
                              {s.city && (
                                <div style={{ fontSize: 12, color: "var(--faint)" }}>{s.city}</div>
                              )}
                            </div>
                            <ContactStatus seller={s} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: "24px 16px",
                          textAlign: "center",
                          color: "var(--muted)",
                          fontSize: 14,
                        }}
                      >
                        {r.unmatched
                          ? tr(
                              "dashboard.myrfqs.unmatched",
                              "No matching suppliers yet — our team is reviewing this requirement."
                            )
                          : tr("dashboard.myrfqs.waiting", "Waiting for a supplier match…")}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
