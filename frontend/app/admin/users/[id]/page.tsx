"use client";

// /admin/users/[id] — the full, cross-product account detail page.
//
// One account can be a buyer, a seller, an employer AND a candidate at once, so
// this page is organised by hat: Account & roles, Directory (seller), Recruitment
// (employer + candidate), plus an activity-count strip. Every per-hat action
// (approve seller/employer, plan & monetization) plus the account-level suspend
// lives here — the list tabs at /admin (Global/Directory/Recruitment › Users)
// just link in.

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import AdminLogin from "@/components/admin/AdminLogin";
import {
  adminGetUser,
  adminSuspendAccount,
  adminReactivateAccount,
  adminApprove,
  adminReject,
  adminSuspend,
  adminMonetization,
  adminApproveEmployer,
  adminSuspendEmployer,
  type AdminUserDetail,
  type AdminUserStats,
} from "@/components/admin/adminApi";
import { Panel, Pill, StatCard, LoadingState, ErrorState, fmtDate } from "@/components/admin/ui";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Select from "@/components/Select";
import Textarea from "@/components/Textarea";
import Modal from "@/components/Modal";
import type { PlanTier, PriorityTier } from "@/lib/types";

const BACK: Record<string, { label: string; hash: string }> = {
  global: { label: "Back to all users", hash: "#global:users" },
  directory: { label: "Back to Directory users", hash: "#directory:directoryUsers" },
  recruitment: { label: "Back to Recruitment users", hash: "#recruitment:recruitmentUsers" },
};

function Line({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border py-2 last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-right text-sm font-medium text-ink">{value}</span>
    </div>
  );
}

export default function AdminUserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const search = useSearchParams();
  const id = typeof params.id === "string" ? params.id : "";
  const from = search.get("from") || "global";
  const back = BACK[from] || BACK.global;

  const { user: me, loading: authLoading, isAdmin } = useAuth();
  const { addToast } = useToast();

  const [data, setData] = useState<{ user: AdminUserDetail; stats: AdminUserStats } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && me && !isAdmin) router.replace("/");
  }, [authLoading, me, isAdmin, router]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setData(await adminGetUser(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load user");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try {
      await fn();
      addToast(ok, "success");
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Action failed", "error");
    } finally {
      setBusy(false);
    }
  }

  function goBack() {
    router.push(`/admin${back.hash}`);
  }

  if (authLoading) {
    return (
      <div className="container-bs flex min-h-[60vh] items-center justify-center">
        <span
          className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-border"
          style={{ borderTopColor: "var(--brand)" }}
        />
      </div>
    );
  }
  if (!me) return <AdminLogin />;
  if (!isAdmin) return null;

  const u = data?.user;
  const stats = data?.stats;
  const sp = u?.sellerProfile || null;
  const ep = u?.employerProfile || null;
  const cp = u?.candidateProfile || null;
  const suspended = u?.accountStatus === "suspended";
  const isSelf = !!u && !!me && u.id === me.id;
  const isAdminAccount = !!u && (u.roles || []).includes("admin");

  return (
    <div className="container-bs py-8">
      <button
        type="button"
        onClick={goBack}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        {back.label}
      </button>

      {loading ? (
        <LoadingState label="Loading account…" />
      ) : error || !u ? (
        <ErrorState message={error || "User not found"} onRetry={load} />
      ) : (
        <>
          {suspended && (
            <div
              className="mb-4 rounded-lg border px-4 py-2.5 text-sm font-medium"
              style={{ background: "#fef2f2", color: "#b91c1c", borderColor: "#fecaca" }}
            >
              This account is suspended — the user is signed out and cannot log in or use any product.
            </div>
          )}

          {/* Header */}
          <div className="card card-flat mb-6 flex flex-wrap items-start justify-between gap-4 p-5">
            <div className="flex min-w-0 items-start gap-3.5">
              <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-brand-tint text-xl font-bold text-brand">
                {(u.name || "?").trim().charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <h1 className="text-h3 font-bold tracking-tight text-ink">{u.name}</h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {u.hats.map((h) => (
                    <Pill
                      key={h}
                      tone={
                        h === "seller"
                          ? "purple"
                          : h === "employer"
                          ? "green"
                          : h === "candidate"
                          ? "amber"
                          : h === "admin"
                          ? "gray"
                          : "blue"
                      }
                    >
                      {h}
                    </Pill>
                  ))}
                  <Pill tone={suspended ? "red" : "green"}>{u.accountStatus}</Pill>
                </div>
                <p className="mt-2 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted">
                  {[
                    u.email,
                    u.mobile,
                    [u.city, u.state].filter(Boolean).join(", ") || null,
                    `Joined ${fmtDate(u.createdAt)}`,
                  ]
                    .filter(Boolean)
                    .map((bit, i, arr) => (
                      <span key={i}>
                        {bit}
                        {i < arr.length - 1 && <span className="mx-1 text-faint">·</span>}
                      </span>
                    ))}
                </p>
                <div className="mt-1 text-xs text-faint">ID {u.id}</div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              {suspended ? (
                <Button
                  variant="brand"
                  disabled={busy}
                  onClick={() => run(() => adminReactivateAccount(u.id), "Account reactivated")}
                >
                  Reactivate account
                </Button>
              ) : (
                <Button
                  variant="danger"
                  disabled={busy || isSelf || isAdminAccount}
                  onClick={() => setConfirmSuspend(true)}
                >
                  Suspend account
                </Button>
              )}
              {(isSelf || isAdminAccount) && !suspended && (
                <span className="text-[11px] text-faint">
                  {isSelf ? "Can't suspend yourself" : "Admin — can't suspend"}
                </span>
              )}
            </div>
          </div>

          {/* Activity — only the counts that apply to the hats this account holds. */}
          {stats && (
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <StatCard label="RFQs sent" value={stats.inquiriesSent} />
              <StatCard label="Reviews received" value={stats.reviewsReceived} />
              {sp && <StatCard label="Listings" value={stats.listings} />}
              {ep && <StatCard label="Jobs posted" value={stats.jobsPosted} />}
              {ep && <StatCard label="Applications received" value={stats.applicationsReceived} />}
              {cp && <StatCard label="Applications sent" value={stats.applicationsSent} />}
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            {/* Account & roles — every account has this. */}
            <Panel title="Account & roles">
              <Line label="Email" value={u.email || "—"} />
              <Line label="Mobile" value={u.mobile || "—"} />
              <Line label="Location" value={[u.city, u.state].filter(Boolean).join(", ") || "—"} />
              <Line label="Joined" value={fmtDate(u.createdAt)} />
              <Line
                label="Roles"
                value={(u.roles || []).length ? (u.roles || []).join(", ") : "user"}
              />
              <Line
                label="Recruitment role"
                value={
                  u.recruitmentRole
                    ? `${u.recruitmentRole}${u.recruitmentRoleLockedAt ? " (locked)" : ""}`
                    : "—"
                }
              />
              <Line
                label="Account status"
                value={<Pill tone={suspended ? "red" : "green"}>{u.accountStatus}</Pill>}
              />
              {!sp && !ep && !cp && (
                <p className="mt-3 text-sm text-muted">
                  Buyer account — no seller, employer or candidate profile.
                </p>
              )}
            </Panel>

            {/* Directory — only if the account is a seller. */}
            {sp && (
              <Panel
                title="Directory · Seller"
                right={
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setPlanOpen(true)}
                    disabled={busy}
                  >
                    Manage plan
                  </Button>
                }
              >
                <Line label="Company" value={sp.companyName || "—"} />
                <Line label="Slug" value={sp.slug ? `/${sp.slug}` : "—"} />
                <Line
                  label="Location"
                  value={
                    sp.location?.city
                      ? `${sp.location.city}${sp.location.state ? `, ${sp.location.state}` : ""}`
                      : "—"
                  }
                />
                <Line label="Status" value={<Pill status={sp.status || "pending"}>{sp.status}</Pill>} />
                <Line
                  label="Verified"
                  value={<Pill tone={sp.isVerified ? "green" : "gray"}>{sp.isVerified ? "Yes" : "No"}</Pill>}
                />
                <Line label="Plan" value={<Pill status={sp.planTier || "free"}>{sp.planTier}</Pill>} />
                <Line
                  label="Priority"
                  value={<Pill status={sp.priorityTier || "none"}>{sp.priorityTier || "none"}</Pill>}
                />
                <Line label="Featured" value={sp.isFeaturedSeller ? "Yes" : "No"} />
                <Line label="Rank boost" value={sp.rankBoostScore ?? 0} />
                <Line
                  label="Rating"
                  value={sp.rating != null ? `${sp.rating} (${sp.reviewCount ?? 0})` : "—"}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {sp.status !== "approved" && (
                    <Button size="sm" variant="brand" disabled={busy} onClick={() => run(() => adminApprove(u.id), "Seller approved")}>
                      Approve
                    </Button>
                  )}
                  {sp.status !== "rejected" && (
                    <Button size="sm" variant="danger" disabled={busy} onClick={() => run(() => adminReject(u.id), "Seller rejected")}>
                      Reject
                    </Button>
                  )}
                  {sp.status !== "suspended" && (
                    <Button size="sm" variant="secondary" disabled={busy} onClick={() => run(() => adminSuspend(u.id), "Seller suspended")}>
                      Suspend seller
                    </Button>
                  )}
                </div>
              </Panel>
            )}

            {/* Recruitment employer — only if the account is an employer. */}
            {ep && (
              <Panel title="Recruitment · Employer">
                <Line label="Company" value={ep.companyName || "—"} />
                <Line label="Slug" value={ep.slug ? `/${ep.slug}` : "—"} />
                <Line label="Industry" value={ep.industry || "—"} />
                <Line label="Company size" value={ep.companySize || "—"} />
                <Line
                  label="Location"
                  value={
                    ep.location?.city
                      ? `${ep.location.city}${ep.location.state ? `, ${ep.location.state}` : ""}`
                      : "—"
                  }
                />
                <Line label="Status" value={<Pill status={ep.status || "pending"}>{ep.status}</Pill>} />
                <Line
                  label="Verified"
                  value={<Pill tone={ep.isVerified ? "green" : "gray"}>{ep.isVerified ? "Yes" : "No"}</Pill>}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {ep.status !== "approved" && (
                    <Button size="sm" variant="brand" disabled={busy} onClick={() => run(() => adminApproveEmployer(u.id), "Employer approved")}>
                      Approve
                    </Button>
                  )}
                  {ep.status !== "suspended" && (
                    <Button size="sm" variant="secondary" disabled={busy} onClick={() => run(() => adminSuspendEmployer(u.id), "Employer suspended")}>
                      Suspend employer
                    </Button>
                  )}
                </div>
              </Panel>
            )}

            {/* Recruitment candidate — only if the account is a candidate. */}
            {cp && (
              <Panel title="Recruitment · Candidate">
                <Line label="Headline" value={cp.headline || "—"} />
                <Line
                  label="Experience"
                  value={cp.experienceYears != null ? `${cp.experienceYears} yr` : "—"}
                />
                <Line label="Current role" value={cp.currentRole || "—"} />
                <Line label="Skills" value={(cp.skills || []).slice(0, 8).join(", ") || "—"} />
                <Line
                  label="Open to work"
                  value={<Pill tone={cp.isOpenToWork ? "green" : "gray"}>{cp.isOpenToWork ? "Yes" : "No"}</Pill>}
                />
                <Line
                  label="CV"
                  value={
                    cp.resumeUrl ? (
                      <a href={cp.resumeUrl} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                        View resume
                      </a>
                    ) : (
                      "—"
                    )
                  }
                />
                <Line label="Applications sent" value={stats?.applicationsSent ?? 0} />
              </Panel>
            )}
          </div>
        </>
      )}

      {confirmSuspend && u && (
        <Modal
          open
          onClose={() => (busy ? undefined : setConfirmSuspend(false))}
          title={`Suspend ${u.name}?`}
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmSuspend(false)} disabled={busy}>
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={busy}
                onClick={async () => {
                  await run(() => adminSuspendAccount(u.id), "Account suspended");
                  setConfirmSuspend(false);
                }}
              >
                {busy ? "Suspending…" : "Suspend account"}
              </Button>
            </>
          }
        >
          <p className="text-sm text-muted">
            They will be signed out and blocked from logging in or using any product until
            reactivated. Their data and profiles are kept.
          </p>
        </Modal>
      )}

      {planOpen && u && sp && (
        <PlanModal
          userId={u.id}
          sp={sp}
          onClose={() => setPlanOpen(false)}
          onSaved={async () => {
            setPlanOpen(false);
            await load();
          }}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------ PlanModal
// Seller plan & monetization — same fields + endpoint as the old Users-tab modal.
interface PlanForm {
  rankBoostScore: string;
  priorityTier: PriorityTier;
  isFeaturedSeller: boolean;
  featuredStartDate: string;
  featuredEndDate: string;
  planTier: PlanTier;
  featuredCredits: string;
  adminNotes: string;
}
function toDateInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function PlanModal({
  userId,
  sp,
  onClose,
  onSaved,
}: {
  userId: string;
  sp: NonNullable<AdminUserDetail["sellerProfile"]>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { addToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<PlanForm>({
    rankBoostScore: String(sp.rankBoostScore ?? 0),
    priorityTier: (sp.priorityTier as PriorityTier) || "none",
    isFeaturedSeller: !!sp.isFeaturedSeller,
    featuredStartDate: toDateInput(sp.featuredStartDate),
    featuredEndDate: toDateInput(sp.featuredEndDate),
    planTier: (sp.planTier as PlanTier) || "free",
    featuredCredits: String(sp.featuredCredits ?? 0),
    adminNotes: sp.adminNotes || "",
  });

  async function save() {
    setBusy(true);
    try {
      await adminMonetization(userId, {
        rankBoostScore: Number(form.rankBoostScore) || 0,
        priorityTier: form.priorityTier,
        isFeaturedSeller: form.isFeaturedSeller,
        featuredStartDate: form.featuredStartDate || null,
        featuredEndDate: form.featuredEndDate || null,
        planTier: form.planTier,
        featuredCredits: Number(form.featuredCredits) || 0,
        adminNotes: form.adminNotes,
      });
      addToast("Monetization saved", "success");
      onSaved();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={() => (busy ? undefined : onClose())}
      title={`Plan & monetization — ${sp.companyName || ""}`}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="brand" onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Plan tier"
            value={form.planTier}
            onChange={(e) => setForm({ ...form, planTier: e.target.value as PlanTier })}
            options={[
              { value: "free", label: "Free" },
              { value: "silver", label: "Silver" },
              { value: "gold", label: "Gold" },
            ]}
          />
          <Select
            label="Priority tier"
            value={form.priorityTier}
            onChange={(e) => setForm({ ...form, priorityTier: e.target.value as PriorityTier })}
            options={[
              { value: "none", label: "None" },
              { value: "premium", label: "Premium" },
              { value: "star", label: "Star" },
              { value: "leader", label: "Leader" },
            ]}
          />
          <Input
            label="Rank boost score"
            type="number"
            value={form.rankBoostScore}
            onChange={(e) => setForm({ ...form, rankBoostScore: e.target.value })}
          />
          <Input
            label="Featured credits"
            type="number"
            value={form.featuredCredits}
            onChange={(e) => setForm({ ...form, featuredCredits: e.target.value })}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={form.isFeaturedSeller}
            onChange={(e) => setForm({ ...form, isFeaturedSeller: e.target.checked })}
          />
          Featured seller
        </label>
        {form.isFeaturedSeller && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Featured start"
              type="date"
              value={form.featuredStartDate}
              onChange={(e) => setForm({ ...form, featuredStartDate: e.target.value })}
            />
            <Input
              label="Featured end"
              type="date"
              value={form.featuredEndDate}
              onChange={(e) => setForm({ ...form, featuredEndDate: e.target.value })}
            />
          </div>
        )}
        <Textarea
          label="Admin notes"
          value={form.adminNotes}
          onChange={(e) => setForm({ ...form, adminNotes: e.target.value })}
        />
      </div>
    </Modal>
  );
}
