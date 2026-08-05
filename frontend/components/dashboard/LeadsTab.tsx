"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { User, Lead, Inquiry } from "@/lib/types";
import { getInquiries } from "@/lib/api";
import { useToast } from "@/components/Toast";
import Badge from "@/components/Badge";
import QuoteForm from "./QuoteForm";
import { PanelHeader, EmptyState, Loading, Icon, formatINR, formatDate, useTr } from "./shared";

interface Props {
  user: User;
}

const BILLING_VARIANT: Record<string, "new" | "sponsored" | "neutral"> = {
  paid: "new",
  waived: "neutral",
  billed: "sponsored",
  unbilled: "neutral",
};

export default function LeadsTab({ user }: Props) {
  void user;
  const tr = useTr();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  // Which lead's quote form is open, and which leads the seller has already quoted.
  const [openQuoteFor, setOpenQuoteFor] = useState<string | null>(null);
  const [quotedLeads, setQuotedLeads] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Contract says getInquiries → { leads, inquiries }; current client types it Lead[].
        const res = (await getInquiries()) as unknown;
        if (!alive) return;
        if (Array.isArray(res)) {
          setLeads(res as Lead[]);
        } else {
          const obj = res as { leads?: Lead[]; inquiries?: Inquiry[] };
          setLeads(obj.leads || []);
          setInquiries(obj.inquiries || []);
        }
      } catch (e) {
        addToast((e as Error).message || "Failed to load leads", "error");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [addToast]);

  const empty = leads.length === 0 && inquiries.length === 0;

  return (
    <div>
      <PanelHeader
        title={tr("dashboard.leads.title", "Leads & RFQs")}
        subtitle={tr("dashboard.leads.subtitle", "Buyer enquiries and requirements delivered to you.")}
      />

      {loading ? (
        <Loading />
      ) : empty ? (
        <EmptyState
          icon={<Icon name="leads" size={22} />}
          title={tr("dashboard.leads.empty", "No leads yet")}
          subtitle={tr("dashboard.leads.emptyHint", "When buyers enquire about your listings, they'll land here.")}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {inquiries.length > 0 && (
            <section>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 10 }}>
                {tr("dashboard.leads.enquiries", "Enquiries")}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {inquiries.map((q) => (
                  <div key={q.id} className="card card-flat" style={{ padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 600, color: "var(--ink)" }}>
                        {q.buyerName || "Buyer"}
                        {q.company ? ` · ${q.company}` : ""}
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {q.kind && <Badge variant="neutral">{q.kind}</Badge>}
                        <Badge variant="new">{q.status}</Badge>
                      </div>
                    </div>
                    {q.message && (
                      <p style={{ fontSize: 14, color: "var(--muted)", marginTop: 8 }}>{q.message}</p>
                    )}
                    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 13, color: "var(--faint)", marginTop: 8 }}>
                      {q.quantity && <span>Qty: {q.quantity}{q.unit ? ` ${q.unit}` : ""}</span>}
                      {q.deliveryLocation && <span>To: {q.deliveryLocation}</span>}
                      {q.targetBudget && <span>Budget: {q.targetBudget}</span>}
                      {q.timeline && <span>Timeline: {q.timeline}</span>}
                      <span>{formatDate(q.createdAt)}</span>
                    </div>
                    <div style={{ display: "flex", gap: 12, marginTop: 10, fontSize: 13 }}>
                      {q.buyerMobile && (
                        <a href={`tel:${q.buyerMobile}`} style={{ color: "var(--brand)", fontWeight: 600 }}>
                          {tr("dashboard.leads.call", "Call")}
                        </a>
                      )}
                      {q.buyerMobile && (
                        <a
                          href={`https://wa.me/${q.buyerMobile.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "var(--success)", fontWeight: 600 }}
                        >
                          WhatsApp
                        </a>
                      )}
                      {q.buyerEmail && (
                        <a href={`mailto:${q.buyerEmail}`} style={{ color: "var(--muted)", fontWeight: 600 }}>
                          {tr("dashboard.leads.email", "Email")}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {leads.length > 0 && (
            <section>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 10 }}>
                {tr("dashboard.leads.delivered", "Delivered leads")}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {leads.map((l) => {
                  const quoted = !!quotedLeads[l.leadId];
                  const canQuote = !!l.inquiryId;
                  return (
                    <div key={l.leadId}>
                      <div
                        className="card card-flat"
                        style={{ padding: 16, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}
                      >
                        <div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 600, color: "var(--ink)" }}>
                              {l.leadType || "Lead"}
                            </span>
                            <Badge variant={BILLING_VARIANT[l.billingStatus] || "neutral"}>
                              {l.billingStatus}
                            </Badge>
                            {l.chargeable && <Badge variant="sponsored">{formatINR(l.leadPrice)}</Badge>}
                            {quoted && <Badge variant="new">{tr("dashboard.leads.quoted", "Quoted")}</Badge>}
                          </div>
                          <div style={{ fontSize: 13, color: "var(--faint)", marginTop: 4 }}>
                            {formatDate(l.deliveredDate)}
                            {l.consumedFromQuota ? " · from quota" : ""}
                            {l.status ? ` · ${l.status}` : ""}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          {l.listingId && (
                            <Link
                              href={`/listing/${l.listingId}`}
                              className="btn btn-secondary btn-sm"
                            >
                              {tr("dashboard.leads.viewListing", "View listing")}
                            </Link>
                          )}
                          {canQuote && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() =>
                                setOpenQuoteFor((cur) => (cur === l.leadId ? null : l.leadId))
                              }
                            >
                              {openQuoteFor === l.leadId
                                ? tr("dashboard.leads.close", "Close")
                                : quoted
                                ? tr("dashboard.leads.editQuote", "Edit quote")
                                : tr("dashboard.leads.sendQuote", "Send quote")}
                            </button>
                          )}
                        </div>
                      </div>

                      {openQuoteFor === l.leadId && l.inquiryId && (
                        <div className="card card-flat" style={{ padding: 16, marginTop: 8 }}>
                          <QuoteForm
                            inquiryId={l.inquiryId}
                            onSent={() => {
                              setQuotedLeads((prev) => ({ ...prev, [l.leadId]: true }));
                              setOpenQuoteFor(null);
                            }}
                            onCancel={() => setOpenQuoteFor(null)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
