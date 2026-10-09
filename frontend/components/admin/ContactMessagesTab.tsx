"use client";

// Admin > Global > Contact messages: what people sent from the Contact page form
// (GET/PATCH /api/admin/contact-messages). Newest first; filter New / Closed / All; close or
// reopen a message once it's been handled. Reply happens outside the app (email / phone links).

import { useCallback, useEffect, useState } from "react";
import { adminGetContactMessages, adminSetContactMessageStatus, type ContactMessage } from "@/lib/api";
import { useToast } from "@/components/Toast";

const TOPIC: Record<string, string> = { general: "General", listing: "Listing", advertising: "Advertising", hiring: "Hiring", support: "Account help", partnership: "Partnership", other: "Other" };

export default function ContactMessagesTab() {
  const { addToast } = useToast();
  const [rows, setRows] = useState<ContactMessage[]>([]);
  const [status, setStatus] = useState<"new" | "closed" | "">("new");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    adminGetContactMessages(status || undefined)
      .then(setRows).catch((e) => addToast(e instanceof Error ? e.message : "Could not load messages", "error"))
      .finally(() => setLoading(false));
  }, [status, addToast]);
  useEffect(load, [load]);

  async function setRow(id: string, next: "new" | "closed") {
    try {
      await adminSetContactMessageStatus(id, next);
      addToast(next === "closed" ? "Marked as handled." : "Reopened.", "success");
      load();
    } catch (e) { addToast(e instanceof Error ? e.message : "Could not update", "error"); }
  }

  return <div style={{ display: "grid", gap: 16 }}>
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <select className="select" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Filter messages" style={{ maxWidth: 200 }}>
        <option value="new">New</option>
        <option value="closed">Handled</option>
        <option value="">All</option>
      </select>
      <span style={{ color: "var(--muted)", fontSize: "var(--fs-sm)" }}>{loading ? "Loading…" : `${rows.length} ${rows.length === 1 ? "message" : "messages"}`}</span>
    </div>
    {!loading && rows.length === 0 && <div className="card card-flat card-pad" style={{ color: "var(--muted)" }}>No messages here.</div>}
    {rows.map((m) => <article key={m.id} className="card card-flat card-pad" style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
        <strong>{m.name} <span style={{ color: "var(--muted)", fontWeight: 500 }}>· {TOPIC[m.topic] || m.topic}</span></strong>
        <small style={{ color: "var(--muted)" }}>{new Date(m.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</small>
      </div>
      <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{m.message}</p>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", fontSize: "var(--fs-sm)" }}>
        {m.email && <a href={`mailto:${m.email}`}>{m.email}</a>}
        {m.phone && <a href={`tel:${m.phone.replace(/\s+/g, "")}`}>{m.phone}</a>}
        {m.userId && <span style={{ color: "var(--muted)" }}>Signed-in user {m.userId}</span>}
        <button type="button" className="btn btn-secondary btn-sm" style={{ marginLeft: "auto" }} onClick={() => setRow(m.id, m.status === "new" ? "closed" : "new")}>{m.status === "new" ? "Mark handled" : "Reopen"}</button>
      </div>
    </article>)}
  </div>;
}
