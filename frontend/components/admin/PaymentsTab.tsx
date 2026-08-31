"use client";

// components/admin/PaymentsTab.tsx — the offline-money backbone (entitlements).
// adminPayments() list + adminCreatePayment + adminUpdatePayment (mark paid / waived).

import React, { useEffect, useState } from "react";
import {
  getPayments,
  createPayment,
  updatePayment,
  type PaymentRow,
  type PaymentInput,
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
  money,
} from "./ui";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import Input from "@/components/Input";
import Select from "@/components/Select";
import Textarea from "@/components/Textarea";
import { useToast } from "@/components/Toast";

type Filter = "all" | "pending" | "paid" | "waived";
const TABS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "waived", label: "Waived" },
];

const EMPTY = {
  sellerId: "",
  relatedEntityType: "plan",
  relatedEntityId: "",
  amount: "0",
  paymentMethod: "upi",
  paymentStatus: "pending",
  validFrom: "",
  validTo: "",
  referenceNo: "",
  notes: "",
};

export default function PaymentsTab() {
  const { addToast } = useToast();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setPayments(await getPayments());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  const visible =
    filter === "all"
      ? payments
      : payments.filter((p) => p.paymentStatus === filter);

  async function mark(p: PaymentRow, paymentStatus: "paid" | "waived") {
    setBusyId(p.id);
    try {
      await updatePayment(p.id, { paymentStatus });
      addToast(`Payment marked ${paymentStatus}`, "success");
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const body: PaymentInput = {
        sellerId: form.sellerId.trim() || null,
        relatedEntityType: form.relatedEntityType,
        relatedEntityId: form.relatedEntityId.trim() || null,
        amount: Number(form.amount) || 0,
        paymentMethod: form.paymentMethod,
        paymentStatus: form.paymentStatus,
        validFrom: form.validFrom || null,
        validTo: form.validTo || null,
        referenceNo: form.referenceNo.trim() || null,
        notes: form.notes.trim() || null,
      };
      await createPayment(body);
      addToast("Payment recorded", "success");
      setOpen(false);
      setForm(EMPTY);
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <SectionHeader
        title="Payments"
        subtitle="Offline payment records — the entitlements backbone. Mark paid/waived to activate benefits."
        actions={
          <Button variant="brand" onClick={() => setOpen(true)}>
            + Record payment
          </Button>
        }
      />

      <div className="mb-4">
        <FilterTabs
          tabs={TABS}
          value={filter}
          onChange={(v) => setFilter(v as Filter)}
        />
      </div>

      {loading ? (
        <LoadingState label="Loading payments…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : visible.length === 0 ? (
        <EmptyState title="No payment records" hint="Record the first payment." />
      ) : (
        <AdminTable
          columns={[
            "Seller",
            "For",
            "Amount",
            "Method",
            "Valid",
            "Reference",
            "Status",
            "Actions",
          ]}
        >
          {visible.map((p) => {
            const busy = busyId === p.id;
            return (
              <Row key={p.id}>
                <Td className="text-muted">{p.sellerId || "—"}</Td>
                <Td>
                  <Pill tone="purple">{p.relatedEntityType || "—"}</Pill>
                  {p.relatedEntityId && (
                    <span className="ml-1 text-xs text-faint">
                      {p.relatedEntityId}
                    </span>
                  )}
                </Td>
                <Td className="font-semibold text-ink">{money(p.amount)}</Td>
                <Td className="text-muted">{p.paymentMethod || "—"}</Td>
                <Td className="whitespace-nowrap text-muted">
                  {p.validFrom || p.validTo
                    ? `${fmtDate(p.validFrom)} → ${fmtDate(p.validTo)}`
                    : "—"}
                </Td>
                <Td className="text-muted">{p.referenceNo || "—"}</Td>
                <Td>
                  <Pill status={p.paymentStatus}>{p.paymentStatus}</Pill>
                </Td>
                <Td>
                  {p.paymentStatus === "pending" ? (
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="brand"
                        disabled={busy}
                        onClick={() => mark(p, "paid")}
                      >
                        Mark paid
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => mark(p, "waived")}
                      >
                        Waive
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-faint">
                      {p.markedPaidDate ? fmtDate(p.markedPaidDate) : "settled"}
                    </span>
                  )}
                </Td>
              </Row>
            );
          })}
        </AdminTable>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Record payment"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="brand" disabled={saving} onClick={save}>
              {saving ? "Saving…" : "Record payment"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Seller ID"
              value={form.sellerId}
              onChange={(e) => setForm({ ...form, sellerId: e.target.value })}
              placeholder="usr_…"
            />
            <Select
              label="Payment for"
              value={form.relatedEntityType}
              onChange={(e) =>
                setForm({ ...form, relatedEntityType: e.target.value })
              }
              options={[
                { value: "plan", label: "Subscription plan" },
                { value: "featured", label: "Featured placement" },
                { value: "ad", label: "Ad booking" },
                { value: "lead", label: "Lead(s)" },
              ]}
            />
            <Input
              label="Related entity ID (optional)"
              value={form.relatedEntityId}
              onChange={(e) =>
                setForm({ ...form, relatedEntityId: e.target.value })
              }
              placeholder="plan_gold / adb_… / lead_…"
            />
            <Input
              label="Amount (₹)"
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
            <Select
              label="Method"
              value={form.paymentMethod}
              onChange={(e) =>
                setForm({ ...form, paymentMethod: e.target.value })
              }
              options={[
                { value: "upi", label: "UPI" },
                { value: "bank_transfer", label: "Bank transfer" },
                { value: "cash", label: "Cash" },
                { value: "cheque", label: "Cheque" },
                { value: "card", label: "Card" },
              ]}
            />
            <Select
              label="Status"
              value={form.paymentStatus}
              onChange={(e) =>
                setForm({ ...form, paymentStatus: e.target.value })
              }
              options={[
                { value: "pending", label: "Pending" },
                { value: "paid", label: "Paid" },
                { value: "waived", label: "Waived" },
              ]}
            />
            <Input
              label="Valid from"
              type="date"
              value={form.validFrom}
              onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
            />
            <Input
              label="Valid to"
              type="date"
              value={form.validTo}
              onChange={(e) => setForm({ ...form, validTo: e.target.value })}
            />
            <Input
              label="Reference no."
              value={form.referenceNo}
              onChange={(e) => setForm({ ...form, referenceNo: e.target.value })}
              placeholder="Txn / UTR / receipt no."
              containerClassName="sm:col-span-2"
            />
          </div>
          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Deal context, invoice link, etc."
          />
          <p className="text-xs text-faint">
            Benefits activate when status is <b>paid</b> or <b>waived</b> and the
            current date is within the valid window.
          </p>
        </div>
      </Modal>
    </div>
  );
}
