"use client";

// components/admin/AdsTab.tsx — ad inventory (slots) + campaign approval list.
//
// Ad slots (inventory — banner/sponsored_row/sidebar) are a generic, product-agnostic
// name+size+placementType catalog; not split by product, left untouched here.
//
// Campaign bookings drive the public slider (routes/ads.js) and are split by product
// via `GET /api/admin/ad-bookings?product=directory|recruitment` (backend/routes/admin.js) —
// a booking belongs to Recruitment iff its placementType starts with "recruitment_", same
// rule as myAds.js's isRecruitmentPlacement(). Server-paginated + status-filterable, same
// { items, total, page, totalPages } envelope as adminGetUsers (see UsersTab.tsx).
//
// A seller/employer self-serve campaign (POST /api/my-ads) always lands here with
// status "pending" — admin approval IS switching its status to "active"/"scheduled" via
// the Edit modal. A separate read-only View modal shows the full creative + details
// without exposing form inputs.
//
// All selection inputs are native dropdowns (mobile-friendly, non-technical admin).

import React, { useEffect, useState } from "react";
import {
  getAdSlots,
  createAdSlot,
  updateAdSlot,
  getAdBookings,
  createAdBooking,
  updateAdBooking,
  getCategories,
  getListings,
  adminSellers,
  adminGetEmployers,
  type AdSlotRow,
  type AdBookingRow,
} from "./adminApi";
import type { Category, Listing } from "@/lib/types";
import {
  SectionHeader,
  Panel,
  AdminTable,
  Row,
  Td,
  Pill,
  Toggle,
  LoadingState,
  ErrorState,
  EmptyState,
  fmtDate,
} from "./ui";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import Input from "@/components/Input";
import Select from "@/components/Select";
import { useToast } from "@/components/Toast";

const PAGE_SIZE_OPTIONS = [10, 20, 50];

// Placement destinations the public serving layer understands, split by product.
const DIRECTORY_PLACEMENTS = [
  { value: "category_top", label: "Category top (category pages)" },
  { value: "search_top", label: "Search top (search results)" },
  { value: "home_hero", label: "Home hero (homepage)" },
];
const RECRUITMENT_PLACEMENTS = [
  { value: "recruitment_home", label: "Recruitment — home page" },
  { value: "recruitment_search_top", label: "Recruitment — job search top" },
];

// Serving statuses. Public /api/ads serves "active" + "scheduled" (within the
// date window); "paused" is the admin off-switch; "pending" is an unreviewed
// seller/employer submission awaiting approval.
const STATUS_OPTIONS = [
  { value: "pending", label: "Pending review" },
  { value: "active", label: "Active" },
  { value: "scheduled", label: "Scheduled" },
  { value: "paused", label: "Paused" },
];
const STATUS_FILTER_OPTIONS = [{ value: "all", label: "Any status" }, ...STATUS_OPTIONS];

interface BookingForm {
  placementType: string;
  categorySlug: string; // "" = all categories
  sellerId: string;
  listingId: string;
  creativeImageUrl: string;
  headline: string;
  targetUrl: string;
  startDate: string;
  endDate: string;
  status: string;
}

function emptyBooking(placementType: string): BookingForm {
  return {
    placementType,
    categorySlug: "",
    sellerId: "",
    listingId: "",
    creativeImageUrl: "",
    headline: "",
    targetUrl: "",
    startDate: "",
    endDate: "",
    status: "active",
  };
}

interface AdsTabProps {
  product?: "directory" | "recruitment";
}

export default function AdsTab({ product = "directory" }: AdsTabProps) {
  const { addToast } = useToast();
  const isRecruitment = product === "recruitment";
  const placementOptions = isRecruitment ? RECRUITMENT_PLACEMENTS : DIRECTORY_PLACEMENTS;

  const [slots, setSlots] = useState<AdSlotRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [advertisers, setAdvertisers] = useState<{ id: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // campaign approval list — server-paginated, filtered to this product
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [bookings, setBookings] = useState<AdBookingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // slot modal
  const [slotOpen, setSlotOpen] = useState(false);
  const [slotForm, setSlotForm] = useState({
    name: "",
    placementType: "banner",
    defaultSize: "",
    isActive: true,
  });
  const [savingSlot, setSavingSlot] = useState(false);

  // booking modals
  const [bookOpen, setBookOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bookForm, setBookForm] = useState<BookingForm>(emptyBooking(placementOptions[0].value));
  const [savingBook, setSavingBook] = useState(false);
  const [viewing, setViewing] = useState<AdBookingRow | null>(null);

  // Product switch (Directory tab vs Recruitment tab) or a filter/page change
  // resets to page 1 so stale offsets from the other view never leak in.
  useEffect(() => {
    setPage(1);
  }, [product, statusFilter, limit]);

  async function loadStatic() {
    try {
      if (isRecruitment) {
        const [s, emps] = await Promise.all([getAdSlots(), adminGetEmployers("approved")]);
        setSlots(s);
        setAdvertisers(emps.map((e) => ({ id: e.id, label: e.companyName })));
        setCategories([]);
        setListings([]);
        return;
      }
      const [s, cats, sel, lst] = await Promise.all([
        getAdSlots(),
        getCategories(),
        adminSellers(),
        getListings({ limit: 500 }),
      ]);
      setSlots(s);
      setCategories(cats);
      setAdvertisers(sel.map((u) => ({ id: u.id, label: u.sellerProfile?.companyName || u.name || u.id })));
      setListings(lst.listings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ads");
    }
  }

  async function loadBookings() {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdBookings({ product, status: statusFilter, page, limit });
      setBookings(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ad bookings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStatic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  useEffect(() => {
    void loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, statusFilter, page, limit]);

  async function toggleSlot(slot: AdSlotRow) {
    try {
      await updateAdSlot(slot.id, { isActive: !slot.isActive });
      const s = await getAdSlots();
      setSlots(s);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed", "error");
    }
  }

  async function saveSlot() {
    setSavingSlot(true);
    try {
      await createAdSlot({
        name: slotForm.name.trim(),
        placementType: slotForm.placementType,
        defaultSize: slotForm.defaultSize,
        isActive: slotForm.isActive,
      });
      addToast("Ad slot created", "success");
      setSlotOpen(false);
      setSlotForm({ name: "", placementType: "banner", defaultSize: "", isActive: true });
      const s = await getAdSlots();
      setSlots(s);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed", "error");
    } finally {
      setSavingSlot(false);
    }
  }

  function openNewBooking() {
    setEditingId(null);
    setBookForm(emptyBooking(placementOptions[0].value));
    setBookOpen(true);
  }

  function openEditBooking(b: AdBookingRow) {
    setEditingId(b.id);
    setBookForm({
      placementType: b.placementType || placementOptions[0].value,
      categorySlug: (b.categoryIds && b.categoryIds[0]) || b.categoryId || "",
      sellerId: b.sellerId || "",
      listingId: b.listingId || "",
      creativeImageUrl: b.creativeImageUrl || "",
      headline: b.headline || "",
      targetUrl: b.targetUrl || "",
      startDate: b.startDate ? b.startDate.slice(0, 10) : "",
      endDate: b.endDate ? b.endDate.slice(0, 10) : "",
      status: b.status || "active",
    });
    setBookOpen(true);
  }

  const dateOrderInvalid =
    !!bookForm.startDate && !!bookForm.endDate && bookForm.endDate < bookForm.startDate;

  const canSaveBooking =
    !savingBook &&
    bookForm.creativeImageUrl.trim() !== "" &&
    bookForm.headline.trim() !== "" &&
    !dateOrderInvalid;

  async function saveBooking() {
    if (!canSaveBooking) return;
    setSavingBook(true);
    try {
      const payload = {
        placementType: bookForm.placementType || null,
        sellerId: bookForm.sellerId || null,
        listingId: bookForm.listingId || null,
        categoryIds: bookForm.categorySlug ? [bookForm.categorySlug] : [],
        creativeImageUrl: bookForm.creativeImageUrl.trim() || null,
        headline: bookForm.headline.trim() || null,
        targetUrl: bookForm.targetUrl.trim() || null,
        startDate: bookForm.startDate || null,
        endDate: bookForm.endDate || null,
        status: bookForm.status,
      };
      if (editingId) {
        await updateAdBooking(editingId, payload);
        addToast("Booking updated", "success");
      } else {
        await createAdBooking(payload);
        addToast("Booking created", "success");
      }
      setBookOpen(false);
      setEditingId(null);
      setBookForm(emptyBooking(placementOptions[0].value));
      await loadBookings();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed", "error");
    } finally {
      setSavingBook(false);
    }
  }

  const categoryOptions = [
    { value: "", label: "All categories" },
    ...[...categories]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => ({ value: c.slug, label: c.name })),
  ];

  const sellerOptions = [
    { value: "", label: "— No advertiser —" },
    ...advertisers.map((a) => ({ value: a.id, label: a.label })),
  ];

  const listingOptions = (() => {
    const scoped = bookForm.sellerId
      ? listings.filter((l) => l.sellerId === bookForm.sellerId)
      : listings;
    return [
      { value: "", label: "— No listing —" },
      ...scoped.map((l) => ({ value: l.id, label: l.title })),
    ];
  })();

  const sellerName = (id?: string | null) =>
    (id && advertisers.find((a) => a.id === id)?.label) || id || "—";
  const catName = (slug: string) =>
    categories.find((c) => c.slug === slug)?.name || slug;
  const targetingLabel = (b: AdBookingRow) => {
    const ids = b.categoryIds && b.categoryIds.length ? b.categoryIds : [];
    if (ids.length === 0) return "All categories";
    return ids.map(catName).join(", ");
  };
  const placementLabel = (b: AdBookingRow) =>
    placementOptions.find((p) => p.value === b.placementType)?.label || b.placementType || "—";

  return (
    <div>
      <SectionHeader
        title="Ads"
        subtitle={
          isRecruitment
            ? "Sponsored placement bookings on Recruitment pages."
            : "Ad slot inventory and sponsored placement bookings."
        }
      />

      <div className="space-y-6">
        {/* Ad slots */}
        <Panel
          title="Ad slots"
          desc="Placements available across the site."
          right={
            <Button size="sm" variant="secondary" onClick={() => setSlotOpen(true)}>
              + New slot
            </Button>
          }
        >
          {slots.length === 0 ? (
            <EmptyState title="No ad slots" />
          ) : (
            <AdminTable columns={["Slot", "Placement", "Size", "Active"]}>
              {slots.map((s) => (
                <Row key={s.id}>
                  <Td>
                    <span className="font-semibold text-ink">{s.name}</span>
                    <span className="ml-1 text-xs text-faint">({s.id})</span>
                  </Td>
                  <Td>
                    <Pill tone="blue">{s.placementType || "—"}</Pill>
                  </Td>
                  <Td className="text-muted">{s.defaultSize || "—"}</Td>
                  <Td>
                    <button type="button" onClick={() => toggleSlot(s)} className="cursor-pointer">
                      <Pill status={s.isActive ? "on" : "off"}>
                        {s.isActive ? "Active" : "Inactive"}
                      </Pill>
                    </button>
                  </Td>
                </Row>
              ))}
            </AdminTable>
          )}
        </Panel>

        {/* Campaign approval list */}
        <Panel
          title="Ad bookings"
          desc="Sponsored campaigns that run in the on-site ad slider. Seller/employer submissions arrive as Pending review — edit to approve."
          right={
            <Button size="sm" variant="brand" onClick={openNewBooking}>
              + New booking
            </Button>
          }
        >
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={STATUS_FILTER_OPTIONS}
              containerClassName="min-w-[180px]"
            />
            <span className="text-sm text-muted">
              {total} campaign{total === 1 ? "" : "s"}
            </span>
          </div>

          {loading ? (
            <LoadingState label="Loading ad bookings…" />
          ) : error ? (
            <ErrorState message={error} onRetry={loadBookings} />
          ) : bookings.length === 0 ? (
            <EmptyState title="No bookings" hint="No campaigns match this filter." />
          ) : (
            <>
              <AdminTable columns={["Placement", "Advertiser", "Targeting", "Dates", "Status", ""]}>
                {bookings.map((b) => (
                  <Row key={b.id}>
                    <Td>
                      <Pill tone="blue">{placementLabel(b)}</Pill>
                    </Td>
                    <Td className="text-muted">{sellerName(b.sellerId)}</Td>
                    <Td className="text-muted">{targetingLabel(b)}</Td>
                    <Td className="whitespace-nowrap text-muted">
                      {fmtDate(b.startDate)} → {fmtDate(b.endDate)}
                    </Td>
                    <Td>
                      <Pill status={b.status}>{b.status}</Pill>
                    </Td>
                    <Td className="whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setViewing(b)}>
                          View
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => openEditBooking(b)}>
                          Edit
                        </Button>
                      </div>
                    </Td>
                  </Row>
                ))}
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
        </Panel>
      </div>

      {/* New slot modal */}
      <Modal
        open={slotOpen}
        onClose={() => setSlotOpen(false)}
        title="New ad slot"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSlotOpen(false)}>
              Cancel
            </Button>
            <Button variant="brand" disabled={savingSlot || !slotForm.name.trim()} onClick={saveSlot}>
              {savingSlot ? "Saving…" : "Create slot"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Slot name"
            value={slotForm.name}
            onChange={(e) => setSlotForm({ ...slotForm, name: e.target.value })}
            placeholder="Homepage Banner"
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Placement type"
              value={slotForm.placementType}
              onChange={(e) => setSlotForm({ ...slotForm, placementType: e.target.value })}
              options={[
                { value: "banner", label: "Banner" },
                { value: "sponsored_row", label: "Sponsored row" },
                { value: "sidebar", label: "Sidebar" },
              ]}
            />
            <Input
              label="Default size"
              value={slotForm.defaultSize}
              onChange={(e) => setSlotForm({ ...slotForm, defaultSize: e.target.value })}
              placeholder="1200x300"
            />
          </div>
          <Toggle
            label="Active"
            checked={slotForm.isActive}
            onChange={(v) => setSlotForm({ ...slotForm, isActive: v })}
          />
        </div>
      </Modal>

      {/* New / edit booking modal */}
      <Modal
        open={bookOpen}
        onClose={() => setBookOpen(false)}
        title={editingId ? "Edit ad booking" : "New ad booking"}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setBookOpen(false)}>
              Cancel
            </Button>
            <Button variant="brand" disabled={!canSaveBooking} onClick={saveBooking}>
              {savingBook ? "Saving…" : editingId ? "Save changes" : "Create booking"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* WHERE + WHICH (dropdowns) */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Where (placement)"
              value={bookForm.placementType}
              onChange={(e) => setBookForm({ ...bookForm, placementType: e.target.value })}
              hint="Which slot this ad runs in."
              options={placementOptions}
            />
            {!isRecruitment && (
              <Select
                label="Target category"
                value={bookForm.categorySlug}
                onChange={(e) => setBookForm({ ...bookForm, categorySlug: e.target.value })}
                hint="Leave on “All categories” to run everywhere."
                options={categoryOptions}
              />
            )}
            <Select
              label={isRecruitment ? "Advertiser (employer)" : "Advertiser (seller)"}
              value={bookForm.sellerId}
              onChange={(e) => setBookForm({ ...bookForm, sellerId: e.target.value, listingId: "" })}
              options={sellerOptions}
            />
            {!isRecruitment && (
              <Select
                label="Advertise a listing (optional)"
                value={bookForm.listingId}
                onChange={(e) => setBookForm({ ...bookForm, listingId: e.target.value })}
                hint={bookForm.sellerId ? "Listings from the selected advertiser." : "Pick an advertiser to narrow this list."}
                options={listingOptions}
              />
            )}
          </div>
          {isRecruitment && (
            <p className="text-xs text-faint">
              To promote a specific job, paste its page link into “Click-through URL” below.
            </p>
          )}

          {/* Creative */}
          <Input
            label="Creative image URL"
            value={bookForm.creativeImageUrl}
            onChange={(e) => setBookForm({ ...bookForm, creativeImageUrl: e.target.value })}
            placeholder="/demo/steel-2.jpg or https://…"
            required
          />
          {bookForm.creativeImageUrl.trim() && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bookForm.creativeImageUrl.trim()}
              alt=""
              className="h-32 w-full rounded-lg border border-border object-cover"
              onError={(e) => (e.currentTarget.style.display = "none")}
              onLoad={(e) => (e.currentTarget.style.display = "block")}
            />
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Headline"
              value={bookForm.headline}
              onChange={(e) => setBookForm({ ...bookForm, headline: e.target.value })}
              placeholder="Bulk SS/MS/TMT at factory rates"
              required
            />
            <Input
              label="Click-through URL"
              value={bookForm.targetUrl}
              onChange={(e) => setBookForm({ ...bookForm, targetUrl: e.target.value })}
              placeholder="/seller/… or https://…"
            />
          </div>

          {/* HOW / WHEN */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Start date"
              type="date"
              value={bookForm.startDate}
              onChange={(e) => setBookForm({ ...bookForm, startDate: e.target.value })}
            />
            <Input
              label="End date"
              type="date"
              value={bookForm.endDate}
              onChange={(e) => setBookForm({ ...bookForm, endDate: e.target.value })}
              error={dateOrderInvalid ? "End date can't be before start date" : undefined}
            />
            <Select
              label="Status"
              value={bookForm.status}
              onChange={(e) => setBookForm({ ...bookForm, status: e.target.value })}
              hint="Active & scheduled serve; paused is off; pending stays hidden until approved."
              options={STATUS_OPTIONS}
            />
          </div>
        </div>
      </Modal>

      {/* Read-only view modal */}
      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title="Campaign details"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setViewing(null)}>
              Close
            </Button>
            {viewing && (
              <Button
                variant="brand"
                onClick={() => {
                  const b = viewing;
                  setViewing(null);
                  openEditBooking(b);
                }}
              >
                Edit
              </Button>
            )}
          </>
        }
      >
        {viewing && (
          <div className="space-y-4">
            {viewing.creativeImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={viewing.creativeImageUrl}
                alt={viewing.headline || ""}
                className="max-h-80 w-full rounded-lg border border-border object-contain bg-bg-subtle"
              />
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-faint">Headline</div>
                <div className="mt-0.5 text-sm text-ink">{viewing.headline || "—"}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-faint">Status</div>
                <div className="mt-0.5">
                  <Pill status={viewing.status}>{viewing.status}</Pill>
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-faint">Placement</div>
                <div className="mt-0.5 text-sm text-ink">{placementLabel(viewing)}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-faint">Advertiser</div>
                <div className="mt-0.5 text-sm text-ink">{sellerName(viewing.sellerId)}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-faint">Targeting</div>
                <div className="mt-0.5 text-sm text-ink">{targetingLabel(viewing)}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-faint">Dates</div>
                <div className="mt-0.5 text-sm text-ink">
                  {fmtDate(viewing.startDate)} → {fmtDate(viewing.endDate)}
                </div>
              </div>
              <div className="sm:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-faint">Click-through URL</div>
                <div className="mt-0.5 break-all text-sm text-ink">{viewing.targetUrl || "—"}</div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
