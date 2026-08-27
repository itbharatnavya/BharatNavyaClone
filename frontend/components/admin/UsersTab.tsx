"use client";

// components/admin/UsersTab.tsx — the account directory, one component for three
// section contexts (Global / Directory / Recruitment) via the `scope` prop.
//
// Every row is an account; an account wears any mix of hats (buyer, seller,
// employer, candidate, admin) at once. This tab is a filtered list — all the
// per-hat actions (approve seller, approve employer, plan & monetization,
// suspend the whole account) live on the full detail page at
// /admin/users/[id], reached by clicking a row.
//
//   scope="global"      → everyone; hats + account-status columns
//   scope="directory"   → sellers + plain buyers; seller status/plan/featured filters
//   scope="recruitment" → employers + candidates; employer-status filter

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminGetUsers,
  type AdminUserRow,
  type AdminUserScope,
  type AdminUserTypeFilter,
  type AdminUserHat,
  type AdminUserFeaturedFilter,
  type AdminUserSummary,
} from "./adminApi";
import type { SellerStatus, PlanTier } from "@/lib/types";
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
import Input from "@/components/Input";
import Select from "@/components/Select";

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const SELLER_STATUS_OPTIONS: { value: SellerStatus | "all"; label: string }[] = [
  { value: "all", label: "Any status" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "suspended", label: "Suspended" },
];

const EMPLOYER_STATUS_OPTIONS: { value: SellerStatus | "all"; label: string }[] = [
  { value: "all", label: "Any status" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "suspended", label: "Suspended" },
];

const PLAN_OPTIONS: { value: PlanTier | "all"; label: string }[] = [
  { value: "all", label: "Any plan" },
  { value: "free", label: "Free" },
  { value: "silver", label: "Silver" },
  { value: "gold", label: "Gold" },
];

const FEATURED_OPTIONS: { value: AdminUserFeaturedFilter; label: string }[] = [
  { value: "all", label: "Featured: any" },
  { value: "yes", label: "Featured only" },
  { value: "no", label: "Not featured" },
];

const HAT_TONE: Record<AdminUserHat, "blue" | "purple" | "green" | "amber" | "gray"> = {
  buyer: "blue",
  seller: "purple",
  employer: "green",
  candidate: "amber",
  admin: "gray",
};

const SUBTITLE: Record<AdminUserScope, string> = {
  global: "Every account, across all products. Click a row for the full cross-product profile.",
  directory: "Directory accounts — buyers and sellers. A seller is a normal user with a seller profile attached.",
  recruitment: "Recruitment accounts — employers (companies) and candidates (job seekers).",
};

function typeTabsFor(
  scope: AdminUserScope,
  s: AdminUserSummary
): { value: AdminUserTypeFilter; label: string; count: number }[] {
  if (scope === "directory") {
    return [
      { value: "all", label: "All", count: s.total },
      { value: "buyer", label: "Buyers", count: s.buyers },
      { value: "seller", label: "Sellers", count: s.sellers },
    ];
  }
  if (scope === "recruitment") {
    return [
      { value: "all", label: "All", count: s.total },
      { value: "employer", label: "Employers", count: s.employers },
      { value: "candidate", label: "Candidates", count: s.candidates },
    ];
  }
  return [
    { value: "all", label: "All", count: s.total },
    { value: "buyer", label: "Buyers", count: s.buyers },
    { value: "seller", label: "Sellers", count: s.sellers },
    { value: "employer", label: "Employers", count: s.employers },
    { value: "candidate", label: "Candidates", count: s.candidates },
    { value: "admin", label: "Admins", count: s.admins },
  ];
}

const EMPTY_SUMMARY: AdminUserSummary = {
  total: 0,
  buyers: 0,
  sellers: 0,
  employers: 0,
  candidates: 0,
  admins: 0,
  suspended: 0,
};

export default function UsersTab({ scope = "global" }: { scope?: AdminUserScope }) {
  const router = useRouter();
  const isRecruitment = scope === "recruitment";

  const [type, setType] = useState<AdminUserTypeFilter>("all");
  const [status, setStatus] = useState<SellerStatus | "all">("all");
  const [planTier, setPlanTier] = useState<PlanTier | "all">("all");
  const [featured, setFeatured] = useState<AdminUserFeaturedFilter>("all");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<AdminUserSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 350);
    return () => clearTimeout(t);
  }, [qInput]);

  // Any filter (or page-size) change resets to page 1.
  useEffect(() => {
    setPage(1);
  }, [type, status, planTier, featured, q, limit]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await adminGetUsers({
        scope,
        type,
        status,
        planTier: isRecruitment ? "all" : planTier,
        featured: isRecruitment ? "all" : featured,
        q: q || undefined,
        page,
        limit,
      });
      setRows(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setSummary(res.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, type, status, planTier, featured, q, page, limit]);

  const typeTabs = typeTabsFor(scope, summary);
  const statusOptions = isRecruitment ? EMPLOYER_STATUS_OPTIONS : SELLER_STATUS_OPTIONS;
  const statusPlaceholder = isRecruitment ? "Employer status" : "Seller status";
  const showSellerFilters = !isRecruitment;
  const sellerFiltersDisabled = type === "buyer";

  function openUser(id: string) {
    router.push(`/admin/users/${id}?from=${scope}`);
  }

  const columns =
    scope === "global"
      ? ["Name", "Hats", "Account", "Joined", ""]
      : scope === "recruitment"
      ? ["Name", "Role", "Company / headline", "Status", "Joined", ""]
      : type === "seller"
      ? ["Name", "Type", "Status", "Plan", "Featured", "Joined", ""]
      : ["Name", "Type", "Status", "Joined", ""];

  function NameCell({ u, secondary }: { u: AdminUserRow; secondary: string }) {
    return (
      <button
        type="button"
        onClick={() => openUser(u.id)}
        className="flex min-w-0 items-center gap-2.5 text-left"
      >
        <span
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-tint text-xs font-bold text-brand"
          aria-hidden
        >
          {(u.name || "?").trim().charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="line-clamp-1 block font-semibold text-brand hover:underline">{u.name}</span>
          <span className="line-clamp-1 block text-xs text-faint">{secondary || "—"}</span>
        </span>
      </button>
    );
  }

  return (
    <div>
      <SectionHeader
        title="Users"
        subtitle={SUBTITLE[scope]}
        actions={
          <span className="text-sm text-muted">
            {total} account{total === 1 ? "" : "s"}
            {summary.suspended > 0 && ` · ${summary.suspended} suspended`}
          </span>
        }
      />

      <div className="mb-4">
        <FilterTabs
          tabs={typeTabs}
          value={type}
          onChange={(v) => setType(v as AdminUserTypeFilter)}
        />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          placeholder="Search name, email, mobile or company…"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
        />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as SellerStatus | "all")}
          options={statusOptions}
          disabled={type === "buyer" || type === "candidate"}
          hint={
            type === "buyer"
              ? "No approval status"
              : type === "candidate"
              ? "Candidates have no status"
              : statusPlaceholder
          }
        />
        {showSellerFilters && (
          <>
            <Select
              value={planTier}
              onChange={(e) => setPlanTier(e.target.value as PlanTier | "all")}
              options={PLAN_OPTIONS}
              disabled={sellerFiltersDisabled}
              hint={sellerFiltersDisabled ? "Seller filter" : undefined}
            />
            <Select
              value={featured}
              onChange={(e) => setFeatured(e.target.value as AdminUserFeaturedFilter)}
              options={FEATURED_OPTIONS}
              disabled={sellerFiltersDisabled}
              hint={sellerFiltersDisabled ? "Seller filter" : undefined}
            />
          </>
        )}
      </div>

      {loading ? (
        <LoadingState label="Loading users…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : rows.length === 0 ? (
        <EmptyState title="No accounts" hint="No users match these filters." />
      ) : (
        <>
          <AdminTable columns={columns}>
            {rows.map((u) => {
              const sp = u.sellerProfile;
              const ep = u.employerProfile;
              const cp = u.candidateProfile;

              if (scope === "global") {
                return (
                  <Row key={u.id}>
                    <Td>
                      <NameCell
                        u={u}
                        secondary={
                          sp?.companyName || ep?.companyName || u.email || u.mobile || ""
                        }
                      />
                    </Td>
                    <Td>
                      <span className="flex flex-wrap gap-1">
                        {u.hats.map((h) => (
                          <Pill key={h} tone={HAT_TONE[h]}>
                            {h}
                          </Pill>
                        ))}
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap">
                      <Pill tone={u.accountStatus === "suspended" ? "red" : "green"}>
                        {u.accountStatus}
                      </Pill>
                    </Td>
                    <Td className="whitespace-nowrap text-xs text-muted">{fmtDate(u.createdAt)}</Td>
                    <Td className="whitespace-nowrap text-right">
                      <Button size="sm" variant="secondary" onClick={() => openUser(u.id)}>
                        View
                      </Button>
                    </Td>
                  </Row>
                );
              }

              if (scope === "recruitment") {
                const roleLabel = ep ? "Employer" : "Candidate";
                return (
                  <Row key={u.id}>
                    <Td>
                      <NameCell u={u} secondary={u.email || u.mobile || ""} />
                    </Td>
                    <Td className="whitespace-nowrap">
                      <Pill tone={ep ? "green" : "amber"}>{roleLabel}</Pill>
                    </Td>
                    <Td className="max-w-[240px]">
                      <span className="line-clamp-1 block text-sm text-ink">
                        {ep?.companyName || cp?.headline || "—"}
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap">
                      {ep ? (
                        <Pill status={ep.status || "pending"}>{ep.status}</Pill>
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-xs text-muted">{fmtDate(u.createdAt)}</Td>
                    <Td className="whitespace-nowrap text-right">
                      <Button size="sm" variant="secondary" onClick={() => openUser(u.id)}>
                        View
                      </Button>
                    </Td>
                  </Row>
                );
              }

              // scope === "directory"
              return (
                <Row key={u.id}>
                  <Td>
                    <NameCell u={u} secondary={sp?.companyName || u.email || u.mobile || ""} />
                  </Td>
                  <Td className="whitespace-nowrap">
                    <Pill tone={u.accountType === "seller" ? "purple" : "blue"}>
                      {u.accountType === "seller" ? "Seller" : "Buyer"}
                    </Pill>
                  </Td>
                  <Td className="whitespace-nowrap">
                    {sp ? (
                      <Pill status={sp.status || "pending"}>{sp.status}</Pill>
                    ) : (
                      <Pill tone={u.accountStatus === "suspended" ? "red" : "green"}>
                        {u.accountStatus}
                      </Pill>
                    )}
                  </Td>
                  {type === "seller" && (
                    <>
                      <Td className="whitespace-nowrap">
                        {sp ? (
                          <Pill status={sp.planTier || "free"}>{sp.planTier}</Pill>
                        ) : (
                          <span className="text-faint">—</span>
                        )}
                      </Td>
                      <Td className="whitespace-nowrap">
                        {sp?.isFeaturedSeller ? (
                          <Pill tone="amber">Featured</Pill>
                        ) : (
                          <span className="text-faint">—</span>
                        )}
                      </Td>
                    </>
                  )}
                  <Td className="whitespace-nowrap text-xs text-muted">{fmtDate(u.createdAt)}</Td>
                  <Td className="whitespace-nowrap text-right">
                    <Button size="sm" variant="secondary" onClick={() => openUser(u.id)}>
                      View
                    </Button>
                  </Td>
                </Row>
              );
            })}
          </AdminTable>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-muted">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
            </span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-sm text-muted">
                Rows per page
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="input !w-auto !py-1"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-muted">
                Page {page} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
