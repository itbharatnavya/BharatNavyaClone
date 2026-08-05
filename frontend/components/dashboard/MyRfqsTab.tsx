"use client";

// MyRfqsTab — the buyer's "My RFQs" inbox. Lists the requirements the buyer posted,
// with a live quote count. Expanding one reveals a side-by-side comparison of every
// quote sellers sent back (QuotesComparison), so the buyer can compare and connect.

import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { User, Inquiry } from "@/lib/types";
import { getMyRfqs } from "@/lib/api";
import { useToast } from "@/components/Toast";
import Badge from "@/components/Badge";
import QuotesComparison from "./QuotesComparison";
import { PanelHeader, EmptyState, Loading, Icon, formatDate, useTr } from "./shared";

interface Props {
  user: User;
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
          "Requirements you posted and the quotes sellers sent back — compare and connect."
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
            "Post a requirement and matching sellers will send you quotes to compare here."
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
            const count = r.quoteCount ?? r.quotes?.length ?? 0;
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
                    <Badge variant={count > 0 ? "new" : "neutral"}>
                      {count} {count === 1
                        ? tr("dashboard.myrfqs.quote", "quote")
                        : tr("dashboard.myrfqs.quotes", "quotes")}
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
                    {count > 0 && r.quotes && r.quotes.length > 0 ? (
                      <QuotesComparison quotes={r.quotes} />
                    ) : (
                      <div
                        style={{
                          padding: "24px 16px",
                          textAlign: "center",
                          color: "var(--muted)",
                          fontSize: 14,
                        }}
                      >
                        {tr("dashboard.myrfqs.waiting", "Waiting for sellers to quote…")}
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
